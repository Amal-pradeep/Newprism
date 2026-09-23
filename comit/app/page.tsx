const nav = [
  "Command Center", "Prospects", "Pipeline", "Communications", "Tasks",
  "Clients", "Projects", "Content", "Campaigns", "Intelligence",
  "Automations", "Reports", "Settings"
];

const kpis = [
  ["Prospects", "128", "+12 this week"],
  ["Qualified", "34", "8 need review"],
  ["Follow-ups", "17", "5 due today"],
  ["Automations", "96.4%", "healthy"]
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-[var(--prism-border)] bg-[rgba(17,16,28,.72)] p-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="text-2xl text-[var(--prism-violet)]">✦</div>
            <div>
              <div className="font-semibold tracking-tight">COMIT</div>
              <div className="text-xs text-[var(--prism-muted)]">by Prism of Stories</div>
            </div>
          </div>
          <nav className="space-y-1">
            {nav.map((item, index) => (
              <div key={item} className={index === 0
                ? "rounded-xl bg-[rgba(139,92,246,.14)] px-3 py-2.5 text-sm font-medium"
                : "rounded-xl px-3 py-2.5 text-sm text-[var(--prism-muted)] hover:bg-white/[.04] hover:text-white"}>
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex items-center justify-between border-b border-[var(--prism-border)] px-5 py-4 md:px-8">
            <div>
              <div className="text-xs uppercase tracking-[.18em] text-[var(--prism-muted)]">Command Center</div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">Good evening, Amal sir.</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-[var(--prism-border)] bg-[var(--prism-surface)] px-3 py-2 text-xs text-[var(--prism-muted)] sm:block">
                ✦ System healthy
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,var(--prism-violet),var(--prism-blue))] text-sm font-semibold">A</div>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map(([label, value, detail]) => (
                <article key={label} className="rounded-2xl border border-[var(--prism-border)] bg-[rgba(17,16,28,.78)] p-5 shadow-2xl shadow-black/10">
                  <div className="text-sm text-[var(--prism-muted)]">{label}</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
                  <div className="mt-2 text-xs text-[var(--prism-muted)]">{detail}</div>
                </article>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <article className="rounded-2xl border border-[var(--prism-border)] bg-[rgba(17,16,28,.78)] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium"><span className="text-[var(--prism-violet)]">✦</span> AI activity</div>
                    <p className="mt-1 text-xs text-[var(--prism-muted)]">The system's current operational queue.</p>
                  </div>
                  <span className="rounded-full border border-[var(--prism-border)] px-2.5 py-1 text-xs text-[var(--prism-muted)]">Live</span>
                </div>
                <div className="mt-6 space-y-3">
                  {[
                    ["Lead enrichment", "12 prospects queued", "Processing"],
                    ["Inbox intelligence", "4 new conversations", "Ready"],
                    ["Follow-up review", "5 messages awaiting approval", "Review"]
                  ].map(([title, detail, state]) => (
                    <div key={title} className="flex items-center justify-between rounded-xl border border-[var(--prism-border)] bg-black/10 p-4">
                      <div><div className="text-sm font-medium">{title}</div><div className="mt-1 text-xs text-[var(--prism-muted)]">{detail}</div></div>
                      <div className="text-xs text-[var(--prism-muted)]">{state}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--prism-border)] bg-[rgba(17,16,28,.78)] p-6">
                <div className="flex items-center gap-2 text-sm font-medium"><span className="text-[var(--prism-violet)]">✦</span> Needs attention</div>
                <div className="mt-5 space-y-4">
                  <div><div className="text-sm">8 qualified prospects</div><div className="mt-1 text-xs text-[var(--prism-muted)]">Need review before outreach.</div></div>
                  <div><div className="text-sm">5 follow-ups</div><div className="mt-1 text-xs text-[var(--prism-muted)]">Due today.</div></div>
                  <div><div className="text-sm">1 integration</div><div className="mt-1 text-xs text-[var(--prism-muted)]">Needs connection check.</div></div>
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-[var(--prism-border)] bg-[rgba(17,16,28,.78)] p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Automation control</div>
                  <p className="mt-1 text-xs text-[var(--prism-muted)]">Every external action remains auditable and approval-aware.</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-xl border border-[var(--prism-border)] px-4 py-2 text-xs text-[var(--prism-muted)] hover:bg-white/[.04]">View executions</button>
                  <button className="rounded-xl bg-[linear-gradient(135deg,var(--prism-violet),var(--prism-blue))] px-4 py-2 text-xs font-medium">Review approvals</button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}