const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(file,stubs={}){
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',compiled)(name=>name in stubs?stubs[name]:require(name),module,module.exports);
  return module.exports;
}
const {encodeMail}=load('lib/mail-message.ts');
test('message contains actual founder CC and Unicode subject',()=>{
  const raw=Buffer.from(encodeMail({to:'hello@example.com',cc:['amal@example.com','aadil@example.com'],subject:'A growth idea · café',body:'Reviewed body'},'info@example.com','reply@example.com'),'base64url').toString();
  assert.match(raw,/Cc: amal@example.com, aadil@example.com\r\n/);
  const encoded=raw.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1];
  assert.equal(Buffer.from(encoded,'base64').toString(),'A growth idea · café');
  assert.match(raw,/\r\n\r\nReviewed body$/);
});
test('header injection is rejected',()=>{
  assert.throws(()=>encodeMail({to:'hello@example.com',subject:'Hello\r\nBcc: other@example.com',body:'Body'},'info@example.com','info@example.com'),/new lines/);
});
function fakeDb(resolve){
  return {from(table){let operation='select',values,options,filters=[];const query={};
    for(const method of ['select','update','insert','upsert','eq','in','or','not','neq','gte','lte','lt','gt','order','limit','single','maybeSingle'])query[method]=(...args)=>{
      if(['update','insert','upsert'].includes(method)){operation=method;values=args[0];}
      if(method==='select')options=args[1];
      if(['eq','in','gte','lte','lt','gt','or','not','neq'].includes(method))filters.push([method,...args]);
      return query;
    };
    query.then=(success,failure)=>Promise.resolve().then(()=>resolve({table,operation,values,options,filters})).then(success,failure);
    return query;
  }};
}
const approval={id:'approval-1',organization_id:'acda1757-1698-405a-8451-5674316ceeaf',prospect_id:'prospect-1',status:'pending',to_email:'hello@example.com',subject:'Reviewed subject',body:'Reviewed body',message_type:'initial'};
function senderRoute(db,onSend){return load('app/api/outreach/route.ts',{
  '@/lib/outreach':{getSessionUser:async()=>({email:'amal@example.com'}),isApprover:()=>true,requireAdminDb:async()=>db,sendApprovedEmail:onSend,AMAL_EMAIL:'amal@example.com',AADIL_EMAIL:'aadil@example.com'},
  '@/lib/sales-engine':{},'@/lib/agent-evaluation':{}
});}
function approve(){return new Request('http://localhost/api/outreach',{method:'POST',body:JSON.stringify({action:'approve',approvalId:'approval-1'})});}
test('missing Gmail configuration leaves draft pending',async()=>{
  const saved=process.env.GOOGLE_CLIENT_ID;delete process.env.GOOGLE_CLIENT_ID;let mutations=0;
  const db=fakeDb(query=>{if(query.operation!=='select')mutations++;return {data:{...approval},error:null};});
  const route=senderRoute(db,async()=>{throw new Error('must not send');});
  try{const response=await route.POST(approve());assert.equal(response.status,503);assert.equal(mutations,0);}finally{if(saved)process.env.GOOGLE_CLIENT_ID=saved;}
});
test('atomic claim allows only one concurrent approval to send',async()=>{
  process.env.GOOGLE_CLIENT_ID='fixture';process.env.GOOGLE_CLIENT_SECRET='fixture';process.env.ORBIT_GMAIL_REFRESH_TOKEN='fixture';
  let claimed=false,sends=0;
  const db=fakeDb(query=>{
    if(query.table==='outreach_approvals'&&query.operation==='select')return {data:{...approval},error:null};
    if(query.values?.status==='approved'){const data=claimed?null:{id:approval.id};claimed=true;return {data,error:null};}
    return {data:{id:'row'},error:null};
  });
  const route=senderRoute(db,async()=>{sends++;return {id:'gmail-1',threadId:'thread-1'};});
  const responses=await Promise.all([route.POST(approve()),route.POST(approve())]);
  assert.equal(sends,1);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
});
test('accepted email is not marked failed when follow-up persistence fails',async()=>{
  const statuses=[];
  const db=fakeDb(query=>{
    if(query.values?.status)statuses.push(query.values.status);
    if(query.table==='outreach_approvals'&&query.operation==='select')return {data:{...approval},error:null};
    if(query.table==='outreach_followups'&&query.operation==='upsert')return {error:{message:'Database unavailable'}};
    return {data:{id:'row'},error:null};
  });
  const route=senderRoute(db,async()=>({id:'gmail-accepted'}));
  const response=await route.POST(approve());const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.status,'sent');assert.equal(body.gmailMessageId,'gmail-accepted');assert.ok(body.warning);assert.ok(!statuses.includes('failed'));
});
test('dashboard totals include records beyond the visible queue limit',async()=>{
  const db=fakeDb(query=>query.options?.head?{count:152,error:null}:{data:[],error:null});
  const route=load('app/api/outreach/dashboard/route.ts',{
    '@/lib/outreach':{getSessionUser:async()=>({email:'amal@example.com'}),isApprover:()=>true,requireAdminDb:async()=>db,SENDER_EMAIL:'info@example.com'},
    '@/lib/sales-engine':{},'@/lib/agent-evaluation':{}
  });
  const response=await route.GET(new Request('http://localhost/api/outreach/dashboard'));
  const body=await response.json();assert.equal(response.status,200);assert.equal(body.metrics.pendingFollowups,152);assert.equal(body.metrics.pendingCount,152);assert.equal(body.followups.length,0);assert.equal(body.dayTimezone,'Asia/Kolkata');
});
test('a prepared follow-up cannot be sent after the prospect replies',async()=>{
  let sends=0;
  const db=fakeDb(query=>{
    if(query.table==='prospects')return {data:{stage:'replied',metadata:{}},error:null};
    return {data:{...approval,message_type:'followup'},error:null};
  });
  const route=senderRoute(db,async()=>{sends++;return {id:'should-not-send'};});
  const response=await route.POST(approve());assert.equal(response.status,409);assert.equal(sends,0);
});
test('all COMIT buttons have a handler or submit an owning form',()=>{
  const path=require('node:path');let buttons=0;
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,item.name);if(item.isDirectory()){walk(file);continue;}if(!file.endsWith('.tsx'))continue;
    const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    function visit(node){
      if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==='button'){
        buttons++;const props=node.openingElement.attributes.properties;
        const click=props.some(p=>p.name?.getText(source)==='onClick');
        const type=props.find(p=>p.name?.getText(source)==='type')?.initializer?.text;
        let parent=node.parent,inForm=false;while(parent){if(ts.isJsxElement(parent)&&parent.openingElement.tagName.getText(source)==='form'){inForm=true;break;}parent=parent.parent;}
        assert.ok(click||(inForm&&type!=='button'),`Inert button in ${file}:${source.getLineAndCharacterOfPosition(node.pos).line+1}`);
      }
      ts.forEachChild(node,visit);
    }visit(source);
  }}walk('app');walk('components');assert.ok(buttons>=100);
});
