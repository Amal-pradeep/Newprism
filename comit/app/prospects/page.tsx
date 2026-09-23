"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Mail, Search, ShieldCheck, Sparkles, XCircle } from "lucide-react";

type Prospect = {
  id: string;
  name: string;
  email: string | null;
  stage: string;
  score: number;
  source: string | null;
  notes: string | null;
  metadata: any;
  companies?: { name?: string; website?: string; industry?: string; location?: string } | null;
  approvals?: any[];
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const r = await fetch("/api/prospects", { cache: "no-store" });
    const d = await r.json();
    if (r.ok) {
      setProspects(d.data || []);
      setUser(d.user || null);
    } else setMessage(d.error || "Could not load prospect database.");
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return prospects;
    return prospects.filter(p => [p.name, p.email, p.metadata?.industry, p.metadata?.location, p.notes].join(" ").toLowerCase().includes(query));
  }, [prospects, q]);

  async function prepare(id: string) {
    setBusy(id); setMessage("");
    const r = await fetch("/api/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "prepare", prospectId: id }) });
    const d = await r.json();
    setMessage(r.ok ? "Cold email prepared and added to the approval queue." : d.error || "Could not prepare email.");
    setBusy("");
    load();
  }

  async function decide(approvalId: string, action: "approve" | "reject") {
    setBusy(approvalId); setMessage("");
    const r = await fetch("/api/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, approvalId }) });
    const d = await r.json();
    setMessage(r.ok ? (action === "approve" ? "Approved: email sent from prismofstories25@gmail.com." : "Outreach rejected.") : d.error || "Operation failed.");
    setBusy("");
    load();
  }

  return (
    <main className="min-h-screen bg-[var(--prism-bg)] text-[var(--prism-text)] p-5 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-[var(--prism-muted)]">CRM · RESEARCH · OUTREACH</p>
            <h1 className="text-3xl font-semibold">Prospect Command Center</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--prism-muted)]">COMIT researches prospects, stores the evidence and prepares personalized outreach. External email never sends without an Amal or Aadil approval.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] px-3 py-2 text-xs">
            <ShieldCheck size={15} />
            Approval authority: Amal + Aadil
          </div>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="text-xs text-[var(--prism-muted)]">Research database</div><div className="mt-2 text-3xl font-semibold">{prospects.length}</div></div>
          <div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="text-xs text-[var(--prism-muted)]">Verified public emails</div><div className="mt-2 text-3xl font-semibold">{prospects.filter(p => p.email).length}</div></div>
          <div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="text-xs text-[var(--prism-muted)]">Pending approvals</div><div className="mt-2 text-3xl font-semibold">{prospects.reduce((n,p)=>n+(p.approvals||[]).filter(a=>a.status==="pending").length,0)}</div></div>
        </div>

        {message && <div className="mb-5 rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-3 text-sm">{message}</div>}

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] px-4 py-3">
          <Search size={17} className="text-[var(--prism-muted)]" />
          <input aria-label="Search prospects" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search companies, sectors, email or research notes…" className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--prism-muted)]" />
          <span className="whitespace-nowrap text-xs text-[var(--prism-muted)]">{user?.email}</span>
        </div>

        <div className="space-y-3">
          {filtered.map(p => {
            const pending = (p.approvals || []).find(a => a.status === "pending");
            const latest = (p.approvals || []).slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
            return (
              <article key={p.id} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-medium">{p.name}</h2>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs">{p.score}/100 fit</span>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs capitalize">{p.stage}</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--prism-muted)]">{p.metadata?.fit_reason || p.notes}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--prism-muted)]">
                      <span>{p.metadata?.industry || "Industry not set"}</span>
                      <span>{p.metadata?.location || "Location not set"}</span>
                      <span>{p.email || "Public email still needs verification"}</span>
                      {p.source && <a href={p.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-white hover:underline">Research source <ExternalLink size={12}/></a>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!pending && p.email && <button disabled={busy===p.id} onClick={()=>prepare(p.id)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-xs hover:bg-white/5"><Mail size={14}/> {busy===p.id ? "Preparing…" : "Prepare cold email"}</button>}
                    {!p.email && <span className="rounded-xl border border-[var(--prism-border)] px-3 py-2 text-xs text-[var(--prism-muted)]">Verify email first</span>}
                  </div>
                </div>

                {pending && <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Sparkles size={15}/> Approval requested by {pending.requested_by}</div>
                  <div className="text-xs text-[var(--prism-muted)]">To: {pending.to_email} · CC: {(pending.cc_emails || []).join(", ")}</div>
                  <div className="mt-3 whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-sm">{pending.body}</div>
                  <div className="mt-3 flex gap-2">
                    <button disabled={busy===pending.id} onClick={()=>decide(pending.id,"approve")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"><CheckCircle2 size={15}/> {busy===pending.id ? "Sending…" : "Approve & Send"}</button>
                    <button disabled={busy===pending.id} onClick={()=>decide(pending.id,"reject")} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-4 py-2 text-sm"><XCircle size={15}/> Reject</button>
                  </div>
                </div>}

                {!pending && latest?.status === "sent" && <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14}/> Sent from prismofstories25@gmail.com · approved by {latest.approved_by}</div>}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
