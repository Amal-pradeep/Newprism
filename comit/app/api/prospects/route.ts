import { NextResponse } from "next/server";
import { getSessionUser, requireAdminDb } from "@/lib/outreach";

export async function GET(req: Request) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  try {
    const db = await requireAdminDb();
    const url = new URL(req.url);
    const pendingOnly = url.searchParams.get("pending") === "1";
    let query = db.from("prospects").select("*, companies(name,website,industry,location), outreach_approvals(*)").order("score", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    const prospects = (data || []).map((p: any) => ({
      ...p,
      approvals: pendingOnly ? (p.outreach_approvals || []).filter((a: any) => a.status === "pending") : (p.outreach_approvals || [])
    }));
    return NextResponse.json({ ok: true, data: prospects, user });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Failed to load prospects" }, { status: 500 });
  }
}
