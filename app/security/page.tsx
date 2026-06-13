"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { User } from "@/lib/types";

export default function SecurityPage() {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, []);

  const kycLabel =
    user?.kycStatus === "verified" ? t("kycVerified")
    : user?.kycStatus === "pending" ? t("kycPending")
    : t("kycUnverified");

  const items = [
    {
      title: t("kyc"),
      desc: "ID Card / Passport + Liveness Check",
      status: kycLabel,
      ok: user?.kycStatus === "verified",
    },
    {
      title: t("otp"),
      desc: "SMS OTP ທຸກຄັ້ງທີ່ເຂົ້າສູ່ລະບົບ ແລະ ທຸລະກຳສຳຄັນ",
      status: t("enabled"),
      ok: true,
    },
    {
      title: t("faceVerify"),
      desc: "Face Verification ກ່ອນຖອນເງິນ/ຄຳ",
      status: user?.faceVerified ? t("enabled") : t("disabled"),
      ok: !!user?.faceVerified,
    },
    {
      title: t("twoFa"),
      desc: "TOTP (Google Authenticator)",
      status: user?.twoFa ? t("enabled") : t("disabled"),
      ok: !!user?.twoFa,
    },
    {
      title: t("encryption"),
      desc: "AES-256 at rest · TLS 1.3 in transit · Supabase RLS",
      status: t("enabled"),
      ok: true,
    },
  ];

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-1">{t("security")}</h1>
        {user && (
          <p className="text-mute text-sm mb-5">{user.name} · {user.phone}</p>
        )}
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.title} className="card p-4 flex items-center gap-4">
              <span className={`h-10 w-10 shrink-0 rounded-full grid place-items-center border
                ${it.ok ? "border-up/40 bg-up/10 text-up" : "border-line bg-white/5 text-mute"}`}>
                {it.ok ? "✓" : "○"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{it.title}</p>
                <p className="text-[11px] text-mute mt-0.5">{it.desc}</p>
              </div>
              <span className={`text-xs font-semibold ${it.ok ? "text-up" : "text-mute"}`}>
                {it.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
