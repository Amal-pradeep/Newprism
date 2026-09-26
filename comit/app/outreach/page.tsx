"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {Clipboard,Mail,RefreshCw,ShieldCheck} from "lucide-react";

type LocalProspect={id:string;name:string;email:string;stage:string;draft?:{status:string;subject:string;body:string;updatedAt:string}};
const STORAGE_KEY="comit.localProspects.v1";
function readRecords():LocalProspect[]{try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(value)?value:[]}catch{return[]}}

export default function OutreachDashboard(){
  const [prospects,setProspects]=useState<LocalProspect[]>([]),[message,setMessage]=useState("");
  function refresh(){setProspects(readRecords());setMessage("Local records refreshed. No external service was contacted.")}
  useEffect(()=>{setProspects(readRecords())},[]);
  async function copy(text:string){try{await navigator.clipboard.writeText(text);setMessage("Draft copied. Review it before using your own mail app.")}catch{setMessage("Clipboard access is unavailable. Open the draft in Prospects to copy it manually.")}}
  const drafts=prospects.filter(p=>p.draft);
  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><a href="/outreach/shared" className="mb-4 inline-block text-xs text-[var(--prism-muted)] underline">Connected team workspace (sign-in required)</a><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs tracking-wide text-[var(--prism-muted)]">REVENUE ENGINE</p><h1 className="mt-1 text-3xl font-semibold">Outreach review</h1><p className="mt-2 text-sm text-[var(--prism-muted)]">Draft preparation and review stay local. Gmail send and sync are disabled by the no-billing rule.</p></div><button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh local records</button></div>
    {message&&<p role="status" className="mt-4 rounded-xl border border-[var(--prism-border)] p-3 text-sm">{message}</p>}
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm"><ShieldCheck size={17} className="shrink-0"/><p>No Gmail account is connected and the platform’s no-charge usage cap has not been verified. Nothing is synchronized or sent. Review and copy drafts manually if needed.</p></div>
    <section className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><Mail size={16}/><div className="mt-3 text-2xl font-semibold">{drafts.length}</div><div className="text-xs text-[var(--prism-muted)]">Local drafts</div></div><div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="text-2xl font-semibold">{drafts.filter(p=>p.draft?.status==="pending").length}</div><div className="text-xs text-[var(--prism-muted)]">Awaiting review</div></div><div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="text-2xl font-semibold">0</div><div className="text-xs text-[var(--prism-muted)]">Messages sent by COMIT</div></div></section>
    <section className="mt-5 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><h2 className="font-semibold">Draft queue</h2><div className="mt-4 space-y-3">{drafts.map(p=><article key={p.id} className="rounded-xl border border-[var(--prism-border)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">{p.name}</h3><p className="mt-1 text-xs text-[var(--prism-muted)]">To: {p.email||"recipient not set"} · {p.draft?.status} · saved {new Date(p.draft!.updatedAt).toLocaleString()}</p></div><button onClick={()=>copy(p.draft!.body)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-xs"><Clipboard size={14}/>Copy draft</button></div><p className="mt-3 text-sm font-medium">{p.draft?.subject}</p><pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-[var(--prism-muted)]">{p.draft?.body}</pre></article>)}{!drafts.length&&<p className="py-6 text-center text-sm text-[var(--prism-muted)]">No drafts in this browser. Prepare one from the <Link href="/prospects" className="underline">Prospects</Link> page.</p>}</div></section>
  </div></main>;
}
