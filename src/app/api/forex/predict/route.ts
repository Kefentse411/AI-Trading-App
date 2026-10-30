export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/predict/forex/${symbol.toLowerCase()}`,
      {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }
    );

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || "Empty response from backend" };
    }

    // Pass through the backend's real status instead of collapsing every
    // non-2xx into a generic 500 — callers need to tell a 400 (invalid
    // symbol) apart from a 503 (model not loaded) apart from a real 500.
    return Response.json(data, { status: response.status });
  } catch (error) {
    // This now only fires for actual network failures (backend unreachable),
    // not for backend error responses — those are handled above.
    console.error("[Forex Predict] network error:", error);
    return Response.json(
      { error: "Failed to reach backend" },
      { status: 502 }
    );
  }
}