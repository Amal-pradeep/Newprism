"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {
  ArrowLeft,BarChart3,Eye,Image as ImageIcon,
  Instagram,LoaderCircle,Megaphone,RefreshCw,Send,ShieldCheck,Sparkles,
  TriangleAlert,Video
} from "lucide-react";

type Approval={
  id:string;
  action:string;
  status:string;
  requested_by:string;
  reviewed_by?:string|null;
  created_at:string;
};
type Variant={
  id:string;
  angle:string;
  hook:string;
  primaryText:string;
  headline:string;
  description:string;
  cta:string;
  placement:string;
  aspectRatio:string;
  visualDirection:string[];
  motionPlan:string[];
  generationPrompt:string;
};
type Draft={
  id:string;
  client_name:string;
  brand_name?:string|null;
  objective:string;
  channel:string;
  placement?:string|null;
  media_type:string;
  source_asset_url?:string|null;
  creative_package:any;
  selected_variant_id?:string|null;
  quality_evaluation:any;
  meta_payload:any;
  status:string;
  created_by:string;
  reviewed_by?:string|null;
  reviewed_at?:string|null;
  meta_object_id?:string|null;
  last_error?:string|null;
  created_at:string;
  approvals:Approval[];
};
type Data={
  ok:boolean;
  user:{email:string;name?:string};
  permissions:{canCreativeReview:boolean;canPublish:boolean};
  integration:{configured:boolean;externalWritesEnabled:boolean;graphVersion:string;adAccountConfigured:boolean;pageConfigured:boolean;instagramConfigured:boolean};
  workflow:{creative:string;organic:string;paid:string};
  metaPermissionPlan?:Record<string,{minimum:readonly string[];reporting?:readonly string[];optionalAgentMcp?:readonly string[];note:string}>;
  drafts:Draft[];
  error?:string;
};

const objectives=["awareness","traffic","leads","messages","sales","engagement"];
const channels=[
  ["instagram_organic","Instagram organic"],
  ["facebook_organic","Facebook organic"],
  ["meta_ads","Meta paid ads"]
];
const placements=[
  ["instagram_reels","Instagram Reels"],
  ["instagram_feed","Instagram Feed"],
  ["facebook_reels","Facebook Reels"],
  ["facebook_feed","Facebook Feed"]
];

function statusStyle(status:string){
  if(["creative_approved","approved","published","active_on_meta"].includes(status))return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if(["creative_review","publish_review","processing_on_meta","paused_on_meta"].includes(status))return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if(["rejected","failed"].includes(status))return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-[var(--prism-border)] bg-white/5 text-[var(--prism-muted)]";
}

export default function MetaStudio(){
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState("");
  const [form,setForm]=useState({
    client:"",
    brand:"",
    industry:"",
    objective:"leads",
    channel:"meta_ads",
    mediaType:"video",
    placement:"instagram_reels",
    audience:"",
    offer:"",
    proof:"",
    sourceAssetUrl:"",
    destinationUrl:"",
    location:"",
    primaryColor:"",
    secondaryColor:"",
    adSetId:"",
    imageHash:"",
    videoId:"",
    thumbnailUrl:""
  });

  async function load(){
    setError("");
    try{
      const r=await fetch("/api/meta/creative",{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Meta Studio unavailable");
      setData(d);
    }catch(e){setError(e instanceof Error?e.message:"Meta Studio unavailable")}
  }
  useEffect(()=>{void load()},[]);

  async function post(body:any,label:string){
    setBusy(label);setError("");setNotice("");
    try{
      const r=await fetch("/api/meta/creative",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Meta Studio action failed");
      setNotice(
        d.status==="processing_on_meta"
          ?"Meta is processing the approved media container. Run the approved publish action again after processing finishes."
          :d.status==="paused_on_meta"
            ?"The paid ad was created PAUSED. Review the Meta preview before requesting activation."
            :d.status==="active_on_meta"
              ?"The approved Meta ad is now ACTIVE."
              :"Saved. Review state updated."
      );
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Meta Studio action failed")}
    finally{setBusy("")}
  }

  async function prepare(e:FormEvent){
    e.preventDefault();
    await post({action:"prepare",...form},"prepare");
  }

  const metrics=useMemo(()=>{
    const drafts=data?.drafts||[];
    return {
      total:drafts.length,
      waiting:drafts.filter(x=>["creative_review","publish_review"].includes(x.status)).length,
      paused:drafts.filter(x=>x.status==="paused_on_meta").length,
      live:drafts.filter(x=>["published","active_on_meta"].includes(x.status)).length
    };
  },[data]);

  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-[var(--prism-muted)]"><ArrowLeft size={14}/>Command Center</Link>
        <p className="mt-4 text-xs tracking-[.22em] text-violet-300">DIGITAL MARKETING AI · META CREATIVE STUDIO</p>
        <h1 className="mt-2 text-3xl font-semibold">Create beautifully. Review deliberately. Publish safely.</h1>
        <p className="mt-2 max-w-4xl text-sm text-[var(--prism-muted)]">COMIT creates placement-ready ad concepts, scores the creative, asks the right teammate to review it, and blocks every Meta post or paid activation until the required permission is explicitly approved.</p>
      </div>
      <button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button>
    </header>

    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 text-sm text-emerald-200">{notice}</p>}

    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Creative drafts",metrics.total,Sparkles],
        ["Waiting review",metrics.waiting,ShieldCheck],
        ["Paused Meta ads",metrics.paused,Eye],
        ["Published / active",metrics.live,BarChart3]
      ].map(([label,value,Icon]:any)=><article key={label} className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><Icon size={18} className="text-violet-300"/><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-[var(--prism-muted)]">{label}</p></article>)}
    </section>

    <section className="mt-6 grid gap-4 lg:grid-cols-3">
      <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex items-center gap-2"><Instagram size={17}/><p className="font-medium">Organic publishing</p></div><p className="mt-2 text-xs text-[var(--prism-muted)]">{data?.workflow.organic||"Creative approved -> founder permission -> explicit publish"}</p></article>
      <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex items-center gap-2"><Megaphone size={17}/><p className="font-medium">Paid Meta ads</p></div><p className="mt-2 text-xs text-[var(--prism-muted)]">{data?.workflow.paid||"Create PAUSED -> preview -> second permission -> ACTIVE"}</p></article>
      <article className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex items-center gap-2"><ShieldCheck size={17}/><p className="font-medium">Integration guard</p></div><p className="mt-2 text-xs text-[var(--prism-muted)]">Graph {data?.integration.graphVersion||"v26.0"} · token {data?.integration.configured?"configured":"not configured"} · external writes {data?.integration.externalWritesEnabled?"enabled":"disabled"}</p></article>
    </section>

    <form onSubmit={prepare} className="mt-6 rounded-3xl border border-violet-400/20 bg-violet-500/5 p-5">
      <div className="flex items-center gap-2"><Sparkles size={19}/><h2 className="font-semibold">Create an ad package</h2></div>
      <p className="mt-2 text-sm text-[var(--prism-muted)]">Give COMIT the truth: audience, offer, proof and actual asset. It will create three differentiated concepts instead of one generic ad.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs text-[var(--prism-muted)]">Client<input required maxLength={120} value={form.client} onChange={e=>setForm(v=>({...v,client:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="Nostaza"/></label>
        <label className="text-xs text-[var(--prism-muted)]">Brand<input maxLength={120} value={form.brand} onChange={e=>setForm(v=>({...v,brand:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="Brand name"/></label>
        <label className="text-xs text-[var(--prism-muted)]">Industry<input maxLength={120} value={form.industry} onChange={e=>setForm(v=>({...v,industry:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="Restaurant"/></label>
        <label className="text-xs text-[var(--prism-muted)]">Location<input maxLength={120} value={form.location} onChange={e=>setForm(v=>({...v,location:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="Al Warqa, Dubai"/></label>

        <label className="text-xs text-[var(--prism-muted)]">Objective<select value={form.objective} onChange={e=>setForm(v=>({...v,objective:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm">{objectives.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label className="text-xs text-[var(--prism-muted)]">Channel<select value={form.channel} onChange={e=>setForm(v=>({...v,channel:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm">{channels.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-[var(--prism-muted)]">Placement<select value={form.placement} onChange={e=>setForm(v=>({...v,placement:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm">{placements.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-[var(--prism-muted)]">Media<select value={form.mediaType} onChange={e=>setForm(v=>({...v,mediaType:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm"><option value="video">Video / Reel</option><option value="image">Image</option></select></label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <label className="text-xs text-[var(--prism-muted)]">Audience<textarea required maxLength={300} rows={3} value={form.audience} onChange={e=>setForm(v=>({...v,audience:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="Who should care and why?"/></label>
        <label className="text-xs text-[var(--prism-muted)]">Offer<textarea required maxLength={300} rows={3} value={form.offer} onChange={e=>setForm(v=>({...v,offer:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="One offer/action only"/></label>
        <label className="text-xs text-[var(--prism-muted)]">Proof<textarea maxLength={300} rows={3} value={form.proof} onChange={e=>setForm(v=>({...v,proof:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="Real product/client/process proof"/></label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs text-[var(--prism-muted)]">HTTPS asset URL<input type="url" value={form.sourceAssetUrl} onChange={e=>setForm(v=>({...v,sourceAssetUrl:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="https://..."/></label>
        <label className="text-xs text-[var(--prism-muted)]">Destination URL<input type="url" value={form.destinationUrl} onChange={e=>setForm(v=>({...v,destinationUrl:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="https://..."/></label>
        <label className="text-xs text-[var(--prism-muted)]">Meta ad set ID <span className="opacity-70">paid only</span><input value={form.adSetId} onChange={e=>setForm(v=>({...v,adSetId:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="123456..."/></label>
        <label className="text-xs text-[var(--prism-muted)]">Meta image hash <span className="opacity-70">image ads</span><input value={form.imageHash} onChange={e=>setForm(v=>({...v,imageHash:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="Existing Meta asset hash"/></label>
      </div>
      {form.channel==="meta_ads"&&form.mediaType==="video"&&<div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs text-[var(--prism-muted)]">Meta video ID<input value={form.videoId} onChange={e=>setForm(v=>({...v,videoId:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="Video already uploaded to the Meta ad account"/></label><label className="text-xs text-[var(--prism-muted)]">Thumbnail URL <span className="opacity-70">optional</span><input type="url" value={form.thumbnailUrl} onChange={e=>setForm(v=>({...v,thumbnailUrl:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="https://..."/></label></div>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--prism-muted)]">Primary brand color<input value={form.primaryColor} onChange={e=>setForm(v=>({...v,primaryColor:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="#... or brand color name"/></label>
        <label className="text-xs text-[var(--prism-muted)]">Secondary color<input value={form.secondaryColor} onChange={e=>setForm(v=>({...v,secondaryColor:e.target.value}))} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2.5 text-sm" placeholder="#... or neutral"/></label>
      </div>

      <button disabled={!!busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{busy==="prepare"?<LoaderCircle className="animate-spin" size={16}/>:<Sparkles size={16}/>}Create 3 ad concepts</button>
    </form>

    <section className="mt-7 space-y-5">
      {(data?.drafts||[]).map(draft=>{
        const variants:Variant[]=draft.creative_package?.variants||[];
        const selected=variants.find(v=>v.id===draft.selected_variant_id)||variants[0];
        const quality=draft.quality_evaluation||{};
        const pendingCreative=draft.approvals?.find(a=>a.action==="creative_review"&&a.status==="pending");
        const pendingExternal=draft.approvals?.find(a=>a.action!=="creative_review"&&a.status==="pending");
        const approvedExternal=draft.approvals?.find(a=>a.action!=="creative_review"&&a.status==="approved");
        const previewUrl=draft.meta_payload?.preview?.preview_shareable_link||draft.meta_payload?.activation_preview?.preview_shareable_link;
        return <article key={draft.id} className="rounded-3xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{draft.client_name}</h2><span className={"rounded-full border px-2 py-1 text-[10px] "+statusStyle(draft.status)}>{draft.status.replaceAll("_"," ")}</span>{draft.creative_package?.special_category_review_required&&<span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-200">manual compliance review</span>}</div><p className="mt-1 text-xs text-[var(--prism-muted)]">{draft.channel.replaceAll("_"," ")} · {draft.placement?.replaceAll("_"," ")} · {draft.media_type} · by {draft.created_by}</p></div>
            <div className="text-right"><p className="text-2xl font-semibold">{quality.score??"—"}<span className="text-sm font-normal text-[var(--prism-muted)]">/100</span></p><p className="text-xs text-[var(--prism-muted)]">creative quality · {quality.grade||"unscored"}</p></div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
            <div className={"overflow-hidden rounded-3xl border border-[var(--prism-border)] bg-black/20 "+(selected?.aspectRatio==="9:16"?"mx-auto w-full max-w-[330px]":"")}>
              {draft.source_asset_url&&draft.media_type==="image"?<div className="relative aspect-[4/5] overflow-hidden"><img src={draft.source_asset_url} alt={selected?.altText||draft.client_name} className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"/><div className="absolute inset-x-0 bottom-0 p-5"><p className="text-lg font-semibold">{selected?.hook}</p><p className="mt-2 text-sm text-white/75">{selected?.headline}</p><span className="mt-4 inline-block rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">{selected?.cta?.replaceAll("_"," ")}</span></div></div>:<div className={"flex flex-col justify-between p-6 "+(selected?.aspectRatio==="9:16"?"aspect-[9/16]":"aspect-[4/5]")}><div><div className="flex items-center gap-2 text-xs text-violet-200">{draft.media_type==="video"?<Video size={14}/>:<ImageIcon size={14}/>} {selected?.aspectRatio} concept</div><p className="mt-6 text-2xl font-semibold">{selected?.hook}</p></div><div><p className="text-sm text-[var(--prism-muted)]">{selected?.headline}</p><p className="mt-2 text-xs text-[var(--prism-muted)]">{selected?.description}</p><span className="mt-4 inline-block rounded-full border border-white/20 px-3 py-1.5 text-xs">{selected?.cta?.replaceAll("_"," ")}</span></div></div>}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--prism-muted)]">Creative variants</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">{variants.map(variant=>{
                const evaluation=(draft.creative_package?.evaluations||[]).find((x:any)=>x.variant_id===variant.id);
                return <button key={variant.id} disabled={!!busy} onClick={()=>void post({action:"select_variant",creativeId:draft.id,variantId:variant.id},"variant-"+draft.id)} className={"rounded-xl border p-3 text-left "+(variant.id===draft.selected_variant_id?"border-violet-300/50 bg-violet-500/10":"border-[var(--prism-border)]")}><p className="text-xs font-medium">{variant.id.toUpperCase()} · {evaluation?.score||"—"}/100</p><p className="mt-1 text-xs text-[var(--prism-muted)]">{variant.angle}</p></button>
              })}</div>

              {selected&&<div className="mt-4 rounded-2xl border border-[var(--prism-border)] p-4"><p className="text-sm font-semibold">{selected.hook}</p><p className="mt-2 text-sm text-[var(--prism-muted)]">{selected.primaryText}</p><div className="mt-3 grid gap-3 md:grid-cols-2"><div><p className="text-xs font-medium">Visual direction</p><div className="mt-2 space-y-1 text-xs text-[var(--prism-muted)]">{selected.visualDirection.slice(0,5).map(x=><p key={x}>• {x}</p>)}</div></div><div><p className="text-xs font-medium">Motion / execution</p><div className="mt-2 space-y-1 text-xs text-[var(--prism-muted)]">{selected.motionPlan.slice(0,5).map(x=><p key={x}>• {x}</p>)}</div></div></div><details className="mt-3"><summary className="cursor-pointer text-xs text-violet-200">AI generation / design prompt</summary><p className="mt-2 text-xs text-[var(--prism-muted)]">{selected.generationPrompt}</p></details></div>}

              {!!quality.revisions?.length&&<div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3"><p className="text-xs font-medium text-amber-200">Improve before scale</p>{quality.revisions.map((x:string)=><p key={x} className="mt-1 text-xs text-[var(--prism-muted)]">• {x}</p>)}</div>}

              <div className="mt-4 flex flex-wrap gap-2">
                {draft.status==="draft"&&!pendingCreative&&<button disabled={!!busy} onClick={()=>void post({action:"request_creative_review",creativeId:draft.id},"creative-review-"+draft.id)} className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs text-violet-100">Ask creative team to review</button>}
                {pendingCreative&&data?.permissions.canCreativeReview&&<><button disabled={!!busy} onClick={()=>void post({action:"review",approvalId:pendingCreative.id,decision:"approve"},"review-"+pendingCreative.id)} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs text-emerald-100">Approve creative</button><button disabled={!!busy} onClick={()=>void post({action:"review",approvalId:pendingCreative.id,decision:"reject"},"reject-"+pendingCreative.id)} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs text-red-100">Request revision</button></>}
                {draft.status==="creative_approved"&&!pendingExternal&&draft.channel!=="meta_ads"&&<button disabled={!!busy} onClick={()=>void post({action:"request_external_approval",creativeId:draft.id,requestedAction:"publish_organic"},"publish-request-"+draft.id)} className="rounded-xl border border-amber-400/30 px-3 py-2 text-xs text-amber-100">Ask permission to publish</button>}
                {draft.status==="creative_approved"&&!pendingExternal&&draft.channel==="meta_ads"&&<button disabled={!!busy} onClick={()=>void post({action:"request_external_approval",creativeId:draft.id,requestedAction:"create_paused_ad"},"ad-request-"+draft.id)} className="rounded-xl border border-amber-400/30 px-3 py-2 text-xs text-amber-100">Ask permission to create PAUSED ad</button>}
                {pendingExternal&&data?.permissions.canPublish&&<><button disabled={!!busy} onClick={()=>void post({action:"review",approvalId:pendingExternal.id,decision:"approve"},"ext-review-"+pendingExternal.id)} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs text-emerald-100">Approve {pendingExternal.action.replaceAll("_"," ")}</button><button disabled={!!busy} onClick={()=>void post({action:"review",approvalId:pendingExternal.id,decision:"reject"},"ext-reject-"+pendingExternal.id)} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs text-red-100">Reject</button></>}
                {approvedExternal&&data?.permissions.canPublish&&<button disabled={!!busy} onClick={()=>void post({action:"execute",approvalId:approvedExternal.id},"execute-"+approvedExternal.id)} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black"><Send size={13}/>Execute approved action</button>}
                {draft.status==="processing_on_meta"&&approvedExternal&&data?.permissions.canPublish&&<button disabled={!!busy} onClick={()=>void post({action:"execute",approvalId:approvedExternal.id},"publish-container-"+approvedExternal.id)} className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs">Check processing & publish</button>}
                {draft.status==="paused_on_meta"&&<><button disabled={!!busy} onClick={()=>void post({action:"refresh_preview",creativeId:draft.id},"preview-"+draft.id)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-xs"><Eye size={13}/>Refresh Meta preview</button>{!pendingExternal&&<button disabled={!!busy} onClick={()=>void post({action:"request_external_approval",creativeId:draft.id,requestedAction:"activate_ad"},"activate-request-"+draft.id)} className="rounded-xl border border-amber-400/30 px-3 py-2 text-xs text-amber-100">Ask permission to activate / spend</button>}</>}
                {draft.status==="active_on_meta"&&<button disabled={!!busy} onClick={()=>void post({action:"refresh_insights",creativeId:draft.id},"insights-"+draft.id)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-xs"><BarChart3 size={13}/>Refresh 7-day insights</button>}
                {previewUrl&&<a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 px-3 py-2 text-xs text-violet-100"><Eye size={13}/>Open Meta preview</a>}
              </div>

              {draft.creative_package?.latest_performance&&<div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/5 p-3"><p className="text-xs font-medium text-sky-100">Latest 7-day Meta diagnostic</p><div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--prism-muted)]">{Object.entries(draft.creative_package.latest_performance.metrics||{}).filter(([,value])=>value!==null).map(([key,value])=><span key={key} className="rounded-full border border-[var(--prism-border)] px-2 py-1">{key.toUpperCase()} {String(value)}</span>)}</div><p className="mt-2 text-xs text-[var(--prism-muted)]">{draft.creative_package.latest_performance.next_experiment}</p></div>}
              <div className="mt-4 border-t border-[var(--prism-border)] pt-3 text-[11px] text-[var(--prism-muted)]">
                {draft.approvals?.slice(0,5).map(a=><p key={a.id}>{a.action.replaceAll("_"," ")} · {a.status} · requested by {a.requested_by}{a.reviewed_by?" · reviewed by "+a.reviewed_by:""}</p>)}
                {!draft.approvals?.length&&<p>No review requests yet.</p>}
              </div>
            </div>
          </div>

          {draft.last_error&&<p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-200">{draft.last_error}</p>}
        </article>
      })}
      {!data?.drafts?.length&&<div className="rounded-2xl border border-dashed border-[var(--prism-border)] p-10 text-center"><Megaphone className="mx-auto text-[var(--prism-muted)]"/><p className="mt-3 text-sm">No Meta creative packages yet. Create the first one above.</p></div>}
    </section>

    <section className="mt-7 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><h2 className="font-medium">Minimum Meta permissions COMIT will request</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">COMIT deliberately avoids asking for every Meta permission. The exact chain depends on whether you connect ads, Facebook Page publishing, or Instagram publishing.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.entries(data?.metaPermissionPlan||{}).map(([key,value])=><article key={key} className="rounded-xl border border-[var(--prism-border)] p-4"><p className="text-sm font-medium">{key.replaceAll("_"," ")}</p><p className="mt-2 text-xs text-[var(--prism-muted)]">{value.minimum.join(" · ")}</p>{value.reporting&&<p className="mt-1 text-xs text-[var(--prism-muted)]">Reporting: {value.reporting.join(" · ")}</p>}<p className="mt-2 text-[11px] text-[var(--prism-muted)]">{value.note}</p></article>)}</div></section>

    <section className="mt-7 grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5"><div className="flex items-center gap-2"><ShieldCheck size={18}/><h2 className="font-medium">Human permission is part of the product</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">Creative review and external execution are separate. Paid ads are created PAUSED first. Activating spend needs another explicit founder approval after the Meta preview is available.</p></article>
      <article className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5"><div className="flex items-center gap-2"><TriangleAlert size={18}/><h2 className="font-medium">Meta access still has to be connected</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">COMIT can prepare everything now. Actual publishing requires a Meta app, correct Page/Instagram/ad-account access, approved permissions, credentials, and the external-write safety switch.</p></article>
    </section>
  </div></main>;
}
