import {NextResponse} from "next/server";
import {getSessionUser,isApprover,requireAdminDb} from "@/lib/outreach";
import {salesOutcomes,type SalesOutcome} from "@/lib/agent-training";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
export const dynamic="force-dynamic";

function stageForOutcome(outcome:SalesOutcome){
  if(outcome==="positive_reply")return "replied";
  if(outcome==="meeting_booked")return "meeting";
  if(outcome==="won")return "won";
  if(outcome==="lost")return "lost";
  return null;
}

export async function GET(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const db=await requireAdminDb();
    const [approvals,prospects,replies,jobs,evaluations,examples,outcomes]=await Promise.all([
      db.from("outreach_approvals").select("id,status,prospect_id,message_type,created_at").eq("organization_id",ORG_ID).limit(500),
      db.from("prospects").select("id,name,stage,score,metadata,updated_at").eq("organization_id",ORG_ID).limit(500),
      db.from("outreach_replies").select("id,prospect_id,classification,received_at").eq("organization_id",ORG_ID).limit(500),
      db.from("workflow_executions").select("id,status,input,output,created_at,completed_at").eq("organization_id",ORG_ID).eq("input->>kind","agent_home").order("created_at",{ascending:false}).limit(100),
      db.from("events").select("id,aggregate_id,payload,created_at").eq("organization_id",ORG_ID).eq("event_type","agent.evaluation.completed").order("created_at",{ascending:false}).limit(200),
      db.from("agent_training_examples").select("id,agent_id,lesson,outcome,quality_score,approved_for_reuse,created_at").eq("organization_id",ORG_ID).order("created_at",{ascending:false}).limit(100),
      db.from("sales_outcomes").select("id,prospect_id,job_id,outcome,note,recorded_by,occurred_at").eq("organization_id",ORG_ID).order("occurred_at",{ascending:false}).limit(100)
    ]);

    if(approvals.error)throw approvals.error;
    if(prospects.error)throw prospects.error;
    if(replies.error)throw replies.error;
    if(jobs.error)throw jobs.error;
    if(evaluations.error)throw evaluations.error;

    const prospectRows=prospects.data||[];
    const prospectById=new Map(prospectRows.map((p:any)=>[p.id,p]));
    const sent=(approvals.data||[]).filter((x:any)=>x.status==="sent");
    const sentInitial=sent.filter((x:any)=>(x.message_type||"initial")==="initial");
    const mismatched=sent.filter((x:any)=>{
      const stage=String(prospectById.get(x.prospect_id)?.stage||"");
      return !["contacted","replied","meeting","won","lost"].includes(stage);
    });

    const scores=(evaluations.data||[]).map((x:any)=>Number(x.payload?.score)).filter((x:number)=>Number.isFinite(x));
    const avgQuality=scores.length?Number((scores.reduce((a:number,b:number)=>a+b,0)/scores.length).toFixed(1)):0;
    const passed=(evaluations.data||[]).filter((x:any)=>x.payload?.pass===true).length;
    const replyCount=(replies.data||[]).length;
    const meetings=prospectRows.filter((p:any)=>p.stage==="meeting").length;
    const won=prospectRows.filter((p:any)=>p.stage==="won").length;
    const positiveOutcomes=(outcomes.data||[]).filter((x:any)=>["positive_reply","meeting_booked","proposal_sent","won"].includes(x.outcome)).length;

    const warnings:string[]=[];
    if(mismatched.length)warnings.push(String(mismatched.length)+" sent outreach records are linked to prospects whose stage was never advanced. Do not use stage labels as training truth until reconciled.");
    if(sentInitial.length>0&&replyCount===0)warnings.push("Outreach has sent messages but no replies are recorded. Improve reply reconciliation and message/target quality before increasing volume.");
    if(avgQuality&&avgQuality<75)warnings.push("Average agent quality is below the 75-point review target.");
    if(examples.error||outcomes.error)warnings.push("Training tables are not applied yet. Git contains the schema, but live learning storage is not active.");

    return NextResponse.json({
      ok:true,
      user,
      schema_ready:!examples.error&&!outcomes.error,
      metrics:{
        prospects:prospectRows.length,
        sent:sentInitial.length,
        replies:replyCount,
        reply_rate:sentInitial.length?Number(((replyCount/sentInitial.length)*100).toFixed(1)):0,
        meetings,
        won,
        agent_jobs:(jobs.data||[]).length,
        evaluated_outputs:scores.length,
        average_quality:avgQuality,
        quality_pass_rate:scores.length?Number(((passed/scores.length)*100).toFixed(1)):0,
        reusable_lessons:(examples.data||[]).filter((x:any)=>x.approved_for_reuse).length,
        confirmed_positive_outcomes:positiveOutcomes,
        stage_sync_warnings:mismatched.length
      },
      warnings,
      recent_jobs:(jobs.data||[]).slice(0,20),
      evaluations:(evaluations.data||[]).slice(0,30),
      training_examples:examples.error?[]:(examples.data||[]),
      outcomes:outcomes.error?[]:(outcomes.data||[])
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Training dashboard unavailable"},{status:503});
  }
}

export async function POST(req:Request){
  const user=getSessionUser(req);
  if(!user||!isApprover(user))return NextResponse.json({ok:false,error:"Founder approval required"},{status:403});
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");
  if(action!=="record_outcome")return NextResponse.json({ok:false,error:"Unknown action"},{status:400});

  const jobId=String(body.jobId||"");
  const prospectId=body.prospectId?String(body.prospectId):null;
  const outcome=String(body.outcome||"") as SalesOutcome;
  const note=typeof body.note==="string"?body.note.trim():"";
  const approvedForReuse=body.approvedForReuse===true;
  if(!/^[a-f0-9-]{36}$/i.test(jobId)||!salesOutcomes.includes(outcome)||note.length<5||note.length>1000){
    return NextResponse.json({ok:false,error:"Valid jobId, outcome and a 5-1000 character outcome note are required"},{status:400});
  }

  try{
    const db=await requireAdminDb();
    const job=await db.from("workflow_executions").select("id,input,output").eq("organization_id",ORG_ID).eq("id",jobId).single();
    if(job.error||job.data?.input?.kind!=="agent_home")return NextResponse.json({ok:false,error:"Agent job not found"},{status:404});

    const occurredAt=new Date().toISOString();
    const saved=await db.from("sales_outcomes").insert({
      organization_id:ORG_ID,
      prospect_id:prospectId,
      job_id:jobId,
      outcome,
      note,
      source:"founder_review",
      recorded_by:user.email,
      occurred_at:occurredAt
    }).select("id").single();
    if(saved.error){
      return NextResponse.json({ok:false,error:"Training schema is not active yet. Apply comit/supabase/agent-training.sql after review.",code:"TRAINING_SCHEMA_REQUIRED"},{status:503});
    }

    const agent=String(job.data.input.agent||"sales");
    const context=job.data.input.context&&typeof job.data.input.context==="object"?job.data.input.context:{};
    const quality=Number(job.data.output?.quality_evaluation?.score||job.data.output?.evaluation?.score||0);
    let lessonId:string|null=null;

    if(approvedForReuse){
      const business=typeof context.business==="string"?context.business.trim().toLowerCase().slice(0,120):null;
      const tags=[agent,outcome,typeof context.industry==="string"?context.industry.trim().toLowerCase():"",typeof context.stage==="string"?context.stage.trim().toLowerCase():""].filter(Boolean);
      const lesson=await db.from("agent_training_examples").insert({
        organization_id:ORG_ID,
        agent_id:agent,
        business_key:business,
        tags,
        input_context:context,
        lesson:note,
        outcome,
        quality_score:Math.max(0,Math.min(100,Math.round(quality))),
        approved_for_reuse:true,
        approved_by:user.email,
        source_job_id:jobId,
        source_prospect_id:prospectId
      }).select("id").single();
      if(lesson.error)throw lesson.error;
      lessonId=lesson.data.id;
    }

    const nextStage=stageForOutcome(outcome);
    if(nextStage&&prospectId){
      await db.from("prospects").update({stage:nextStage,updated_at:occurredAt}).eq("organization_id",ORG_ID).eq("id",prospectId);
    }

    await db.from("events").insert({
      organization_id:ORG_ID,
      event_type:"sales.outcome.recorded",
      aggregate_type:"agent_job",
      aggregate_id:jobId,
      payload:{outcome,note,prospect_id:prospectId,recorded_by:user.email,approved_for_reuse:approvedForReuse,training_example_id:lessonId}
    });

    return NextResponse.json({ok:true,outcome_id:saved.data.id,training_example_id:lessonId,prospect_stage:nextStage});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Could not record training outcome"},{status:503});
  }
}
