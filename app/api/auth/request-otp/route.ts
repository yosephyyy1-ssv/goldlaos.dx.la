import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// POST { phone } → ส่ง OTP 6 หลัก (หมดอายุ 5 นาที)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? "").replace(/[\s-]/g, "");
  if (!/^\+?\d{8,15}$/.test(phone))
    return NextResponse.json({ error: "invalid phone number" }, { status: 400 });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await getRepo().saveOtp(phone, code);

  // Production: ต่อ SMS Gateway (Unitel/LTC/ETL หรือ Twilio) ผ่าน env SMS_GATEWAY_URL
  if (process.env.SMS_GATEWAY_URL) {
    try {
      await fetch(process.env.SMS_GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message: `GoldSave OTP: ${code}` }),
        signal: AbortSignal.timeout(5000),
      });
      return NextResponse.json({ ok: true, sent: true });
    } catch {
      return NextResponse.json({ error: "SMS gateway unavailable" }, { status: 502 });
    }
  }

  // Demo Mode: ไม่มี SMS Gateway — แสดงรหัสบนหน้าจอ
  return NextResponse.json({ ok: true, sent: false, demoHint: code });
}
