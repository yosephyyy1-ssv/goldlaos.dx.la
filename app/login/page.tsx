"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const DEMO_PHONE = "+8562055551234";

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(DEMO_PHONE);
  const [code, setCode] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setHint(d.demoHint ?? null);
      setStep("otp");
      setCode("");
      setTimeout(() => otpRef.current?.focus(), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(otp: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(t("invalidOtp"));
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function onOtpChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) verify(digits);
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/icon.svg" alt="" className="h-20 w-20 rounded-3xl mx-auto mb-4 shadow-[0_0_60px_rgba(245,197,66,0.25)]" />
          <h1 className="text-3xl font-extrabold gold-text">GoldSave Laos</h1>
          <p className="text-mute text-sm mt-1.5">{t("tagline")}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg">{t("loginTitle")}</h2>
            <div className="flex rounded-lg border border-line overflow-hidden text-xs font-semibold">
              {(["lo", "th"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 ${lang === l ? "bg-gold text-black" : "text-mute"}`}>
                  {l === "lo" ? "ລາວ" : "ไทย"}
                </button>
              ))}
            </div>
          </div>

          {step === "phone" ? (
            <>
              <p className="text-mute text-xs mb-4">{t("loginSubtitle")}</p>
              <label className="text-xs text-mute">{t("phoneLabel")}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+856 20 XXXX XXXX"
                className="input w-full mt-1.5 mb-2 px-4 py-3.5 text-lg font-semibold tracking-wide"
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
              <p className="text-[10px] text-mute mb-4">
                {phone === DEMO_PHONE && `★ ${t("demoAccountNote")}`}
              </p>
              <button onClick={sendOtp} disabled={busy || phone.length < 8}
                className="btn-gold w-full py-3.5 text-sm">
                {busy ? t("loading") : t("sendOtp")}
              </button>
            </>
          ) : (
            <>
              <p className="text-mute text-xs mb-1">
                {t("otpSentTo")} <span className="text-white font-semibold">{phone}</span>
              </p>
              {hint && (
                <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 my-3 text-center">
                  <p className="text-[10px] text-mute">{t("demoOtpHint")}</p>
                  <p className="text-2xl font-extrabold gold-text tracking-[0.3em]">{hint}</p>
                </div>
              )}
              <label className="text-xs text-mute">{t("otpLabel")}</label>
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => onOtpChange(e.target.value)}
                placeholder="••••••"
                className="input w-full mt-1.5 mb-4 px-4 py-3.5 text-2xl font-extrabold tracking-[0.5em] text-center"
              />
              {error && <p className="text-down text-xs mb-3">{error}</p>}
              <button onClick={() => verify(code)} disabled={busy || code.length !== 6}
                className="btn-gold w-full py-3.5 text-sm mb-2">
                {busy ? t("loading") : t("verifyOtp")}
              </button>
              <div className="flex justify-between text-xs">
                <button onClick={() => { setStep("phone"); setError(null); }} className="text-mute hover:text-white">
                  ← {t("changePhone")}
                </button>
                <button onClick={sendOtp} disabled={busy} className="text-gold hover:underline">
                  {t("resendOtp")}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-mute mt-6">
          🔒 OTP · 2FA · Face Verification · AES-256 Encryption
        </p>
      </div>
    </div>
  );
}
