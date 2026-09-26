"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, LockKeyhole, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import OwnerSetup from "./owner-setup";

type Member = { email: string; name: string; role: "owner" | "member"; active?: number };
type Prospect = { id: string; name: string; email: string | null; industry: string | null; location: string | null; source: string | null; stage: string; notes: string; owner_email: string | null; updated_by: string | null; updated_at: string };
type Draft = { id: string; prospect_id: string; subject: string; body: string; status: string; created_by: string; updated_at: string };
type Checkin = { id: string; email: string; note: string; created_at: string };
type Creative = { id: string; title: string; category: string; source_url: string; notes: string; created_by: string; created_at: string };
type Workspace = { member: Member; members: Member[]; prospects: Prospect[]; drafts: Draft[]; checkins: Checkin[]; creative: Creative[] };
const stages = ["research", "new", "qualified", "contacted", "meeting", "won", "not-a-fit"];
const categories = ["shoot brief", "footage reference", "edit", "spot edit", "script", "creative reference"];
const input = "w-full rounded-xl border border-[var(--prism-border)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-violet-400";
const panel = "rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5";
const button = "rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50";

export default function WorkspacePage() {
  const [data, setData] = useState<Workspace | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("prospects");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState("");
  const [stage, setStage] = useState("research");
  const [notes, setNotes] = useState("");
  const [owner, setOwner] = useState("");
  const [subject, setSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [checkin, setCheckin] = useState("");
  const [creativeTitle, setCreativeTitle] = useState("");
  const [creativeCategory, setCreativeCategory] = useState(categories[0]);
  const [creativeUrl, setCreativeUrl] = useState("");
  const [creativeNotes, setCreativeNotes] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [issuedPassword, setIssuedPassword] = useState("");
  const [prospectForm, setProspectForm] = useState({ name: "", email: "", industry: "", location: "", source: "", notes: "" });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) { setData(null); if (response.status !== 401) setMessage(body.error || "Shared workspace unavailable."); return; }
      setData(body);
    } catch { setMessage("Could not connect to the shared workspace."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const selected = useMemo(() => data?.prospects.find(item => item.id === chosen), [data, chosen]);
  const selectedDraft = useMemo(() => data?.drafts.find(item => item.prospect_id === chosen && item.status === "draft"), [data, chosen]);
  function selectProspect(item: Prospect) {
    setChosen(item.id); setStage(item.stage); setNotes(item.notes); setOwner(item.owner_email || "");
    const existing = data?.drafts.find(draft => draft.prospect_id === item.id && draft.status === "draft");
    setSubject(existing?.subject || `A few ideas for ${item.name}`);
    setDraftBody(existing?.body || `Hi ${item.name} team,\n\nWe would like to understand your current creative priorities before suggesting a project. If useful, we can share a few ideas for your review.\n\nRegards,\nPrism of Stories`);
    setMessage("");
  }
  async function mutate(url: string, payload: object, success: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save.");
      setMessage(success); await refresh(); return result;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); return null; }
    finally { setBusy(false); }
  }
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    const result = await mutate("/api/workspace/auth", { email, password }, "Signed in to the shared workspace.");
    if (result) setPassword("");
  }
  async function signOut() {
    await fetch("/api/workspace/auth", { method: "DELETE" });
    setData(null); setChosen(""); setIssuedPassword(""); setMessage("Signed out.");
  }

  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs tracking-widest text-violet-300">PRIVATE · SHARED · NO AUTOMATIC SENDS</p><h1 className="mt-2 text-3xl font-semibold">Team workspace</h1><p className="mt-2 max-w-2xl text-sm text-[var(--prism-muted)]">One shared place for prospect progress, reviewed drafts, team check-ins and Shahid’s creative references. Updates appear for every signed-in teammate.</p></div>
        {data && <div className="flex items-center gap-2"><span className="text-sm text-[var(--prism-muted)]">{data.member.name}</span><button onClick={() => void refresh()} aria-label="Refresh shared records" className="rounded-xl border border-[var(--prism-border)] p-2"><RefreshCw size={16}/></button><button onClick={() => void signOut()} className="rounded-xl border border-[var(--prism-border)] p-2" aria-label="Sign out"><LogOut size={16}/></button></div>}
      </header>
      {message && <p role="status" className="mt-5 rounded-xl border border-[var(--prism-border)] p-3 text-sm">{message}</p>}
      {loading ? <p className="mt-8 text-sm text-[var(--prism-muted)]">Connecting to shared records…</p> : !data ?
        <div className="mt-8 grid max-w-5xl gap-5 lg:grid-cols-2"><section className={panel}><div className="flex items-center gap-2 text-violet-300"><LockKeyhole size={18}/><span className="text-xs uppercase tracking-widest">Private team sign-in</span></div><h2 className="mt-3 text-xl font-medium">Sign in with your password</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">Use your COMIT team email and your individual password. Your session lasts up to 30 days on this device.</p><form onSubmit={event => void signIn(event)} className="mt-6 space-y-3"><label className="block text-sm">Team email<input className={`${input} mt-2`} type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)}/></label><label className="block text-sm">Password<input className={`${input} mt-2`} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)}/></label><button disabled={busy} className={button}>{busy ? "Checking…" : "Open shared workspace"}</button></form></section><OwnerSetup /></div>
      : <>
        <div className="mt-7 flex gap-2 overflow-x-auto" role="tablist" aria-label="Workspace sections">{[["prospects","Prospects"],["drafts","Drafts"],["team","Team"],["creative","Creative Library"],...(data.member.role === "owner" ? [["access","Access"]] : [])].map(([key,label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setMessage(""); }} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${tab === key ? "border-violet-400 bg-violet-500/15 text-white" : "border-[var(--prism-border)] text-[var(--prism-muted)]"}`}>{label}</button>)}</div>
        {tab === "prospects" && <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]"><section className={panel}><h2 className="text-lg font-medium">Shared prospects <span className="text-sm text-[var(--prism-muted)]">{data.prospects.length}</span></h2><p className="mt-1 text-xs text-[var(--prism-muted)]">Research leads are hypotheses. Public email addresses do not grant marketing consent.</p><div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto">{data.prospects.map(item => <button key={item.id} onClick={() => selectProspect(item)} className={`w-full rounded-xl border p-3 text-left ${chosen === item.id ? "border-violet-400" : "border-[var(--prism-border)]"}`}><span className="block font-medium">{item.name}</span><span className="mt-1 block text-xs text-[var(--prism-muted)]">{item.stage} · {item.location || "Location pending"} · {item.owner_email || "Unassigned"}</span></button>)}</div></section><section className="space-y-5">{selected ? <div className={panel}><div className="flex items-start justify-between gap-2"><div><h2 className="text-xl font-medium">{selected.name}</h2><p className="mt-1 text-sm text-[var(--prism-muted)]">{selected.industry} · {selected.location}</p></div>{selected.source && <a href={selected.source} target="_blank" rel="noreferrer" aria-label="Open research source"><ExternalLink size={16}/></a>}</div><p className="mt-3 text-xs text-[var(--prism-muted)]">{selected.email || "Email unverified"}</p><label className="mt-5 block text-sm">Stage<select className={`${input} mt-2`} value={stage} onChange={event => setStage(event.target.value)}>{stages.map(value => <option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-sm">Owner<select className={`${input} mt-2`} value={owner} onChange={event => setOwner(event.target.value)}><option value="">Unassigned</option>{data.members.filter(m => m.active).map(m => <option key={m.email} value={m.email}>{m.name}</option>)}</select></label><label className="mt-3 block text-sm">Research and next action<textarea className={`${input} mt-2 min-h-28`} value={notes} onChange={event => setNotes(event.target.value)}/></label><button disabled={busy} onClick={() => void mutate("/api/workspace", { action: "update-prospect", id: selected.id, stage, notes, owner_email: owner }, "Prospect updated for the team.")} className={`${button} mt-4`}>Save for team</button><p className="mt-3 text-xs text-[var(--prism-muted)]">Last updated {selected.updated_at} by {selected.updated_by || "research seed"}</p></div> : <div className={panel}><p className="text-sm text-[var(--prism-muted)]">Choose a prospect to assign and update it.</p></div>}<form onSubmit={event => {event.preventDefault(); void mutate("/api/workspace", {action:"add-prospect", ...prospectForm}, "Prospect added for the team.").then(result => {if(result) setProspectForm({name:"",email:"",industry:"",location:"",source:"",notes:""});});}} className={panel}><h2 className="font-medium">Add a prospect</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{(["name","email","industry","location","source","notes"] as const).map(key => <label key={key} className={`text-xs capitalize ${key === "notes" ? "sm:col-span-2" : ""}`}>{key}<input className={`${input} mt-1`} type={key === "email" ? "email" : key === "source" ? "url" : "text"} required={key === "name"} placeholder={key === "source" ? "https://official-site.example" : ""} value={prospectForm[key]} onChange={event => setProspectForm({...prospectForm,[key]:event.target.value})}/></label>)}</div><button disabled={busy} className={`${button} mt-4`}>Add to shared list</button></form></section></div>}
        {tab === "drafts" && <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]"><section className={panel}><h2 className="text-lg font-medium">Draft review queue</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">These are shared drafts only. COMIT does not send email.</p><div className="mt-4 space-y-3">{data.drafts.length ? data.drafts.map(item => <button key={item.id} onClick={() => {const prospect = data.prospects.find(p => p.id === item.prospect_id); if(prospect) selectProspect(prospect);}} className="block w-full rounded-xl border border-[var(--prism-border)] p-3 text-left"><span className="font-medium">{item.subject}</span><span className="mt-1 block text-xs text-[var(--prism-muted)]">{data.prospects.find(p => p.id === item.prospect_id)?.name} · {item.created_by} · {item.status}</span></button>) : <p className="text-sm text-[var(--prism-muted)]">No shared drafts yet.</p>}</div></section><section className={panel}><h2 className="text-lg font-medium">Prepare or edit a draft</h2><label className="mt-4 block text-sm">Prospect<select className={`${input} mt-2`} value={chosen} onChange={event => {const item = data.prospects.find(p => p.id === event.target.value); if(item) selectProspect(item);}}><option value="">Choose a prospect</option>{data.prospects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{selected && <><label className="mt-3 block text-sm">Subject<input className={`${input} mt-2`} value={subject} onChange={event => setSubject(event.target.value)}/></label><label className="mt-3 block text-sm">Body<textarea className={`${input} mt-2 min-h-64`} value={draftBody} onChange={event => setDraftBody(event.target.value)}/></label><button disabled={busy} onClick={() => void mutate("/api/workspace", { action:"save-draft", id:selectedDraft?.id, prospect_id:selected.id, subject, body:draftBody }, "Draft saved for team review. Nothing was sent.")} className={`${button} mt-4`}>Save shared draft</button></>}</section></div>}
        {tab === "team" && <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]"><section className={panel}><h2 className="text-lg font-medium">Teammates</h2><div className="mt-4 space-y-2">{data.members.map(item => <div key={item.email} className="rounded-xl border border-[var(--prism-border)] p-3"><span className="font-medium">{item.name}</span><span className="ml-2 text-xs text-[var(--prism-muted)]">{item.active ? item.role : "inactive"}</span><p className="mt-1 text-xs text-[var(--prism-muted)]">{item.email}</p></div>)}</div></section><section className={panel}><h2 className="text-lg font-medium">Team check-ins</h2><form onSubmit={event => {event.preventDefault(); void mutate("/api/workspace", {action:"checkin",note:checkin}, "Check-in shared with the team.").then(result => {if(result) setCheckin("");});}} className="mt-4"><label className="block text-sm">What moved forward today?<textarea className={`${input} mt-2 min-h-24`} required value={checkin} onChange={event => setCheckin(event.target.value)}/></label><button disabled={busy} className={`${button} mt-3`}>Post check-in</button></form><div className="mt-5 space-y-2">{data.checkins.map(item => <div key={item.id} className="rounded-xl border border-[var(--prism-border)] p-3"><p className="text-sm">{item.note}</p><p className="mt-2 text-xs text-[var(--prism-muted)]">{item.email} · {item.created_at}</p></div>)}</div></section></div>}
        {tab === "creative" && <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]"><section className={panel}><h2 className="text-lg font-medium">Shahid’s shared creative references</h2><p className="mt-2 text-sm text-[var(--prism-muted)]">Share secure links to shoot briefs, edits and reference assets. Large files can stay in your existing storage.</p><div className="mt-4 space-y-3">{data.creative.length ? data.creative.map(item => <div key={item.id} className="rounded-xl border border-[var(--prism-border)] p-3"><a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium hover:underline">{item.title}<ExternalLink size={14}/></a><p className="mt-1 text-xs text-[var(--prism-muted)]">{item.category} · {item.created_by}</p><p className="mt-2 text-sm text-[var(--prism-muted)]">{item.notes}</p></div>) : <p className="text-sm text-[var(--prism-muted)]">No shared references yet.</p>}</div></section><form onSubmit={event => {event.preventDefault(); void mutate("/api/workspace", {action:"creative",title:creativeTitle,category:creativeCategory,source_url:creativeUrl,notes:creativeNotes}, "Creative reference shared with the team.").then(result => {if(result){setCreativeTitle("");setCreativeUrl("");setCreativeNotes("");}});}} className={panel}><h2 className="text-lg font-medium">Add a reference</h2><label className="mt-4 block text-sm">Title<input className={`${input} mt-2`} required value={creativeTitle} onChange={event => setCreativeTitle(event.target.value)}/></label><label className="mt-3 block text-sm">Category<select className={`${input} mt-2`} value={creativeCategory} onChange={event => setCreativeCategory(event.target.value)}>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-sm">Secure link<input className={`${input} mt-2`} type="url" placeholder="https://" required value={creativeUrl} onChange={event => setCreativeUrl(event.target.value)}/></label><label className="mt-3 block text-sm">Production notes<textarea className={`${input} mt-2 min-h-28`} value={creativeNotes} onChange={event => setCreativeNotes(event.target.value)}/></label><button disabled={busy} className={`${button} mt-4`}>Share with team</button></form></div>}
        {tab === "access" && data.member.role === "owner" && <section className={`${panel} mt-5 max-w-2xl`}><div className="flex items-center gap-2"><ShieldCheck size={18}/><h2 className="text-lg font-medium">Team passwords</h2></div><p className="mt-2 text-sm text-[var(--prism-muted)]">Create a separate strong password for each teammate. Creating a new one replaces their old password and signs out their existing sessions. Share it privately; it appears here once.</p><label className="mt-5 block text-sm">Teammate<select className={`${input} mt-2`} value={inviteEmail} onChange={event => {setInviteEmail(event.target.value);setIssuedPassword("");}}><option value="">Choose teammate</option>{["aadil.sudhir279@gmail.com","msaneeshnath@gmail.com","jishnu.01010011@gmail.com","shahidruiz01@gmail.com"].map(value => <option key={value} value={value}>{value}</option>)}</select></label><button disabled={busy || !inviteEmail} onClick={() => {setBusy(true);fetch("/api/workspace/invites",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:inviteEmail})}).then(async response => {const result=await response.json();if(!response.ok) throw new Error(result.error || "Could not create password.");setIssuedPassword(result.password);setMessage("New password created. Share it privately with the selected teammate.");return refresh();}).catch(error => setMessage(error.message)).finally(() => setBusy(false));}} className={`${button} mt-4`}>Create individual password</button>{issuedPassword && <div className="mt-5 rounded-xl border border-amber-300/40 bg-amber-500/5 p-4"><p className="text-xs text-amber-200">Copy this password now. It will not be shown again.</p><code className="mt-2 block break-all select-all text-sm">{issuedPassword}</code></div>}</section>}
        <div className="mt-6 flex items-center gap-2 text-xs text-[var(--prism-muted)]"><ShieldCheck size={14}/> Shared records are private to signed-in team members. Email sending remains disabled. <ArrowRight size={13}/></div>
      </>}
    </div>
  </main>;
}


