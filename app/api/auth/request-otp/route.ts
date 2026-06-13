import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/repo";
import { sendOtpSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

// Rate limit: 1 OTP ต่อ 30 วินาที ต่อเบอร์ (กัน abuse / กันค่าใช้จ่าย SMS)
const lastSent = new Map<string, number>();

// POST { phone } → ส่ง OTP 6 หลัก (หมดอายุ 5 นาที)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? "").replace(/[\s-]/g, "");
  if (!/^\+?\d{8,15}$/.test(phone))
    return NextResponse.json({ error: "invalid phone number" }, { status: 400 });

  // Rate limit (เฉพาะ production ที่ส่ง SMS จริง)
  const hasSmsProvider =
    process.env.TWILIO_ACCOUNT_SID || process.env.SMS_GATEWAY_URL;
  if (hasSmsProvider) {
    const last = lastSent.get(phone) ?? 0;
    const wait = 30_000 - (Date.now() - last);
    if (wait > 0)
      return NextResponse.json(
        { error: `ກະລຸນາລໍຖ້າ ${Math.ceil(wait / 1000)} ວິນາທີ ກ່ອນຂໍລະຫັດໃໝ່` },
        { status: 429 }
      );
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await getRepo().saveOtp(phone, code);

  try {
    const result = await sendOtpSms(phone, code);
    if (result.sent) {
      lastSent.set(phone, Date.now());
      return NextResponse.json({ ok: true, sent: true, provider: result.provider });
    }
    // Demo Mode — ไม่มี SMS provider
    return NextResponse.json({ ok: true, sent: false, demoHint: result.demoHint });
  } catch (e) {
    return NextResponse.json(
      { error: `ສົ່ງ SMS ບໍ່ສຳເລັດ: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
