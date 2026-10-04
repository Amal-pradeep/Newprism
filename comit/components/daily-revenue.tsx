"use client";
import {useCallback, useEffect, useState} from "react";
import Link from "next/link";
import {RefreshCw} from "lucide-react";
import {requestJson} from "@/lib/client-request";
import ComitLoading from "./comit-loading";

export default function DailyRevenue(){
  const [data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const refresh=useCallback(async()=>{
    setLoading(true);
    try{setData(await requestJson("/api/outreach/dashboard",{cache:"no-store"}));setError("");}
    catch(e){setError(e instanceof Error ? e.message : "Revenue dashboard unavailable.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{
    void refresh();
    const update=()=>{if(!document.hidden)void refresh();};
    const timer=window.setInterval(update,60000);
    window.addEventListener("focus",update);
    return()=>{clearInterval(timer);window.removeEventListener("focus",update);};
  },[refresh]);
  const m=data?.metrics;
  return <section aria-labelledby="daily-revenue" className="mt-6 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="daily-revenue" className="font-semibold">Today’s sales desk</h2><button disabled={loading} onClick={()=>void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>{loading?"Refreshing…":"Refresh sales"}</button></div>
    {!data&&loading?<ComitLoading compact label="Loading leads and follow-ups…"/>:m?<>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">{[["Prospects",m.prospects],["Awaiting review",m.pendingCount],["Due follow-ups",m.dueFollowups],["Emails sent today",m.sentToday],["Replies today",m.repliesToday]].map(([label,value])=><div key={label} className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-[var(--prism-muted)]">{label}</p></div>)}</div>
      <p className="mt-3 text-xs text-[var(--prism-muted)]">Updated {new Date(data.syncedAt).toLocaleTimeString()} · refreshes each minute while open · day uses India time</p>
    </>:<p className="mt-3 text-sm text-[var(--prism-muted)]">Sign in with your team email to see shared leads, replies and due follow-ups.</p>}
    {error&&<p role="status" className="mt-3 text-sm text-amber-200">{error}{data?" Showing the last successful update.":""}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Link href="/outreach/shared" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">Open daily outreach</Link><Link href="/prospects/shared" className="rounded-xl border border-[var(--prism-border)] px-4 py-2 text-sm">Research leads</Link><Link href="/login" className="rounded-xl border border-[var(--prism-border)] px-4 py-2 text-sm">Team sign-in</Link></div>
  </section>;
}
