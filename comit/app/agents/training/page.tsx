"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,BrainCircuit,CheckCircle2,Database,RefreshCw,Target,TriangleAlert} from "lucide-react";

type Dashboard={
 ok:boolean;
 schema_ready:boolean;
 error?:string;
 metrics:{
  prospects:number;sent:number;replies:number;reply_rate:number;meetings:number;won:number;
  agent_jobs:number;evaluated_outputs:number;average_quality:number;quality_pass_rate:number;
  reusable_lessons:number;confirmed_positive_outcomes:number;stage_sync_warnings:number;
 };
 warnings:string[];
 recent_jobs:Array<{id:string;status:string;input:any;output:any;created_at:string}>;
 training_examples:Array<{id:string;agent_id:string;lesson:string;outcome:string;quality_score:number;approved_for_reuse:boolean;created_at:string}>;
 outcomes:Array<{id:string;job_id:string;outcome:string;note:string;recorded_by:string;occurred_at:string}>;
};

const outcomes=["no_reply","negative_reply","positive_reply","meeting_booked","proposal_sent","won","lost"];

export default function TrainingPage(){
 const [data,setData]=useState<Dashboard|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");
 const [form,setForm]=useState<Record<string,{outcome:string;note:string;reuse:boolean}>>({});

 async function load(){
  setError("");
  try{
   const r=await fetch("/api/agents/training",{cache:"no-store"});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||"Training dashboard unavailable");
   setData(d);
  }catch(e){setError(e instanceof Error?e.message:"Training dashboard unavailable")}
 }

 useEffect(()=>{void load()},[]);

 async function record(jobId:string){
  const f=form[jobId]||{outcome:"",note:"",reuse:false};
  if(!f.outcome||f.note.trim().length<5)return;
  setBusy(jobId);setError("");
  try{
   const job=data?.recent_jobs.find(item=>item.id===jobId);
   const prospectId=job?.input?.context?.prospectId||null;
   const r=await fetch("/api/agents/training",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"record_outcome",jobId,prospectId,outcome:f.outcome,note:f.note,approvedForReuse:f.reuse})});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||"Could not record outcome");
   setForm(v=>({...v,[jobId]:{outcome:"",note:"",reuse:false}}));
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not record outcome")}
  finally{setBusy("")}
 }

 const metrics=data?.metrics;
 return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-7xl">
  <header className="flex flex-wrap items-end justify-between gap-4">
   <div><Link href="/agents" className="inline-flex items-center gap-2 text-xs text-[var(--prism-muted)]"><ArrowLeft size={14}/>Agents</Link><p className="mt-4 text-xs tracking-widest text-violet-300">AI ENGINEERING · TRAINING LAB</p><h1 className="mt-2 text-3xl font-semibold">Train on real outcomes, not activity</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">COMIT improves by storing founder-reviewed lessons, scoring draft quality and connecting each agent task to replies, meetings, proposals, wins and losses. This is learning memory and evaluation, not a claim that model weights are being fine-tuned.</p></div>
   <button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button>
  </header>

  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-200">{error}</p>}
  {data&&!data.schema_ready&&<div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 text-sm"><TriangleAlert size={18}/><div><b>Training storage is code-ready but not applied.</b><p className="mt-1 text-[var(--prism-muted)]">Review and manually apply comit/supabase/agent-training.sql before outcomes can become reusable live lessons.</p></div></div>}

  {metrics&&<section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   {[
    ["Prospects",metrics.prospects,Target],
    ["Sent outreach",metrics.sent,Database],
    ["Recorded replies",metrics.replies,CheckCircle2],
    ["Reply rate",metrics.reply_rate+"%",BrainCircuit],
    ["Meetings",metrics.meetings,CheckCircle2],
    ["Won",metrics.won,CheckCircle2],
    ["Avg agent quality",metrics.average_quality||"—",BrainCircuit],
    ["Reusable lessons",metrics.reusable_lessons,Database],
   ].map(([label,value,Icon]:any)=><article key={label} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><Icon size={18} className="text-violet-300"/><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-[var(--prism-muted)]">{label}</p></article>)}
  </section>}

  {!!data?.warnings?.length&&<section className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5"><h2 className="font-medium">Training blockers first</h2><div className="mt-3 space-y-2">{data.warnings.map(w=><p key={w} className="text-sm text-[var(--prism-muted)]">• {w}</p>)}</div></section>}

  <section className="mt-6 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
   <h2 className="font-medium">Outcome loop</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">After an agent task reaches the market, record what actually happened. Only check “reuse” when the lesson is specific, true and useful for future work.</p>
   <div className="mt-4 space-y-4">{(data?.recent_jobs||[]).slice(0,12).map(job=>{
    const f=form[job.id]||{outcome:"",note:"",reuse:false};
    const score=job.output?.quality_evaluation?.score||job.output?.evaluation?.score;
    return <article key={job.id} className="rounded-xl border border-[var(--prism-border)] p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium">{job.input?.task||"Agent task"}</p><p className="mt-1 text-xs text-[var(--prism-muted)]">{job.input?.agent} · {job.status}{score!==undefined?" · quality "+score+"/100":""}</p></div><span className="text-xs text-[var(--prism-muted)]">{new Date(job.created_at).toLocaleString()}</span></div>
     <div className="mt-3 grid gap-2 md:grid-cols-[12rem_1fr_auto]"><select value={f.outcome} onChange={e=>setForm(v=>({...v,[job.id]:{...f,outcome:e.target.value}}))} className="rounded-lg border border-[var(--prism-border)] bg-black/20 px-3 py-2 text-sm"><option value="">Outcome</option>{outcomes.map(o=><option key={o} value={o}>{o.replaceAll("_"," ")}</option>)}</select><input value={f.note} onChange={e=>setForm(v=>({...v,[job.id]:{...f,note:e.target.value}}))} placeholder="What actually worked or failed, and why?" className="rounded-lg border border-[var(--prism-border)] bg-black/20 px-3 py-2 text-sm"/><button disabled={busy===job.id||!f.outcome||f.note.trim().length<5} onClick={()=>void record(job.id)} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">Record</button></div>
     <label className="mt-2 flex items-center gap-2 text-xs text-[var(--prism-muted)]"><input type="checkbox" checked={f.reuse} onChange={e=>setForm(v=>({...v,[job.id]:{...f,reuse:e.target.checked}}))}/>Founder-approved lesson can be reused by future agent runs</label>
    </article>
   })}{!data?.recent_jobs?.length&&<p className="text-sm text-[var(--prism-muted)]">No agent jobs yet.</p>}</div>
  </section>

  <section className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5"><h2 className="font-medium">Training priority</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">Optimize in this order: verified triggers → qualification → personalized proof → replies → meetings → proposals → wins. Sending volume is not a training success metric.</p></section>
 </div></main>
}
