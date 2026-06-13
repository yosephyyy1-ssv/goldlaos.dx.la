import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/guard";
import { ApiError, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// จำลองการเติมเงินผ่าน BCEL One / LAPNet QR
export async function POST(req: NextRequest) {
  const g = await requireUser(req);
  if (g.res) return g.res;

  const body = await req.json().catch(() => null);
  const lak = Number(body?.lak);
  if (!Number.isFinite(lak) || lak <= 0 || lak > 100_000_000)
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });

  try {
    const { balance } = await getRepo().topup(g.user.id, lak);
    return NextResponse.json({ ok: true, balance });
  } catch (e) {
    if (e instanceof ApiError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
