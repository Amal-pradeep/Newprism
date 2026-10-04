"use client";
import Link from "next/link";
import ComitLogo from "@/components/comit-logo";
export default function ErrorPage({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return <main className="grid min-h-[65vh] place-items-center p-6"><div role="alert" className="max-w-md text-center">
    <ComitLogo className="mx-auto h-14 w-14 text-violet-300"/>
    <h1 className="mt-5 text-xl font-semibold">This page couldn’t load</h1>
    <p className="mt-2 text-sm text-[var(--prism-muted)]">Try again or return to the Command Center.</p>
    <div className="mt-5 flex justify-center gap-3"><button onClick={reset} className="rounded-xl bg-white px-4 py-2 text-black">Try again</button><Link href="/" className="rounded-xl border border-[var(--prism-border)] px-4 py-2">Command Center</Link></div>
  </div></main>;
}
