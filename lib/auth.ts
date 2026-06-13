// Session ด้วย HMAC-signed cookie (HttpOnly) — รองรับทั้ง cookie (เว็บ)
// และ Authorization: Bearer <token> (มือถือ React Native)
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.SESSION_SECRET ?? "goldsave-demo-secret-change-in-production";
export const SESSION_COOKIE = "gs_session";

export function signSession(userId: string): string {
  const sig = crypto.createHmac("sha256", SECRET).update(userId).digest("base64url");
  return `${userId}.${sig}`;
}

export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const userId = token.slice(0, i);
  const expected = signSession(userId);
  if (expected.length !== token.length) return null;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token)) ? userId : null;
}

// อ่าน session จาก Bearer header (มือถือ) หรือ cookie (เว็บ)
export function sessionUserId(req: NextRequest): string | null {
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const id = verifySession(bearer.slice(7));
    if (id) return id;
  }
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function setSessionCookie(res: NextResponse, userId: string) {
  res.cookies.set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 วัน
    path: "/",
  });
}
