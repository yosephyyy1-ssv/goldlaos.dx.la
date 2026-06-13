import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/guard";
import { getLivePrices } from "@/lib/pricing";
import { ApiError, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// POST { type: "cash", lak } | { type: "gold", gram }
export async function POST(req: NextRequest) {
  const g = await requireUser(req);
  if (g.res) return g.res;

  const body = await req.json().catch(() => null);
  const repo = getRepo();
  const s = await repo.getSettings();

  try {
    if (body?.type === "cash") {
      const lak = Number(body.lak);
      if (!Number.isFinite(lak) || lak <= 0)
        return NextResponse.json({ error: "invalid amount" }, { status: 400 });
      const fee = s.cashWithdrawFeeLak + Math.ceil((lak * s.withdrawProcessingPct) / 100);
      const { id } = await repo.requestWithdrawCash(g.user.id, lak, fee);
      return NextResponse.json({ ok: true, fee, id });
    }

    if (body?.type === "gold") {
      const gram = Math.round(Number(body.gram) * 10_000) / 10_000;
      if (!Number.isFinite(gram) || gram <= 0)
        return NextResponse.json({ error: "invalid amount" }, { status: 400 });
      // ค่าจัดส่ง (flat) + ค่าดำเนินการ % ของมูลค่าทอง — หักจากกระเป๋า LAK
      const p = await getLivePrices();
      const fee = s.shippingFlatLak +
        Math.ceil((gram * p.realLakPerGram * s.withdrawProcessingPct) / 100);
      const { id } = await repo.requestWithdrawGold(g.user.id, gram, fee, p);
      return NextResponse.json({ ok: true, fee, id });
    }

    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  } catch (e) {
    if (e instanceof ApiError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
