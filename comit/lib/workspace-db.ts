import { getSessionUser, requireAdminDb } from "@/lib/outreach";
import { teamUser, teamUsers } from "@/lib/team-auth";

export type WorkspaceMember = { email: string; name: string; role: "owner" | "member"; active?: number };

export async function workspaceClient() {
  try{return await requireAdminDb()}catch{return null}
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export async function workspaceMember(request: Request):Promise<WorkspaceMember|null> {
  const session = await getSessionUser(request);
  if (!session) return null;
  const known = teamUser(session.email);
  if (!known) return null;
  const founders = new Set([
    (process.env.COMIT_AMAL_EMAIL || "amalpradeep25@gmail.com").toLowerCase(),
    (process.env.COMIT_AADIL_EMAIL || "aadil.sudhir279@gmail.com").toLowerCase(),
  ]);
  return {
    email: known.email,
    name: known.name,
    role: founders.has(known.email.toLowerCase()) ? "owner" : "member",
    active: 1,
  };
}

export function workspaceMembers(): WorkspaceMember[] {
  const founders = new Set([
    (process.env.COMIT_AMAL_EMAIL || "amalpradeep25@gmail.com").toLowerCase(),
    (process.env.COMIT_AADIL_EMAIL || "aadil.sudhir279@gmail.com").toLowerCase(),
  ]);
  return teamUsers.map(user => ({
    ...user,
    role: founders.has(user.email.toLowerCase()) ? "owner" as const : "member" as const,
    active: 1,
  }));
}

export const workspaceUnavailable = () => Response.json(
  { error: "Shared workspace is unavailable for this session." },
  { status: 503 }
);
export const workspaceUnauthorized = () => Response.json(
  { error: "Sign in with your approved team email first." },
  { status: 401 }
);
