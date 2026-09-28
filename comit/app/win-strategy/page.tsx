import Link from "next/link";
import {ArrowRight,BrainCircuit,CheckCircle2,ClipboardCheck,Database,Mail,Target,TrendingUp,Users} from "lucide-react";

const stages=[
  {title:"1 · Find",desc:"Capture researched businesses and existing leads.",icon:Target,owner:"COMIT + Amal"},
  {title:"2 · Diagnose",desc:"Record the business problem, evidence, intent and value potential.",icon:BrainCircuit,owner:"COMIT research"},
  {title:"3 · Prioritize",desc:"Score hot, warm and nurture opportunities before outreach.",icon:TrendingUp,owner:"Amal"},
  {title:"4 · Personalize",desc:"Prepare a relevant offer, proof and reviewed outreach draft.",icon:Mail,owner:"COMIT + Amal"},
  {title:"5 · Close",desc:"Track replies, discovery, proposal, negotiation and decision.",icon:CheckCircle2,owner:"Amal + Aadil"},
  {title:"6 · Deliver",desc:"Split work by owner with deadline, KPI and approval state.",icon:Users,owner:"Full team"},
  {title:"7 · Prove",desc:"Record outcomes, client impact, revenue and case-study evidence.",icon:ClipboardCheck,owner:"COMIT"},
  {title:"8 · Learn",desc:"Turn successful patterns into reusable Win Library playbooks.",icon:Database,owner:"COMIT"},
];

export default function WinStrategy(){
  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs tracking-widest text-violet-300">COMIT WIN ENGINE</p><h1 className="mt-2 text-3xl font-semibold">Revenue → delivery → learning</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">One operating loop for Prism: find the right opportunity, close it responsibly, deliver measurable value, then reuse what actually worked.</p></div>
      <Link href="/workspace" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">Open workspace <ArrowRight size={15}/></Link>
    </header>

    <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stages.map(({title,desc,icon:Icon,owner})=><article key={title} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
        <Icon size={20} className="text-violet-300"/><h2 className="mt-4 font-medium">{title}</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">{desc}</p><p className="mt-4 text-xs text-violet-200">Owner · {owner}</p>
      </article>)}
    </section>

    <section className="mt-6 grid gap-5 lg:grid-cols-2">
      <article className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5"><h2 className="font-medium">Daily decision rule</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">Every action should do at least one of five things: make money, protect money, save time, improve a client result, or create evidence that makes the next decision better.</p></article>
      <article className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5"><h2 className="font-medium">No-billing guardrail</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">COMIT may prepare work and store reviewed records. External sending, publishing, paid APIs and production deployment stay disabled until explicitly approved and verified as no-charge.</p></article>
    </section>

    <section className="mt-6 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><h2 className="font-medium">Team operating lane</h2><div className="mt-4 grid gap-3 md:grid-cols-5">
      {[["Amal","Operations · sales · client meetings"],["Aadil","Finance · compliance · founder oversight"],["Aneesh","Design · creative delivery"],["Jishnu","AI · automation · development"],["Shahid","Shoot · production · edits"]].map(([name,role])=><div key={name} className="rounded-xl border border-[var(--prism-border)] p-3"><div className="font-medium">{name}</div><div className="mt-1 text-xs text-[var(--prism-muted)]">{role}</div></div>)}
    </div></section>
  </div></main>
}
