import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("comit_session", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set("comit_workspace", "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
