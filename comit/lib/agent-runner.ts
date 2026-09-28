import {agentSpecs,draftForAgent,type AgentId} from "./agent-home";
import {COMIT_SYSTEM_PROMPT} from "./ai-system";
import {retrieveKnowledge} from "./knowledge";
import {requireAdminDb} from "./outreach";
import {evaluateSalesArtifact} from "./agent-evaluation";
import {compactModelContext,optionalModelDraft as runOptionalModelDraft} from "./model-adapters";
import {buildAgentContextEnvelope} from "./agent-context";

export const AGENT_ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
type Db=Awaited<ReturnType<typeof requireAdminDb>>;

export async function agentEvent(db:Db,jobId:string,event_type:string,payload:Record<string,unknown>){
 const {error}=await db.from("events").insert({organization_id:AGENT_ORG_ID,event_type,aggregate_type:"agent_job",aggregate_id:jobId,payload});
 if(error)throw error;
}

async function optionalModelDraft(agent:AgentId,task:string,context:Record<string,unknown>,lessons:string[]){
 const compact=compactModelContext(context);
 const knowledge=retrieveKnowledge(task).slice(0,6);
 const contextEnvelope=buildAgentContextEnvelope(compact,knowledge,lessons);
 const skill=(compact as any).missionSkill;
 const skillGuidance=skill&&typeof skill==="object"&&Array.isArray(skill.instructions)
  ? " Follow mission skill instructions: "+skill.instructions.slice(0,6).join(" | ")
  : "";
 return runOptionalModelDraft({
  system:COMIT_SYSTEM_PROMPT,
  agent,
  task,
  context:compact,
  context_envelope:contextEnvelope,
  knowledge,
  approved_lessons:lessons.slice(0,6),
  mode:"draft-only",
  instruction:"Use only supplied facts. Prefer a specific low-risk next step. Never guarantee results. Do not invent tool results."+skillGuidance
 });
}

async function reusableLessons(db:Db,agent:AgentId,context:Record<string,unknown>){
 const lessons:string[]=[];
 const business=typeof context.business==="string"?context.business.trim().toLowerCase().slice(0,120):"";
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
   .select("lesson,quality_score,outcome,business_key,tags,created_at")
   .eq("organization_id",AGENT_ORG_ID)
   .eq("agent_id",agent)
   .eq("approved_for_reuse",true)
   .order("quality_score",{ascending:false})
   .order("created_at",{ascending:false})
   .limit(20);
  if(!trained.error){
   const relevantTokens=new Set([
    String(context.industry||"").toLowerCase(),
    String(context.stage||"").toLowerCase(),
    String(context.location||"").toLowerCase()
   ].flatMap(v=>v.split(/[^a-z0-9]+/)).filter(v=>v.length>2));
   const ranked=(trained.data||[]).map((row:any)=>{
    let relevance=Number(row.quality_score||0)/100;
    if(business&&String(row.business_key||"")===business)relevance+=6;
    for(const tag of Array.isArray(row.tags)?row.tags:[])if(relevantTokens.has(String(tag).toLowerCase()))relevance+=2;
    if(["won","meeting_booked","proposal_sent","positive_reply"].includes(String(row.outcome)))relevance+=1.5;
    if(["lost","negative_reply","delivery_failed"].includes(String(row.outcome)))relevance+=0.5;
    return {row,relevance};
   }).sort((a:any,b:any)=>b.relevance-a.relevance).slice(0,4);
   lessons.push(...ranked.map((x:any)=>String(x.row.lesson||"").slice(0,300)).filter(Boolean));
  }
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
  const lessons=await reusableLessons(db,agent,context);
  const output=draftForAgent(agent,String(job.input.task||""),context,lessons);
  const modelResult=await optionalModelDraft(agent,String(job.input.task||""),{...context,approved_lessons:lessons},lessons);
  const modelDraft=modelResult?.answer||null;

  const deterministicEvaluation=(output as any).evaluation||evaluateSalesArtifact(String((output as any).artifact?.body||""),context);
  const textDraftAgent=agent==="outreach"||agent==="followup"||agent==="sales";
  const modelEvaluation=modelDraft&&textDraftAgent?evaluateSalesArtifact(modelDraft,context):null;
  const useModel=Boolean(modelDraft&&modelEvaluation&&modelEvaluation.score>=deterministicEvaluation.score&&modelEvaluation.pass);
  const final={
   ...output,
   model_draft:modelDraft,
   context_policy:buildAgentContextEnvelope(context,retrieveKnowledge(String(job.input.task||"")).slice(0,6),lessons),
   model_evaluation:modelEvaluation,
   recommended_draft:useModel?modelDraft:(output as any).artifact?.body||"",
   quality_evaluation:useModel?modelEvaluation:deterministicEvaluation,
   quality_gate:(useModel?modelEvaluation?.pass:deterministicEvaluation.pass)?"pass":"revise",
   model_mode:modelResult?modelResult.provider+(modelResult.model?":"+modelResult.model:""):"rules-based",
   external_action_taken:false
  };

  const {error}=await db.from("workflow_executions").update({status:"awaiting_approval",output:final})
   .eq("organization_id",AGENT_ORG_ID).eq("id",job.id).eq("status","processing");
  if(error)throw error;

  try{
   try{
    const evaluation=final.quality_evaluation as any;
    await db.from("agent_evaluations").insert({organization_id:AGENT_ORG_ID,job_id:job.id,agent_id:agent,score:Number(evaluation?.score||0),grade:String(evaluation?.grade||"D"),passed:Boolean(evaluation?.pass),dimensions:evaluation?.dimensions||[],risks:evaluation?.risks||[],revision:evaluation?.revision||[]});
   }catch{}
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
