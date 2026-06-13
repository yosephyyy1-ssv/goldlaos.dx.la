import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/guard";
import { getLivePrices } from "@/lib/pricing";
import { ApiError, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// POST { side: "buy", lak: number } | { side: "sell", gram: number }
export async function POST(req: NextRequest) {
  const g = await requireUser(req);
  if (g.res) return g.res;

  const body = await req.json().catch(() => null);
  if (!body?.side) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const p = await getLivePrices();
  try {
    if (body.side === "buy") {
      const lak = Number(body.lak);
      if (!Number.isFinite(lak) || lak <= 0)
        return NextResponse.json({ error: "invalid amount" }, { status: 400 });
      const { gram } = await getRepo().executeBuy(g.user.id, lak, p);
      return NextResponse.json({ ok: true, gram, pricePerGram: p.sellLakPerGram });
    }
    if (body.side === "sell") {
      const gram = Math.round(Number(body.gram) * 10_000) / 10_000;
      if (!Number.isFinite(gram) || gram <= 0)
        return NextResponse.json({ error: "invalid amount" }, { status: 400 });
      const { lak } = await getRepo().executeSell(g.user.id, gram, p);
      return NextResponse.json({ ok: true, lak, pricePerGram: p.buyLakPerGram });
    }
    return NextResponse.json({ error: "invalid side" }, { status: 400 });
  } catch (e) {
    if (e instanceof ApiError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
