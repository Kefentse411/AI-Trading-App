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
      `${BACKEND_URL}/strategies/trend-following/${symbol.toLowerCase()}`,
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

    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("[Forex Trend Following] network error:", error);
    return Response.json({ error: "Failed to reach backend" }, { status: 502 });
  }
}