import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const currency = url.searchParams.get("currency");

  // Generate realistic economic events for the current week
  const now = new Date();
  const events = generateEconomicEvents(now, currency);

  return NextResponse.json({ events });
}

function generateEconomicEvents(baseDate: Date, currency: string | null) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const eventTemplates = [
    { title: "Non-Farm Payrolls", currency: "USD", impact: "HIGH", time: "13:30", description: "Monthly change in employment excluding farming sector. Most impactful USD event." },
    { title: "FOMC Meeting Minutes", currency: "USD", impact: "HIGH", time: "19:00", description: "Federal Reserve meeting notes revealing monetary policy stance." },
    { title: "CPI (Consumer Price Index)", currency: "USD", impact: "HIGH", time: "13:30", description: "Measures inflation from consumer perspective. Key for Fed rate decisions." },
    { title: "ECB Interest Rate Decision", currency: "EUR", impact: "HIGH", time: "12:45", description: "European Central Bank rate announcement. Major EUR mover." },
    { title: "GDP Preliminary", currency: "USD", impact: "HIGH", time: "13:30", description: "First estimate of economic output. Significant market mover." },
    { title: "Bank of England Rate Decision", currency: "GBP", impact: "HIGH", time: "12:00", description: "BoE monetary policy decision affecting GBP pairs significantly." },
    { title: "ISM Manufacturing PMI", currency: "USD", impact: "MEDIUM", time: "15:00", description: "Purchasing managers index for manufacturing sector." },
    { title: "Retail Sales m/m", currency: "USD", impact: "MEDIUM", time: "13:30", description: "Monthly change in retail sales. Consumer spending indicator." },
    { title: "Unemployment Claims", currency: "USD", impact: "MEDIUM", time: "13:30", description: "Weekly initial jobless claims report." },
    { title: "PPI (Producer Price Index)", currency: "USD", impact: "MEDIUM", time: "13:30", description: "Inflation from producer perspective, leading indicator of CPI." },
    { title: "Trade Balance", currency: "USD", impact: "MEDIUM", time: "13:30", description: "Difference between imports and exports." },
    { title: "RBNZ Rate Decision", currency: "NZD", impact: "HIGH", time: "02:00", description: "Reserve Bank of New Zealand interest rate decision." },
    { title: "RBA Rate Decision", currency: "AUD", impact: "HIGH", time: "03:30", description: "Reserve Bank of Australia interest rate decision." },
    { title: "BOJ Policy Rate", currency: "JPY", impact: "HIGH", time: "01:00", description: "Bank of Japan monetary policy decision." },
    { title: "German CPI Flash", currency: "EUR", impact: "MEDIUM", time: "13:00", description: "German consumer price inflation preliminary estimate." },
  ];

  const result = [];
  let dayOffset = 0;

  for (let i = 0; i < Math.min(eventTemplates.length, 12); i++) {
    const template = eventTemplates[i];
    if (currency && template.currency !== currency) continue;

    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() + (dayOffset % 5));
    dayOffset++;

    const [hours, minutes] = template.time.split(":").map(Number);
    eventDate.setHours(hours, minutes, 0, 0);

    result.push({
      id: `evt_${i}`,
      title: template.title,
      currency: template.currency,
      impact: template.impact,
      eventTime: eventDate.toISOString(),
      forecast: generateForecast(template.title),
      previous: generatePrevious(template.title),
      actual: null,
      description: template.description,
      dayLabel: days[dayOffset % 5],
    });
  }

  return result;
}

function generateForecast(title: string): string {
  const forecasts: Record<string, string> = {
    "Non-Farm Payrolls": "185K",
    "FOMC Meeting Minutes": "N/A",
    "CPI (Consumer Price Index)": "3.1%",
    "ECB Interest Rate Decision": "4.50%",
    "GDP Preliminary": "2.8%",
    "Bank of England Rate Decision": "5.25%",
    "ISM Manufacturing PMI": "48.5",
    "Retail Sales m/m": "0.3%",
    "Unemployment Claims": "215K",
    "PPI (Producer Price Index)": "0.2%",
  };
  return forecasts[title] || "N/A";
}

function generatePrevious(title: string): string {
  const previous: Record<string, string> = {
    "Non-Farm Payrolls": "227K",
    "CPI (Consumer Price Index)": "3.2%",
    "GDP Preliminary": "3.1%",
    "ISM Manufacturing PMI": "47.9",
    "Retail Sales m/m": "0.4%",
    "Unemployment Claims": "219K",
    "PPI (Producer Price Index)": "0.4%",
  };
  return previous[title] || "N/A";
}
