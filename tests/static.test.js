const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

for(const file of ['outreach.js','automation.js','monitoring.js','orbit-ux.js','orbit-v2.js']){
 test('syntax: '+file,()=>{const src=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotThrow(()=>new Function(src));});
}

test('syntax: index inline scripts',()=>{
 const src=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...src.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
 assert.ok(scripts.length>0);
 for(const js of scripts)assert.doesNotThrow(()=>new Function(js));
});

test('knowledge base is valid JSON',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'orbit-knowledge.json'),'utf8'));
 assert.equal(data.product.name,'Prism Orbit');
 assert.ok(Array.isArray(data.sales.segments));
});