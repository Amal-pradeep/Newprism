"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Banknote,CheckCircle2,Clock3,Mail,Plus,RefreshCw,Send,ShieldCheck,TriangleAlert,WalletCards} from "lucide-react";

type Approval={id:string;status:string;to_email:string;subject:string;body:string;requested_by:string;approved_by?:string|null;created_at:string;error?:string|null};
type Payment={id:string;amount:number;currency:string;payment_method?:string|null;reference?:string|null;note?:string|null;recorded_at:string};
type Risk={balance:number;overdueDays:number|null;band:string;priority:string;nextAction:string};
type Invoice={
  id:string;client_id:string;client_name:string;billing_email?:string|null;period_label?:string|null;
  amount:number;paid_amount:number;currency:string;due_date?:string|null;status:string;reminder_count:number;
  last_reminder_at?:string|null;notes?:string|null;approvals:Approval[];payments:Payment[];risk:Risk;
};
type Client={id:string;name:string;billing_email?:string|null;currency:string;notes?:string|null};
type Data={ok:boolean;user:{email:string;name?:string};owner:{name:string;role:string;email:string};clients:Client[];invoices:Invoice[];summary:{billed:number;paid:number;outstanding:number;overdue:number;collectionRate:number;attention:Invoice[]};error?:string};

function money(value:number,currency="AED"){
  return new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:2}).format(Number(value||0));
}
function riskClass(priority:string){
  if(priority==="critical")return "border-red-400/30 bg-red-500/10 text-red-200";
  if(priority==="high")return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if(priority==="medium")return "border-violet-400/30 bg-violet-500/10 text-violet-200";
  if(priority==="low")return "border-sky-400/30 bg-sky-500/10 text-sky-200";
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
}

export default function FinancePage(){
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState("");
  const [clientEmails,setClientEmails]=useState<Record<string,string>>({});
  const [dueDates,setDueDates]=useState<Record<string,string>>({});
  const [payments,setPayments]=useState<Record<string,string>>({});
  const [newInvoice,setNewInvoice]=useState({clientId:"",amount:"",periodLabel:"",dueDate:"",currency:"AED"});

  async function load(){
    setError("");
    try{
      const r=await fetch("/api/finance",{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Finance workspace unavailable");
      setData(d);
      const emails:Record<string,string>={};
      const dues:Record<string,string>={};
      for(const client of d.clients||[])emails[client.id]=client.billing_email||"";
      for(const invoice of d.invoices||[])dues[invoice.id]=invoice.due_date||"";
      setClientEmails(emails);setDueDates(dues);
      if(!newInvoice.clientId&&d.clients?.[0]?.id)setNewInvoice(v=>({...v,clientId:d.clients[0].id}));
    }catch(e){setError(e instanceof Error?e.message:"Finance workspace unavailable")}
  }
  useEffect(()=>{void load()},[]);

  async function post(body:any,label:string){
    setBusy(label);setError("");setNotice("");
    try{
      const r=await fetch("/api/finance",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Finance action failed");
      if(d.status==="approved_manual"&&d.mailtoUrl){
        setNotice("Reminder approved. Opening your mail app with the reviewed content ready to send.");
        window.location.href=d.mailtoUrl;
      }else{
        setNotice(d.status==="sent"?"Payment reminder approved and sent through Prism Gmail.":"Finance record updated.");
      }
      await load();
      return d;
    }catch(e){setError(e instanceof Error?e.message:"Finance action failed")}
    finally{setBusy("")}
  }

  async function addInvoice(e:FormEvent){
    e.preventDefault();
    await post({action:"add_invoice",...newInvoice,amount:Number(newInvoice.amount)},"new-invoice");
    setNewInvoice(v=>({...v,amount:"",periodLabel:"",dueDate:""}));
  }

  const pendingApprovals=useMemo(()=>data?.invoices.flatMap(i=>i.approvals.filter(a=>a.status==="pending").map(a=>({...a,client_name:i.client_name,invoice_id:i.id})))||[],[data]);

  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/team/shared" className="inline-flex items-center gap-2 text-xs text-[var(--prism-muted)]"><ArrowLeft size={14}/>Aadil / Team</Link><p className="mt-4 text-xs tracking-[.22em] text-sky-300">FINANCE AI · AADIL</p><h1 className="mt-2 text-3xl font-semibold">Payments, collections & client follow-up</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">One place for paid, pending, partial and delayed client payments. COMIT prepares reminder emails; Aadil reviews the exact content before anything is sent.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button></header>

    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 text-sm text-emerald-200">{notice}</p>}

    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Billed",money(data?.summary.billed||0),WalletCards],
        ["Collected",money(data?.summary.paid||0),CheckCircle2],
        ["Outstanding",money(data?.summary.outstanding||0),Banknote],
        ["Overdue",money(data?.summary.overdue||0),TriangleAlert],
        ["Collection rate",(data?.summary.collectionRate||0)+"%",ShieldCheck]
      ].map(([label,value,Icon]:any)=><article key={label} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><Icon size={18}/><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-[var(--prism-muted)]">{label}</p></article>)}
    </section>

    <section className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_.5fr]">
      <div className="space-y-4">{(data?.invoices||[]).map(invoice=>{
        const pending=invoice.approvals.find(a=>a.status==="pending");
        return <article key={invoice.id} className="rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{invoice.client_name}</h2><span className={"rounded-full border px-2 py-1 text-[10px] "+riskClass(invoice.risk.priority)}>{invoice.status.replaceAll("_"," ")} · {invoice.risk.priority}</span></div><p className="mt-1 text-xs text-[var(--prism-muted)]">{invoice.period_label||"Client payment"} · {invoice.currency}</p></div><div className="text-right"><p className="text-2xl font-semibold">{money(invoice.risk.balance,invoice.currency)}</p><p className="text-xs text-[var(--prism-muted)]">outstanding of {money(invoice.amount,invoice.currency)}</p></div></div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-[11px] text-[var(--prism-muted)]">Paid</p><p className="mt-1 font-medium">{money(invoice.paid_amount,invoice.currency)}</p></div><div className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-[11px] text-[var(--prism-muted)]">Due date</p><p className="mt-1 font-medium">{invoice.due_date||"Not set"}</p></div><div className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-[11px] text-[var(--prism-muted)]">Reminders sent</p><p className="mt-1 font-medium">{invoice.reminder_count||0}</p></div></div>

          <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3"><p className="text-xs font-medium">Finance AI next action</p><p className="mt-1 text-sm text-[var(--prism-muted)]">{invoice.risk.nextAction}</p>{invoice.risk.overdueDays!==null&&invoice.risk.overdueDays>0&&<p className="mt-1 text-xs text-amber-200">{invoice.risk.overdueDays} days overdue</p>}</div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div><label className="text-xs text-[var(--prism-muted)]">Agreed due date<input type="date" value={dueDates[invoice.id]||""} onChange={e=>setDueDates(v=>({...v,[invoice.id]:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm"/></label><button disabled={!!busy} onClick={()=>void post({action:"set_due_date",invoiceId:invoice.id,dueDate:dueDates[invoice.id]||null},"due-"+invoice.id)} className="mt-2 rounded-lg border border-[var(--prism-border)] px-3 py-2 text-xs">Save due date</button></div>
            <div><label className="text-xs text-[var(--prism-muted)]">Record payment<input inputMode="decimal" value={payments[invoice.id]||""} onChange={e=>setPayments(v=>({...v,[invoice.id]:e.target.value.replace(/[^0-9.]/g,"")}))} placeholder="Amount received" className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm"/></label><button disabled={!!busy||!payments[invoice.id]} onClick={()=>void post({action:"record_payment",invoiceId:invoice.id,amount:Number(payments[invoice.id])},"pay-"+invoice.id)} className="mt-2 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs text-emerald-100">Mark payment received</button></div>
          </div>

          {invoice.risk.balance>0&&<div className="mt-4 flex flex-wrap gap-2">{!pending&&<button disabled={!!busy||!invoice.billing_email} onClick={()=>void post({action:"prepare_reminder",invoiceId:invoice.id},"reminder-"+invoice.id)} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 px-3 py-2 text-xs text-amber-100"><Mail size={13}/>Prepare payment reminder</button>}{!invoice.billing_email&&<span className="rounded-xl border border-red-400/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">Add billing email first</span>}</div>}

          {pending&&<div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4"><p className="text-xs font-medium text-amber-100">Ready for Aadil approval</p><p className="mt-2 text-sm font-medium">{pending.subject}</p><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-5 text-[var(--prism-muted)]">{pending.body}</pre><div className="mt-3 flex gap-2"><button disabled={!!busy} onClick={()=>void post({action:"approve_and_send",approvalId:pending.id},"send-"+pending.id)} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black"><Send size={13}/>Approve & send</button><button disabled={!!busy} onClick={()=>void post({action:"reject_reminder",approvalId:pending.id},"reject-"+pending.id)} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs text-red-100">Reject draft</button></div></div>}

          {!!invoice.payments.length&&<details className="mt-4 rounded-xl border border-[var(--prism-border)] p-3"><summary className="cursor-pointer text-xs font-medium">Payment history</summary><div className="mt-2 space-y-2">{invoice.payments.map(p=><p key={p.id} className="text-xs text-[var(--prism-muted)]">{money(p.amount,p.currency)} · {new Date(p.recorded_at).toLocaleString()} {p.reference?"· "+p.reference:""}</p>)}</div></details>}
        </article>
      })}</div>

      <aside className="space-y-4">
        <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><h2 className="font-medium">Client billing emails</h2><p className="mt-1 text-xs text-[var(--prism-muted)]">COMIT will never guess an email. Add a verified billing/contact address before reminders are enabled.</p><div className="mt-4 space-y-4">{(data?.clients||[]).map(client=><div key={client.id}><label className="text-xs">{client.name}<input value={clientEmails[client.id]||""} onChange={e=>setClientEmails(v=>({...v,[client.id]:e.target.value}))} placeholder="billing@client.com" className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2 text-sm"/></label><button disabled={!!busy} onClick={()=>void post({action:"update_client",clientId:client.id,billingEmail:clientEmails[client.id]},"client-"+client.id)} className="mt-2 rounded-lg border border-[var(--prism-border)] px-3 py-1.5 text-xs">Save email</button></div>)}</div></article>

        <form onSubmit={addInvoice} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex items-center gap-2"><Plus size={16}/><h2 className="font-medium">Add invoice / monthly charge</h2></div><div className="mt-3 space-y-3"><select value={newInvoice.clientId} onChange={e=>setNewInvoice(v=>({...v,clientId:e.target.value}))} className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm">{(data?.clients||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input required value={newInvoice.amount} onChange={e=>setNewInvoice(v=>({...v,amount:e.target.value.replace(/[^0-9.]/g,"")}))} placeholder="Amount" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm"/><input value={newInvoice.periodLabel} onChange={e=>setNewInvoice(v=>({...v,periodLabel:e.target.value}))} placeholder="Period e.g. October 2026" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm"/><input type="date" value={newInvoice.dueDate} onChange={e=>setNewInvoice(v=>({...v,dueDate:e.target.value}))} className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm"/><button disabled={!!busy} className="w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black">Add invoice</button></div></form>

        {pendingApprovals.length>0&&<article className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4"><div className="flex items-center gap-2"><Clock3 size={16}/><h2 className="font-medium">Pending reminder approvals</h2></div><p className="mt-2 text-2xl font-semibold">{pendingApprovals.length}</p><p className="text-xs text-[var(--prism-muted)]">Review before sending.</p></article>}
      </aside>
    </section>
  </div></main>;
}
