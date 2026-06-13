import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { getLivePrices } from "@/lib/pricing";
import { getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await requireAdmin(req);
  if (g.res) return g.res;
  const p = await getLivePrices();
  const stats = await getRepo().stats(p.realLakPerGram);
  return NextResponse.json({ ...stats, prices: p });
}
