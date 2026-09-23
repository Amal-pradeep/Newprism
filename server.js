const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Orbit production hotfix: keep inline outreach injection syntax-safe for Node 20.

const port = Number(process.env.PORT) || 8080;
const root = __dirname;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const loginAttempts = new Map();

const USERS = {
  'amalpradeep25@gmail.com': { name: 'Amalmenon', role: 'owner', hash: process.env.ORBIT_AMAL_PASSWORD_SHA256 || '' },
  'aadil.sudhir279@gmail.com': { name: 'Aadil', role: 'partner', hash: process.env.ORBIT_AADIL_PASSWORD_SHA256 || '' },
  'msaneeshnath@gmail.com': { name: 'Aneesh', role: 'design', hash: process.env.ORBIT_ANEESH_PASSWORD_SHA256 || '' }
};
const SESSION_SECRET = process.env.ORBIT_SESSION_SECRET || '';
const GMAIL_SCOPES=['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.send'];
const GMAIL_CLIENT_ID=process.env.GOOGLE_CLIENT_ID||'';
const GMAIL_CLIENT_SECRET=process.env.GOOGLE_CLIENT_SECRET||'';
const GMAIL_REDIRECT_URI=process.env.GOOGLE_REDIRECT_URI||'https://prism-orbit-production-e6fe.up.railway.app/api/gmail/callback';
const GMAIL_TOKEN_FILE=process.env.ORBIT_GMAIL_TOKEN_FILE||path.join('/tmp','prism-orbit-gmail-tokens.enc');
const gmailTokens=new Map();
function ownerOnly(req){const s=readSession(req);return s&&s.role==='owner'?s:null}
function gmailConfigured(){return !!(GMAIL_CLIENT_ID&&GMAIL_CLIENT_SECRET&&SESSION_SECRET)}
function tokenKey(){return crypto.createHash('sha256').update(SESSION_SECRET||'orbit').digest()}
function saveGmailTokens(){try{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',tokenKey(),iv),data=Buffer.concat([c.update(JSON.stringify(Object.fromEntries(gmailTokens.entries())),'utf8'),c.final()]);fs.writeFileSync(GMAIL_TOKEN_FILE,JSON.stringify({iv:iv.toString('base64url'),tag:c.getAuthTag().toString('base64url'),data:data.toString('base64url')}),{mode:0o600})}catch(e){console.error('Gmail token save failed',e.message)}}
function loadGmailTokens(){try{if(fs.existsSync(GMAIL_TOKEN_FILE)){const b=JSON.parse(fs.readFileSync(GMAIL_TOKEN_FILE,'utf8')),d=crypto.createDecipheriv('aes-256-gcm',tokenKey(),Buffer.from(b.iv,'base64url'));d.setAuthTag(Buffer.from(b.tag,'base64url'));const x=JSON.parse(Buffer.concat([d.update(Buffer.from(b.data,'base64url')),d.final()]).toString());Object.entries(x||{}).forEach(([k,v])=>gmailTokens.set(k,v))}}catch(e){console.error('Gmail token load failed',e.message)}if(process.env.ORBIT_GMAIL_REFRESH_TOKEN)gmailTokens.set(process.env.ORBIT_GMAIL_EMAIL||'amalpradeep25@gmail.com',{refresh_token:process.env.ORBIT_GMAIL_REFRESH_TOKEN})}
loadGmailTokens();
function oauthUrl(email){const p=Buffer.from(JSON.stringify({email,exp:Date.now()+600000,n:crypto.randomBytes(12).toString('hex')})).toString('base64url'),state=p+'.'+sign(p);return 'https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:GMAIL_CLIENT_ID,redirect_uri:GMAIL_REDIRECT_URI,response_type:'code',access_type:'offline',include_granted_scopes:'true',prompt:'consent',scope:GMAIL_SCOPES.join(' '),state})}
function verifyState(state){try{const [p,sig]=String(state||'').split('.'),exp=sign(p);if(!p||!sig||sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp)))return null;const d=JSON.parse(Buffer.from(p,'base64url').toString());return d.exp>Date.now()&&USERS[d.email]?d:null}catch{return null}}
async function googleToken(params){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)}),d=await r.json();if(!r.ok)throw new Error(d.error_description||d.error||'Google token request failed');return d}
async function gmailToken(email){const t=gmailTokens.get(email);if(!t?.refresh_token)throw new Error('Gmail is not connected.');const d=await googleToken({client_id:GMAIL_CLIENT_ID,client_secret:GMAIL_CLIENT_SECRET,refresh_token:t.refresh_token,grant_type:'refresh_token'});return d.access_token}
async function gmailApi(email,endpoint,opt={}){const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me'+endpoint,{...opt,headers:{Authorization:'Bearer '+await gmailToken(email),...(opt.headers||{})}}),d=await r.json();if(!r.ok)throw new Error(d.error?.message||'Gmail API request failed');return d}
function rawMail(p){const h=['MIME-Version: 1.0','Content-Type: text/plain; charset="UTF-8"','Content-Transfer-Encoding: 8bit','To: '+p.to,...(p.cc?['Cc: '+p.cc]:[]),'Subject: '+p.subject,...(p.inReplyTo?['In-Reply-To: '+p.inReplyTo]:[])];return Buffer.from(h.join('\r\n')+'\r\n\r\n'+p.body).toString('base64url')}


function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:;"
  };
}

function send(res, status, body, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
  res.writeHead(status, Object.assign({
    'Content-Type': contentType,
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
  }, securityHeaders(), extraHeaders));
  res.end(body);
}

function sendFile(res, filePath, contentType) {
  try {
    const body = fs.readFileSync(filePath);
    send(res, 200, body, contentType);
  } catch (error) {
    send(res, 404, 'Not Found');
  }
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function createSession(email) {
  const payload = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  })).toString('base64url');
  return payload + '.' + sign(payload);
}

function readSession(req) {
  if (!SESSION_SECRET) return null;
  const token = parseCookies(req).orbit_session;
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.email || !USERS[data.email] || !data.exp || data.exp < Date.now()) return null;
    return { email: data.email, ...USERS[data.email] };
  } catch {
    return null;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10000) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(new URLSearchParams(body)));
    req.on('error', reject);
  });
}

function loginKey(email) {
  return String(email || '').trim().toLowerCase();
}

function loginRateLimit(email) {
  const key = loginKey(email);
  const now = Date.now();
  const existing = loginAttempts.get(key);
  if (!existing || now - existing.firstAttempt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { firstAttempt: now, attempts: 0 });
    return { allowed: true, retryAfter: 0 };
  }
  if (existing.attempts >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((LOGIN_WINDOW_MS - (now - existing.firstAttempt)) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

function recordLoginFailure(email) {
  const key = loginKey(email);
  const now = Date.now();
  const existing = loginAttempts.get(key);
  if (!existing || now - existing.firstAttempt >= LOGIN_WINDOW_MS) loginAttempts.set(key, { firstAttempt: now, attempts: 1 });
  else existing.attempts += 1;
}

function clearLoginFailures(email) { loginAttempts.delete(loginKey(email)); }

function serveIndex(req, res) {
  try {
    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const outreachScript = fs.readFileSync(path.join(root, 'outreach.js'), 'utf8');
    html = html.replace('</body>', '<script>' + outreachScript.replaceAll('</script', '<\\/script') + '</script></body>');
    const session = readSession(req);
    if (session) {
      const safe = JSON.stringify({ email: session.email, name: session.name, role: session.role }).replace(/</g, '\\u003c');
      html = html.replace('<head>', '<head><script>window.__ORBIT_SERVER_AUTH=' + safe + ';</script>');
      html = html.replace('<div id="authGate">', '<div id="authGate" style="display:none">');
    }
    send(res, 200, html, 'text/html; charset=utf-8');
  } catch (error) {
    console.error('index.html error', error);
    send(res, 500, 'Orbit failed to load.');
  }
}

const server = http.createServer(async (req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (req.method === 'POST' && requestPath === '/api/login') {
    try {
      const body = await readBody(req);
      const email = (body.get('email') || '').trim().toLowerCase();
      const password = body.get('password') || '';
      const limit = loginRateLimit(email);
      if (!limit.allowed) return send(res, 429, JSON.stringify({ authenticated: false, error: 'Too many login attempts. Try again later.' }), 'application/json; charset=utf-8', { 'Retry-After': String(limit.retryAfter) });
      const account = USERS[email];
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      if (!account || !account.hash || passwordHash !== account.hash) {
        recordLoginFailure(email);
        if ((req.headers.accept || '').includes('application/json')) return send(res, 401, JSON.stringify({ authenticated: false }), 'application/json; charset=utf-8');
        return send(res, 401, 'Invalid Orbit credentials. Please go back and try again.');
      }
      clearLoginFailures(email);
      const token = createSession(email);
      const cookie = 'orbit_session=' + encodeURIComponent(token) + '; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax';
      if ((req.headers.accept || '').includes('application/json')) return send(res, 200, JSON.stringify({ authenticated: true }), 'application/json; charset=utf-8', { 'Set-Cookie': cookie });
      return send(res, 303, '', 'text/plain; charset=utf-8', { 'Location': '/', 'Set-Cookie': cookie });
    } catch (error) {
      console.error('login error', error);
      return send(res, 400, 'Orbit login request could not be processed.');
    }
  }


  if(req.method==='GET'&&requestPath==='/api/gmail/connect'){const u=ownerOnly(req);if(!u)return send(res,401,JSON.stringify({error:'Owner access required.'}),'application/json; charset=utf-8');if(!gmailConfigured())return send(res,503,JSON.stringify({error:'Gmail OAuth credentials are not configured.'}),'application/json; charset=utf-8');return send(res,302,'','text/plain',{Location:oauthUrl(u.email)})}
  if(req.method==='GET'&&requestPath==='/api/gmail/callback'){const q=new URL(req.url||'/', 'http://orbit').searchParams,s=verifyState(q.get('state'));if(!s)return send(res,400,'Invalid or expired Gmail authorization.');if(q.get('error'))return send(res,400,'Gmail authorization cancelled.');try{const t=await googleToken({code:q.get('code')||'',client_id:GMAIL_CLIENT_ID,client_secret:GMAIL_CLIENT_SECRET,redirect_uri:GMAIL_REDIRECT_URI,grant_type:'authorization_code'});if(!t.refresh_token)throw new Error('Google did not return a refresh token. Reconnect and approve offline access.');gmailTokens.set(s.email,t);saveGmailTokens();return send(res,302,'','text/plain',{Location:'/?gmail=connected'})}catch(e){console.error(e);return send(res,500,'Gmail connection failed: '+e.message)}}
  if(req.method==='GET'&&requestPath==='/api/gmail/status'){const u=ownerOnly(req);if(!u)return send(res,401,JSON.stringify({connected:false}),'application/json');return send(res,200,JSON.stringify({configured:gmailConfigured(),connected:!!gmailTokens.get(u.email)?.refresh_token,email:u.email}),'application/json')}
  if(req.method==='GET'&&requestPath==='/api/gmail/search'){const u=ownerOnly(req);if(!u)return send(res,401,JSON.stringify({error:'Owner access required.'}),'application/json');try{const q=new URL(req.url||'/', 'http://orbit').searchParams.get('q')||'newer_than:30d',d=await gmailApi(u.email,'/threads?'+new URLSearchParams({q,maxResults:'30'}));const threads=[];for(const x of d.threads||[])threads.push(await gmailApi(u.email,'/threads/'+x.id+'?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date&metadataHeaders=Message-Id'));return send(res,200,JSON.stringify({threads}),'application/json')}catch(e){return send(res,502,JSON.stringify({error:e.message}),'application/json')}}
  if(req.method==='POST'&&requestPath==='/api/gmail/send'){const u=ownerOnly(req);if(!u)return send(res,401,JSON.stringify({error:'Owner access required.'}),'application/json');try{const b=await readBody(req),p=JSON.parse(b.get('payload')||'{}');if(!p.to||!p.subject||!p.body)return send(res,400,JSON.stringify({error:'to, subject and body are required.'}),'application/json');const d=await gmailApi(u.email,'/messages/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({raw:rawMail(p),...(p.threadId?{threadId:p.threadId}:{})})});return send(res,200,JSON.stringify({ok:true,messageId:d.id,threadId:d.threadId}),'application/json')}catch(e){return send(res,502,JSON.stringify({error:e.message}),'application/json')}}
  if(req.method==='POST'&&requestPath==='/api/gmail/disconnect'){const u=ownerOnly(req);if(!u)return send(res,401,JSON.stringify({error:'Owner access required.'}),'application/json');gmailTokens.delete(u.email);saveGmailTokens();return send(res,200,JSON.stringify({ok:true}),'application/json')}
  if (req.method === 'POST' && requestPath === '/api/logout') return send(res, 303, '', 'text/plain; charset=utf-8', { 'Location': '/', 'Set-Cookie': 'orbit_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' });
  if (!['GET','POST'].includes(req.method)) return send(res,405,'Method Not Allowed','text/plain; charset=utf-8',{Allow:'GET, POST'});

  if (requestPath === '/api/health') return send(res, 200, JSON.stringify({ status: 'ok', service: 'prism-orbit', version: '2026.09.23-gmail', uptime_seconds: Math.floor(process.uptime()), node: process.versions.node }), 'application/json; charset=utf-8');
  if (requestPath === '/api/session') {
    const session = readSession(req);
    return send(res, 200, JSON.stringify(session ? { authenticated: true, user: { email: session.email, name: session.name, role: session.role } } : { authenticated: false }), 'application/json; charset=utf-8');
  }
  if (requestPath === '/manifest.webmanifest') return sendFile(res, path.join(root, 'manifest.webmanifest'), 'application/manifest+json; charset=utf-8');
  if (requestPath === '/sw.js') return sendFile(res, path.join(root, 'sw.js'), 'application/javascript; charset=utf-8');
  if (requestPath === '/icon.svg') return sendFile(res, path.join(root, 'icon.svg'), 'image/svg+xml; charset=utf-8');
  if (requestPath === '/favicon.ico') return sendFile(res, path.join(root, 'favicon.ico'), 'image/x-icon');
  return serveIndex(req, res);
});

server.listen(port, '0.0.0.0', () => console.log('Prism Orbit listening on ' + port));
