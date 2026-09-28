"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {Activity,ArrowLeft,BrainCircuit,CheckCircle2,CirclePause,Clock3,Plug,RefreshCw,ShieldCheck,Sparkles,Target,Workflow} from "lucide-react";

type Step={id:string;status:string;input:any;output:any;created_at:string;completed_at?:string|null;error?:string|null};
type Mission={id:string;status:string;input:any;output:any;created_at:string;completed_at?:string|null;steps:Step[];progress:{total:number;completed:number;failed:number;active:number;percent:number}};
type Capability={id:string;name:string;category:string;openSource:boolean;noCostCore:boolean;purpose:string;risk:string;status:string;notes:string};
type Skill={id:string;name:string;purpose:string;preferredAgents:string[];instructions:string[];success:string[];requiresApproval:boolean};
type ActivityItem={id:string;status:string;agent:string;title:string;missionId?:string|null;created_at:string;quality?:number|null};
type Health={queued:number;processing:number;awaiting_review:number;failed:number;blocked:number;average_quality:number};
type Dashboard={ok:boolean;missions:Mission[];capabilities:Capability[];skills:Skill[];recentActivity:ActivityItem[];health:Health;mode:string;policy:string;error?:string};

function statusClass(status:string){
  if(status==="completed")return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if(status==="paused"||status==="failed")return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if(status==="queued"||status==="processing"||status==="awaiting_approval"||status==="active")return "border-violet-400/30 bg-violet-500/10 text-violet-200";
  return "border-[var(--prism-border)] bg-white/5 text-[var(--prism-muted)]";
}

export default function MissionControl(){
  const [data,setData]=useState<Dashboard|null>(null);
  const [goal,setGoal]=useState("");
  const [business,setBusiness]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function load(){
    setError("");
    try{
      const r=await fetch("/api/agents/missions",{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Mission Control unavailable");
      setData(d);
    }catch(e){setError(e instanceof Error?e.message:"Mission Control unavailable")}
  }
  useEffect(()=>{void load()},[]);

  async function createMission(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const r=await fetch("/api/agents/missions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task:goal,context:{business}})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Could not create mission");
      setGoal("");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not create mission")}
    finally{setBusy(false)}
  }

  const stats=useMemo(()=>{
    const missions=data?.missions||[];
    return {
      total:missions.length,
      active:missions.filter(m=>m.status==="active").length,
      paused:missions.filter(m=>m.status==="paused").length,
      completed:missions.filter(m=>m.status==="completed").length
    };
  },[data]);

  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><Link href="/agents" className="inline-flex items-center gap-2 text-xs text-[var(--prism-muted)]"><ArrowLeft size={14}/>Agents</Link><p className="mt-4 text-xs tracking-[.22em] text-violet-300">SUPER AGENT · MISSION CONTROL</p><h1 className="mt-2 text-3xl font-semibold">Plan deeply. Delegate narrowly. Stop safely.</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">COMIT uses a bounded supervisor: one mission becomes small specialist steps, each with its own success condition, retry budget and approval boundary.</p></div>
      <button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button>
    </header>

    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-200">{error}</p>}

    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {[
        ["Missions",stats.total,Workflow],
        ["Active",stats.active,Activity],
        ["Paused",stats.paused,CirclePause],
        ["Completed",stats.completed,CheckCircle2],
        ["Awaiting review",data?.health?.awaiting_review||0,Clock3],
        ["Avg quality",data?.health?.average_quality?data.health.average_quality+"/100":"—",Target]
      ].map(([label,value,Icon]:any)=><article key={label} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><Icon size={18} className="text-violet-300"/><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-[var(--prism-muted)]">{label}</p></article>)}
    </section>

    <form onSubmit={createMission} className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5">
      <div className="flex items-center gap-2"><BrainCircuit size={18}/><h2 className="font-medium">Create a bounded mission</h2></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[12rem_1fr_auto]"><input maxLength={120} value={business} onChange={e=>setBusiness(e.target.value)} placeholder="Business / client" className="rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-3 text-sm"/><input required maxLength={2000} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Example: turn this restaurant prospect into a qualified meeting without generic outreach" className="rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-3 text-sm"/><button disabled={busy} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{busy?"Planning…":"Create mission"}</button></div>
      <p className="mt-3 text-xs text-[var(--prism-muted)]">The first specialist step is queued. Later steps stay blocked until the previous step is reviewed and approved.</p>
    </form>

    <section className="mt-6 space-y-4">
      {(data?.missions||[]).map(mission=><article key={mission.id} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={"rounded-full border px-2 py-1 text-[11px] "+statusClass(mission.status)}>{mission.status}</span><span className="text-xs text-[var(--prism-muted)]">{new Date(mission.created_at).toLocaleString()}</span></div><div className="mt-3 flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{mission.input?.plan?.title||mission.input?.task}</h2>{mission.input?.plan?.skill?.name&&<span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200">Skill · {mission.input.plan.skill.name}</span>}</div><p className="mt-1 max-w-3xl text-sm text-[var(--prism-muted)]">{mission.input?.task}</p></div><div className="min-w-44"><div className="flex items-center justify-between text-xs text-[var(--prism-muted)]"><span>Progress</span><span>{mission.progress.percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-white" style={{width:mission.progress.percent+"%"}}/></div></div></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-5">{mission.steps.map((s,index)=><div key={s.id} className={"rounded-xl border p-3 "+statusClass(s.status)}><div className="flex items-center justify-between text-[11px]"><span>{String(index+1).padStart(2,"0")}</span><span>{s.status}</span></div><p className="mt-2 text-sm font-medium">{s.input?.context?.missionStepTitle||s.input?.agent}</p><p className="mt-1 text-xs opacity-80">{s.input?.agent}</p><p className="mt-2 text-xs opacity-80">{s.input?.context?.missionSuccess}</p></div>)}</div>
        {mission.status==="active"&&<p className="mt-4 text-xs text-[var(--prism-muted)]">Continue from <Link href="/agents" className="underline">Agent Home</Link>: run the queued step, review its result, and approve it to unlock the next specialist.</p>}
      </article>)}
      {!data?.missions?.length&&<div className="rounded-2xl border border-dashed border-[var(--prism-border)] p-8 text-center text-sm text-[var(--prism-muted)]">No missions yet. Create one above.</div>}
    </section>

    <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Sparkles size={18}/><h2 className="font-medium">Reusable agent skills</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">Skills encode Prism's repeatable ways of working so specialists follow the same conventions instead of relying on prompt memory.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{(data?.skills||[]).map(skill=><article key={skill.id} className="rounded-xl border border-[var(--prism-border)] p-4"><div className="flex items-start justify-between gap-2"><p className="font-medium">{skill.name}</p>{skill.requiresApproval&&<span className="rounded-full border border-amber-400/30 px-2 py-1 text-[10px] text-amber-200">review gate</span>}</div><p className="mt-2 text-xs text-[var(--prism-muted)]">{skill.purpose}</p><p className="mt-3 text-[11px] text-[var(--prism-muted)]">Agents: {skill.preferredAgents.join(" → ")}</p></article>)}</div></article>
      <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Activity size={18}/><h2 className="font-medium">Recent agent activity</h2></div><div className="mt-4 space-y-3">{(data?.recentActivity||[]).slice(0,8).map(item=><div key={item.id} className="flex items-start gap-3"><span className={"mt-1 h-2.5 w-2.5 shrink-0 rounded-full border "+(item.status==="completed"?"border-emerald-300 bg-emerald-300":item.status==="failed"?"border-amber-300 bg-amber-300":"border-violet-300 bg-violet-300")}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate text-sm font-medium">{item.title}</p><span className="text-[10px] text-[var(--prism-muted)]">{new Date(item.created_at).toLocaleTimeString()}</span></div><p className="mt-1 text-xs text-[var(--prism-muted)]">{item.agent} · {item.status}{item.quality?" · quality "+item.quality+"/100":""}</p></div></div>)}{!data?.recentActivity?.length&&<p className="text-sm text-[var(--prism-muted)]">No mission activity yet.</p>}</div></article>
    </section>

    <section className="mt-7 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Plug size={18}/><h2 className="font-medium">Free capability registry</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">These are reviewed building blocks, not auto-installed plugins. Code-executing plugins stay off until their source and permissions are reviewed.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(data?.capabilities||[]).map(cap=><article key={cap.id} className="rounded-xl border border-[var(--prism-border)] p-4"><div className="flex items-center justify-between gap-2"><p className="font-medium">{cap.name}</p><span className={"rounded-full border px-2 py-1 text-[10px] "+(cap.status==="core-ready"?"border-emerald-400/30 text-emerald-200":"border-violet-400/30 text-violet-200")}>{cap.status}</span></div><p className="mt-2 text-xs text-[var(--prism-muted)]">{cap.purpose}</p><p className="mt-3 text-[11px] text-[var(--prism-muted)]">Risk: {cap.risk} · {cap.openSource?"open source":"service"} · {cap.noCostCore?"no-cost core":"cost varies"}</p></article>)}</div></section>

    <section className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5"><div className="flex items-center gap-2"><ShieldCheck size={18}/><h2 className="font-medium">Supervisor contract</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">{data?.policy||"External writes remain approval-gated."}</p></section>
  </div></main>;
}
