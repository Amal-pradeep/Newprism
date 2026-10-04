"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {Mail,RefreshCw,Send,Clock3,Target,MessageSquareReply} from "lucide-react";
import ComitLoading from "@/components/comit-loading";
import {requestJson} from "@/lib/client-request";

type Row=Record<string,any>;
type Dashboard={metrics:Row;recent:Row[];replies:Row[];followups:Row[];topTargets:Row[];failedApprovals:Row[];permissions:{canApprove:boolean};integration:{gmailConfigured:boolean;sender:string};syncedAt:string};
const panel="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5";
const button="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm disabled:opacity-50";
function date(value:string){return new Date(value).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}

export default function OutreachDashboard(){
  const [data,setData]=useState<Dashboard|null>(null),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[busy,setBusy]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);
    try{setData(await requestJson<Dashboard>("/api/outreach/dashboard",{cache:"no-store"}));}
    catch(e){setMessage(e instanceof Error?e.message:"Dashboard unavailable.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{
    void load();
    const update=()=>{if(!document.hidden)void load();};
    const timer=setInterval(update,60000);window.addEventListener("focus",update);
    return()=>{clearInterval(timer);window.removeEventListener("focus",update);};
  },[load]);
  async function run(url:string,payload:object,key:string,success:string){
    if(busy)return;setBusy(key);setMessage("");
    try{const result=await requestJson(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});await load();setMessage(result.warning||success);}
    catch(e){setMessage(e instanceof Error?e.message:"Action failed. Try again.");}
    finally{setBusy("");}
  }
  const canApprove=data?.permissions.canApprove, gmail=data?.integration.gmailConfigured, m=data?.metrics;
  return <main className="min-h-screen p-5 pb-24 lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-[var(--prism-muted)]">DAILY SALES DESK</p><h1 className="mt-1 text-3xl font-semibold">Leads, emails and follow-ups</h1><p className="mt-2 text-sm text-[var(--prism-muted)]">Review due work, approve a message, then track the result.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>void run("/api/outreach/reconcile",{},"sync","Gmail replies synchronized.")} disabled={!!busy||!gmail||!canApprove} title={!gmail?"Gmail OAuth must be configured":undefined} className={button}><Mail size={15}/>{busy==="sync"?"Syncing…":"Sync Gmail replies"}</button><button disabled={loading||!!busy} onClick={()=>void load()} className={button}><RefreshCw size={15}/>{loading?"Refreshing…":"Refresh"}</button></div></header>
    {message&&<p role="status" className="mt-4 rounded-xl border border-amber-300/20 p-3 text-sm">{message}</p>}
    {!data&&loading?<ComitLoading label="Loading outreach records…"/>:!data?<section className={`${panel} mt-5`}><h2 className="font-semibold">Open your team sales desk</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">Sign in with your approved email. If you are already signed in, refresh to retry the connection.</p><Link href="/login" className={`${button} mt-4`}>Team sign-in</Link></section>:<>
      <p className="mt-4 text-xs text-[var(--prism-muted)]">Updated {date(data.syncedAt)} IST · refreshes each minute while open · {gmail?`Mailbox configured: ${data.integration.sender}`:"Gmail OAuth needs configuration before sending or reply sync."}</p>
      <section aria-label="Outreach totals" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Prospects",m?.prospects,Target],["Emails sent today",m?.sentToday,Send],["Replies today",m?.repliesToday,MessageSquareReply],["Due follow-ups",m?.dueFollowups,Clock3],["Awaiting approval",m?.pendingCount,Mail]].map(([label,value,Icon]:any)=><div key={label} className={panel}><Icon size={16}/><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-[var(--prism-muted)]">{label}</p></div>)}</section>
      <div className="mt-4 flex flex-wrap gap-3 text-sm"><Link href="/prospects/shared" className="underline">Research and prepare new outreach</Link><Link href="/team/pulse" className="underline">Team handoffs</Link><Link href="/outreach" className="underline">Drafts on this device</Link></div>
      <section className={`${panel} mt-5`}><h2 className="font-semibold">Review before sending</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">Amal or Aadil reviews the recipient, subject and body. Sending schedules the next follow-ups.</p><div className="mt-4 space-y-3">{m?.pending.map((a:Row)=><article key={a.id} className="rounded-xl border border-[var(--prism-border)] p-4"><h3 className="font-medium">{a.prospects?.name||a.to_email} · {a.message_type||"initial"}</h3><p className="mt-1 break-words text-sm text-[var(--prism-muted)]">To: {a.to_email} · CC: {(a.cc_emails||[]).join(", ")}</p><p className="mt-3 font-medium">{a.subject}</p><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-[var(--prism-muted)]">{a.body}</pre>{canApprove&&<div className="mt-4 flex flex-wrap gap-2"><button disabled={!!busy||!gmail} onClick={()=>void run("/api/outreach",{action:"approve",approvalId:a.id},a.id,"Email sent. The follow-up schedule was updated.")} className={button}><Send size={14}/>{busy===a.id?"Processing…":"Approve & send"}</button><button disabled={!!busy} onClick={()=>void run("/api/outreach",{action:"reject",approvalId:a.id},a.id,"Draft rejected. Nothing sent.")} className={button}>Reject</button></div>}</article>)}{!m?.pending.length&&<p className="text-sm text-[var(--prism-muted)]">No pending drafts. Prepare one from Prospects.</p>}</div></section>
      <section className={`${panel} mt-5`}><h2 className="font-semibold">Daily follow-up queue</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">{m?.pendingFollowups} pending · {m?.upcomingFollowups} due in the next 7 days. Prepare each message for review; replies and closed opportunities stop the sequence.</p><div className="mt-4 space-y-2">{data.followups.map(f=><article key={f.id} className="rounded-xl border border-[var(--prism-border)] p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">{f.prospects?.name||"Prospect"}</h3><p className="mt-1 text-sm text-[var(--prism-muted)]">{f.label} · {date(f.due_at)} IST · {f.status}</p></div>{canApprove&&f.status==="pending"&&<div className="flex gap-2"><button disabled={!!busy} onClick={()=>void run("/api/outreach/dashboard",{action:"prepare-followup",followupId:f.id},f.id,"Follow-up prepared. Review it above before sending.")} className={button}>Prepare for review</button><button disabled={!!busy} onClick={()=>void run("/api/outreach/dashboard",{action:"skip-followup",followupId:f.id},f.id,"Follow-up skipped.")} className={button}>Skip</button></div>}{f.status==="prepared"&&<span className="text-sm text-violet-300">In the review queue</span>}</div></article>)}{!data.followups.length&&<p className="text-sm text-[var(--prism-muted)]">No pending or prepared follow-ups.</p>}</div></section>
      <section className={`${panel} mt-5`}><h2 className="font-semibold">Incoming replies</h2><div className="mt-4 space-y-2">{data.replies.map(reply=><article key={reply.id} className="rounded-xl border border-[var(--prism-border)] p-3"><h3 className="font-medium">{reply.prospects?.name||reply.sender_email}</h3><p className="mt-1 text-sm text-[var(--prism-muted)]">{reply.subject} · {date(reply.received_at)} IST</p><p className="mt-2 text-sm">{reply.snippet}</p></article>)}{!data.replies.length&&<p className="text-sm text-[var(--prism-muted)]">No matched replies. Sync Gmail to check the connected mailbox.</p>}</div></section>
      <section className={`${panel} mt-5`}><h2 className="font-semibold">Delivery failures</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">{m?.failed} failed records. Check the mailbox or recipient before preparing another message.</p>{data.failedApprovals.map(a=><div key={a.id} className="mt-3 rounded-xl border border-red-300/20 p-3"><p className="font-medium">{a.prospects?.name||a.to_email}</p><p className="mt-1 text-sm text-red-200">{a.error||"Delivery failed. Review the mailbox status."}</p></div>)}</section>
      <section className={`${panel} mt-5`}><h2 className="font-semibold">Recent sent emails</h2>{data.recent.map(a=><article key={a.id} className="mt-3 rounded-xl border border-[var(--prism-border)] p-3"><p className="font-medium">{a.prospects?.name||a.to_email}</p><p className="mt-1 text-sm text-[var(--prism-muted)]">{a.subject} · {date(a.updated_at)} IST</p></article>)}{!data.recent.length&&<p className="mt-3 text-sm text-[var(--prism-muted)]">No sent emails yet.</p>}</section>
    </>}
  </div></main>;
}
