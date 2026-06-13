import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/guard";
import { ApiError, getRepo } from "@/lib/repo";
import { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

const KEYS: (keyof Settings)[] = [
  "fxRiskPct", "goldRiskPct", "opCostPct", "profitPct", "buybackDiscountPct",
  "minSaveLak", "minWithdrawGram", "shippingFlatLak", "withdrawProcessingPct",
  "cashWithdrawFeeLak",
];

// อ่านได้ทุกคนที่ login (หน้า withdraw ใช้แสดงค่าธรรมเนียม)
export async function GET(req: NextRequest) {
  const g = await requireUser(req);
  if (g.res) return g.res;
  return NextResponse.json(await getRepo().getSettings());
}

// แก้ไขได้เฉพาะ Admin — ปรับเปอร์เซ็นต์ความเสี่ยง/ค่าธรรมเนียม/กำไรทั้งหมด
export async function PUT(req: NextRequest) {
  const g = await requireAdmin(req);
  if (g.res) return g.res;

  const body = (await req.json().catch(() => null)) as Partial<Settings> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patch: Partial<Settings> = {};
  for (const k of KEYS) if (body[k] !== undefined) patch[k] = Number(body[k]);

  try {
    return NextResponse.json(await getRepo().updateSettings(patch));
  } catch (e) {
    if (e instanceof ApiError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
