import { workspaceClient, workspaceMember, workspaceUnavailable } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!workspaceClient()) return workspaceUnavailable();
  return Response.json({ member: workspaceMember(request) }, { headers: { "cache-control": "no-store" } });
}

export async function POST() {
  return Response.json({ error: "Use your verified COMIT email link. Password login is disabled." }, { status: 410 });
}
