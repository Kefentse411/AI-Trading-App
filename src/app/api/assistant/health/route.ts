import { NextResponse } from "next/server";

export const runtime = "nodejs";
const PY_API_BASE = process.env.PY_API_BASE_URL || "http://127.0.0.1:8000";

export async function GET() {
  const res = await fetch(`${PY_API_BASE}/health`, { cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
}
