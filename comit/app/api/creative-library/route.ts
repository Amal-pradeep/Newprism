import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/outreach";

export const dynamic = "force-dynamic";
const ORG_ID = "acda1757-1698-405a-8451-5674316ceeaf";
const SPACE_SLUG = "shahid-video-creative";
const BUCKET = "comit-creative-library";
const ASSET_TYPES = ["raw_ideas", "shoot_briefs", "footage_refs", "edits", "spot_edits", "creative_briefs", "thumbnails", "scripts", "reference_assets"];
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "image/jpeg", "image/png", "image/webp", "application/pdf"]);

async function getSpace(db: NonNullable<ReturnType<typeof supabaseAdmin>>) {
  const { data, error } = await db.from("creative_library_spaces")
    .select("id,name,slug,asset_types,ai_adaptation_enabled,evolution_mode")
    .eq("organization_id", ORG_ID).eq("slug", SPACE_SLUG).single();
  return error ? null : data;
}

export async function GET(req: Request) {
  if (!getSessionUser(req)) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Shared library storage is not configured yet." }, { status: 503 });
  const space = await getSpace(db);
  if (!space) return NextResponse.json({ error: "Creative library is awaiting its database migration." }, { status: 503 });
  const [{ data: assets, error: assetError }, { data: learnings, error: learningError }] = await Promise.all([
    db.from("creative_library_assets").select("id,title,asset_type,storage_path,source_url,tags,metadata,feedback,uploaded_by_email,created_at").eq("space_id", space.id).order("created_at", { ascending: false }).limit(100),
    db.from("creative_library_learning").select("id,signal_type,signal,learned_rule,confidence,created_at").eq("space_id", space.id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (assetError || learningError) return NextResponse.json({ error: "Could not load the private creative library." }, { status: 503 });
  const items = await Promise.all((assets || []).map(async item => {
    const { data } = item.storage_path ? await db.storage.from(BUCKET).createSignedUrl(item.storage_path, 900) : { data: null };
    return { ...item, url: data?.signedUrl || item.source_url || null };
  }));
  return NextResponse.json({ space, items, learnings: learnings || [] });
}

export async function POST(req: Request) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Shared library storage is not configured yet." }, { status: 503 });
  const space = await getSpace(db);
  if (!space) return NextResponse.json({ error: "Creative library is awaiting its database migration." }, { status: 503 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "A valid form is required." }, { status: 400 });
  const action = String(form.get("action") || "asset");

  if (action === "asset") {
    const file = form.get("file");
    const title = String(form.get("title") || "").trim().slice(0, 120);
    const assetType = String(form.get("asset_type") || "");
    const notes = String(form.get("notes") || "").trim().slice(0, 1000);
    const tags = String(form.get("tags") || "").split(",").map(tag => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 12);
    const sourceUrl = String(form.get("source_url") || "").trim();
    if (!title || !ASSET_TYPES.includes(assetType) || !(space.asset_types || []).includes(assetType)) return NextResponse.json({ error: "Add a title and choose a valid library category." }, { status: 400 });
    let storagePath: string | null = null;
    let mimeType = "reference";
    let fileSize = 0;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES || !ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Choose an MP4, MOV, WebM, image or PDF under 25 MB." }, { status: 400 });
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "asset";
      storagePath = `${ORG_ID}/${SPACE_SLUG}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await db.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
      if (error) return NextResponse.json({ error: "Private upload failed. Check the COMIT storage setup and free storage allowance." }, { status: 502 });
      mimeType = file.type;
      fileSize = file.size;
    } else if (sourceUrl) {
      try { if (new URL(sourceUrl).protocol !== "https:") throw new Error(); }
      catch { return NextResponse.json({ error: "Reference links must use HTTPS." }, { status: 400 }); }
    } else {
      return NextResponse.json({ error: "Choose a small file or add a secure reference link." }, { status: 400 });
    }
    const { data, error } = await db.from("creative_library_assets").insert({
      space_id: space.id, uploaded_by_email: user.email, asset_type: assetType, title,
      storage_path: storagePath, source_url: sourceUrl || null, tags,
      metadata: { notes, mime_type: mimeType, file_size: fileSize, learning_status: "new" },
    }).select("id").single();
    if (error) {
      if (storagePath) await db.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: "Could not save this library item." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (action === "feedback") {
    const assetId = String(form.get("asset_id") || "");
    const rating = Number(form.get("rating"));
    const note = String(form.get("note") || "").trim().slice(0, 500);
    if (!assetId || !Number.isInteger(rating) || rating < 1 || rating > 5 || !note) return NextResponse.json({ error: "Choose a 1–5 rating and describe the result." }, { status: 400 });
    const { data: asset, error } = await db.from("creative_library_assets").select("id,title,asset_type,tags,feedback").eq("id", assetId).eq("space_id", space.id).single();
    if (error || !asset) return NextResponse.json({ error: "Library item not found." }, { status: 404 });
    const entry = { rating, note, reviewed_by: user.email, reviewed_at: new Date().toISOString() };
    const feedback = Array.isArray(asset.feedback?.entries) ? asset.feedback.entries : [];
    const { error: updateError } = await db.from("creative_library_assets").update({ feedback: { entries: [...feedback, entry].slice(-20) }, updated_at: new Date().toISOString() }).eq("id", asset.id);
    if (updateError) return NextResponse.json({ error: "Could not save creative feedback." }, { status: 500 });
    const learnedRule = `${asset.asset_type.replaceAll("_", " ")} · ${asset.title}: ${rating >= 4 ? "promising result" : rating <= 2 ? "needs revision" : "mixed result"}. ${note}`;
    const { error: learningError } = await db.from("creative_library_learning").insert({
      space_id: space.id, signal_type: "human_reviewed_asset_feedback", signal: { asset_id: asset.id, rating, reviewer: user.email, review_status: "proposed", tags: asset.tags }, learned_rule: learnedRule, confidence: rating / 5,
    });
    if (learningError) return NextResponse.json({ error: "Feedback saved, but the learning suggestion could not be created." }, { status: 503 });
    return NextResponse.json({ ok: true, review_status: "proposed" });
  }

  if (action === "review-learning") {
    const learningId = String(form.get("learning_id") || "");
    const decision = String(form.get("decision") || "");
    if (!learningId || !["accepted", "rejected"].includes(decision)) return NextResponse.json({ error: "Choose accept or dismiss for this suggestion." }, { status: 400 });
    const { data: current, error } = await db.from("creative_library_learning").select("id,signal").eq("id", learningId).eq("space_id", space.id).single();
    if (error || !current) return NextResponse.json({ error: "Learning suggestion not found." }, { status: 404 });
    const signal = { ...(current.signal || {}), review_status: decision, reviewed_by: user.email, reviewed_at: new Date().toISOString() };
    const { error: updateError } = await db.from("creative_library_learning").update({ signal }).eq("id", learningId);
    if (updateError) return NextResponse.json({ error: "Could not update the review." }, { status: 500 });
    return NextResponse.json({ ok: true, decision });
  }

  return NextResponse.json({ error: "Unknown library action." }, { status: 400 });
}

