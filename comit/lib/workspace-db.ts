import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createHash } from "crypto";
import { getSessionUser } from "@/lib/outreach";

export type WorkspaceMember = { email: string; name: string; role: "owner" | "member" };

type Statement = {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
};
export type WorkspaceDb = { prepare(sql: string): Statement };

export function workspaceDb(): WorkspaceDb | null {
  try {
    const context = getCloudflareContext() as unknown as { env: { COMIT_DB?: WorkspaceDb } };
    return context.env.COMIT_DB || null;
  } catch {
    return null;
  }
}

export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export async function workspaceMember(db: WorkspaceDb, request: Request): Promise<WorkspaceMember | null> {
  const user = getSessionUser(request);
  if (!user) return null;
  const email = user.email.toLowerCase();
  const existing = await db.prepare("SELECT email,name,role,active FROM workspace_members WHERE email=?")
    .bind(email).first<WorkspaceMember & { active: number }>();
  if (existing) return existing.active ? { email: existing.email, name: existing.name, role: existing.role } : null;
  const role = email === (process.env.COMIT_AMAL_EMAIL || "amalpradeep25@gmail.com").toLowerCase() ? "owner" : "member";
  await db.prepare("INSERT OR IGNORE INTO workspace_members(email,name,role,code_hash) VALUES(?,?,?,NULL)")
    .bind(email, user.name || email, role).run();
  return db.prepare("SELECT email,name,role FROM workspace_members WHERE email=? AND active=1")
    .bind(email).first<WorkspaceMember>();
}

export const workspaceUnavailable = () => Response.json(
  { error: "Shared workspace is not configured on this deployment." }, { status: 503 }
);
export const workspaceUnauthorized = () => Response.json(
  { error: "Sign in to the shared workspace first." }, { status: 401 }
);

