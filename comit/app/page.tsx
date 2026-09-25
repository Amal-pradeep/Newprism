"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {Activity, ArrowUpRight, Bell, Bot, Mail, ShieldCheck, Sparkles, Target, Users, Workflow, Clapperboard} from "lucide-react";
import ComitAssistant from "@/components/comit-assistant";

const cards=[
  ["Prospects","Research and qualify accounts","/prospects",Target],
  ["Outreach","Review drafts and follow-ups","/outreach",Mail],
  ["Team","Ownership and check-ins","/team",Users],
  ["Creative Library","Shahid’s shoots, edits and approved patterns","/creative-library",Clapperboard],
  ["AI Agents","Plan and review measurable experiments","/agents",Bot],
  ["Automation","Manage no-cost local workflows","/automation",Workflow],
  ["Integrations","Check provider readiness","/integrations",Sparkles],
] as const;

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};

export default function CommandCenter(){
  const [nudge,setNudge]=useState("A clear next action is better than another open tab.");
  const [notice,setNotice]=useState("");
  const [installPrompt,setInstallPrompt]=useState<InstallPrompt|null>(null);
  useEffect(()=>{
    const onInstall=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPrompt)};
    window.addEventListener("beforeinstallprompt",onInstall);
    return()=>window.removeEventListener("beforeinstallprompt",onInstall);
  },[]);
  async function notify(){
    if(!("Notification" in window)){setNotice("This browser does not support desktop notifications.");return}
    const permission=Notification.permission==="default"?await Notification.requestPermission():Notification.permission;
    if(permission!=="granted"){setNotice("Notifications were not enabled. You can still use COMIT without them.");return}
    new Notification("COMIT check-in",{body:nudge});
    setNotice("Check-in reminder shown on this device.");
  }
  async function install(){
    if(!installPrompt){setNotice("Install is unavailable in this browser. Use the browser menu’s Install or Add to Home Screen option.");return}
    await installPrompt.prompt();
    const choice=await installPrompt.userChoice;
    setNotice(choice.outcome==="accepted"?"COMIT was added to this device.":"Install was dismissed.");
    setInstallPrompt(null);
  }
  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs tracking-wide text-[var(--prism-muted)]">BUSINESS OPERATING SYSTEM</p><h1 className="mt-1 text-3xl font-semibold">Command Center</h1><p className="mt-2 text-sm text-[var(--prism-muted)]">Observe → decide → act → learn. External actions require approval.</p></div>
        <div className="flex gap-2"><button onClick={notify} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><Bell size={15}/>Reminder</button><button onClick={install} className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black">Install app</button></div>
      </header>
      {notice&&<p role="status" className="mt-4 rounded-xl border border-[var(--prism-border)] p-3 text-sm">{notice}</p>}
      <section aria-label="COMIT sections" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,desc,href,Icon])=><Link href={href} key={href} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5 transition hover:-translate-y-0.5 hover:bg-white/[.04]"><div className="flex items-center justify-between"><Icon className="text-[var(--prism-violet)]" size={20}/><ArrowUpRight size={16} className="text-[var(--prism-muted)]"/></div><div className="mt-4 font-medium">{label}</div><div className="mt-1 text-xs text-[var(--prism-muted)]">{desc}</div></Link>)}</section>
      <ComitAssistant/>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Activity size={17}/><h2 className="font-medium">Revenue loop</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">Research evidence, qualify fit, prepare work for review, then record the result. COMIT does not send, publish, or spend automatically.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/prospects" className="rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm">Open prospects</Link><Link href="/automation" className="rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm">Review automation</Link></div></section>
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5"><div className="flex items-center gap-2"><ShieldCheck size={17}/><h2 className="font-medium">Ready for today</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">Start with five researched prospects, assign the next action, and collect video references in Shahid’s Creative Library. Email sending is paused.</p></section>
      </div>
      <section className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5"><div className="flex items-center gap-3"><Sparkles size={18}/><div><h2 className="font-medium">Next step</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">{nudge}</p></div></div></section>
    </div>
  </main>;
}
