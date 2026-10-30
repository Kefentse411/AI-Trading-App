export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8000";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/watchlist/forex`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("[Forex Watchlist]", error);
    return Response.json(
      { error: "Failed to fetch forex watchlist" },
      { status: 500 }
    );
  }
}