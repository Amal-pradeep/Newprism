export type ModelDraftResult={
  provider:"ollama"|"n8n";
  answer:string;
  model?:string;
};

function isLocalHost(url:string){
  try{
    const u=new URL(url);
    return ["localhost","127.0.0.1","::1"].includes(u.hostname);
  }catch{return false}
}

function cleanText(value:unknown,limit:number){
  return typeof value==="string"?value.trim().slice(0,limit):"";
}

export function compactModelContext(raw:Record<string,unknown>={}){
  const allow=[
    "business","industry","location","stage","score","fit_reason","trigger","evidence",
    "decision_maker_known","budget_signal","proof_available","previous_outcome",
    "missionStepTitle","missionSuccess","missionRisk","missionSkill"
  ];
  const compact:Record<string,unknown>={};
  for(const key of allow){
    const value=raw[key];
    if(value===undefined||value===null||value==="")continue;
    if(typeof value==="string")compact[key]=value.slice(0,1200);
    else if(Array.isArray(value))compact[key]=value.slice(0,8).map(v=>typeof v==="string"?v.slice(0,400):v);
    else if(typeof value==="object")compact[key]=JSON.parse(JSON.stringify(value).slice(0,4000));
    else compact[key]=value;
  }
  return compact;
}

async function n8nDraft(payload:Record<string,unknown>):Promise<ModelDraftResult|null>{
  const webhook=process.env.N8N_AGENT_WEBHOOK_URL;
  const secret=process.env.N8N_AGENT_SHARED_SECRET;
  if(!webhook||!secret)return null;
  try{
    const response=await fetch(webhook,{
      method:"POST",
      headers:{"Content-Type":"application/json","X-COMIT-Agent-Secret":secret},
      body:JSON.stringify({...payload,external_tools_allowed:false}),
      signal:AbortSignal.timeout(8000),
      cache:"no-store"
    });
    if(!response.ok)return null;
    const data=await response.json();
    const answer=cleanText(data?.answer,4000);
    return data?.ok===true&&answer?{provider:"n8n",answer}:null;
  }catch{return null}
}

async function ollamaDraft(payload:Record<string,unknown>):Promise<ModelDraftResult|null>{
  const base=(process.env.COMIT_OLLAMA_URL||"").replace(/\/+$/,"");
  const model=cleanText(process.env.COMIT_OLLAMA_MODEL,120);
  if(!base||!model)return null;
  const allowPrivate=process.env.COMIT_ALLOW_PRIVATE_MODEL_HOST==="true";
  if(!isLocalHost(base)&&!allowPrivate)return null;
  try{
    const response=await fetch(base+"/api/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model,
        stream:false,
        format:{
          type:"object",
          properties:{answer:{type:"string"}},
          required:["answer"]
        },
        messages:[
          {role:"system",content:String(payload.system||"")},
          {role:"user",content:JSON.stringify({
            agent:payload.agent,
            task:payload.task,
            context:payload.context,
            knowledge:payload.knowledge,
            approved_lessons:payload.approved_lessons,
            instruction:payload.instruction
          })}
        ],
        options:{temperature:0.2}
      }),
      signal:AbortSignal.timeout(12000),
      cache:"no-store"
    });
    if(!response.ok)return null;
    const data=await response.json();
    const parsed=typeof data?.message?.content==="string"?JSON.parse(data.message.content):null;
    const answer=cleanText(parsed?.answer,4000);
    return answer?{provider:"ollama",answer,model}:null;
  }catch{return null}
}

export async function optionalModelDraft(payload:Record<string,unknown>):Promise<ModelDraftResult|null>{
  const preference=cleanText(process.env.COMIT_MODEL_PROVIDER,20).toLowerCase();
  if(preference==="ollama")return ollamaDraft(payload);
  if(preference==="n8n")return n8nDraft(payload);

  const local=await ollamaDraft(payload);
  if(local)return local;
  return n8nDraft(payload);
}
