"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {
  ArrowLeft,CheckCircle2,Clock3,ExternalLink,FileText,FolderOpen,Image as ImageIcon,
  Link2,LoaderCircle,MessageSquare,Palette,Plus,RefreshCw,Send,ShieldCheck,
  Sparkles,Target,TriangleAlert,Users
} from "lucide-react";

type Update={id:string;update_type:string;note:string;created_by:string;created_at:string};
type Detail={
  client_name?:string|null;deliverable_type?:string|null;platform?:string|null;objective?:string|null;
  audience?:string|null;offer?:string|null;brief?:string|null;output_spec?:string|null;
  approval_state?:string|null;revision_count?:number;asset_links?:Array<{url:string;label:string;added_by?:string;added_at?:string}>;
  client_feedback?:string|null;handoff_to?:string|null;handoff_note?:string|null;
};
type Guidance={focusScore:number;focusBand:string;nextAction:string;briefChecklist:string[];reviewChecklist:string[];risks:string[]};
type Task={id:string;title:string;description?:string|null;status:string;priority:string;due_at?:string|null;created_at:string;updated_at:string;detail:Detail;guidance:Guidance;updates:Update[]};
type Data={ok:boolean;user:{email:string;name?:string};owner:{name:string;email:string;role:string};tasks:Task[];focus:Array<{task:any;guidance:Guidance}>;summary:{total:number;todo:number;inProgress:number;blocked:number;review:number;done:number};collaborators:Array<{name:string;email:string}>;error?:string};

const statusOptions=["todo","in_progress","blocked","done","cancelled"];
const priorityOptions=["low","medium","high","urgent"];
const approvalOptions=["not_started","internal_review","client_review","revision","approved"];
const deliverables=["poster","carousel","story","social_post","ad_creative","thumbnail","brochure","logo","brand_asset","presentation","other"];
const platforms=["Instagram Feed","Instagram Story","Instagram Reels","Facebook","Meta Ads","LinkedIn","Website","Print","Other"];

function badge(value:string){
  if(["urgent","blocked","revision"].includes(value))return "border-red-400/30 bg-red-500/10 text-red-200";
  if(["high","client_review","internal_review"].includes(value))return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if(["in_progress","today"].includes(value))return "border-sky-400/30 bg-sky-500/10 text-sky-200";
  if(["approved","done"].includes(value))return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  return "border-[var(--prism-border)] bg-white/5 text-[var(--prism-muted)]";
}

export default function CreativeOpsPage(){
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState("");
  const [filter,setFilter]=useState("active");
  const [open,setOpen]=useState("");
  const [drafts,setDrafts]=useState<Record<string,any>>({});
  const [updates,setUpdates]=useState<Record<string,string>>({});
  const [assetLinks,setAssetLinks]=useState<Record<string,string>>({});
  const [newTask,setNewTask]=useState({
    title:"",clientName:"",deliverableType:"poster",platform:"Instagram Feed",objective:"",
    audience:"",offer:"",priority:"high",dueAt:"",description:""
  });

  async function load(){
    setError("");
    try{
      const r=await fetch("/api/creative-ops",{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Creative Ops unavailable");
      setData(d);
      const next:Record<string,any>={};
      for(const t of d.tasks||[])next[t.id]={
        clientName:t.detail?.client_name||"",deliverableType:t.detail?.deliverable_type||"",
        platform:t.detail?.platform||"",objective:t.detail?.objective||"",audience:t.detail?.audience||"",
        offer:t.detail?.offer||"",brief:t.detail?.brief||"",outputSpec:t.detail?.output_spec||"",
        clientFeedback:t.detail?.client_feedback||"",handoffTo:t.detail?.handoff_to||"",
        handoffNote:t.detail?.handoff_note||"",approvalState:t.detail?.approval_state||"not_started",
        dueAt:t.due_at?new Date(t.due_at).toISOString().slice(0,16):"",priority:t.priority,status:t.status
      };
      setDrafts(next);
    }catch(e){setError(e instanceof Error?e.message:"Creative Ops unavailable")}
  }
  useEffect(()=>{void load()},[]);

  async function post(body:any,label:string){
    setBusy(label);setError("");setNotice("");
    try{
      const r=await fetch("/api/creative-ops",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Creative Ops action failed");
      setNotice("Creative workspace updated.");
      await load();
      return d;
    }catch(e){setError(e instanceof Error?e.message:"Creative Ops action failed")}
    finally{setBusy("")}
  }

  async function createTask(e:FormEvent){
    e.preventDefault();
    await post({action:"create_task",...newTask,dueAt:newTask.dueAt?new Date(newTask.dueAt).toISOString():null},"create");
    setNewTask(v=>({...v,title:"",clientName:"",objective:"",audience:"",offer:"",description:"",dueAt:""}));
  }

  const visible=useMemo(()=>{
    const tasks=data?.tasks||[];
    if(filter==="active")return tasks.filter(t=>!["done","cancelled"].includes(t.status));
    if(filter==="review")return tasks.filter(t=>["internal_review","client_review","revision"].includes(t.detail?.approval_state||""));
    return tasks.filter(t=>t.status===filter);
  },[data,filter]);

  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><Link href="/team/shared" className="inline-flex items-center gap-2 text-xs text-[var(--prism-muted)]"><ArrowLeft size={14}/>Aneesh / Team</Link><p className="mt-4 text-xs tracking-[.22em] text-violet-300">CREATIVE OPERATIONS · ANEESH</p><h1 className="mt-2 text-3xl font-semibold">Design queue, briefs, revisions & approvals</h1><p className="mt-2 max-w-4xl text-sm text-[var(--prism-muted)]">Aneesh’s single source of truth for active client design work. COMIT prioritizes what matters now, keeps revision history, and separates creation from review and final approval.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/creative-library" className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><FolderOpen size={15}/>Creative Library</Link><Link href="/meta-studio" className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 px-3 py-2 text-sm"><Sparkles size={15}/>Meta Studio</Link><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button></div>
    </header>

    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 text-sm text-emerald-200">{notice}</p>}

    <section className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {[
        ["Total",data?.summary.total||0,Palette],["To do",data?.summary.todo||0,Target],
        ["In progress",data?.summary.inProgress||0,Clock3],["Review",data?.summary.review||0,ShieldCheck],
        ["Blocked",data?.summary.blocked||0,TriangleAlert],["Done",data?.summary.done||0,CheckCircle2]
      ].map(([label,value,Icon]:any)=><article key={label} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><Icon size={17}/><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-[var(--prism-muted)]">{label}</p></article>)}
    </section>

    <section className="mt-6 rounded-3xl border border-violet-400/20 bg-violet-500/5 p-5">
      <div className="flex items-center gap-2"><Target size={18}/><h2 className="font-semibold">Today’s creative focus</h2></div>
      <p className="mt-1 text-sm text-[var(--prism-muted)]">COMIT ranks Aneesh’s active work by urgency, due date, blockers and revision risk.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">{(data?.focus||[]).map((entry:any,index)=><article key={entry.task.id} className="rounded-2xl border border-[var(--prism-border)] bg-black/10 p-4"><div className="flex items-center justify-between"><span className="text-xs text-[var(--prism-muted)]">#{index+1} · score {entry.guidance.focusScore}</span><span className={"rounded-full border px-2 py-1 text-[10px] "+badge(entry.guidance.focusBand)}>{entry.guidance.focusBand}</span></div><h3 className="mt-3 font-medium">{entry.task.title}</h3><p className="mt-1 text-xs text-[var(--prism-muted)]">{entry.task.clientName||"Internal"} · {entry.task.deliverableType||"creative"}</p><p className="mt-3 text-xs">{entry.guidance.nextAction}</p></article>)}
      {!data?.focus?.length&&<p className="col-span-full rounded-xl border border-dashed border-[var(--prism-border)] p-5 text-sm text-[var(--prism-muted)]">No active creative tasks yet. Add the first live brief below.</p>}
      </div>
    </section>

    <section className="mt-6 grid gap-5 xl:grid-cols-[.65fr_1.35fr]">
      <form onSubmit={createTask} className="h-fit rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
        <div className="flex items-center gap-2"><Plus size={18}/><h2 className="font-semibold">Add creative task</h2></div>
        <p className="mt-2 text-xs text-[var(--prism-muted)]">COMIT automatically creates the first structured brief from these inputs.</p>
        <div className="mt-4 space-y-3">
          <input required maxLength={180} value={newTask.title} onChange={e=>setNewTask(v=>({...v,title:e.target.value}))} placeholder="Task title" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm"/>
          <input maxLength={160} value={newTask.clientName} onChange={e=>setNewTask(v=>({...v,clientName:e.target.value}))} placeholder="Client / brand" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm"/>
          <div className="grid grid-cols-2 gap-2"><select value={newTask.deliverableType} onChange={e=>setNewTask(v=>({...v,deliverableType:e.target.value}))} className="rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-3 text-sm">{deliverables.map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select><select value={newTask.platform} onChange={e=>setNewTask(v=>({...v,platform:e.target.value}))} className="rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-3 text-sm">{platforms.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
          <textarea rows={2} value={newTask.objective} onChange={e=>setNewTask(v=>({...v,objective:e.target.value}))} placeholder="Business objective" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm"/>
          <textarea rows={2} value={newTask.audience} onChange={e=>setNewTask(v=>({...v,audience:e.target.value}))} placeholder="Audience" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm"/>
          <textarea rows={2} value={newTask.offer} onChange={e=>setNewTask(v=>({...v,offer:e.target.value}))} placeholder="Message / offer / CTA" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm"/>
          <div className="grid grid-cols-2 gap-2"><select value={newTask.priority} onChange={e=>setNewTask(v=>({...v,priority:e.target.value}))} className="rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-3 text-sm">{priorityOptions.map(x=><option key={x} value={x}>{x}</option>)}</select><input type="datetime-local" value={newTask.dueAt} onChange={e=>setNewTask(v=>({...v,dueAt:e.target.value}))} className="rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 text-sm"/></div>
          <button disabled={!!busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold text-black disabled:opacity-50">{busy==="create"?<LoaderCircle size={16} className="animate-spin"/>:<Sparkles size={16}/>}Create task + AI brief</button>
        </div>
      </form>

      <div>
        <div className="mb-3 flex flex-wrap gap-2">{["active","todo","in_progress","review","blocked","done"].map(x=><button key={x} onClick={()=>setFilter(x)} className={"rounded-full border px-3 py-1.5 text-xs "+(filter===x?"border-violet-300/50 bg-violet-500/10":"border-[var(--prism-border)]")}>{x.replaceAll("_"," ")}</button>)}</div>
        <div className="space-y-4">{visible.map(task=>{
          const d=drafts[task.id]||{};
          return <article key={task.id} className="rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{task.title}</h2><span className={"rounded-full border px-2 py-1 text-[10px] "+badge(task.priority)}>{task.priority}</span><span className={"rounded-full border px-2 py-1 text-[10px] "+badge(task.status)}>{task.status.replaceAll("_"," ")}</span><span className={"rounded-full border px-2 py-1 text-[10px] "+badge(task.detail?.approval_state||"not_started")}>{(task.detail?.approval_state||"not_started").replaceAll("_"," ")}</span></div><p className="mt-1 text-xs text-[var(--prism-muted)]">{task.detail?.client_name||"Internal"} · {task.detail?.deliverable_type?.replaceAll("_"," ")||"creative"} · {task.detail?.platform||"platform not set"}</p></div><button onClick={()=>setOpen(open===task.id?"":task.id)} className="rounded-xl border border-[var(--prism-border)] px-3 py-2 text-xs">{open===task.id?"Close":"Manage task"}</button></div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-[10px] text-[var(--prism-muted)]">FOCUS SCORE</p><p className="mt-1 text-lg font-semibold">{task.guidance.focusScore}</p></div><div className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-[10px] text-[var(--prism-muted)]">REVISIONS</p><p className="mt-1 text-lg font-semibold">{task.detail?.revision_count||0}</p></div><div className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-[10px] text-[var(--prism-muted)]">DUE</p><p className="mt-1 text-sm font-medium">{task.due_at?new Date(task.due_at).toLocaleString():"Not set"}</p></div></div>

            <p className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3 text-sm">{task.guidance.nextAction}</p>
            {!!task.guidance.risks?.length&&<div className="mt-2 text-xs text-amber-200">{task.guidance.risks.map(x=><p key={x}>• {x}</p>)}</div>}

            {open===task.id&&<div className="mt-5 border-t border-[var(--prism-border)] pt-5">
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2"><select value={d.status||task.status} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,status:e.target.value}}))} className="rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-2 text-xs">{statusOptions.map(x=><option key={x}>{x}</option>)}</select><select value={d.priority||task.priority} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,priority:e.target.value}}))} className="rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-2 text-xs">{priorityOptions.map(x=><option key={x}>{x}</option>)}</select><input type="datetime-local" value={d.dueAt||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,dueAt:e.target.value}}))} className="rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/></div>
                  <button disabled={!!busy} onClick={()=>void post({action:"update_task",taskId:task.id,status:d.status,priority:d.priority,dueAt:d.dueAt?new Date(d.dueAt).toISOString():null},"task-"+task.id)} className="rounded-lg border border-sky-400/30 px-3 py-2 text-xs text-sky-100">Save status / priority / due</button>

                  <div className="grid grid-cols-2 gap-2"><input value={d.clientName||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,clientName:e.target.value}}))} placeholder="Client" className="rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/><input value={d.deliverableType||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,deliverableType:e.target.value}}))} placeholder="Deliverable" className="rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/></div>
                  <input value={d.platform||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,platform:e.target.value}}))} placeholder="Platform / size" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/>
                  <textarea rows={2} value={d.objective||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,objective:e.target.value}}))} placeholder="Objective" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/>
                  <textarea rows={2} value={d.audience||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,audience:e.target.value}}))} placeholder="Audience" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/>
                  <textarea rows={2} value={d.offer||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,offer:e.target.value}}))} placeholder="Message / offer" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/>
                  <select value={d.approvalState||"not_started"} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,approvalState:e.target.value}}))} className="w-full rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-2 text-xs">{approvalOptions.map(x=><option key={x}>{x}</option>)}</select>
                  <button disabled={!!busy} onClick={()=>void post({action:"update_brief",taskId:task.id,...d},"brief-"+task.id)} className="rounded-lg border border-violet-400/30 px-3 py-2 text-xs text-violet-100">Save creative brief fields</button>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-[var(--prism-border)] p-3"><div className="flex items-center justify-between"><p className="text-xs font-medium">AI-structured brief</p><button onClick={()=>void post({action:"regenerate_brief",taskId:task.id},"regen-"+task.id)} className="text-xs underline">Regenerate</button></div><textarea rows={12} value={d.brief||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,brief:e.target.value}}))} className="mt-2 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-3 font-mono text-xs"/></div>
                  <textarea rows={3} value={d.clientFeedback||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,clientFeedback:e.target.value}}))} placeholder="Latest consolidated client feedback" className="w-full rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/>
                  <div className="grid grid-cols-2 gap-2"><select value={d.handoffTo||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,handoffTo:e.target.value}}))} className="rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-2 text-xs"><option value="">No handoff</option>{(data?.collaborators||[]).map(c=><option key={c.email} value={c.email}>{c.name}</option>)}</select><input value={d.handoffNote||""} onChange={e=>setDrafts(v=>({...v,[task.id]:{...d,handoffNote:e.target.value}}))} placeholder="Handoff note" className="rounded-xl border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/></div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--prism-border)] p-3"><div className="flex items-center gap-2"><Link2 size={14}/><p className="text-xs font-medium">Asset / Figma / Drive link</p></div><div className="mt-2 flex gap-2"><input value={assetLinks[task.id]||""} onChange={e=>setAssetLinks(v=>({...v,[task.id]:e.target.value}))} placeholder="https://..." className="min-w-0 flex-1 rounded-lg border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/><button onClick={()=>void post({action:"add_asset_link",taskId:task.id,url:assetLinks[task.id],label:"Creative asset"},"asset-"+task.id)} className="rounded-lg border border-[var(--prism-border)] px-3 text-xs">Add</button></div><div className="mt-2 space-y-1">{(task.detail?.asset_links||[]).map((a:any)=><a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-violet-200 underline"><ExternalLink size={11}/>{a.label}</a>)}</div></div>
                <div className="rounded-xl border border-[var(--prism-border)] p-3"><div className="flex items-center gap-2"><MessageSquare size={14}/><p className="text-xs font-medium">Revision / review log</p></div><div className="mt-2 flex gap-2"><input value={updates[task.id]||""} onChange={e=>setUpdates(v=>({...v,[task.id]:e.target.value}))} placeholder="What changed / what is blocked?" className="min-w-0 flex-1 rounded-lg border border-[var(--prism-border)] bg-black/20 p-2 text-xs"/><button onClick={()=>void post({action:"add_update",taskId:task.id,updateType:"note",note:updates[task.id]},"update-"+task.id)} className="rounded-lg border border-[var(--prism-border)] px-3 text-xs">Log</button></div><div className="mt-2 flex flex-wrap gap-2"><button onClick={()=>void post({action:"add_update",taskId:task.id,updateType:"revision",note:updates[task.id]||"Revision requested"},"revision-"+task.id)} className="rounded-lg border border-amber-400/30 px-2 py-1 text-[11px]">Revision</button><button onClick={()=>void post({action:"add_update",taskId:task.id,updateType:"blocker",note:updates[task.id]||"Creative task blocked"},"block-"+task.id)} className="rounded-lg border border-red-400/30 px-2 py-1 text-[11px]">Blocker</button><button onClick={()=>void post({action:"add_update",taskId:task.id,updateType:"approval",note:updates[task.id]||"Creative approved"},"approve-"+task.id)} className="rounded-lg border border-emerald-400/30 px-2 py-1 text-[11px]">Approved</button><button onClick={()=>void post({action:"add_update",taskId:task.id,updateType:"completion",note:updates[task.id]||"Final creative delivered"},"done-"+task.id)} className="rounded-lg border border-sky-400/30 px-2 py-1 text-[11px]">Delivered</button></div></div>
              </div>

              {!!task.updates?.length&&<details className="mt-4 rounded-xl border border-[var(--prism-border)] p-3"><summary className="cursor-pointer text-xs font-medium">Task history</summary><div className="mt-2 space-y-2">{task.updates.map(u=><div key={u.id} className="rounded-lg bg-black/10 p-2"><p className="text-[10px] uppercase text-[var(--prism-muted)]">{u.update_type} · {new Date(u.created_at).toLocaleString()}</p><p className="mt-1 text-xs">{u.note}</p></div>)}</div></details>}
            </div>}
          </article>
        })}
        {!visible.length&&<p className="rounded-2xl border border-dashed border-[var(--prism-border)] p-8 text-center text-sm text-[var(--prism-muted)]">No tasks in this view.</p>}
        </div>
      </div>
    </section>

    <section className="mt-6 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4"><div className="flex items-center gap-2"><FileText size={16}/><h2 className="font-medium">Brief discipline</h2></div><p className="mt-2 text-xs text-[var(--prism-muted)]">Every task should have an objective, audience, message, platform, deadline and definition of done before heavy design work starts.</p></article><article className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4"><div className="flex items-center gap-2"><Users size={16}/><h2 className="font-medium">One consolidated revision</h2></div><p className="mt-2 text-xs text-[var(--prism-muted)]">Collect client/internal feedback into one revision note. Repeated revisions raise the task’s risk score and trigger a brief re-check.</p></article><article className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4"><div className="flex items-center gap-2"><ImageIcon size={16}/><h2 className="font-medium">Final asset learning</h2></div><p className="mt-2 text-xs text-[var(--prism-muted)]">After delivery, archive the final asset in Creative Library and record what worked so COMIT can reuse reviewed design patterns.</p></article></section>
  </div></main>;
}
