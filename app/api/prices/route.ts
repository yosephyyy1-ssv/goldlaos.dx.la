import { NextResponse } from "next/server";
import { getLivePrices } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getLivePrices());
}
