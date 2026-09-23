import { NextResponse } from "next/server";
import { demoProspects } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({ ok: true, data: demoProspects, source: "demo-adapter" });
}
