"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowUpRight,CheckCircle2,Clock3,Mail,MessageSquareReply,RefreshCw,Send,Target,Utensils,Users, XCircle} from "lucide-react";

type DashboardData={
  metrics:any;
  recent:any[];
  followups:any[];
  topTargets:any[];
};

function fmtDate(value:string){return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value))}
function dueLabel(value:string){const diff=new Date(value).getTime()-Date.now();if(diff<=0)return "Due now";const days=Math.ceil(diff/86400000);return `Due in ${days}d`}

export default function OutreachDashboard(){
  const [data,setData]=useState<DashboardData|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState("");

  async function load(){
    setLoading(true);
    try{const r=await fetch("/api/outreach/dashboard",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load dashboard");setData(d)}catch(e:any){setMessage(e.message||"Dashboard unavailable")}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  async function action(payload:any){
    setBusy(String(payload.followupId||payload.prospectId||payload.action));setMessage("");
    try{
      const r=await fetch("/api/outreach/dashboard",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Action failed");
      setMessage(payload.action==="prepare-followup"?"Follow-up prepared and added to the approval queue.":"CRM outcome updated.");
      await load();
    }catch(e:any){setMessage(e.message||"Action failed")}finally{setBusy("")}
  }

  const m=data?.metrics;
  const due=useMemo(()=>data?.followups.filter((f:any)=>f.status==="pending").slice(0,16)||[],[data]);

  return <main className="min-h-screen bg-[var(--prism-bg)] text-[var(--prism-text)] p-5 lg:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--prism-muted)]">REVENUE ENGINE · COLD OUTREACH</p>
          <h1 className="mt-2 text-3xl font-semibold">Outreach Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">Track sent campaigns, CRM-recorded replies, meetings, restaurant prospects and the next approval-gated follow-up without leaving COMIT.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/> Refresh</button>
          <a href="/prospects" className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-black">Open CRM <ArrowUpRight size={15}/></a>
        </div>
      </header>

      {message&&<div className="mb-5 rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-3 text-sm">{message}</div>}

      {loading&&!data?<div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-8 text-sm text-[var(--prism-muted)]">Loading live campaign intelligence…</div>:!data?<div className="rounded-2xl border border-red-400/30 bg-red-500/5 p-6 text-sm">{message||"No dashboard data."}</div>:
      <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Sent",m.sent,Send],
            ["Pending approval",m.pending.length,Clock3],
            ["Replies recorded",m.replied,MessageSquareReply],
            ["Meetings",m.meetings,Users],
            ["Follow-ups due",m.dueFollowups,Mail],
            ["Restaurant sends",m.restaurantSent,Utensils],
          ].map(([label,value,Icon]:any)=><article key={label} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><Icon size={17} className="text-[var(--prism-violet)]"/><div className="mt-3 text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-[var(--prism-muted)]">{label}</div></article>)}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
            <div className="flex items-center justify-between"><div><p className="text-xs text-[var(--prism-muted)]">CAMPAIGN FUNNEL</p><h2 className="mt-1 font-semibold">Recorded outcomes</h2></div><Target size={18}/></div>
            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Sent",m.sent],["Replies",m.replied],["Meetings",m.meetings],["Won",m.won],["Lost",m.lost]
              ].map(([label,value]:any)=><div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[var(--prism-violet)]" style={{width:`${m.sent?Math.min(100,(value/m.sent)*100):0}%`}}/></div></div>)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl border border-[var(--prism-border)] p-3"><div className="text-[var(--prism-muted)]">Reply rate</div><div className="mt-1 text-lg font-semibold">{m.replyRate}%</div></div><div className="rounded-xl border border-[var(--prism-border)] p-3"><div className="text-[var(--prism-muted)]">Meeting rate</div><div className="mt-1 text-lg font-semibold">{m.meetingRate}%</div></div></div>
          </article>

          <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5 lg:col-span-2">
            <div className="flex items-center justify-between"><div><p className="text-xs text-[var(--prism-muted)]">FOLLOW-UP QUEUE</p><h2 className="mt-1 font-semibold">Next actions</h2></div><span className="rounded-full bg-white/5 px-2 py-1 text-xs">{m.upcomingFollowups} upcoming / 7d</span></div>
            <div className="mt-4 space-y-2">
              {due.slice(0,8).map((f:any)=><div key={f.id} className="flex flex-col gap-3 rounded-xl border border-[var(--prism-border)] p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{f.prospects?.name||"Prospect"}</span><span className="rounded-full bg-white/5 px-2 py-1 text-[10px]">Touch {f.sequence_no}</span><span className={new Date(f.due_at)<=new Date()?"text-amber-300":"text-[var(--prism-muted)]"}>{dueLabel(f.due_at)}</span></div><div className="mt-1 text-xs text-[var(--prism-muted)]">{f.label} · {fmtDate(f.due_at)}</div></div>
                <div className="flex flex-wrap gap-2"><button disabled={busy===f.id||f.status!=="pending"} onClick={()=>action({action:"prepare-followup",followupId:f.id})} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-40">{f.status==="prepared"?"Prepared":"Prepare"}</button><button disabled={busy===f.id} onClick={()=>action({action:"mark-outcome",prospectId:f.prospect_id,stage:"replied"})} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs">Reply</button><button disabled={busy===f.id} onClick={()=>action({action:"mark-outcome",prospectId:f.prospect_id,stage:"meeting"})} className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs">Meeting</button><button disabled={busy===f.id} onClick={()=>action({action:"skip-followup",followupId:f.id})} className="rounded-xl border border-[var(--prism-border)] px-3 py-2 text-xs">Skip</button></div>
              </div>)}
              {!due.length&&<div className="rounded-xl border border-dashed border-[var(--prism-border)] p-6 text-center text-sm text-[var(--prism-muted)]">No pending follow-ups.</div>}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
            <div className="flex items-center justify-between"><div><p className="text-xs text-[var(--prism-muted)]">RECENT ACTIVITY</p><h2 className="mt-1 font-semibold">Outbound results</h2></div><a href="/prospects" className="text-xs underline">Approval queue</a></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[var(--prism-muted)]"><tr><th className="pb-3">Prospect</th><th className="pb-3">Status</th><th className="pb-3">Type</th><th className="pb-3">Date</th></tr></thead><tbody>{data.recent.map((x:any)=><tr key={x.id} className="border-t border-[var(--prism-border)]"><td className="py-3"><div className="font-medium">{x.prospects?.name||x.to_email}</div><div className="text-[var(--prism-muted)]">{x.to_email}</div></td><td className="py-3"><span className={x.status==="sent"?"text-emerald-300":x.status==="failed"?"text-red-300":"text-amber-300"}>{x.status}</span></td><td className="py-3 capitalize">{x.message_type||"initial"}</td><td className="py-3 text-[var(--prism-muted)]">{fmtDate(x.created_at)}</td></tr>)}</tbody></table></div>
          </article>

          <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
            <p className="text-xs text-[var(--prism-muted)]">HIGH-FIT TARGETS</p><h2 className="mt-1 font-semibold">Research queue</h2>
            <div className="mt-4 space-y-2">{data.topTargets.map((p:any)=><div key={p.id} className="flex items-center justify-between rounded-xl border border-[var(--prism-border)] p-3"><div className="min-w-0"><div className="truncate text-sm">{p.name}</div><div className="text-[10px] text-[var(--prism-muted)]">{p.stage} · {p.email?"email ready":"email needed"}</div></div><span className="rounded-full bg-white/5 px-2 py-1 text-xs">{p.score}</span></div>)}</div>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-[var(--prism-muted)]">TEAM RULE</p><h2 className="font-semibold">Every external message stays approval-gated</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">Initial emails and follow-ups route through Amal/Aadil approval, with both copied on the outgoing message.</p></div><div className="flex items-center gap-2 text-xs"><CheckCircle2 size={15}/> No-billing execution layer</div></div>
        </section>
      </>}
    </div>
  </main>
}
