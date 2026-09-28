import Link from "next/link";
import {Database,GitBranch,HardDrive,Mail,Plug,ShieldAlert,Workflow} from "lucide-react";
import {freeCapabilityRegistry} from "@/lib/free-capabilities";

const stack=[
  {name:"GitHub",status:"Source of truth. Changes go to a feature branch and review before production.",icon:GitBranch},
  {name:"Supabase",status:"Email-only authentication, shared state, missions and private teammate records. Server credentials required.",icon:Database},
  {name:"Google Drive",status:"Connected in ChatGPT for Prism files; COMIT should ingest only reviewed extracts, not mirror private documents into public Git.",icon:HardDrive},
  {name:"Gmail",status:"Sales sending remains founder-approved. Reconciliation should classify replies, delays and delivery failures separately.",icon:Mail},
  {name:"n8n",status:"Use self-hosted/no-charge workflows and reviewed community nodes only. Unverified nodes are code-execution risk.",icon:Workflow},
];

export default function Integrations(){return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-6xl">
  <p className="text-xs tracking-wide text-[var(--prism-muted)]">CONNECTIVITY LAYER</p><h1 className="mt-1 text-3xl font-semibold">Git-first, no-billing integrations</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">COMIT can prepare and store work without deploying it. Production changes, external writes and code-executing plugins remain review-gated.</p>
  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm"><ShieldAlert size={18} className="shrink-0"/><p>Hard stop: no Cloudflare deployment, no metered AI dependency, no automatic external sending, and no blind plugin installs. Push code to Git for review first.</p></div>
  <section className="mt-7 grid gap-4 md:grid-cols-2">{stack.map(({name,status,icon:Icon})=><article key={name} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><Icon size={18}/><h2 className="mt-3 font-medium">{name}</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">{status}</p></article>)}</section>

  <section className="mt-7 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5"><div className="flex items-center gap-2"><Plug size={18}/><h2 className="font-medium">Reviewed open-source capability shelf</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">These are architecture options COMIT can use without making them mandatory dependencies. Optional tools stay off until their source, permissions and runtime cost are reviewed.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{freeCapabilityRegistry.map(item=><article key={item.id} className="rounded-xl border border-[var(--prism-border)] bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="mt-1 text-xs text-[var(--prism-muted)]">{item.purpose}</p></div><span className={"rounded-full border px-2 py-1 text-[10px] "+(item.enabledByDefault?"border-emerald-400/30 text-emerald-200":"border-violet-400/30 text-violet-200")}>{item.enabledByDefault?"core-ready":"optional-review"}</span></div><p className="mt-3 text-[11px] text-[var(--prism-muted)]">{item.openSource?"Open source":"Service"} · risk {item.risk} · {item.noCostCore?"no-cost core":"cost varies"}</p><p className="mt-2 text-[11px] text-[var(--prism-muted)]">{item.notes}</p></article>)}</div></section>

  <section className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5"><h2 className="font-medium">Workspace access</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">Approved teammates enter their email and use the verification link sent to that inbox. Password login is disabled.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/workspace" className="underline">Open Shared Workspace</Link><Link href="/agents/mission-control" className="underline">Open Mission Control</Link></div></section>
</div></main>}
