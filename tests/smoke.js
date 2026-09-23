const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');

const port=8787;
const env={...process.env,PORT:String(port),ORBIT_SESSION_SECRET:'test-secret',ORBIT_AMAL_PASSWORD_SHA256:'test',ORBIT_AADIL_PASSWORD_SHA256:'test',ORBIT_ANEESH_PASSWORD_SHA256:'test'};
const child=spawn(process.execPath,[path.join(__dirname,'..','server.js')],{env,stdio:['ignore','pipe','pipe']});
let output='';
child.stdout.on('data',d=>output+=d);
child.stderr.on('data',d=>output+=d);

function request(p,headers={}){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:p,headers},res=>{let body='';res.on('data',d=>body+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end();});}
(async()=>{
 try{
  for(let i=0;i<30;i++){try{const r=await request('/api/health');if(r.status===200)break}catch{} await new Promise(r=>setTimeout(r,100));}
  const health=await request('/api/health');
  assert.equal(health.status,200,'health endpoint must return 200');
  const h=JSON.parse(health.body); assert.equal(h.status,'ok'); assert.equal(h.service,'prism-orbit');
  const session=await request('/api/session'); assert.equal(session.status,200); assert.equal(JSON.parse(session.body).authenticated,false);
  const knowledge=await request('/api/knowledge'); assert.equal(knowledge.status,401,'knowledge must require auth');
  const html=await request('/'); assert.equal(html.status,200); assert.match(html.body,/Command Center/);
  console.log('Orbit smoke tests passed');
 }catch(e){console.error('Orbit smoke test failed:',e.message);console.error(output);process.exitCode=1}
 finally{child.kill('SIGTERM')}
})().catch(e=>{console.error(e);child.kill('SIGTERM');process.exitCode=1});