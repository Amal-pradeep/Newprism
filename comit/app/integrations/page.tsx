import Link from "next/link";
import {Database,GitBranch,HardDrive,Mail,ShieldAlert,Workflow} from "lucide-react";

const stack=[
  {name:"GitHub",status:"Source of truth. Changes go to a feature branch and review before production.",icon:GitBranch},
  {name:"Supabase",status:"Email-only authentication and private shared workspace records. Server credentials required.",icon:Database},
  {name:"Google Drive",status:"Connected in ChatGPT for Prism files; COMIT embedding remains a separate implementation task.",icon:HardDrive},
  {name:"Gmail / Resend",status:"Sending remains disabled inside COMIT until separately approved and verified no-charge.",icon:Mail},
  {name:"n8n",status:"Use only a self-hosted/no-charge setup; no hosted paid workflow is enabled.",icon:Workflow},
];

export default function Integrations(){return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-6xl">
  <p className="text-xs tracking-wide text-[var(--prism-muted)]">CONNECTIVITY LAYER</p><h1 className="mt-1 text-3xl font-semibold">Git-first, no-billing integrations</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">COMIT can prepare and store work without deploying it. Production changes require a separate explicit decision.</p>
  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm"><ShieldAlert size={18} className="shrink-0"/><p>Hard stop: no Cloudflare deployment, no metered AI, no paid workflow platform, and no automatic external sending. Push code to Git for review first.</p></div>
  <section className="mt-7 grid gap-4 md:grid-cols-2">{stack.map(({name,status,icon:Icon})=><article key={name} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><Icon size={18}/><h2 className="mt-3 font-medium">{name}</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">{status}</p></article>)}</section>
  <section className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5"><h2 className="font-medium">Workspace access</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">Approved teammates enter their email and use the verification link sent to that inbox. Password login is disabled.</p><Link href="/workspace" className="mt-4 inline-block underline">Open Shared Workspace</Link></section>
</div></main>}
