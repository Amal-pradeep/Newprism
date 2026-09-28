import {agentSpecs,draftForAgent,type AgentId} from "./agent-home";
import {COMIT_SYSTEM_PROMPT} from "./ai-system";
import {retrieveKnowledge} from "./knowledge";
import {requireAdminDb} from "./outreach";
import {evaluateSalesArtifact} from "./agent-evaluation";

export const AGENT_ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
type Db=Awaited<ReturnType<typeof requireAdminDb>>;

export async function agentEvent(db:Db,jobId:string,event_type:string,payload:Record<string,unknown>){
 const {error}=await db.from("events").insert({organization_id:AGENT_ORG_ID,event_type,aggregate_type:"agent_job",aggregate_id:jobId,payload});
 if(error)throw error;
}

async function optionalModelDraft(agent:AgentId,task:string,context:Record<string,unknown>,lessons:string[]){
 const webhook=process.env.N8N_AGENT_WEBHOOK_URL,secret=process.env.N8N_AGENT_SHARED_SECRET;
 if(!webhook||!secret)return null;
 try{
  const response=await fetch(webhook,{
   method:"POST",
   headers:{"Content-Type":"application/json","X-COMIT-Agent-Secret":secret},
   body:JSON.stringify({
    system:COMIT_SYSTEM_PROMPT,
    agent,task,context,knowledge:retrieveKnowledge(task),
    approved_lessons:lessons,
    mode:"draft-only",
    external_tools_allowed:false,
    instruction:"Use only supplied facts. Prefer a specific low-risk next step. Never guarantee results."
   }),
   signal:AbortSignal.timeout(8000),cache:"no-store"
  });
  if(!response.ok)return null;
  const data=await response.json();
  if(data?.ok!==true||typeof data.answer!=="string"||!data.answer.trim()||data.answer.length>4000)return null;
  return data.answer.trim();
 }catch{return null}
}

async function reusableLessons(db:Db,agent:AgentId,business:string){
 const lessons:string[]=[];
 if(business){
  const lookup=await db.from("events").select("payload")
   .eq("organization_id",AGENT_ORG_ID)
   .eq("event_type","agent.feedback.reviewed")
   .eq("payload->>agent",agent)
   .eq("payload->>business",business)
   .eq("payload->>approved_for_reuse","true")
   .order("created_at",{ascending:false}).limit(3);
  if(!lookup.error)lessons.push(...(lookup.data||[]).map(x=>String(x.payload?.note||"").slice(0,300)).filter(Boolean));
 }
 try{
  const trained=await db.from("agent_training_examples")
   .select("lesson,quality_score,outcome")
   .eq("organization_id",AGENT_ORG_ID)
   .eq("agent_id",agent)
   .eq("approved_for_reuse",true)
   .order("quality_score",{ascending:false})
   .order("created_at",{ascending:false})
   .limit(4);
  if(!trained.error)lessons.push(...(trained.data||[]).map(x=>String(x.lesson||"").slice(0,300)).filter(Boolean));
 }catch{}
 return [...new Set(lessons)].slice(0,6);
}

export async function processAgentJob(db:Db,job:{id:string;status:string;input:any}){
 if(job.status!=="queued"||job.input?.kind!=="agent_home"||!agentSpecs.some(x=>x.id===job.input.agent))return {ok:false,reason:"not-queued-agent-job"};
 const claimed=await db.from("workflow_executions").update({status:"processing",started_at:new Date().toISOString()})
  .eq("organization_id",AGENT_ORG_ID).eq("id",job.id).eq("status","queued").select("id").maybeSingle();
 if(claimed.error)throw claimed.error;
 if(!claimed.data)return {ok:false,reason:"already-claimed"};

 try{
  const agent=job.input.agent as AgentId;
  const context=job.input.context||{};
  const business=typeof context.business==="string"?context.business.trim().toLowerCase().slice(0,120):"";
  const lessons=await reusableLessons(db,agent,business);
  const output=draftForAgent(agent,String(job.input.task||""),context,lessons);
  const modelDraft=await optionalModelDraft(agent,String(job.input.task||""),{...context,approved_lessons:lessons},lessons);

  const deterministicEvaluation=(output as any).evaluation||evaluateSalesArtifact(String((output as any).artifact?.body||""),context);
  const modelEvaluation=modelDraft?evaluateSalesArtifact(modelDraft,context):null;
  const useModel=Boolean(modelDraft&&modelEvaluation&&modelEvaluation.score>=deterministicEvaluation.score&&modelEvaluation.pass);
  const final={
   ...output,
   model_draft:modelDraft,
   model_evaluation:modelEvaluation,
   recommended_draft:useModel?modelDraft:(output as any).artifact?.body||"",
   quality_evaluation:useModel?modelEvaluation:deterministicEvaluation,
   quality_gate:(useModel?modelEvaluation?.pass:deterministicEvaluation.pass)?"pass":"revise",
   model_mode:modelDraft?"connected-n8n-draft":"rules-based",
   external_action_taken:false
  };

  const {error}=await db.from("workflow_executions").update({status:"awaiting_approval",output:final})
   .eq("organization_id",AGENT_ORG_ID).eq("id",job.id).eq("status","processing");
  if(error)throw error;

  try{
   await agentEvent(db,job.id,"agent.evaluation.completed",{
    agent,score:(final.quality_evaluation as any)?.score||0,
    grade:(final.quality_evaluation as any)?.grade||"D",
    pass:Boolean((final.quality_evaluation as any)?.pass),
    model_mode:final.model_mode
   });
   await agentEvent(db,job.id,"agent.draft.ready",{agent,owner:(output as any).owner,model_mode:final.model_mode,handoff:(output as any).handoff||null,quality_gate:final.quality_gate});
  }catch{
   return {ok:true,jobId:job.id,mode:final.model_mode,audit_warning:"Draft saved; one or more event-log writes failed"};
  }
  return {ok:true,jobId:job.id,mode:final.model_mode,quality_gate:final.quality_gate};
 }catch(error){
  const message=error instanceof Error?error.message:"Agent processing failed";
  await db.from("workflow_executions").update({status:"failed",error:message.slice(0,500),completed_at:new Date().toISOString()})
   .eq("organization_id",AGENT_ORG_ID).eq("id",job.id).eq("status","processing");
  return {ok:false,jobId:job.id,reason:"processing-failed"};
 }
}
