import { workspaceDb, workspaceMember, workspaceUnavailable } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const db = workspaceDb();
  if (!db) return workspaceUnavailable();
  return Response.json({ member: await workspaceMember(db, request) }, { headers: { "cache-control": "no-store" } });
}

// A password or unverified email submitted here cannot create a session.
export async function POST() {
  return Response.json({ error: "Sign in with the verified email link on the COMIT login page." }, { status: 410 });
}
