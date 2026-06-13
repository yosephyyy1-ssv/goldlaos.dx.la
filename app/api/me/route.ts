import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/guard";
import { getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await requireUser(req);
  if (g.res) return g.res;
  const repo = getRepo();
  const [txs, withdrawals] = await Promise.all([
    repo.getUserTxs(g.user.id),
    repo.getUserWithdrawals(g.user.id),
  ]);
  return NextResponse.json({ user: g.user, txs, withdrawals });
}
