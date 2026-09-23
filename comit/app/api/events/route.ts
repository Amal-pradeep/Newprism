import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.event_type !== "string") {
    return NextResponse.json({ ok: false, error: "event_type is required" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    accepted: true,
    event_type: body.event_type,
    idempotency_key: request.headers.get("x-idempotency-key") ?? null,
    mode: "comit-event-boundary"
  });
}
