import { randomBytes } from "crypto";
import { teamUser } from "@/lib/team-auth";
import { digest, sameOrigin, workspaceDb, workspaceMember, workspaceUnauthorized, workspaceUnavailable } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const db = workspaceDb();
  if (!db) return workspaceUnavailable();
  const member = await workspaceMember(db, request);
  if (!member) return workspaceUnauthorized();
  if (member.role !== "owner") return Response.json({ error: "Only the workspace owner can issue access codes." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const known = teamUser(email);
  if (!known) return Response.json({ error: "Choose a COMIT teammate." }, { status: 400 });
  const code = randomBytes(24).toString("base64url");
  await db.prepare(
    "INSERT INTO workspace_members(email,name,role,code_hash,active,failed_attempts,locked_until) VALUES(?,?,?, ?,1,0,NULL) ON CONFLICT(email) DO UPDATE SET name=excluded.name,code_hash=excluded.code_hash,active=1,failed_attempts=0,locked_until=NULL"
  ).bind(known.email.toLowerCase(), known.name, email === member.email ? "owner" : "member", digest(code)).run();
  await db.prepare("DELETE FROM workspace_sessions WHERE email=?").bind(email).run();
  return Response.json({ email: known.email, name: known.name, code }, { headers: { "cache-control": "no-store" } });
}

