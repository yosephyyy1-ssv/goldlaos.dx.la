import { NextRequest, NextResponse } from "next/server";

// ป้องกันทุกหน้า — ถ้าไม่มี session cookie ให้ไปหน้า /login
// (ตรวจลายเซ็น HMAC จริงใน API routes ฝั่ง Node runtime)
export function middleware(req: NextRequest) {
  const session = req.cookies.get("gs_session")?.value;
  if (!session) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|login|icon\\.svg|manifest\\.json|favicon\\.ico).*)",
  ],
};
