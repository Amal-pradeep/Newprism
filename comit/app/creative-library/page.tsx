"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Clapperboard, Cloud, ExternalLink, Film, RefreshCw, Sparkles, UploadCloud } from "lucide-react";

type Asset = { id: string; title: string; asset_type: string; tags: string[]; metadata?: { notes?: string; mime_type?: string; file_size?: number }; url?: string | null; created_at: string; local?: boolean };
type Learning = { id: string; learned_rule: string; confidence: number | null; signal?: { review_status?: string }; created_at: string; local?: boolean };
const TYPES = ["raw_ideas", "shoot_briefs", "footage_refs", "edits", "spot_edits", "creative_briefs", "thumbnails", "scripts", "reference_assets"];
const LOCAL_ASSETS = "comit.creative-library.assets.v1";
const LOCAL_LEARNINGS = "comit.creative-library.learnings.v1";
function readLocal<T>(key: string): T[] { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }

export default function CreativeLibraryPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [status, setStatus] = useState("Loading the shared library…");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState(TYPES[1]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { rating: string; note: string }>>({});

  async function refresh() {
    const localAssets = readLocal<Asset>(LOCAL_ASSETS);
    const localLearnings = readLocal<Learning>(LOCAL_LEARNINGS);
    try {
      const response = await fetch("/api/creative-library", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Shared library is not available yet.");
      setItems([...(payload.items || []), ...localAssets]);
      setLearnings([...(payload.learnings || []), ...localLearnings]);
      setStatus("Private team library connected. New learning stays a suggestion until a teammate reviews it.");
    } catch (error) {
      setItems(localAssets);
      setLearnings(localLearnings);
      setStatus(`${error instanceof Error ? error.message : "Shared library is not ready."} Reference notes still work locally in this browser.`);
    }
  }
  useEffect(() => { void refresh(); }, []);
  const acceptedCount = useMemo(() => learnings.filter(item => item.signal?.review_status === "accepted").length, [learnings]);

  async function addAsset(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setStatus("Give the library item a title first."); return; }
    if (!file && !sourceUrl.trim()) { setStatus("Add an HTTPS reference link or a small file."); return; }
    if (file && file.size > 25 * 1024 * 1024) { setStatus("This free-first workspace accepts files up to 25 MB. Add a small edit/proxy or a secure reference link for larger footage."); return; }
    setBusy(true);
    const data = new FormData();
    data.set("action", "asset"); data.set("title", title.trim()); data.set("asset_type", assetType); data.set("source_url", sourceUrl.trim()); data.set("tags", tags); data.set("notes", notes);
    if (file) data.set("file", file);
    try {
      const response = await fetch("/api/creative-library", { method: "POST", body: data });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (file) throw new Error(payload.error || "Cloud upload is not ready. Try a reference link or complete the shared storage setup.");
        const localAsset: Asset = { id: crypto.randomUUID(), title: title.trim(), asset_type: assetType, tags: tags.split(",").map(tag => tag.trim()).filter(Boolean), metadata: { notes }, url: sourceUrl.trim(), created_at: new Date().toISOString(), local: true };
        const next = [localAsset, ...readLocal<Asset>(LOCAL_ASSETS)];
        localStorage.setItem(LOCAL_ASSETS, JSON.stringify(next));
        setItems(current => [localAsset, ...current]);
        setStatus("Saved as a local reference on this browser. It is not shared with the team yet.");
      } else {
        setStatus("Added to the private team library.");
        await refresh();
      }
      setTitle(""); setSourceUrl(""); setTags(""); setNotes(""); setFile(null);
      const input = document.getElementById("creative-file") as HTMLInputElement | null; if (input) input.value = "";
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not add this item."); }
    finally { setBusy(false); }
  }

  async function recordFeedback(event: FormEvent, item: Asset) {
    event.preventDefault();
    const value = feedback[item.id] || { rating: "", note: "" };
    if (!value.rating || !value.note.trim()) { setStatus("Choose a rating and record the result so COMIT can suggest a reusable pattern."); return; }
    setBusy(true);
    const data = new FormData(); data.set("action", "feedback"); data.set("asset_id", item.id); data.set("rating", value.rating); data.set("note", value.note.trim());
    try {
      const response = await fetch("/api/creative-library", { method: "POST", body: data });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const local: Learning = { id: crypto.randomUUID(), learned_rule: `${item.asset_type.replaceAll("_", " ")} · ${item.title}: ${Number(value.rating) >= 4 ? "promising result" : Number(value.rating) <= 2 ? "needs revision" : "mixed result"}. ${value.note.trim()}`, confidence: Number(value.rating) / 5, signal: { review_status: "proposed" }, created_at: new Date().toISOString(), local: true };
        const next = [local, ...readLocal<Learning>(LOCAL_LEARNINGS)]; localStorage.setItem(LOCAL_LEARNINGS, JSON.stringify(next)); setLearnings(current => [local, ...current]);
        setStatus("Feedback saved as a local learning suggestion. Review it before using it as guidance.");
      } else { setStatus("Feedback recorded as a learning suggestion for team review."); await refresh(); }
      setFeedback(current => ({ ...current, [item.id]: { ...value, note: "" } }));
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not record feedback."); }
    finally { setBusy(false); }
  }

  async function reviewLearning(item: Learning, decision: "accepted" | "rejected") {
    if (item.local) {
      const next = readLocal<Learning>(LOCAL_LEARNINGS).map(row => row.id === item.id ? { ...row, signal: { ...row.signal, review_status: decision } } : row);
      localStorage.setItem(LOCAL_LEARNINGS, JSON.stringify(next)); setLearnings(current => current.map(row => row.id === item.id ? { ...row, signal: { ...row.signal, review_status: decision } } : row)); setStatus(decision === "accepted" ? "Marked accepted on this browser. It does not change the assistant automatically." : "Suggestion dismissed on this browser."); return;
    }
    const data = new FormData(); data.set("action", "review-learning"); data.set("learning_id", item.id); data.set("decision", decision);
    const response = await fetch("/api/creative-library", { method: "POST", body: data }); const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus(payload.error || "Could not update the suggestion."); return; }
    await refresh(); setStatus(decision === "accepted" ? "Suggestion accepted as reviewed creative guidance." : "Suggestion dismissed.");
  }

  return <main className="min-h-screen bg-[var(--prism-bg)] p-5 pb-24 text-[var(--prism-text)] lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs tracking-wide text-[var(--prism-muted)]">VIDEO SHOOT · PRODUCTION · CREATIVE</p><h1 className="mt-1 text-3xl font-semibold">Shahid’s Creative Library</h1><p className="mt-2 max-w-3xl text-sm text-[var(--prism-muted)]">One evolving workspace for shoot briefs, footage references, edits, spot edits, scripts and reusable creative patterns.</p></div><button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button></header>
    <p role="status" className="mt-4 rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-3 text-sm text-[var(--prism-muted)]">{status}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex items-center gap-2 text-xs text-[var(--prism-muted)]"><Cloud size={14}/>SHARED + LOCAL ITEMS</div><div className="mt-2 text-2xl font-semibold">{items.length}</div></div><div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex items-center gap-2 text-xs text-[var(--prism-muted)]"><Sparkles size={14}/>LEARNING SUGGESTIONS</div><div className="mt-2 text-2xl font-semibold">{learnings.length}</div></div><div className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex items-center gap-2 text-xs text-[var(--prism-muted)]"><Check size={14}/>TEAM-REVIEWED PATTERNS</div><div className="mt-2 text-2xl font-semibold">{acceptedCount}</div></div></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><UploadCloud size={18}/><h2 className="font-semibold">Add a shoot asset or reference</h2></div><p className="mt-2 text-xs text-[var(--prism-muted)]">Private team uploads are limited to 25 MB per item to protect free storage. Use small proxies/reference clips for large raw footage.</p>
        <form onSubmit={addAsset} className="mt-4 space-y-3"><label className="block text-xs">Title<input value={title} onChange={event => setTitle(event.target.value)} required maxLength={120} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-transparent px-3 py-2 text-sm" placeholder="e.g. Ramadan menu reel — hook B"/></label><label className="block text-xs">Library category<select value={assetType} onChange={event => setAssetType(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-[var(--prism-bg)] px-3 py-2 text-sm">{TYPES.map(type => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label><label className="block text-xs">Secure reference link<input value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} type="url" className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-transparent px-3 py-2 text-sm" placeholder="https://…"/></label><label className="block text-xs">Or upload a small asset<input id="creative-file" type="file" accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp,application/pdf" onChange={event => setFile(event.target.files?.[0] || null)} className="mt-1 block w-full text-xs"/></label><label className="block text-xs">Tags, separated by commas<input value={tags} onChange={event => setTags(event.target.value)} maxLength={400} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-transparent px-3 py-2 text-sm" placeholder="food, close-up, hook A"/></label><label className="block text-xs">Brief or production notes<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} maxLength={1000} className="mt-1 w-full rounded-xl border border-[var(--prism-border)] bg-transparent px-3 py-2 text-sm" placeholder="Goal, audience, location, edit notes…"/></label><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"><UploadCloud size={15}/>{busy ? "Saving…" : "Add to library"}</button></form>
      </section>
      <section className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5"><div className="flex items-center gap-2"><Film size={18}/><h2 className="font-semibold">Shoot and edit library</h2></div><div className="mt-4 space-y-3">{items.map(item => <article key={item.id} className="rounded-xl border border-[var(--prism-border)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{item.title}</h3><p className="mt-1 text-xs capitalize text-[var(--prism-muted)]">{item.asset_type.replaceAll("_", " ")} · {new Date(item.created_at).toLocaleDateString()}{item.local ? " · this browser only" : ""}</p></div>{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline"><ExternalLink size={13}/>Open</a>}</div>{item.tags?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{item.tags.map(tag => <span key={tag} className="rounded-full border border-[var(--prism-border)] px-2 py-1 text-[10px]">{tag}</span>)}</div>}{item.metadata?.notes && <p className="mt-2 text-sm text-[var(--prism-muted)]">{item.metadata.notes}</p>}<form onSubmit={event => void recordFeedback(event, item)} className="mt-4 grid gap-2 sm:grid-cols-[100px_1fr_auto]"><label className="sr-only" htmlFor={`rating-${item.id}`}>Result rating</label><select id={`rating-${item.id}`} value={feedback[item.id]?.rating || ""} onChange={event => setFeedback(current => ({ ...current, [item.id]: { rating: event.target.value, note: current[item.id]?.note || "" } }))} className="rounded-lg border border-[var(--prism-border)] bg-[var(--prism-bg)] px-2 py-2 text-xs"><option value="">Rate result</option>{[1,2,3,4,5].map(rate => <option key={rate} value={rate}>{rate} / 5</option>)}</select><input value={feedback[item.id]?.note || ""} onChange={event => setFeedback(current => ({ ...current, [item.id]: { rating: current[item.id]?.rating || "", note: event.target.value } }))} maxLength={500} className="rounded-lg border border-[var(--prism-border)] bg-transparent px-3 py-2 text-xs" placeholder="What happened: views, retention, client response…"/><button disabled={busy} className="rounded-lg border border-[var(--prism-border)] px-3 py-2 text-xs disabled:opacity-50">Record result</button></form></article>)}{!items.length && <div className="rounded-xl border border-dashed border-[var(--prism-border)] p-8 text-center"><Clapperboard className="mx-auto text-[var(--prism-muted)]"/><p className="mt-3 text-sm">No assets yet. Start with a brief, a small reference clip or a secure link.</p></div>}</div></section>
    </div>
    <section className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/5 p-5"><div className="flex items-center gap-2"><Sparkles size={18}/><h2 className="font-semibold">Improve from reviewed outcomes</h2></div><p className="mt-2 max-w-4xl text-sm text-[var(--prism-muted)]">COMIT turns teammate ratings and results into proposed production patterns. A teammate must accept a suggestion before the team uses it as guidance; this free mode does not call an AI model or change its own rules.</p><div className="mt-4 space-y-3">{learnings.map(item => <article key={item.id} className="rounded-xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm">{item.learned_rule}</p><span className="rounded-full border border-[var(--prism-border)] px-2 py-1 text-[10px] capitalize">{item.signal?.review_status || "proposed"}{item.local ? " · local" : ""}</span></div>{(!item.signal?.review_status || item.signal.review_status === "proposed") && <div className="mt-3 flex gap-2"><button onClick={() => void reviewLearning(item, "accepted")} className="rounded-lg border border-emerald-300/30 px-3 py-2 text-xs">Accept as guidance</button><button onClick={() => void reviewLearning(item, "rejected")} className="rounded-lg border border-[var(--prism-border)] px-3 py-2 text-xs">Dismiss</button></div>}</article>)}{!learnings.length && <p className="rounded-xl border border-dashed border-[var(--prism-border)] p-4 text-sm text-[var(--prism-muted)]">Record real performance results to build a reviewed creative playbook.</p>}</div></section>
  </div></main>;
}

