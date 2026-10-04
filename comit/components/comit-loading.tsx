import ComitLogo from "./comit-logo";

export default function ComitLoading({label = "Loading your workspace…", compact = false}: {label?: string; compact?: boolean}) {
  return <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-4 ${compact ? "py-8" : "min-h-[65vh] p-6"}`}>
    <ComitLogo animated className="h-16 w-16 text-violet-300"/>
    <span className="text-lg font-semibold tracking-[.2em]">COMIT</span>
    <span className="text-sm text-[var(--prism-muted)]">{label}</span>
    <span className="comit-loading-track" aria-hidden="true"><span/></span>
  </div>;
}
