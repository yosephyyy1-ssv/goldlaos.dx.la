// SMS Gateway — ส่ง OTP จริงไปยังเบอร์ลูกค้า
// รองรับ 3 รูปแบบ (เลือกตามที่หาได้):
//   1) Twilio  — บริการระดับโลก ใช้กับลาวได้ ส่งจากเบอร์อเมริกัน
//   2) Generic webhook — ต่อ API ของ Unitel/LTC/ETL หรือบริการในประเทศ
//   3) ไม่ตั้งค่า → Demo Mode: แสดงรหัสบนหน้าจอ (Dev เท่านั้น)

export type SmsResult =
  | { sent: true; provider: string }
  | { sent: false; demoHint: string };

export async function sendOtpSms(phone: string, code: string): Promise<SmsResult> {
  const message = `GoldSave Laos: ລະຫັດຂອງທ່ານຄື ${code} (ໝົດອາຍຸໃນ 5 ນາທີ). ບໍ່ຄວນແບ່ງປັນກັບໃຜ`;

  // ===== 1) Twilio =====
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    const auth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_FROM,
          To: phone,
          Body: message,
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Twilio ${res.status}: ${err.slice(0, 200)}`);
    }
    return { sent: true, provider: "twilio" };
  }

  // ===== 2) Generic webhook (Unitel/LTC/ETL/บริการในประเทศ) =====
  // endpoint ต้องรับ POST { to, message } และคืน 2xx เมื่อสำเร็จ
  // ใส่ Bearer token ได้ใน SMS_GATEWAY_TOKEN
  if (process.env.SMS_GATEWAY_URL) {
    const res = await fetch(process.env.SMS_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_GATEWAY_TOKEN
          ? { Authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ to: phone, message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`SMS gateway ${res.status}: ${err.slice(0, 200)}`);
    }
    return { sent: true, provider: "webhook" };
  }

  // ===== 3) Demo Mode =====
  return { sent: false, demoHint: code };
}
