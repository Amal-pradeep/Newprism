import { sameOrigin, workspaceClient, workspaceMember, workspaceMembers, workspaceUnauthorized, workspaceUnavailable } from "@/lib/workspace-db";
import { teamUser } from "@/lib/team-auth";

export const dynamic = "force-dynamic";
const stages = new Set(["research", "new", "qualified", "contacted", "meeting", "won", "not-a-fit"]);
const categories = new Set(["shoot brief", "footage reference", "edit", "spot edit", "script", "creative reference"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const db = await workspaceClient();
  if (!db) return workspaceUnavailable();
  const member = await workspaceMember(request);
  if (!member) return workspaceUnauthorized();

  const [prospects, drafts, checkins, creative] = await Promise.all([
    db.from("workspace_prospects").select("*").order("updated_at", { ascending: false }).order("name").limit(250),
    db.from("workspace_drafts").select("*").order("updated_at", { ascending: false }).limit(100),
    db.from("workspace_checkins").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("workspace_creative").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const failed = [prospects, drafts, checkins, creative].find(result => result.error);
  if (failed?.error) return Response.json({ error: "Shared workspace tables are not ready yet." }, { status: 503 });

  return Response.json({
    member,
    members: workspaceMembers(),
    prospects: prospects.data || [],
    drafts: drafts.data || [],
    checkins: checkins.data || [],
    creative: creative.data || [],
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const db = await workspaceClient();
  if (!db) return workspaceUnavailable();
  const member = await workspaceMember(request);
  if (!member) return workspaceUnauthorized();
  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const now = new Date().toISOString();

  if (action === "add-prospect") {
    const name = String(body?.name || "").trim().slice(0, 120);
    const email = String(body?.email || "").trim().toLowerCase().slice(0, 254);
    const source = String(body?.source || "").trim().slice(0, 500);
    if (!name || (email && !emailPattern.test(email)) || (source && !validUrl(source))) return invalid();
    const id = crypto.randomUUID();
    const { error } = await db.from("workspace_prospects").insert({
      id, name, email: email || null,
      industry: String(body?.industry || "").trim().slice(0, 100),
      location: String(body?.location || "").trim().slice(0, 100),
      source: source || null, stage: "research",
      notes: String(body?.notes || "").trim().slice(0, 2000),
      owner_email: null, updated_by: member.email, updated_at: now,
    });
    if (error) return failedSave();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  if (action === "update-prospect") {
    const id = String(body?.id || "");
    const stage = String(body?.stage || "");
    const notes = String(body?.notes || "").trim().slice(0, 2000);
    const owner = String(body?.owner_email || "").trim().toLowerCase();
    if (!id || !stages.has(stage) || (owner && (!emailPattern.test(owner) || !teamUser(owner)))) return invalid();
    const { error } = await db.from("workspace_prospects").update({
      stage, notes, owner_email: owner || null, updated_by: member.email, updated_at: now,
    }).eq("id", id);
    if (error) return failedSave();
    return Response.json({ ok: true });
  }

  if (action === "save-draft") {
    const prospectId = String(body?.prospect_id || "");
    const subject = String(body?.subject || "").trim().slice(0, 180);
    const text = String(body?.body || "").trim().slice(0, 10000);
    const existingId = String(body?.id || "");
    if (!prospectId || !subject || !text) return invalid();
    const { data: prospect } = await db.from("workspace_prospects").select("id").eq("id", prospectId).maybeSingle();
    if (!prospect) return invalid();
    if (existingId) {
      const { error } = await db.from("workspace_drafts").update({ subject, body: text, status: "draft", updated_at: now })
        .eq("id", existingId).eq("prospect_id", prospectId);
      if (error) return failedSave();
      return Response.json({ ok: true, id: existingId });
    }
    const id = crypto.randomUUID();
    const { error } = await db.from("workspace_drafts").insert({
      id, prospect_id: prospectId, subject, body: text, status: "draft", created_by: member.email, updated_at: now,
    });
    if (error) return failedSave();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  if (action === "checkin") {
    const note = String(body?.note || "").trim().slice(0, 1000);
    if (!note) return invalid();
    const id = crypto.randomUUID();
    const { error } = await db.from("workspace_checkins").insert({ id, email: member.email, note, created_at: now });
    if (error) return failedSave();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  if (action === "creative") {
    const title = String(body?.title || "").trim().slice(0, 120);
    const category = String(body?.category || "");
    const sourceUrl = String(body?.source_url || "").trim().slice(0, 500);
    const notes = String(body?.notes || "").trim().slice(0, 2000);
    if (!title || !categories.has(category) || !validUrl(sourceUrl)) return invalid();
    const id = crypto.randomUUID();
    const { error } = await db.from("workspace_creative").insert({
      id, title, category, source_url: sourceUrl, notes, created_by: member.email, created_at: now,
    });
    if (error) return failedSave();
    return Response.json({ ok: true, id }, { status: 201 });
  }
  return invalid();
}

function validUrl(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
function invalid() { return Response.json({ error: "Check the required fields and try again." }, { status: 400 }); }
function failedSave() { return Response.json({ error: "Could not save the shared record." }, { status: 503 }); }
