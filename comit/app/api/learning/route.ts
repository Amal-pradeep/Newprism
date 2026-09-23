import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.LEARNING_CRON_SECRET;
  const supplied = request.headers.get("authorization");
  if (!expected || supplied !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503 });

  const since = new Date(Date.now() - 120_000).toISOString();
  const { count, error } = await db.from("events").select("*", { count: "exact", head: true }).gte("created_at", since);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { error: writeError } = await db.from("events").insert({
    event_type: "comit.learning.cycle",
    payload: {
      window_seconds: 120,
      observed_events: count ?? 0,
      action: "recompute_operational_signals",
      source: "scheduled_learning"
    }
  });
  if (writeError) return NextResponse.json({ ok: false, error: writeError.message }, { status: 500 });

  return NextResponse.json({ ok: true, cycle_seconds: 120, observed_events: count ?? 0 });
}
