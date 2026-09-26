"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {Bell, CheckCircle2, Clock3, Copy, Pause, Play, ShieldCheck, Workflow} from "lucide-react";

type Run={id:string;workflow:string;status:"completed"|"skipped"|"failed";createdAt:string;detail:string};
const RUNS_KEY="comit.localAutomationRuns.v1";
const CHECKINS_KEY="comit.teamCheckins.v1";

function readRuns():Run[]{try{const value=JSON.parse(localStorage.getItem(RUNS_KEY)||"[]");return Array.isArray(value)?value:[]}catch{return[]}}

export default function AutomationPage(){
  const [runs,setRuns]=useState<Run[]>([]),[brief,setBrief]=useState(""),[notice,setNotice]=useState(""),[reminders,setReminders]=useState(false);
  useEffect(()=>{setRuns(readRuns());setReminders(localStorage.getItem("comit.localReminders.v1")==="on")},[]);
  function saveRun(workflow:string,status:Run["status"],detail:string){
    const entry:Run={id:crypto.randomUUID(),workflow,status,createdAt:new Date().toISOString(),detail};
    const next=[...readRuns(),entry].slice(-50);localStorage.setItem(RUNS_KEY,JSON.stringify(next));setRuns(next);return entry;
  }
  function runBrief(){
    const checkins=(()=>{try{return JSON.parse(localStorage.getItem(CHECKINS_KEY)||"[]")}catch{return[]}})();
    const today=new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
    const content=`COMIT daily focus · ${today}\n\nTeam check-ins recorded on this device: ${Array.isArray(checkins)?checkins.filter((x:any)=>new Date(x.at).toDateString()===new Date().toDateString()).length:0}.\n\n1. Review pending prospect approvals.\n2. Confirm the owner and next action for each active opportunity.\n3. Record replies, meetings, and delivery outcomes.\n\nNo external services were called.`;
    setBrief(content);saveRun("Daily focus brief","completed","Brief generated locally and saved in this browser.");setNotice("Daily focus brief generated on this device.");
  }
  function runOverdueGuard(){
    saveRun("Overdue task guard","skipped","No connected task source is available. No task data was changed.");setNotice("Skipped safely: task data is not connected.");
  }
  function toggleReminders(){
    const next=!reminders;localStorage.setItem("comit.localReminders.v1",next?"on":"off");setReminders(next);
    saveRun("Local reminder preference", "completed", next?"Reminder preference saved in this browser; it runs only while this page is open.":"Reminder preference paused in this browser.");
    setNotice(next?"Local reminder preference enabled. This browser must stay open; no background schedule is created.":"Local reminder preference paused.");
  }
  async function copyBrief(){if(!brief)return;try{await navigator.clipboard.writeText(brief);setNotice("Brief copied.")}catch{setNotice("Clipboard access is unavailable. Select and copy the brief manually.")}}
  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-6xl">
    <p className="text-xs tracking-wide text-[var(--prism-muted)]">WORKFLOW CONTROL</p><h1 className="mt-1 text-3xl font-semibold">Automation</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">Orbit’s workflow catalog is retained, with explicit execution states. Current actions run in this browser only; they do not call n8n, AI providers, Gmail, or metered services.</p>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm"><ShieldCheck size={18} className="shrink-0"/><p>External integrations are blocked until authorization and a no-charge usage cap are verified. Hosting costs depend on the provider plan. “Skipped” means no side effect occurred.</p></div>
    {notice&&<p role="status" className="mt-4 rounded-xl border border-[var(--prism-border)] p-3 text-sm">{notice}</p>}
    <section className="mt-6 grid gap-4 lg:grid-cols-3">
      <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Workflow size={17}/><h2 className="font-semibold">Daily command brief</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">Creates a local, reusable focus brief from COMIT’s safe defaults and this browser’s check-in count.</p><button onClick={runBrief} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-black"><Play size={14}/>Run now</button></article>
      <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Clock3 size={17}/><h2 className="font-semibold">Overdue task guard</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">Checks whether COMIT has a connected task source before it can flag overdue work.</p><button onClick={runOverdueGuard} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><Play size={14}/>Check safely</button></article>
      <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Bell size={17}/><h2 className="font-semibold">Local reminder preference</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">Stores a reminder preference in this browser. Background scheduling is unavailable without a verified free scheduler.</p><button onClick={toggleReminders} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm">{reminders?<Pause size={14}/>:<Play size={14}/>}{reminders?"Pause":"Enable preference"}</button></article>
    </section>
    {brief&&<section className="mt-5 rounded-2xl border border-violet-400/30 bg-violet-500/5 p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Latest local brief</h2><button onClick={copyBrief} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-xs"><Copy size={14}/>Copy</button></div><pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-6">{brief}</pre></section>}
    <section className="mt-5 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><CheckCircle2 size={17}/><h2 className="font-semibold">Run history</h2></div><div className="mt-4 space-y-2">{runs.slice().reverse().map(run=><div key={run.id} className="rounded-xl border border-[var(--prism-border)] p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{run.workflow}</strong><span className="capitalize text-[var(--prism-muted)]">{run.status} · {new Date(run.createdAt).toLocaleString()}</span></div><p className="mt-1 text-xs text-[var(--prism-muted)]">{run.detail}</p></div>)}{!runs.length&&<p className="text-sm text-[var(--prism-muted)]">No workflows have run in this browser yet.</p>}</div></section>
    <p className="mt-5 text-sm text-[var(--prism-muted)]">Future integrations: review the <Link href="/integrations" className="underline">integration readiness</Link> page. External actions require explicit approval and a confirmed zero-billing cap.</p>
  </div></main>;
}
