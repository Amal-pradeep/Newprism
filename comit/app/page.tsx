"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Bot, CheckCircle2, CircleAlert, Mail, Sparkles, Target, Zap } from "lucide-react";

const nav = ["Command Center","Prospects","Pipeline","Communications","Tasks","Clients","Projects","Content","Campaigns","Intelligence","Automations","Reports","Settings"];

const cards = [
  { label: "Prospects", value: "128", delta: "+12 this week", icon: Target },
  { label: "Qualified", value: "34", delta: "8 need review", icon: CheckCircle2 },
  { label: "Follow-ups", value: "17", delta: "5 due today", icon: Mail },
  { label: "Automation", value: "96.4%", delta: "Healthy", icon: Zap }
];

export default function CommandCenter() {
  const [health, setHealth] = useState<"checking"|"healthy"|"offline">("checking");

  useEffect(() => {
    fetch("/api/health").then(r => r.ok ? setHealth("healthy") : setHealth("offline")).catch(() => setHealth("offline"));
  }, []);

  return (
    <main className="min-h-screen bg-[var(--prism-bg)] text-[var(--prism-text)]">
      <aside className="fixed hidden h-screen w-64 border-r border-[var(--prism-border)] bg-[var(--prism-surface)] p-5 lg:block">
        <div className="mb-8 flex items-center gap-3"><div className="text-2xl text-[var(--prism-violet)]">✦</div><div><div className="font-semibold">COMIT</div><div className="text-xs text-[var(--prism-muted)]">by Prism of Stories</div></div></div>
        <nav className="space-y-1">{nav.map((item,i)=><div key={item} className={`rounded-xl px-3 py-2 text-sm ${i===0?"bg-white/5 text-white":"text-[var(--prism-muted)]"}`}>{item}</div>)}</nav>
      </aside>
      <section className="lg:pl-64">
        <header className="flex items-center justify-between border-b border-[var(--prism-border)] px-5 py-5 lg:px-8">
          <div><p className="text-sm text-[var(--prism-muted)]">Command Center</p><h1 className="mt-1 text-2xl font-semibold">Good evening, Amal.</h1></div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--prism-border)] bg-[var(--prism-surface)] px-3 py-2 text-xs"><span className={`h-2 w-2 rounded-full ${health==="healthy"?"bg-emerald-400":health==="offline"?"bg-red-400":"bg-amber-400"}`}/>{health==="healthy"?"System healthy":health==="offline"?"System unavailable":"Checking system"}</div>
        </header>
        <div className="space-y-6 p-5 lg:p-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,delta,icon:Icon})=><div key={label} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center justify-between text-sm text-[var(--prism-muted)]"><span>{label}</span><Icon size={17}/></div><div className="mt-4 text-3xl font-semibold">{value}</div><div className="mt-1 text-xs text-[var(--prism-muted)]">{delta}</div></div>)}</div>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
              <div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium">AI activity</h2><p className="text-xs text-[var(--prism-muted)]">Live operational signals</p></div><Sparkles size={18} className="text-[var(--prism-violet)]"/></div>
              <div className="space-y-3">{["Lead research completed for 6 prospects","5 follow-ups are due today","Marketing monitor detected a new signal"].map((x,i)=><div key={x} className="flex items-center gap-3 rounded-xl border border-[var(--prism-border)] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[var(--prism-violet)]"><Bot size={16}/></div><div className="flex-1 text-sm">{x}<div className="text-xs text-[var(--prism-muted)]">{i+1}h ago</div></div><ArrowUpRight size={15} className="text-[var(--prism-muted)]"/></div>)}</div>
            </section>
            <section className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
              <div className="mb-5 flex items-center gap-2"><CircleAlert size={18}/><h2 className="font-medium">Needs attention</h2></div>
              {["8 qualified prospects need review","5 follow-ups due today","1 automation awaiting approval"].map(x=><div key={x} className="border-t border-[var(--prism-border)] py-3 text-sm">{x}</div>)}
            </section>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4 text-sm"><Activity size={17} className="text-[var(--prism-blue)]"/><span>COMIT foundation is connected to the Orbit-era operational model. Live Supabase data and n8n execution are the next activation layer.</span></div>
        </div>
      </section>
    </main>
  );
}
