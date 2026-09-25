import {NextResponse} from "next/server";
import {randomUUID} from "crypto";
import {getSessionUser,isApprover,requireAdminDb} from "@/lib/outreach";
import {agentSpecs,toolRegistry,routeAgent,draftForAgent,type AgentId} from "@/lib/agent-home";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
export const dynamic="force-dynamic";

async function logEvent(db:Awaited<ReturnType<typeof requireAdminDb>>,jobId:string,event_type:string,payload:Record<string,unknown>){
 const {error}=await db.from("events").insert({organization_id:ORG_ID,event_type,aggregate_type:"agent_job",aggregate_id:jobId,payload});
 if(error)throw error;
}

export async function GET(req:Request){
 const user=getSessionUser(req);if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 try{
  const db=await requireAdminDb();
  let query=db.from("workflow_executions").select("id,status,input,output,created_at,completed_at,error").eq("organization_id",ORG_ID).eq("input->>kind","agent_home");
  if(!isApprover(user))query=query.eq("input->>requested_by",user.email);
  const {data:jobs,error}=await query.order("created_at",{ascending:false}).limit(30);
  if(error)throw error;
  const ids=(jobs||[]).map(x=>x.id);
  let messages:unknown[]=[];
  if(ids.length){const response=await db.from("events").select("id,event_type,aggregate_id,payload,created_at").eq("organization_id",ORG_ID).eq("aggregate_type","agent_job").in("aggregate_id",ids).order("created_at",{ascending:false}).limit(100);if(response.error)throw response.error;messages=response.data||[]}
  return NextResponse.json({ok:true,agents:agentSpecs,tools:toolRegistry,jobs:jobs||[],messages,mode:"draft-and-review"});
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||"Agent Home unavailable"},{status:503})}
}

export async function POST(req:Request){
 const user=getSessionUser(req);if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const body=await req.json().catch(()=>({}));
 const action=String(body.action||"create");
 try{
  const db=await requireAdminDb();
  if(action==="create"){
   const task=typeof body.task==="string"?body.task.trim():"";
   if(!task||task.length>2000)return NextResponse.json({ok:false,error:"Task must contain 1–2000 characters"},{status:400});
   const context=body.context&&typeof body.context==="object"&&!Array.isArray(body.context)?body.context:{};
   if(JSON.stringify(context).length>4000)return NextResponse.json({ok:false,error:"Context is too large"},{status:400});
   const requested=String(body.agentId||"");
   const agent:AgentId=agentSpecs.some(x=>x.id===requested)?requested as AgentId:routeAgent(task);
   const rawKey=req.headers.get("x-idempotency-key");
   if(rawKey&&!/^[a-zA-Z0-9_-]{8,100}$/.test(rawKey))return NextResponse.json({ok:false,error:"Invalid idempotency key"},{status:400});
   const key=rawKey||randomUUID();
   const input={kind:"agent_home",task,context,agent,requested_by:user.email};
   const {data:job,error}=await db.from("workflow_executions").insert({organization_id:ORG_ID,idempotency_key:key,status:"queued",input}).select("id,status,input,created_at").single();
   if(error){if(error.code==="23505"){const existing=await db.from("workflow_executions").select("id,status,input,created_at").eq("organization_id",ORG_ID).eq("idempotency_key",key).single();if(existing.data?.input?.kind==="agent_home"&&existing.data.input.requested_by===user.email)return NextResponse.json({ok:true,job:existing.data,idempotent:true});}throw error}
   await logEvent(db,job.id,"agent.task.created",{agent,requested_by:user.email,summary:task.slice(0,200)});
   return NextResponse.json({ok:true,job,mode:"queued-for-draft"},{status:201});
  }
  const jobId=String(body.jobId||"");
  if(!/^[a-f0-9-]{36}$/i.test(jobId))return NextResponse.json({ok:false,error:"Valid jobId required"},{status:400});
  const {data:job,error}=await db.from("workflow_executions").select("id,status,input,output").eq("organization_id",ORG_ID).eq("id",jobId).single();
  if(error||job?.input?.kind!=="agent_home")return NextResponse.json({ok:false,error:"Agent task not found"},{status:404});
  if(!isApprover(user)&&job.input.requested_by!==user.email)return NextResponse.json({ok:false,error:"Agent task not found"},{status:404});
  if(action==="run"){
   if(job.status!=="queued")return NextResponse.json({ok:false,error:"Only queued tasks can be drafted"},{status:409});
   const output=draftForAgent(job.input.agent,job.input.task,job.input.context);
   const updated=await db.from("workflow_executions").update({status:"awaiting_approval",output}).eq("organization_id",ORG_ID).eq("id",jobId).eq("status","queued").select("id,status,output").single();
   if(updated.error||!updated.data)return NextResponse.json({ok:false,error:"Task was already claimed"},{status:409});
   await logEvent(db,jobId,"agent.draft.ready",{agent:output.agent,owner:output.owner,requested_by:user.email,handoff:output.handoff});
   return NextResponse.json({ok:true,job:updated.data});
  }
  if(action==="approve"||action==="reject"){
   if(!isApprover(user))return NextResponse.json({ok:false,error:"Founder approval required"},{status:403});
   if(job.status!=="awaiting_approval")return NextResponse.json({ok:false,error:"Task is not awaiting review"},{status:409});
   const decision={...job.output,review:{decision:action,by:user.email,at:new Date().toISOString()},external_action_taken:false};
   const updated=await db.from("workflow_executions").update({status:action==="approve"?"completed":"failed",output:decision,completed_at:new Date().toISOString()}).eq("organization_id",ORG_ID).eq("id",jobId).eq("status","awaiting_approval").select("id,status,output").single();
   if(updated.error||!updated.data)return NextResponse.json({ok:false,error:"Task review already changed"},{status:409});
   await logEvent(db,jobId,action==="approve"?"agent.draft.approved":"agent.draft.rejected",{by:user.email,agent:job.input.agent});
   return NextResponse.json({ok:true,job:updated.data,external_action_taken:false});
  }
  if(action==="feedback"){
   const note=typeof body.note==="string"?body.note.trim():"";
   if(note.length<5||note.length>1000)return NextResponse.json({ok:false,error:"Feedback must contain 5–1000 characters"},{status:400});
   await logEvent(db,jobId,"agent.feedback.recorded",{by:user.email,note,review_required:true});
   return NextResponse.json({ok:true,recorded:true,knowledge_updated:false});
  }
  return NextResponse.json({ok:false,error:"Unknown action"},{status:400});
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||"Agent action failed"},{status:503})}
}
