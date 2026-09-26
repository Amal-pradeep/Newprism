"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {Bot, CircleDollarSign, Home, Users, Workflow, Target, Mail, PlugZap, Clapperboard, Database} from "lucide-react";

const links=[
  ["/","Command Center",Home],
  ["/workspace","Shared Workspace",Database],
  ["/prospects","Prospects",Target],
  ["/outreach","Outreach",Mail],
  ["/team","Team",Users],
  ["/creative-library","Creative Library",Clapperboard],
  ["/agents","AI Agents",Bot],
  ["/automation","Automation",Workflow],
  ["/integrations","Integrations",PlugZap],
] as const;

export default function AppNavigation(){
  const pathname=usePathname();
  if(pathname==="/login")return null;
  return <>
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-[var(--prism-border)] bg-[var(--prism-surface)] p-5 lg:block">
      <Link href="/" className="mb-7 flex items-center gap-3"><span className="text-2xl text-[var(--prism-violet)]">✦</span><span><span className="block font-semibold">COMIT</span><span className="block text-xs text-[var(--prism-muted)]">Prism of Stories</span></span></Link>
      <nav aria-label="Main navigation" className="space-y-1">{links.map(([href,label,Icon])=><Link key={href} href={href} aria-current={(href==="/"?pathname===href:pathname.startsWith(href))?"page":undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${pathname===href?"bg-white/10 text-white":"text-[var(--prism-muted)] hover:bg-white/5"}`}><Icon size={16}/>{label}</Link>)}</nav>
      <div className="mt-8 rounded-2xl border border-[var(--prism-border)] p-4 text-xs text-[var(--prism-muted)]"><CircleDollarSign size={15} className="mb-2"/>Use Shared Workspace for team updates. The other pages retain local drafts and reference workflows.</div>
    </aside>
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-20 flex gap-2 overflow-x-auto border-t border-[var(--prism-border)] bg-[var(--prism-bg)] p-2 lg:hidden">{links.map(([href,label,Icon])=><Link key={href} href={href} aria-current={pathname===href?"page":undefined} className={`flex shrink-0 items-center gap-2 rounded-full border border-[var(--prism-border)] px-3 py-2 text-xs ${pathname===href?"bg-white/10":"text-[var(--prism-muted)]"}`}><Icon size={14}/>{label}</Link>)}</nav>
    <div className="hidden lg:block" aria-hidden="true" />
  </>;
}

