import {NextResponse} from "next/server";
import {randomUUID} from "crypto";
import {getSessionUser,isApprover,requireAdminDb} from "@/lib/outreach";
import {buildSuperMission,missionProgress} from "@/lib/super-agent";
import {capabilitySummary} from "@/lib/free-capabilities";
import {skillSummary} from "@/lib/agent-skills";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
export const dynamic="force-dynamic";

export async function GET(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const db=await requireAdminDb();
    let query=db.from("workflow_executions")
      .select("id,status,input,output,created_at,completed_at,error")
      .eq("organization_id",ORG_ID)
      .eq("input->>kind","super_agent_mission");
    if(!isApprover(user))query=query.eq("input->>requested_by",user.email);
    const missions=await query.order("created_at",{ascending:false}).limit(20);
    if(missions.error)throw missions.error;

    const ids=(missions.data||[]).map((m:any)=>m.id);
    let children:any[]=[];
    let missionEvents:any[]=[];
    if(ids.length){
      const response=await db.from("workflow_executions")
        .select("id,status,input,output,created_at,completed_at,error")
        .eq("organization_id",ORG_ID)
        .eq("input->>kind","agent_home")
        .in("input->context->>missionId",ids)
        .order("created_at",{ascending:true});
      if(response.error)throw response.error;
      children=response.data||[];
      const eventResponse=await db.from("events")
        .select("id,event_type,aggregate_id,payload,created_at")
        .eq("organization_id",ORG_ID)
        .eq("aggregate_type","super_agent_mission")
        .in("aggregate_id",ids)
        .order("created_at",{ascending:false}).limit(200);
      if(eventResponse.error)throw eventResponse.error;
      missionEvents=eventResponse.data||[];
    }

    const enriched=(missions.data||[]).map((mission:any)=>{
      const steps=children
        .filter((child:any)=>child.input?.context?.missionId===mission.id)
        .sort((a:any,b:any)=>Number(a.input?.context?.missionStepIndex||0)-Number(b.input?.context?.missionStepIndex||0));
      const events=missionEvents.filter((event:any)=>event.aggregate_id===mission.id).slice(0,12);
      return {...mission,steps,events,progress:missionProgress(steps)};
    });

    const recentActivity=children.slice().sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,12).map((step:any)=>({
      id:step.id,
      status:step.status,
      agent:step.input?.agent||"agent",
      title:step.input?.context?.missionStepTitle||step.input?.task||"Agent step",
      missionId:step.input?.context?.missionId||null,
      created_at:step.created_at,
      quality:Number(step.output?.quality_evaluation?.score||step.output?.evaluation?.score||0)||null
    }));
    const qualityScores=children.map((x:any)=>Number(x.output?.quality_evaluation?.score||x.output?.evaluation?.score)).filter((x:number)=>Number.isFinite(x));
    const health={
      queued:children.filter((x:any)=>x.status==="queued").length,
      processing:children.filter((x:any)=>x.status==="processing").length,
      awaiting_review:children.filter((x:any)=>x.status==="awaiting_approval").length,
      failed:children.filter((x:any)=>x.status==="failed").length,
      blocked:children.filter((x:any)=>x.status==="blocked").length,
      average_quality:qualityScores.length?Number((qualityScores.reduce((a:number,b:number)=>a+b,0)/qualityScores.length).toFixed(1)):0
    };

    return NextResponse.json({
      ok:true,
      missions:enriched,
      skills:skillSummary(),
      health,
      recentActivity,
      capabilities:capabilitySummary(),
      mode:"bounded-supervisor",
      policy:"Read and draft work may proceed inside COMIT. Writes, sends, publishing, spend and production changes require approval."
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Mission Control unavailable"},{status:503});
  }
}

export async function POST(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const body=await req.json().catch(()=>({}));
  const task=typeof body.task==="string"?body.task.trim():"";
  const context=body.context&&typeof body.context==="object"&&!Array.isArray(body.context)?body.context:{};
  if(!task||task.length>2000)return NextResponse.json({ok:false,error:"Mission goal must contain 1–2000 characters"},{status:400});
  if(JSON.stringify(context).length>5000)return NextResponse.json({ok:false,error:"Mission context is too large"},{status:400});

  try{
    const db=await requireAdminDb();
    const plan=buildSuperMission(task,context);
    const missionInput={kind:"super_agent_mission",task,context,requested_by:user.email,plan};
    const mission=await db.from("workflow_executions").insert({
      organization_id:ORG_ID,
      idempotency_key:randomUUID(),
      status:"active",
      input:missionInput,
      output:{progress:{total:plan.steps.length,completed:0,failed:0,active:1,percent:0},external_action_taken:false}
    }).select("id,status,input,output,created_at").single();
    if(mission.error)throw mission.error;

    const rows=plan.steps.map((step,index)=>({
      organization_id:ORG_ID,
      idempotency_key:randomUUID(),
      status:index===0?"queued":"blocked",
      input:{
        kind:"agent_home",
        task:step.objective+" Mission goal: "+task,
        context:{
          ...context,
          missionId:mission.data.id,
          missionStepId:step.id,
          missionStepIndex:index,
          missionStepTitle:step.title,
          missionSuccess:step.success,
          missionRisk:step.risk,
          missionMaxAttempts:step.maxAttempts,
          missionSkill:plan.skill
        },
        agent:step.agent,
        requested_by:user.email
      },
      output:{mission:{id:mission.data.id,step:step.id,index,title:step.title,success:step.success,risk:step.risk},external_action_taken:false}
    }));
    const children=await db.from("workflow_executions").insert(rows).select("id,status,input,created_at");
    if(children.error){
      await db.from("workflow_executions").update({status:"failed",error:"Mission child creation failed",completed_at:new Date().toISOString()}).eq("id",mission.data.id);
      throw children.error;
    }

    await db.from("events").insert({
      organization_id:ORG_ID,
      event_type:"super_agent.mission.created",
      aggregate_type:"super_agent_mission",
      aggregate_id:mission.data.id,
      payload:{requested_by:user.email,title:plan.title,steps:plan.steps.map(x=>({id:x.id,agent:x.agent,risk:x.risk}))}
    });

    return NextResponse.json({ok:true,mission:{...mission.data,steps:children.data,plan},mode:"bounded-supervisor"},{status:201});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Could not create mission"},{status:503});
  }
}
