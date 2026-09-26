import { sameOrigin, workspaceDb, workspaceMember, workspaceUnauthorized, workspaceUnavailable } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";
const stages = new Set(["research", "new", "qualified", "contacted", "meeting", "won", "not-a-fit"]);
const categories = new Set(["shoot brief", "footage reference", "edit", "spot edit", "script", "creative reference"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const db = workspaceDb();
  if (!db) return workspaceUnavailable();
  const member = await workspaceMember(db, request);
  if (!member) return workspaceUnauthorized();
  const [prospects, drafts, checkins, creative, members] = await Promise.all([
    db.prepare("SELECT * FROM workspace_prospects ORDER BY updated_at DESC,name LIMIT 250").all(),
    db.prepare("SELECT * FROM workspace_drafts ORDER BY updated_at DESC LIMIT 100").all(),
    db.prepare("SELECT * FROM workspace_checkins ORDER BY created_at DESC LIMIT 50").all(),
    db.prepare("SELECT * FROM workspace_creative ORDER BY created_at DESC LIMIT 100").all(),
    db.prepare("SELECT email,name,role,active FROM workspace_members ORDER BY name").all(),
  ]);
  return Response.json({ member, prospects: prospects.results, drafts: drafts.results, checkins: checkins.results, creative: creative.results, members: members.results }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const db = workspaceDb();
  if (!db) return workspaceUnavailable();
  const member = await workspaceMember(db, request);
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
    await db.prepare("INSERT INTO workspace_prospects(id,name,email,industry,location,source,stage,notes,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .bind(id, name, email || null, String(body?.industry || "").trim().slice(0, 100), String(body?.location || "").trim().slice(0, 100), source || null, "research", String(body?.notes || "").trim().slice(0, 2000), member.email, now).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  if (action === "update-prospect") {
    const id = String(body?.id || "");
    const stage = String(body?.stage || "");
    const notes = String(body?.notes || "").trim().slice(0, 2000);
    const owner = String(body?.owner_email || "").trim().toLowerCase();
    if (!id || !stages.has(stage) || (owner && !emailPattern.test(owner))) return invalid();
    if (owner) {
      const selected = await db.prepare("SELECT email FROM workspace_members WHERE email=? AND active=1").bind(owner).first();
      if (!selected) return invalid();
    }
    const result = await db.prepare("UPDATE workspace_prospects SET stage=?,notes=?,owner_email=?,updated_by=?,updated_at=? WHERE id=?")
      .bind(stage, notes, owner || null, member.email, now, id).run();
    return Response.json({ ok: result.success });
  }

  if (action === "save-draft") {
    const prospectId = String(body?.prospect_id || "");
    const subject = String(body?.subject || "").trim().slice(0, 180);
    const text = String(body?.body || "").trim().slice(0, 10000);
    const existingId = String(body?.id || "");
    if (!prospectId || !subject || !text) return invalid();
    const prospect = await db.prepare("SELECT id FROM workspace_prospects WHERE id=?").bind(prospectId).first();
    if (!prospect) return invalid();
    if (existingId) {
      const draft = await db.prepare("SELECT id FROM workspace_drafts WHERE id=? AND prospect_id=?").bind(existingId, prospectId).first();
      if (!draft) return invalid();
      await db.prepare("UPDATE workspace_drafts SET subject=?,body=?,status='draft',updated_at=? WHERE id=?")
        .bind(subject, text, now, existingId).run();
      return Response.json({ ok: true, id: existingId });
    }
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO workspace_drafts(id,prospect_id,subject,body,created_by,updated_at) VALUES(?,?,?,?,?,?)")
      .bind(id, prospectId, subject, text, member.email, now).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  if (action === "checkin") {
    const note = String(body?.note || "").trim().slice(0, 1000);
    if (!note) return invalid();
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO workspace_checkins(id,email,note,created_at) VALUES(?,?,?,?)")
      .bind(id, member.email, note, now).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  if (action === "creative") {
    const title = String(body?.title || "").trim().slice(0, 120);
    const category = String(body?.category || "");
    const url = String(body?.source_url || "").trim().slice(0, 500);
    const notes = String(body?.notes || "").trim().slice(0, 2000);
    if (!title || !categories.has(category) || !validUrl(url)) return invalid();
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO workspace_creative(id,title,category,source_url,notes,created_by,created_at) VALUES(?,?,?,?,?,?,?)")
      .bind(id, title, category, url, notes, member.email, now).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }
  return invalid();
}

function validUrl(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
function invalid() { return Response.json({ error: "Check the required fields and try again." }, { status: 400 }); }

