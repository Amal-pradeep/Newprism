"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,CheckCircle2,CircleDot,RefreshCw,ShieldCheck,Users} from "lucide-react";

type Pulse={id:string;user_email:string;status:string;focus:string;blocker?:string|null;created_at:string};
type Member={id:string;name:string;email:string;role:string;focus:string;initials:string;color_token:string;daily_target:string;automation_lane:string;pulse:Pulse|null};
type Data={ok:boolean;user:{email:string;name?:string};members:Member[];note:string;error?:string};

const statusStyle:Record<string,string>={
 available:"border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
 focused:"border-violet-400/30 bg-violet-500/10 text-violet-200",
 blocked:"border-amber-400/30 bg-amber-500/10 text-amber-200",
 done:"border-sky-400/30 bg-sky-500/10 text-sky-200"
};

export default function TeamPulse(){
 const [data,setData]=useState<Data|null>(null);
 const [status,setStatus]=useState("focused");
 const [focus,setFocus]=useState("");
 const [blocker,setBlocker]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");

 async function load(){
  setError("");
  try{
   const r=await fetch("/api/team/pulse",{cache:"no-store"});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||"Team pulse unavailable");
   setData(d);
  }catch(e){setError(e instanceof Error?e.message:"Team pulse unavailable")}
 }
 useEffect(()=>{void load()},[]);

 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{
   const r=await fetch("/api/team/pulse",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({status,focus,blocker})});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||"Could not save team pulse");
   setFocus("");setBlocker("");await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not save team pulse")}
  finally{setBusy(false)}
 }

 return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-6xl">
  <header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/team/shared" className="inline-flex items-center gap-2 text-xs text-[var(--prism-muted)]"><ArrowLeft size={14}/>Shared Team</Link><p className="mt-4 text-xs tracking-[.22em] text-violet-300">TEAM PULSE</p><h1 className="mt-2 text-3xl font-semibold">What is everyone moving today?</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">A lightweight shared work-status layer for focus, blockers and handoffs. Wellness remains private and is never shown here.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button></header>

  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-200">{error}</p>}

  <form onSubmit={save} className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5"><div className="flex items-center gap-2"><CircleDot size={17}/><h2 className="font-medium">My current work pulse</h2></div><div className="mt-4 grid gap-3 lg:grid-cols-[10rem_1fr_1fr_auto]"><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-3 text-sm"><option value="available">Available</option><option value="focused">Focused</option><option value="blocked">Blocked</option><option value="done">Done</option></select><input required minLength={3} maxLength={280} value={focus} onChange={e=>setFocus(e.target.value)} placeholder="Main focus: close proposal, finish reel, QA client site…" className="rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-3 text-sm"/><input maxLength={280} value={blocker} onChange={e=>setBlocker(e.target.value)} placeholder="Blocker / help needed (optional)" className="rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-3 text-sm"/><button disabled={busy} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{busy?"Saving…":"Update pulse"}</button></div></form>

  <section className="mt-6 grid gap-4 md:grid-cols-2">{(data?.members||[]).map(member=><article key={member.id} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold">{member.initials}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{member.name}</h2>{member.pulse?<span className={"rounded-full border px-2 py-1 text-[10px] "+(statusStyle[member.pulse.status]||"border-[var(--prism-border)] text-[var(--prism-muted)]")}>{member.pulse.status}</span>:<span className="rounded-full border border-[var(--prism-border)] px-2 py-1 text-[10px] text-[var(--prism-muted)]">no recent pulse</span>}</div><p className="text-xs text-[var(--prism-muted)]">{member.role}</p></div></div>{member.pulse?<div className="mt-4 rounded-xl border border-[var(--prism-border)] p-3"><p className="text-sm font-medium">{member.pulse.focus}</p>{member.pulse.blocker&&<p className="mt-2 text-xs text-amber-200">Needs help: {member.pulse.blocker}</p>}<p className="mt-2 text-[11px] text-[var(--prism-muted)]">Updated {new Date(member.pulse.created_at).toLocaleString()}</p></div>:<div className="mt-4 rounded-xl border border-dashed border-[var(--prism-border)] p-3 text-xs text-[var(--prism-muted)]">No work pulse in the last 48 hours.</div>}<p className="mt-3 text-xs text-[var(--prism-muted)]">Daily outcome: {member.daily_target}</p></article>)}</section>

  <section className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4"><ShieldCheck size={18} className="shrink-0"/><p className="text-sm text-[var(--prism-muted)]">{data?.note||"This page is for work status only."}</p></section>
 </div></main>;
}
