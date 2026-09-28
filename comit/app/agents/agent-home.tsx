"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";

type Agent={id:string;name:string;purpose:string;owner:string;success:string};
type Prospect={id:string;name:string;email?:string|null;stage?:string;score?:number;source?:string|null;metadata?:Record<string,any>;companies?:{name?:string;industry?:string;location?:string;website?:string}|null};
type Job={id:string;status:string;input:{task:string;agent:string;context?:Record<string,any>};output?:{owner?:string;model_draft?:string;recommended_draft?:string;model_mode?:string;quality_gate?:string;quality_evaluation?:{score:number;grade:string;pass:boolean;revision?:string[]};approved_lessons?:string[];artifact?:{title:string;body:string;checks:string[]};brief?:{recommendation?:{experiment:string;kpi:string};research_gaps?:string[]};sales_strategy?:{score?:{total:number;band:string;missing?:string[]};nextAction?:string};handoff?:{to:string;reason:string};external_action_taken?:boolean}};
type Message={id:string;event_type:string;aggregate_id:string;created_at:string;payload:{note?:string;handoff?:{to:string;reason:string}}};

export default function AgentHome(){
 const [agents,setAgents]=useState<Agent[]>([]),[jobs,setJobs]=useState<Job[]>([]),[messages,setMessages]=useState<Message[]>([]),[pending,setPending]=useState<Message[]>([]);
 const [prospects,setProspects]=useState<Prospect[]>([]);
 const [task,setTask]=useState(""),[business,setBusiness]=useState(""),[agentId,setAgentId]=useState("auto"),[prospectId,setProspectId]=useState(""),[feedback,setFeedback]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(""),[error,setError]=useState("");

 const selected=useMemo(()=>prospects.find(p=>p.id===prospectId)||null,[prospects,prospectId]);

 async function load(){
  try{
   const [a,p]=await Promise.all([fetch("/api/agents",{cache:"no-store"}),fetch("/api/prospects",{cache:"no-store"})]);
   const ad=await a.json(),pd=await p.json();
   if(!a.ok)throw new Error(ad.error||"Agent Home unavailable");
   setAgents(ad.agents||[]);setJobs(ad.jobs||[]);setMessages(ad.messages||[]);setPending(ad.pending_feedback||[]);
   if(p.ok)setProspects(pd.data||[]);
  }catch(e){setError(e instanceof Error?e.message:"Agent Home unavailable")}
 }

 useEffect(()=>{void load()},[]);

 function contextForCreate(){
  if(!selected)return {business};
  const m=selected.metadata||{};
  return {
   prospectId:selected.id,
   business:selected.name,
   industry:m.industry||selected.companies?.industry||"",
   location:m.location||selected.companies?.location||"",
   stage:selected.stage||"",
   score:selected.score||0,
   fit_reason:m.fit_reason||"",
   trigger:m.trigger||m.buying_signal||m.recent_news||m.recent_change||"",
   evidence:[m.source_url,m.evidence,selected.source].filter(Boolean),
   email:selected.email||"",
   decision_maker_known:Boolean(m.decision_maker||m.decision_maker_name),
   budget_signal:Boolean(m.budget_signal||m.budget),
   proof_available:Boolean(m.proof_asset||m.case_study)
  };
 }

 async function send(action:string,jobId?:string,extra:Record<string,string>={}){
  setBusy(jobId||"new");setError("");
  try{
   const body=action==="create"
    ?{action,task,context:contextForCreate(),agentId:agentId==="auto"?undefined:agentId}
    :{action,jobId,note:feedback[jobId||""],...extra};
   const r=await fetch("/api/agents",{method:"POST",headers:{"content-type":"application/json",...(action==="create"?{"x-idempotency-key":crypto.randomUUID()}: {})},body:JSON.stringify(body)});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||"Action failed");
   if(action==="create")setTask("");
   if(action==="feedback")setFeedback(v=>({...v,[jobId||""]:""}));
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Action failed")}
  finally{setBusy("")}
 }

 return <section className="mt-7 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
  <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-violet-300">Agent Home · sales learning mode</p><h2 className="mt-1 text-xl font-semibold">Research → qualify → sell → learn</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">Start from a real CRM prospect or a manual task. Agents draft and score work; external actions still require founder review.</p></div><div className="flex flex-wrap gap-2"><Link href="/agents/mission-control" className="rounded-lg border border-violet-400/40 px-3 py-2 text-xs text-violet-200">Mission Control</Link><Link href="/agents/training" className="rounded-lg border border-violet-400/40 px-3 py-2 text-xs text-violet-200">Training Lab</Link><button type="button" onClick={()=>void load()} className="rounded-lg border border-[var(--prism-border)] px-3 py-2 text-xs">Refresh</button></div></div>

  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{agents.map(a=><article key={a.id} className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-sm font-semibold">{a.name}</p><p className="mt-1 text-xs text-[var(--prism-muted)]">{a.purpose}</p><p className="mt-2 text-xs">Owner: {a.owner}</p></article>)}</div>

  <form onSubmit={e=>{e.preventDefault();void send("create")}} className="mt-5 space-y-3">
   <div className="grid gap-3 md:grid-cols-3"><label className="text-xs text-[var(--prism-muted)]">CRM prospect<select value={prospectId} onChange={e=>{setProspectId(e.target.value);const p=prospects.find(x=>x.id===e.target.value);if(p){setBusiness(p.name);if(!task)setTask("Research and qualify this prospect, then recommend the strongest next sales action.");}}} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm text-[var(--prism-text)]"><option value="">Manual / no CRM prospect</option>{prospects.slice(0,100).map(p=><option key={p.id} value={p.id}>{p.name} · {p.stage||"new"} · {p.score||0}</option>)}</select></label><label className="text-xs text-[var(--prism-muted)]">Business scope<input maxLength={120} value={business} onChange={e=>setBusiness(e.target.value)} placeholder="Client or prospect name" className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm text-[var(--prism-text)]"/></label><label className="text-xs text-[var(--prism-muted)]">Route to<select value={agentId} onChange={e=>setAgentId(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm text-[var(--prism-text)]"><option value="auto">Orchestrator</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>
   {selected&&<div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-3 text-xs text-[var(--prism-muted)]"><b className="text-[var(--prism-text)]">{selected.name}</b> · {selected.metadata?.industry||selected.companies?.industry||"industry missing"} · {selected.metadata?.location||selected.companies?.location||"location missing"} · trigger: {selected.metadata?.trigger||selected.metadata?.buying_signal||selected.metadata?.recent_news||"not verified"}</div>}
   <div className="grid gap-3 md:grid-cols-[1fr_auto]"><label className="text-xs text-[var(--prism-muted)]">Agent task<input required maxLength={2000} value={task} onChange={e=>setTask(e.target.value)} placeholder="Research and qualify this prospect, then recommend the next sales action." className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm text-[var(--prism-text)]"/></label><button disabled={!!busy} className="self-end rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">Queue agent task</button></div>
  </form>

  {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}

  {pending.length>0&&<div className="mt-5 rounded-xl border border-amber-500/30 p-4"><h3 className="text-sm font-semibold">Feedback awaiting founder review</h3>{pending.map(m=><div key={m.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{m.payload?.note||"Correction"}</span><div className="flex gap-2"><button disabled={!!busy} onClick={()=>void send("review_feedback",m.aggregate_id,{feedbackId:m.id,decision:"accept"})} className="rounded-lg border border-emerald-500/40 px-2 py-1">Approve for reuse</button><button disabled={!!busy} onClick={()=>void send("review_feedback",m.aggregate_id,{feedbackId:m.id,decision:"reject"})} className="rounded-lg border border-red-500/40 px-2 py-1">Reject</button></div></div>)}</div>}

  <div className="mt-5 space-y-3">{jobs.map(j=><article key={j.id} className="rounded-xl border border-[var(--prism-border)] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{j.input.task}</p><p className="mt-1 text-xs text-[var(--prism-muted)]">{j.input.agent} · {j.status} · {j.output?.owner||"owner assigned on draft"}{j.input.context?.business?" · "+j.input.context.business:""}</p></div><div className="flex gap-2">{j.status==="queued"&&<button disabled={!!busy} onClick={()=>void send("run",j.id)} className="rounded-lg border border-[var(--prism-border)] px-3 py-1.5 text-xs">Run agent</button>}{j.status==="awaiting_approval"&&<><button disabled={!!busy} onClick={()=>void send("approve",j.id)} className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs">Approve draft</button><button disabled={!!busy} onClick={()=>void send("reject",j.id)} className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs">Reject</button></>}</div></div>
   {j.output?.artifact&&<div className="mt-3 rounded-lg bg-white/5 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{j.output.artifact.title}</p>{j.output.quality_evaluation&&<span className={"rounded-full px-2 py-1 text-[11px] "+(j.output.quality_evaluation.pass?"bg-emerald-500/15 text-emerald-200":"bg-amber-500/15 text-amber-200")}>Quality {j.output.quality_evaluation.score}/100 · {j.output.quality_evaluation.grade}</span>}</div><p className="mt-1 whitespace-pre-wrap">{j.output.artifact.body}</p><p className="mt-2 text-xs text-[var(--prism-muted)]">Checks: {j.output.artifact.checks.join(" · ")}</p>{j.output.sales_strategy?.score&&<p className="mt-2 text-xs text-[var(--prism-muted)]">Opportunity: {j.output.sales_strategy.score.total}/100 · {j.output.sales_strategy.score.band}</p>}<p className="mt-2 text-xs text-[var(--prism-muted)]">KPI: {j.output.brief?.recommendation?.kpi||"Progress to a verified reply, meeting or next decision"}</p>{j.output.quality_evaluation?.revision?.length?<p className="mt-2 text-xs text-amber-200">Revise: {j.output.quality_evaluation.revision.join(" · ")}</p>:null}</div>}
   {j.output?.model_draft&&<div className="mt-2 rounded-lg border border-violet-400/30 p-3 text-sm"><p className="text-xs text-violet-300">Optional connected-model draft · scored against deterministic draft</p><p className="mt-2 whitespace-pre-wrap">{j.output.model_draft}</p></div>}
   {!!j.output?.approved_lessons?.length&&<p className="mt-2 text-xs text-[var(--prism-muted)]">Training lessons used: {j.output.approved_lessons.join(" · ")}</p>}
   {j.output?.handoff&&<p className="mt-2 text-xs text-amber-200">Suggested handoff → {j.output.handoff.to}: {j.output.handoff.reason}</p>}
   <div className="mt-3 flex gap-2"><input aria-label={"Feedback for "+j.input.task} value={feedback[j.id]||""} onChange={e=>setFeedback(v=>({...v,[j.id]:e.target.value}))} placeholder="Record a correction or measured outcome" className="min-w-0 flex-1 rounded-lg border border-[var(--prism-border)] bg-black/20 px-3 py-2 text-xs"/><button disabled={!!busy||!(feedback[j.id]||"").trim()} onClick={()=>void send("feedback",j.id)} className="rounded-lg border border-[var(--prism-border)] px-3 py-2 text-xs">Record</button></div>
   {messages.filter(m=>m.aggregate_id===j.id).slice(0,5).map(m=><p key={m.id} className="mt-2 text-xs text-[var(--prism-muted)]">{m.event_type} · {new Date(m.created_at).toLocaleString()}{m.payload?.note?" · "+m.payload.note:""}</p>)}
  </article>)}{jobs.length===0&&<p className="text-sm text-[var(--prism-muted)]">No agent tasks yet. Select a CRM prospect and queue the first research/qualification task.</p>}</div>
 </section>;
}
