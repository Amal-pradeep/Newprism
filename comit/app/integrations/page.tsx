import Link from "next/link";
import {Database,ExternalLink,Instagram,MessageCircle,ShieldAlert,Workflow} from "lucide-react";

const publicLinks=[
  {name:"Prism of Stories website",status:"Public link only; no COMIT integration",url:"https://prismofstories.com",icon:ExternalLink},
  {name:"Instagram",status:"Public profile only; OAuth is not connected",url:"https://instagram.com/prismofstories",icon:Instagram},
  {name:"WhatsApp",status:"Public click-to-chat only; team accounts are not connected",url:"https://wa.me/919745643726",icon:MessageCircle},
];
const blocked=[
  {name:"Supabase",status:"Not configured; CRM data endpoints are unavailable"},
  {name:"Gmail",status:"Not configured; sending and synchronization are disabled"},
  {name:"n8n",status:"Blocked; external workflow calls are disabled"},
  {name:"AI provider",status:"Deterministic local logic only; external model calls are blocked"},
  {name:"Cloudflare Access",status:"Not activated because it requires a payment card and overage authorization"},
];

export default function Integrations(){return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-6xl">
  <p className="text-xs tracking-wide text-[var(--prism-muted)]">CONNECTIVITY LAYER</p><h1 className="mt-1 text-3xl font-semibold">Business integrations</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">This inventory is explicit and read-only. A public profile link does not mean a private API is connected.</p>
  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm"><ShieldAlert size={18} className="shrink-0"/><p>Hard cost stop: no paid plans, metered overages, or usage-based AI. Keep integrations disabled until authentication and a provider-side no-charge limit are verified.</p></div>
  <section className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5"><div className="flex items-center gap-2"><Database size={18}/><h2 className="font-medium">Cloudflare D1 shared database</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">The team database is on the Workers Free plan. Usage stops when free limits are reached. The private <Link href="/workspace" className="underline">Shared Workspace</Link> uses individual passwords; Amal can activate his password from the sign-in page before creating teammate passwords.</p></section>
  <section className="mt-7"><h2 className="text-lg font-semibold">Public links</h2><div className="mt-3 grid gap-4 md:grid-cols-3">{publicLinks.map(({name,status,url,icon:Icon})=><article key={name} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><Icon size={18}/><h3 className="mt-3 font-medium">{name}</h3><p className="mt-1 text-xs text-[var(--prism-muted)]">{status}</p><a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs underline">Open link <ExternalLink size={13}/></a></article>)}</div></section>
  <section className="mt-7"><h2 className="text-lg font-semibold">Disabled or unverified</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{blocked.map(item=><article key={item.name} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex items-start gap-3"><Workflow size={17} className="mt-0.5 text-amber-300"/><div><h3 className="text-sm font-medium">{item.name}</h3><p className="mt-1 text-xs text-[var(--prism-muted)]">{item.status}</p></div></div></article>)}</div></section>
  <p className="mt-6 text-sm text-[var(--prism-muted)]">Use Shared Workspace for team records after sign-in. See <Link href="/automation" className="underline">Automation</Link> for local workflows.</p>
</div></main>}


