import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createHash } from "crypto";

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
  const raw = request.headers.get("cookie") || "";
  const token = raw.match(/(?:^|;\s*)comit_workspace=([^;]+)/)?.[1];
  if (!token || token.length > 128) return null;
  const row = await db.prepare(
    "SELECT m.email,m.name,m.role FROM workspace_sessions s JOIN workspace_members m ON m.email=s.email WHERE s.token_hash=? AND s.expires_at>? AND m.active=1"
  ).bind(digest(token), new Date().toISOString()).first<WorkspaceMember>();
  return row;
}

export const workspaceUnavailable = () => Response.json(
  { error: "Shared workspace is not configured on this deployment." }, { status: 503 }
);
export const workspaceUnauthorized = () => Response.json(
  { error: "Sign in to the shared workspace first." }, { status: 401 }
);

