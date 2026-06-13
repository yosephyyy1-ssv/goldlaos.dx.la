import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { ApiError, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await requireAdmin(req);
  if (g.res) return g.res;
  return NextResponse.json(await getRepo().listWithdrawals());
}

// POST { id, action: "approve" | "reject" }
export async function POST(req: NextRequest) {
  const g = await requireAdmin(req);
  if (g.res) return g.res;

  const body = await req.json().catch(() => null);
  if (!body?.id || !["approve", "reject"].includes(body?.action))
    return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    return NextResponse.json(await getRepo().decideWithdrawal(body.id, body.action));
  } catch (e) {
    if (e instanceof ApiError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
