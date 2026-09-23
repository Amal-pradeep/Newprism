const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    return {
      allowed: false,
      retryAfter: Math.ceil((LOGIN_WINDOW_MS - (now - existing.firstAttempt)) / 1000)
    };
  }
  return { allowed: true, retryAfter: 0 };
}

function recordLoginFailure(email) {
  const key = loginKey(email);
  const now = Date.now();
  const existing = loginAttempts.get(key);
  if (!existing || now - existing.firstAttempt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { firstAttempt: now, attempts: 1 });
  } else {
    existing.attempts += 1;
  }
}

function clearLoginFailures(email) {
  loginAttempts.delete(loginKey(email));
}

function serveIndex(req, res) {
  try {
    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const outreachScript = fs.readFileSync(path.join(root, 'outreach.js'), 'utf8');
    html = html.replace('</body>', '<script>' + outreachScript.replace(/<\\/script/gi, '<\\\\/script') + '</script></body>');
    const session = readSession(req);
    if (session) {
      const safe = JSON.stringify({
        email: session.email,
        name: session.name,
        role: session.role
      }).replace(/</g, '\\u003c');
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
      if (!limit.allowed) {
        return send(
          res,
          429,
          JSON.stringify({ authenticated: false, error: 'Too many login attempts. Try again later.' }),
          'application/json; charset=utf-8',
          { 'Retry-After': String(limit.retryAfter) }
        );
      }

      const account = USERS[email];
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      if (!account || !account.hash || passwordHash !== account.hash) {
        recordLoginFailure(email);
        if ((req.headers.accept || '').includes('application/json')) {
          return send(res, 401, JSON.stringify({ authenticated: false }), 'application/json; charset=utf-8');
        }
        return send(res, 401, 'Invalid Orbit credentials. Please go back and try again.');
      }

      clearLoginFailures(email);
      const token = createSession(email);
      const cookie = 'orbit_session=' + encodeURIComponent(token) + '; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax';
      if ((req.headers.accept || '').includes('application/json')) {
        return send(res, 200, JSON.stringify({ authenticated: true }), 'application/json; charset=utf-8', { 'Set-Cookie': cookie });
      }
      return send(res, 303, '', 'text/plain; charset=utf-8', {
        'Location': '/',
        'Set-Cookie': cookie
      });
    } catch (error) {
      console.error('login error', error);
      return send(res, 400, 'Orbit login request could not be processed.');
    }
  }

  if (req.method === 'POST' && requestPath === '/api/logout') {
    return send(res, 303, '', 'text/plain; charset=utf-8', {
      'Location': '/',
      'Set-Cookie': 'orbit_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
    });
  }

  if (req.method !== 'GET') {
    return send(res, 405, 'Method Not Allowed', 'text/plain; charset=utf-8', { 'Allow': 'GET' });
  }

  if (requestPath === '/api/health') {
    return send(res, 200, JSON.stringify({
      status: 'ok',
      service: 'prism-orbit',
      version: '2026.09.23-hardening',
      uptime_seconds: Math.floor(process.uptime()),
      node: process.versions.node
    }), 'application/json; charset=utf-8');
  }

  if (requestPath === '/api/session') {
    const session = readSession(req);
    return send(res, 200, JSON.stringify(session ? {
      authenticated: true,
      user: { email: session.email, name: session.name, role: session.role }
    } : { authenticated: false }), 'application/json; charset=utf-8');
  }

  if (requestPath === '/manifest.webmanifest') {
    return sendFile(res, path.join(root, 'manifest.webmanifest'), 'application/manifest+json; charset=utf-8');
  }
  if (requestPath === '/sw.js') {
    return sendFile(res, path.join(root, 'sw.js'), 'application/javascript; charset=utf-8');
  }
  if (requestPath === '/icon.svg') {
    return sendFile(res, path.join(root, 'icon.svg'), 'image/svg+xml; charset=utf-8');
  }
  if (requestPath === '/favicon.ico') {
    return sendFile(res, path.join(root, 'favicon.ico'), 'image/x-icon');
  }

  return serveIndex(req, res);
});

server.listen(port, '0.0.0.0', () => {
  console.log('Prism Orbit listening on ' + port);
});
