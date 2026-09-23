"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {LockKeyhole,Sparkles} from "lucide-react";

export default function Login(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const router=useRouter();
  const isAmal=email.trim().toLowerCase()==="amalpradeep25@gmail.com";
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError("");
    const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password:isAmal?"":password})});
    const d=await r.json();
    if(!r.ok){setError(d.error||"Login failed");setBusy(false);return}
    router.push("/");router.refresh();
  };
  return <main className="grid min-h-screen place-items-center bg-[var(--prism-bg)] p-6"><div className="w-full max-w-md rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-8">
    <div className="mb-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-2xl text-violet-300">✦</div><div><div className="text-lg font-semibold">COMIT</div><div className="text-xs text-[var(--prism-muted)]">Prism of Stories · Team workspace</div></div></div>
    <h1 className="text-2xl font-semibold">Welcome back</h1><p className="mt-2 text-sm text-[var(--prism-muted)]">{isAmal?"Enter your Gmail ID to continue.":"Sign in to your operational command center."}</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm">Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-4 py-3 outline-none"/></label>
      {!isAmal&&<label className="block text-sm">Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-4 py-3 outline-none"/></label>}
      {isAmal&&email&&<div className="rounded-xl bg-violet-500/10 p-3 text-sm text-violet-200">Amal access: no password required.</div>}
      {error&&<div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-medium text-black">{busy?"Signing in…":<><LockKeyhole size={16}/>Sign in</>}</button>
    </form>
    <div className="mt-6 flex items-center gap-2 text-xs text-[var(--prism-muted)]"><Sparkles size={14}/>Secure team access</div>
  </div></main>
}