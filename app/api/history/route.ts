import { NextRequest, NextResponse } from "next/server";
import { buildHistory, Range } from "@/lib/history";
import { getLivePrices } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const range = (req.nextUrl.searchParams.get("range") ?? "7d") as Range;
  if (!["1d", "7d", "30d", "1y"].includes(range)) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }
  const prices = await getLivePrices();
  return NextResponse.json({
    range,
    points: buildHistory(range, Math.round(prices.sellLakPerGram)),
  });
}
