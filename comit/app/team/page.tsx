"use client";

import { useMemo, useState } from "react";

type Priority = "High" | "Medium" | "Low";
type Task = { title: string; priority: Priority; due: string; aiReason: string };
type TeamMember = { name: string; role: string; focus: string; avatar: string; tasks: Task[] };

const seed: TeamMember[] = [
  {name:"Amal",role:"Founder / Strategy",focus:"Growth, clients & business intelligence",avatar:"AP",tasks:[
    {title:"Review high-value prospect queue",priority:"High",due:"Today",aiReason:"AI detected strong buying signals."},
    {title:"Approve outbound campaign drafts",priority:"High",due:"Today",aiReason:"3 prospects reached approval state."},
    {title:"Review weekly revenue opportunities",priority:"Medium",due:"Tomorrow",aiReason:"Pipeline signals changed."}]},
  {name:"Aadil",role:"Business Development",focus:"Prospecting, outreach & follow-ups",avatar:"AS",tasks:[
    {title:"Follow up with qualified prospects",priority:"High",due:"Today",aiReason:"Reply likelihood is elevated."},
    {title:"Research new UAE opportunities",priority:"Medium",due:"Today",aiReason:"AI found new matching companies."},
    {title:"Update meeting outcomes",priority:"Low",due:"Tomorrow",aiReason:"Keeps CRM intelligence current."}]},
  {name:"Jishnu",role:"Design & Creative",focus:"Creative production & brand systems",avatar:"JS",tasks:[
    {title:"Finish priority client creatives",priority:"High",due:"Today",aiReason:"Client deadline is approaching."},
    {title:"Prepare next content batch",priority:"Medium",due:"Tomorrow",aiReason:"Content engine detected a gap."},
    {title:"Review creative requests",priority:"Low",due:"This week",aiReason:"AI grouped similar requests."}]}
];

export default function TeamPage() {
  const [members,setMembers]=useState(seed);
  const [active,setActive]=useState(seed[0].name);
  const member=useMemo(()=>members.find(m=>m.name===active)??members[0],[members,active]);
  const complete=(title:string)=>setMembers(ms=>ms.map(m=>m.name===active?{...m,tasks:m.tasks.filter(t=>t.title!==title)}:m));
  return <main className="min-h-screen p-6 md:p-10"><div className="mx-auto max-w-6xl">
    <div className="mb-8"><p className="text-sm text-[var(--prism-blue)]">COMIT · TEAM OS</p><h1 className="mt-1 text-3xl font-semibold">Your team, personalized by AI ✦</h1><p className="mt-2 text-[var(--prism-muted)]">Each profile turns business signals into a focused task queue.</p></div>
    <div className="grid gap-4 md:grid-cols-3">{members.map(m=><button key={m.name} onClick={()=>setActive(m.name)} className={`rounded-2xl border p-5 text-left transition ${active===m.name?"border-[var(--prism-violet)] bg-white/10":"border-white/10 bg-white/[.03] hover:bg-white/[.06]"}`}>
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 font-semibold">{m.avatar}</div><div><div className="font-semibold">{m.name}</div><div className="text-xs text-[var(--prism-muted)]">{m.role}</div></div></div>
      <p className="mt-4 text-sm">{m.focus}</p><div className="mt-4 text-xs text-[var(--prism-muted)]">{m.tasks.length} active tasks · AI assigned</div>
    </button>)}</div>
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-[var(--prism-blue)]">Personal task card</p><h2 className="mt-1 text-xl font-semibold">{member.name}'s priorities</h2></div><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs">AI personalized</span></div>
      <div className="mt-5 space-y-3">{member.tasks.map(t=><div key={t.title} className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="flex items-start justify-between gap-4"><div><div className="font-medium">{t.title}</div><div className="mt-1 text-xs text-[var(--prism-muted)]">✦ {t.aiReason}</div></div><button onClick={()=>complete(t.title)} className="rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/10">Done</button></div><div className="mt-3 flex gap-2 text-xs"><span className="rounded-full bg-white/5 px-2 py-1">{t.priority}</span><span className="rounded-full bg-white/5 px-2 py-1">{t.due}</span></div></div>)}</div>
    </section>
  </div></main>;
}
