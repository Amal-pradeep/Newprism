import { Target, Search, Plus, ArrowUpRight } from "lucide-react";

const prospects = [
  ["Al Noor Interiors","qualified","92","Lead Hunter"],
  ["Gulf Hospitality Group","contacted","84","Website research"],
  ["Urban Craft Studio","researching","76","Referral"],
  ["Nostaza Hospitality","meeting","88","Inbound"],
  ["Pearl Design House","new","69","Lead Hunter"]
];

export default function ProspectsPage() {
  return <main className="min-h-screen bg-[var(--prism-bg)] text-[var(--prism-text)] p-5 lg:p-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-[var(--prism-muted)]">CRM</p><h1 className="text-3xl font-semibold">Prospects</h1><p className="mt-1 text-sm text-[var(--prism-muted)]">One pipeline for research, outreach and follow-up.</p></div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"><Plus size={16}/> Add prospect</button>
      </div>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] px-4 py-3"><Search size={17} className="text-[var(--prism-muted)]"/><input aria-label="Search prospects" placeholder="Search prospects, companies or domains…" className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--prism-muted)]"/></div>
      <div className="overflow-hidden rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)]">
        {prospects.map(([name,stage,score,source])=><div key={name} className="grid gap-3 border-b border-[var(--prism-border)] p-4 last:border-0 md:grid-cols-[1.5fr_.8fr_.5fr_1fr_auto] md:items-center">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[var(--prism-violet)]"><Target size={17}/></div><div><div className="text-sm font-medium">{name}</div><div className="text-xs text-[var(--prism-muted)]">{source}</div></div></div>
          <span className="text-xs capitalize text-[var(--prism-muted)]">{stage}</span><span className="text-sm">{score}/100</span><span className="text-xs text-[var(--prism-muted)]">AI qualification score</span><ArrowUpRight size={16} className="text-[var(--prism-muted)]"/>
        </div>)}
      </div>
    </div>
  </main>;
}
