import { NextResponse } from "next/server";
import { getSessionUser, isApprover, requireAdminDb, AMAL_EMAIL, AADIL_EMAIL, SENDER_EMAIL } from "@/lib/outreach";
import { buildSalesDraft, salesContextFromProspect } from "@/lib/sales-engine";
import { evaluateSalesArtifact } from "@/lib/agent-evaluation";

const ORG_ID = "acda1757-1698-405a-8451-5674316ceeaf";
export const dynamic="force-dynamic";
const ACTIVE_STAGES = new Set(["replied","meeting","won","lost","not-a-fit","unsubscribed"]);

function normalizeStage(value:string){return ["replied","meeting","won","lost","contacted"].includes(value)?value:"replied"}

export async function GET(req:Request){
  const user=await getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const db=await requireAdminDb();
    const now=new Date();
    const sevenDays=new Date(now.getTime()+7*86400000);
    const [{data:approvals,error:approvalError},{data:followups,error:followupError},{data:prospects,error:prospectError},{data:replies,error:replyError}]=await Promise.all([
      db.from("outreach_approvals").select("id,status,message_type,followup_id,to_email,cc_emails,subject,body,error,updated_at,created_at,approved_at,gmail_message_id,gmail_thread_id,prospect_id,prospects(name,stage,score,metadata)").eq("organization_id",ORG_ID).order("created_at",{ascending:false}).limit(200),
      db.from("outreach_followups").select("id,prospect_id,source_approval_id,sequence_no,label,due_at,status,prepared_approval_id,completed_at,notes,prospects(name,stage,score,metadata)").eq("organization_id",ORG_ID).in("status",["pending","prepared"]).order("due_at",{ascending:true}).limit(100),
      db.from("prospects").select("id,name,email,stage,score,metadata,updated_at").eq("organization_id",ORG_ID).order("score",{ascending:false}).limit(200),
      db.from("outreach_replies").select("id,prospect_id,approval_id,gmail_message_id,gmail_thread_id,sender_email,subject,snippet,received_at,classification,prospects(name,stage,score,metadata)").eq("organization_id",ORG_ID).order("received_at",{ascending:false}).limit(50)
    ]);
    if(approvalError)throw approvalError;
    if(followupError)throw followupError;
    if(prospectError)throw prospectError;
    if(replyError)throw replyError;
    const list=approvals||[], f=followups||[], p=prospects||[], replyRows=replies||[];
    const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
    const dayStart=new Date(today+"T00:00:00+05:30").toISOString();
    async function count(table:string, configure:(query:any)=>any = query=>query){
      const result=await configure(db.from(table).select("id",{count:"exact",head:true}).eq("organization_id",ORG_ID));
      if(result.error)throw result.error;
      return result.count||0;
    }
    const [prospectCount,emailReady,totalSent,initialSent,sentToday,actualReplies,repliesToday,pendingFollowups,dueFollowups,upcomingFollowups,pendingCount,failed,replied,meetings,won,lost]=await Promise.all([
      count("prospects"),count("prospects",q=>q.not("email","is",null).neq("email","")),
      count("outreach_approvals",q=>q.eq("status","sent")),
      count("outreach_approvals",q=>q.eq("status","sent").or("message_type.eq.initial,message_type.is.null")),
      count("outreach_approvals",q=>q.eq("status","sent").gte("updated_at",dayStart)),
      count("outreach_replies",q=>q.eq("classification","human_reply")),
      count("outreach_replies",q=>q.eq("classification","human_reply").gte("received_at",dayStart)),
      count("outreach_followups",q=>q.eq("status","pending")),
      count("outreach_followups",q=>q.eq("status","pending").lte("due_at",now.toISOString())),
      count("outreach_followups",q=>q.eq("status","pending").gt("due_at",now.toISOString()).lte("due_at",sevenDays.toISOString())),
      count("outreach_approvals",q=>q.eq("status","pending")),count("outreach_approvals",q=>q.eq("status","failed")),
      count("prospects",q=>q.eq("stage","replied")),count("prospects",q=>q.eq("stage","meeting")),
      count("prospects",q=>q.eq("stage","won")),count("prospects",q=>q.eq("stage","lost"))
    ]);
    return NextResponse.json({ok:true,user,syncedAt:now.toISOString(),dayTimezone:"Asia/Kolkata",
      permissions:{canApprove:isApprover(user)},
      integration:{gmailConfigured:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.ORBIT_GMAIL_REFRESH_TOKEN),sender:SENDER_EMAIL},
      metrics:{prospects:prospectCount,emailReady,sent:initialSent,totalSent,sentToday,actualReplies,repliesToday,
        pending:list.filter((x:any)=>x.status==="pending"),pendingCount,failed,replied,meetings,won,lost,
        dueFollowups,upcomingFollowups,pendingFollowups},
      recent:list.filter((x:any)=>x.status==="sent").slice(0,20),replies:replyRows,
      followups:f,topTargets:p.slice(0,12),failedApprovals:list.filter((x:any)=>x.status==="failed").slice(0,20)
    },{headers:{"cache-control":"no-store"}});

  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Failed to load outreach dashboard"},{status:500})}
}

export async function POST(req:Request){
  const user=await getSessionUser(req);
  if(!user||!isApprover(user))return NextResponse.json({ok:false,error:"Only Amal or Aadil can change outreach state."},{status:403});
  try{
    const body=await req.json();
    const action=String(body.action||"");
    const db=await requireAdminDb();

    if(action==="prepare-followup"){
      const followupId=String(body.followupId||"");
      const {data:f,error:fError}=await db.from("outreach_followups").select("*, prospects(*), source_approval:outreach_approvals!outreach_followups_source_approval_id_fkey(*)").eq("id",followupId).eq("organization_id",ORG_ID).single();
      if(fError||!f)return NextResponse.json({ok:false,error:"Follow-up not found."},{status:404});
      if(f.status!=="pending")return NextResponse.json({ok:false,error:"This follow-up is no longer pending."},{status:409});
      const prospect=f.prospects;
      if(!prospect?.email)return NextResponse.json({ok:false,error:"Verify a business email before preparing this follow-up."},{status:400});
      if(ACTIVE_STAGES.has(String(prospect?.stage)))return NextResponse.json({ok:false,error:"This prospect already has an outcome recorded."},{status:409});
      const source=f.source_approval;
      const context=salesContextFromProspect(prospect);
      const draft=buildSalesDraft(context,"followup");
      const quality=evaluateSalesArtifact(draft.body,context);
      if(!quality.pass)return NextResponse.json({ok:false,error:"Follow-up quality gate recommends revision before approval.",quality},{status:409});
      const subject=String(source?.subject||draft.subject||("A practical growth idea for "+prospect.name)).replace(/^Re:\s*/i,"");
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
        body:draft.body,
        gmail_thread_id:source?.gmail_thread_id||null
      }).select().single();
      if(error)throw error;
      const prepared=await db.from("outreach_followups").update({status:"prepared",prepared_approval_id:approval.id,updated_at:new Date().toISOString()}).eq("id",f.id).eq("organization_id",ORG_ID);
      if(prepared.error)throw prepared.error;
      return NextResponse.json({ok:true,approval,quality});
    }

    if(action==="complete-followup"||action==="skip-followup"){
      const followupId=String(body.followupId||"");
      const status=action==="complete-followup"?"completed":"skipped";
      const {data:updated,error}=await db.from("outreach_followups").update({status,completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),notes:body.notes||null}).eq("id",followupId).eq("organization_id",ORG_ID).select("id").maybeSingle();
      if(error)throw error;
      if(!updated)return NextResponse.json({ok:false,error:"Follow-up not found."},{status:404});
      return NextResponse.json({ok:true,status});
    }

    if(action==="mark-outcome"){
      const prospectId=String(body.prospectId||"");
      const stage=normalizeStage(String(body.stage||"replied"));
      const now=new Date().toISOString();
      const {data:updated,error}=await db.from("prospects").update({stage,updated_at:now}).eq("id",prospectId).eq("organization_id",ORG_ID).select("id").maybeSingle();
      if(error)throw error;
      if(!updated)return NextResponse.json({ok:false,error:"Prospect not found."},{status:404});
      if(ACTIVE_STAGES.has(stage)&&stage!=="contacted"){
        await db.from("outreach_followups").update({status:"skipped",updated_at:now,notes:"Stopped after CRM outcome: "+stage}).eq("prospect_id",prospectId).eq("organization_id",ORG_ID).in("status",["pending","prepared"]);
      }
      await db.from("audit_logs").insert({organization_id:ORG_ID,action:"outreach_outcome_recorded",entity_type:"prospect",entity_id:prospectId,metadata:{stage,recorded_by:user.email}});
      return NextResponse.json({ok:true,stage});
    }

    return NextResponse.json({ok:false,error:"Unknown action."},{status:400});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Outreach dashboard action failed"},{status:500})}
}
