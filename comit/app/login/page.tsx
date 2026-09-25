"use client";
import {useState} from "react";
import {Mail,Sparkles} from "lucide-react";

export default function Login(){
  const [email,setEmail]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError("");
    const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email})});
    const d=await r.json();
    if(!r.ok){setError(d.error||"This email is not authorized for COMIT.");setBusy(false);return}
    setSent(true);setBusy(false);
  };
  return <main className="grid min-h-screen place-items-center bg-[var(--prism-bg)] p-6"><div className="w-full max-w-md rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-8">
    <div className="mb-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-2xl text-violet-300">✦</div><div><div className="text-lg font-semibold">COMIT</div><div className="text-xs text-[var(--prism-muted)]">Prism of Stories · Team workspace</div></div></div>
    <h1 className="text-2xl font-semibold">Welcome back</h1><p className="mt-2 text-sm text-[var(--prism-muted)]">Enter your authorized team email. We will send a sign-in link to that inbox.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm">Team email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@company.com" required className="mt-2 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-4 py-3 outline-none"/></label>
      {error&&<div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      {sent&&<div role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">Check your inbox and open the sign-in link on this device.</div>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-medium text-black">{busy?"Sending…":<><Mail size={16}/>Send sign-in link</>}</button>
    </form>
    <div className="mt-6 flex items-center gap-2 text-xs text-[var(--prism-muted)]"><Sparkles size={14}/>Verified email access · no password</div>
  </div></main>
}
