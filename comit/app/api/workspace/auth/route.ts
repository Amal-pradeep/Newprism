import { randomBytes, timingSafeEqual } from "crypto";
import { digest, sameOrigin, workspaceDb, workspaceMember, workspaceUnavailable } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";
const COOKIE = "comit_workspace";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(request: Request) {
  const db = workspaceDb();
  if (!db) return workspaceUnavailable();
  const member = await workspaceMember(db, request);
  return Response.json({ member }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const db = workspaceDb();
  if (!db) return workspaceUnavailable();
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "").trim();
  if (!email || email.length > 254 || password.length < 20 || password.length > 128) {
    return Response.json({ error: "Check your email and password." }, { status: 400 });
  }
  const row = await db.prepare(
    "SELECT email,name,role,code_hash,locked_until FROM workspace_members WHERE email=? AND active=1"
  ).bind(email).first<{ email: string; name: string; role: string; code_hash: string | null; locked_until: string | null }>();
  const now = new Date().toISOString();
  if (row?.locked_until && row.locked_until > now) {
    return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  const supplied = Buffer.from(digest(password), "hex");
  const expected = row?.code_hash && /^[a-f0-9]{64}$/.test(row.code_hash) ? Buffer.from(row.code_hash, "hex") : Buffer.alloc(32);
  const valid = timingSafeEqual(supplied, expected) && Boolean(row?.code_hash);
  if (!row || !valid) {
    if (row) await db.prepare(
      "UPDATE workspace_members SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=4 THEN ? ELSE locked_until END WHERE email=?"
    ).bind(new Date(Date.now() + 15 * 60_000).toISOString(), email).run();
    return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  await db.prepare("UPDATE workspace_members SET failed_attempts=0,locked_until=NULL WHERE email=?").bind(email).run();
  const token = randomBytes(32).toString("base64url");
  await db.prepare("INSERT INTO workspace_sessions(token_hash,email,expires_at) VALUES(?,?,?)")
    .bind(digest(token), email, new Date(Date.now() + MAX_AGE * 1000).toISOString()).run();
  const response = Response.json({ member: { email: row.email, name: row.name, role: row.role } });
  response.headers.append("set-cookie", `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`);
  return response;
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const db = workspaceDb();
  if (!db) return workspaceUnavailable();
  const token = (request.headers.get("cookie") || "").match(/(?:^|;\s*)comit_workspace=([^;]+)/)?.[1];
  if (token) await db.prepare("DELETE FROM workspace_sessions WHERE token_hash=?").bind(digest(token)).run();
  const response = Response.json({ ok: true });
  response.headers.append("set-cookie", `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
  return response;
}


