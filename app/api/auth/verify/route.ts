import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, signSession } from "@/lib/auth";
import { getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// POST { phone, code } → ตรวจ OTP, สร้าง/หา user, ออก session
// เว็บใช้ HttpOnly cookie · มือถือใช้ token ใน response (Authorization: Bearer)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? "").replace(/[\s-]/g, "");
  const code = String(body?.code ?? "");

  if (!(await getRepo().checkOtp(phone, code)))
    return NextResponse.json({ error: "invalid or expired OTP" }, { status: 401 });

  const user = await getRepo().findOrCreateUserByPhone(phone);
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
    token: signSession(user.id), // สำหรับ React Native
  });
  setSessionCookie(res, user.id);
  return res;
}
