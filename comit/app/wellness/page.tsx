"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Bell,CheckCircle2,Coffee,Footprints,GlassWater,HeartPulse,RefreshCw,Save,ShieldCheck,Sparkles} from "lucide-react";

type Data={
  ok:boolean;
  user:{name?:string;email:string};
  privacy:string;
  medical_use:boolean;
  preferences:{water_target_ml:number|null;water_reminders:boolean;break_reminders:boolean;movement_reminders:boolean;reminder_interval_minutes:number};
  summary:{water_ml:number;screen_breaks:number;movement_breaks:number;meal_checkins:number;latest_energy:number|null};
  checkins:Array<{id:string;kind:string;amount_ml?:number|null;energy_level?:number|null;note?:string|null;created_at:string}>;
  error?:string;
};

function localDayStart(){const d=new Date();d.setHours(0,0,0,0);return d.toISOString()}

export default function WellnessPage(){
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");
  const [target,setTarget]=useState("");
  const [interval,setIntervalValue]=useState("90");
  const timer=useRef<number|null>(null);

  async function load(){
    setError("");
    try{
      const r=await fetch("/api/wellness?dayStart="+encodeURIComponent(localDayStart()),{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Wellness data unavailable");
      setData(d);
      setTarget(d.preferences?.water_target_ml?String(d.preferences.water_target_ml):"");
      setIntervalValue(String(d.preferences?.reminder_interval_minutes||90));
    }catch(e){setError(e instanceof Error?e.message:"Wellness data unavailable")}
  }
  useEffect(()=>{void load()},[]);

  useEffect(()=>{
    if(timer.current)window.clearInterval(timer.current);
    if(!data)return;
    const enabled=data.preferences.water_reminders||data.preferences.break_reminders||data.preferences.movement_reminders;
    if(!enabled)return;
    const mins=Math.max(30,Math.min(240,data.preferences.reminder_interval_minutes||90));
    timer.current=window.setInterval(()=>{
      if(!("Notification" in window)||Notification.permission!=="granted")return;
      const prompts:string[]=[];
      if(data.preferences.water_reminders)prompts.push("water");
      if(data.preferences.break_reminders)prompts.push("screen break");
      if(data.preferences.movement_reminders)prompts.push("movement");
      new Notification("COMIT wellbeing check",{body:"Quick check: "+prompts.join(" · ")+". Log only what is useful to you."});
    },mins*60*1000);
    return()=>{if(timer.current)window.clearInterval(timer.current)};
  },[data]);

  async function post(body:any,label:string){
    setBusy(label);setError("");
    try{
      const r=await fetch("/api/wellness",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Could not save check-in");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not save check-in")}
    finally{setBusy("")}
  }

  async function enableNotifications(){
    if(!("Notification" in window)){setError("This browser does not support notifications.");return}
    const permission=await Notification.requestPermission();
    if(permission!=="granted")setError("Notifications were not enabled. Tracking still works without them.");
  }

  const pct=useMemo(()=>{
    const goal=data?.preferences?.water_target_ml||0;
    return goal?Math.min(100,Math.round(((data?.summary.water_ml||0)/goal)*100)):null;
  },[data]);

  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/team" className="inline-flex items-center gap-2 text-xs text-[var(--prism-muted)]"><ArrowLeft size={14}/>Team</Link><p className="mt-4 text-xs tracking-[.22em] text-sky-300">MY WELLNESS · PRIVATE</p><h1 className="mt-2 text-3xl font-semibold">Small resets during the workday</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">Track water, screen breaks, movement, meals and a simple energy check-in. This is optional self-tracking, not medical monitoring or performance scoring.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button></header>

    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4"><ShieldCheck size={18} className="shrink-0"/><p className="text-sm text-[var(--prism-muted)]">Your entries are tied to your signed-in email and are not exposed as a teammate leaderboard or manager health score. Use the feature only if it helps you.</p></div>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-200">{error}</p>}

    <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <article className="rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><GlassWater size={20} className="text-sky-300"/><h2 className="font-semibold">Water</h2></div><p className="mt-2 text-4xl font-semibold">{data?.summary.water_ml||0}<span className="ml-1 text-base font-normal text-[var(--prism-muted)]">ml today</span></p>{data?.preferences.water_target_ml?<p className="mt-1 text-xs text-[var(--prism-muted)]">Personal target: {data.preferences.water_target_ml} ml</p>:<p className="mt-1 text-xs text-[var(--prism-muted)]">No target set. You can track intake without a target.</p>}</div>{pct!==null&&<div className="grid h-20 w-20 place-items-center rounded-full border border-sky-300/30 bg-sky-300/5 text-lg font-semibold">{pct}%</div>}</div>{pct!==null&&<div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-white" style={{width:pct+"%"}}/></div>}<div className="mt-5 flex flex-wrap gap-2">{[150,250,350,500].map(amount=><button key={amount} disabled={!!busy} onClick={()=>void post({kind:"water",amountMl:amount},"water")} className="rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm">+ {amount} ml</button>)}</div></article>

      <article className="rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Sparkles size={20} className="text-violet-300"/><h2 className="font-semibold">Quick resets</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><button disabled={!!busy} onClick={()=>void post({kind:"screen_break"},"screen")} className="flex items-center justify-between rounded-2xl border border-[var(--prism-border)] p-4 text-left"><span><b className="block text-sm">Screen break</b><span className="text-xs text-[var(--prism-muted)]">{data?.summary.screen_breaks||0} logged today</span></span><HeartPulse size={18}/></button><button disabled={!!busy} onClick={()=>void post({kind:"movement"},"move")} className="flex items-center justify-between rounded-2xl border border-[var(--prism-border)] p-4 text-left"><span><b className="block text-sm">Movement break</b><span className="text-xs text-[var(--prism-muted)]">{data?.summary.movement_breaks||0} logged today</span></span><Footprints size={18}/></button><button disabled={!!busy} onClick={()=>void post({kind:"meal"},"meal")} className="flex items-center justify-between rounded-2xl border border-[var(--prism-border)] p-4 text-left"><span><b className="block text-sm">Meal / food break</b><span className="text-xs text-[var(--prism-muted)]">{data?.summary.meal_checkins||0} logged today</span></span><Coffee size={18}/></button></div></article>
    </section>

    <section className="mt-5 rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><h2 className="font-semibold">Energy check-in</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">This is simply how you feel right now, not a diagnosis.</p><div className="mt-4 flex flex-wrap gap-2">{[1,2,3,4,5].map(level=><button key={level} disabled={!!busy} onClick={()=>void post({kind:"energy",energyLevel:level},"energy")} className={"h-11 w-11 rounded-xl border "+(data?.summary.latest_energy===level?"border-violet-300 bg-violet-500/15":"border-[var(--prism-border)]")}>{level}</button>)}</div><p className="mt-2 text-xs text-[var(--prism-muted)]">1 = very low energy · 5 = very high energy</p></section>

    <section className="mt-5 rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Bell size={18}/><h2 className="font-semibold">Gentle reminders</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">While COMIT is open, the browser can nudge you at a chosen interval. No reminder is sent to teammates or managers.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-[var(--prism-muted)]">Personal water target (optional)<input inputMode="numeric" value={target} onChange={e=>setTarget(e.target.value.replace(/\D/g,""))} placeholder="e.g. 2000" className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm"/></label><label className="text-xs text-[var(--prism-muted)]">Reminder interval<select value={interval} onChange={e=>setIntervalValue(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm"><option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option><option value="180">180 min</option></select></label><button onClick={()=>void enableNotifications()} className="self-end rounded-xl border border-[var(--prism-border)] px-3 py-2.5 text-sm">Enable browser reminders</button><button disabled={!!busy} onClick={()=>void post({action:"preferences",waterTargetMl:target||null,reminderIntervalMinutes:Number(interval),waterReminders:true,breakReminders:true,movementReminders:true},"prefs")} className="inline-flex self-end items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black"><Save size={15}/>Save</button></div></section>

    <section className="mt-5 rounded-2xl border border-dashed border-[var(--prism-border)] p-4 text-xs text-[var(--prism-muted)]"><CheckCircle2 size={15} className="mr-2 inline"/>COMIT wellness features are not medical advice and should not replace professional care or personalized medical guidance.</section>
  </div></main>;
}
