import { NextResponse } from "next/server";
import { googleAccessToken, requireAdminDb, getSessionUser } from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ORG_ID = "acda1757-1698-405a-8451-5674316ceeaf";
const SENDER = "prismofstories25@gmail.com";

type Approval = {
  id:string;
  prospect_id:string;
  to_email:string;
  subject:string;
  gmail_message_id:string|null;
  gmail_thread_id:string|null;
  approved_at:string|null;
  created_at:string;
};

type Prospect = { id:string; name:string; email:string|null; stage:string; metadata:any };

function normalizeEmail(value:string){const m=value.match(/<([^>]+)>/)||[null,value];return String(m[1]||"").trim().toLowerCase()}
function normalizeSubject(value:string){return String(value||"").replace(/^(re|fwd):\s*/ig,"").replace(/^\[.*?\]\s*/,"").trim().toLowerCase()}

async function gmailGet(path:string){
  const token=await googleAccessToken();
  const r=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/"+path,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const data=await r.json();
  if(!r.ok)throw new Error(data.error?.message||`Gmail API request failed (${r.status})`);
  return data;
}

async function gmailList(query:string){
  const messages:any[]=[];
  let pageToken="";
  for(let page=0;page<3;page++){
    const params=new URLSearchParams({maxResults:"100",q:query});
    if(pageToken)params.set("pageToken",pageToken);
    const data=await gmailGet("messages?"+params.toString());
    messages.push(...(data.messages||[]));
    pageToken=data.nextPageToken||"";
    if(!pageToken||!(data.messages||[]).length)break;
  }
  return messages;
}

async function reconcile(){
  const db=await requireAdminDb();
  const {data:approvals,error:approvalError}=await db.from("outreach_approvals").select("id,prospect_id,to_email,subject,gmail_message_id,gmail_thread_id,approved_at,created_at").eq("organization_id",ORG_ID).eq("status","sent").order("created_at",{ascending:false}).limit(200);
  if(approvalError)throw approvalError;
  const {data:prospects,error:prospectError}=await db.from("prospects").select("id,name,email,stage,metadata").eq("organization_id",ORG_ID).not("email","is",null).limit(200);
  if(prospectError)throw prospectError;

  const sentApprovals=(approvals||[]) as Approval[];
  const prospectList=(prospects||[]) as Prospect[];
  const byEmail=new Map(prospectList.map(p=>[String(p.email).trim().toLowerCase(),p]));
  const bySubject=new Map<string,Approval[]>();
  for(const a of sentApprovals){const key=normalizeSubject(a.subject);if(!bySubject.has(key))bySubject.set(key,[]);bySubject.get(key)!.push(a)}

  const emails=[...new Set(sentApprovals.map(a=>normalizeEmail(a.to_email)).filter(Boolean))];
  const found:any[]=[];
  for(let i=0;i<emails.length;i+=12){
    const chunk=emails.slice(i,i+12);
    const query=`in:anywhere newer_than:60d -in:sent {${chunk.map(e=>`from:${e}`).join(" " )}}`;
    const ids=await gmailList(query);
    for(const x of ids)found.push(x);
  }

  let newReplies=0,matched=0,ignored=0;
  const replyRows:any[]=[];
  const prospectUpdates=new Map<string,{reply_count:number;last_reply_at:string;last_reply_subject:string;last_reply_snippet:string}>();

  const uniqueMessageIds=[...new Set(found.map(x=>x.id).filter(Boolean))].slice(0,120);
  const details=await Promise.all(uniqueMessageIds.map(async id=>{
    try{return await gmailGet(`messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=In-Reply-To&metadataHeaders=References`)}catch{return null}
  }));

  const existingIds=new Set<string>();
  if(uniqueMessageIds.length){
    const {data}=await db.from("outreach_replies").select("gmail_message_id").in("gmail_message_id",uniqueMessageIds);
    for(const row of data||[])existingIds.add(row.gmail_message_id);
  }

  for(const msg of details.filter(Boolean) as any[]){
    const headers=new Map<string,string>((msg.payload?.headers||[]).map((h:any)=>[String(h.name).toLowerCase(),String(h.value||"")]));
    const sender=normalizeEmail(headers.get("from")||"");
    const subject=headers.get("subject")||"";
    const prospect=byEmail.get(sender);
    if(!prospect){ignored++;continue}

    const references=(headers.get("references")||"")+" "+(headers.get("in-reply-to")||"");
    const approval=sentApprovals.find(a=>a.prospect_id===prospect.id && (
      (a.gmail_thread_id&&a.gmail_thread_id===msg.threadId) ||
      (a.gmail_message_id&&references.includes(a.gmail_message_id)) ||
      normalizeSubject(a.subject)===normalizeSubject(subject)
    )) || bySubject.get(normalizeSubject(subject))?.find(a=>a.prospect_id===prospect.id);
    if(!approval){ignored++;continue}

    matched++;
    if(existingIds.has(msg.id))continue;

    replyRows.push({
      organization_id:ORG_ID,
      prospect_id:prospect.id,
      approval_id:approval.id,
      gmail_message_id:msg.id,
      gmail_thread_id:msg.threadId||approval.gmail_thread_id||null,
      sender_email:sender,
      subject,
      snippet:msg.snippet||"",
      received_at:new Date(Number(msg.internalDate||Date.now())).toISOString(),
      classification:"human_reply"
    });
  }

  if(replyRows.length){
    const {error}=await db.from("outreach_replies").upsert(replyRows,{onConflict:"gmail_message_id",ignoreDuplicates:true});
    if(error)throw error;
    newReplies=replyRows.length;

    for(const row of replyRows){
      const current=prospectUpdates.get(row.prospect_id);
      if(!current||new Date(row.received_at)>new Date(current.last_reply_at)){
        prospectUpdates.set(row.prospect_id,{
          reply_count:(current?.reply_count||0)+1,
          last_reply_at:row.received_at,
          last_reply_subject:row.subject,
          last_reply_snippet:row.snippet
        });
      }else{
        current.reply_count+=1;
      }
    }

    for(const [prospectId,u] of prospectUpdates){
      const {data:prospect}=await db.from("prospects").select("reply_count,stage").eq("id",prospectId).single();
      const nextCount=Number(prospect?.reply_count||0)+u.reply_count;
      const update:any={reply_count:nextCount,last_reply_at:u.last_reply_at,last_reply_subject:u.last_reply_subject,last_reply_snippet:u.last_reply_snippet,updated_at:new Date().toISOString()};
      if(!["meeting","won","lost"].includes(String(prospect?.stage)))update.stage="replied";
      await db.from("prospects").update(update).eq("id",prospectId).eq("organization_id",ORG_ID);
      await db.from("outreach_followups").update({status:"skipped",updated_at:new Date().toISOString(),notes:"Automatic Gmail reply detected; follow-up cadence stopped."}).eq("prospect_id",prospectId).eq("status","pending");
      const prospectName=(prospectList.find(p=>p.id===prospectId)?.name)||"prospect";
      await db.from("notifications").insert({organization_id:ORG_ID,user_id:null,type:"outreach_reply",title:"New outreach reply",body:`Reply received from ${prospectName}`,metadata:{prospect_id:prospectId,subject:u.last_reply_subject,received_at:u.last_reply_at}});
    }
  }

  return {scanned:uniqueMessageIds.length,matched,newReplies,ignored,repliedProspects:prospectUpdates.size};
}

async function authorizedCron(req:Request){
  const expected=process.env.CRON_SECRET||process.env.LEARNING_CRON_SECRET;
  const supplied=req.headers.get("authorization");
  return !!expected&&supplied===`Bearer ${expected}`;
}

export async function GET(req:Request){
  if(!(await authorizedCron(req)))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  try{return NextResponse.json({ok:true,...await reconcile(),synced_at:new Date().toISOString()})}
  catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Gmail reconciliation failed"},{status:502})}
}

export async function POST(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{return NextResponse.json({ok:true,...await reconcile(),synced_at:new Date().toISOString()})}
  catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Gmail reconciliation failed"},{status:502})}
}
