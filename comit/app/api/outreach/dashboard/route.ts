import { NextResponse } from "next/server";
import { followupBody, getSessionUser, isApprover, requireAdminDb, AMAL_EMAIL, AADIL_EMAIL } from "@/lib/outreach";

const ORG_ID = "acda1757-1698-405a-8451-5674316ceeaf";
const ACTIVE_STAGES = new Set(["replied","meeting","won","lost"]);

function normalizeStage(value:string){return ["replied","meeting","won","lost","contacted"].includes(value)?value:"replied"}

export async function GET(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const db=await requireAdminDb();
    const now=new Date();
    const sevenDays=new Date(now.getTime()+7*86400000);
    const [{data:approvals,error:approvalError},{data:followups,error:followupError},{data:prospects,error:prospectError}]=await Promise.all([
      db.from("outreach_approvals").select("id,status,message_type,followup_id,to_email,subject,created_at,approved_at,gmail_message_id,gmail_thread_id,prospect_id,prospects(name,stage,score,metadata)").eq("organization_id",ORG_ID).order("created_at",{ascending:false}).limit(100),
      db.from("outreach_followups").select("id,prospect_id,source_approval_id,sequence_no,label,due_at,status,prepared_approval_id,completed_at,notes,prospects(name,stage,score,metadata)").eq("organization_id",ORG_ID).order("due_at",{ascending:true}).limit(100),
      db.from("prospects").select("id,name,email,stage,score,metadata,updated_at").eq("organization_id",ORG_ID).order("score",{ascending:false}).limit(200)
    ]);
    if(approvalError)throw approvalError;
    if(followupError)throw followupError;
    if(prospectError)throw prospectError;
    const list=approvals||[], f=list.length?followups||[]:followups||[], p=prospects||[];
    const initialSent=list.filter((x:any)=>x.status==="sent"&&(x.message_type||"initial")==="initial");
    const sent=list.filter((x:any)=>x.status==="sent");
    const pending=list.filter((x:any)=>x.status==="pending");
    const failed=list.filter((x:any)=>x.status==="failed");
    const replied=p.filter((x:any)=>x.stage==="replied").length;
    const meetings=p.filter((x:any)=>x.stage==="meeting").length;
    const won=p.filter((x:any)=>x.stage==="won").length;
    const lost=p.filter((x:any)=>x.stage==="lost").length;
    const restaurantSent=initialSent.filter((x:any)=>/restaurant|hospitality|cafe|f&b|food/.test(String(x.prospects?.metadata?.industry||"").toLowerCase())).length;
    const due=f.filter((x:any)=>x.status==="pending"&&new Date(x.due_at)<=now);
    const upcoming=f.filter((x:any)=>x.status==="pending"&&new Date(x.due_at)>now&&new Date(x.due_at)<=sevenDays);
    return NextResponse.json({ok:true,user,metrics:{
      prospects:p.length,emailReady:p.filter((x:any)=>x.email).length,sent:initialSent.length,totalSent:sent.length,pending,failed:failed.length,replied,meetings,won,lost,restaurantSent,
      replyRate:initialSent.length?Number(((replied/initialSent.length)*100).toFixed(1)):0,
      meetingRate:initialSent.length?Number(((meetings/initialSent.length)*100).toFixed(1)):0,
      dueFollowups:due.length,upcomingFollowups:upcoming.length
    },recent:sent.slice(0,20),followups:f.slice(0,50),topTargets:p.slice(0,12)});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Failed to load outreach dashboard"},{status:500})}
}

export async function POST(req:Request){
  const user=getSessionUser(req);
  if(!user||!isApprover(user))return NextResponse.json({ok:false,error:"Only Amal or Aadil can change outreach state."},{status:403});
  try{
    const body=await req.json();
    const action=String(body.action||"");
    const db=await requireAdminDb();

    if(action==="prepare-followup"){
      const followupId=String(body.followupId||"");
      const {data:f,error:fError}=await db.from("outreach_followups").select("*, prospects(*), source_approval:outreach_approvals!outreach_followups_source_approval_id_fkey(*)").eq("id",followupId).single();
      if(fError||!f)return NextResponse.json({ok:false,error:"Follow-up not found."},{status:404});
      if(f.status!=="pending")return NextResponse.json({ok:false,error:"This follow-up is no longer pending."},{status:409});
      const prospect=f.prospects;
      if(ACTIVE_STAGES.has(String(prospect?.stage)))return NextResponse.json({ok:false,error:"This prospect already has an outcome recorded."},{status:409});
      const source=f.source_approval;
      const subject=String(source?.subject||("A practical growth idea for "+prospect.name)).replace(/^Re:\s*/i,"");
      const {data:approval,error}=await db.from("outreach_approvals").insert({
        organization_id:f.organization_id,
        prospect_id:f.prospect_id,
        status:"pending",
        message_type:"followup",
        followup_id:f.id,
        requested_by:user.email,
        to_email:prospect.email,
        cc_emails:[AMAL_EMAIL,AADIL_EMAIL],
        subject:"Re: "+subject,
        body:followupBody(prospect,f.sequence_no),
        gmail_thread_id:source?.gmail_thread_id||null
      }).select().single();
      if(error)throw error;
      await db.from("outreach_followups").update({status:"prepared",prepared_approval_id:approval.id,updated_at:new Date().toISOString()}).eq("id",f.id);
      return NextResponse.json({ok:true,approval});
    }

    if(action==="complete-followup"||action==="skip-followup"){
      const followupId=String(body.followupId||"");
      const status=action==="complete-followup"?"completed":"skipped";
      const {error}=await db.from("outreach_followups").update({status,completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),notes:body.notes||null}).eq("id",followupId);
      if(error)throw error;
      return NextResponse.json({ok:true,status});
    }

    if(action==="mark-outcome"){
      const prospectId=String(body.prospectId||"");
      const stage=normalizeStage(String(body.stage||"replied"));
      const now=new Date().toISOString();
      const {error}=await db.from("prospects").update({stage,updated_at:now}).eq("id",prospectId).eq("organization_id",ORG_ID);
      if(error)throw error;
      if(ACTIVE_STAGES.has(stage)&&stage!=="contacted"){
        await db.from("outreach_followups").update({status:"skipped",updated_at:now,notes:"Stopped after CRM outcome: "+stage}).eq("prospect_id",prospectId).eq("status","pending");
      }
      await db.from("audit_logs").insert({organization_id:ORG_ID,action:"outreach_outcome_recorded",entity_type:"prospect",entity_id:prospectId,metadata:{stage,recorded_by:user.email}});
      return NextResponse.json({ok:true,stage});
    }

    return NextResponse.json({ok:false,error:"Unknown action."},{status:400});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Outreach dashboard action failed"},{status:500})}
}
