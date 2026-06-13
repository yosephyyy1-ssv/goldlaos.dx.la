"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtGram, fmtLak } from "@/lib/format";
import { Prices, Settings, User, WithdrawRequest } from "@/lib/types";

export default function WithdrawPage() {
  const { t } = useI18n();
  const [type, setType] = useState<"cash" | "gold">("gold");
  const [user, setUser] = useState<User | null>(null);
  const [wds, setWds] = useState<WithdrawRequest[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prices, setPrices] = useState<Prices | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    fetch("/api/me").then((r) => r.json()).then((d) => { setUser(d.user); setWds(d.withdrawals); });
    fetch("/api/admin/settings").then((r) => r.json()).then(setSettings);
    fetch("/api/prices").then((r) => r.json()).then(setPrices);
  };
  useEffect(load, []);

  const n = parseFloat(amount) || 0;
  // คำนวณค่าธรรมเนียมอัตโนมัติ
  const shipping = type === "gold" && settings ? settings.shippingFlatLak : 0;
  const processing = settings && prices
    ? type === "gold"
      ? Math.ceil((n * prices.realLakPerGram * settings.withdrawProcessingPct) / 100)
      : Math.ceil((n * settings.withdrawProcessingPct) / 100) + settings.cashWithdrawFeeLak
    : 0;
  const totalFee = shipping + processing;

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "cash" ? { type, lak: n } : { type, gram: n }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMsg({ ok: true, text: `${t("success")} ${t("pendingApproval")}` });
      setAmount("");
      load();
    } catch (e) {
      setMsg({ ok: false, text: `${t("error")}: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-5">{t("withdrawTitle")}</h1>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {(["gold", "cash"] as const).map((tp) => (
            <button
              key={tp}
              onClick={() => { setType(tp); setAmount(""); setMsg(null); }}
              className={`py-3 rounded-xl font-bold text-sm border transition
                ${type === tp ? "bg-gold/15 text-gold border-gold/40" : "text-mute border-line hover:text-white"}`}
            >
              {tp === "gold" ? t("withdrawGold") : t("withdrawCash")}
            </button>
          ))}
        </div>

        {user && (
          <div className="flex justify-between text-xs text-mute mb-2 px-1">
            <span>{t("balance")}: ₭ {fmtLak(user.lakBalance)}</span>
            <span>{t("goldBalance")}: {fmtGram(user.goldGram)} g</span>
          </div>
        )}

        <div className="card p-5 mb-4">
          <label className="text-xs text-mute">
            {type === "gold" ? t("amountGram") : t("amountLak")}
            {type === "gold" && settings && (
              <span className="text-gold"> · {t("minWithdrawGold")} {settings.minWithdrawGram} g</span>
            )}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step={type === "gold" ? "0.0001" : "1000"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={type === "gold" ? "1.0000" : "100,000"}
            className="input w-full mt-2 px-4 py-3.5 text-xl font-bold"
          />

          {/* ค่าธรรมเนียมคำนวณอัตโนมัติ */}
          <div className="border-t border-line mt-4 pt-4 space-y-2 text-sm">
            {type === "gold" && (
              <div className="flex justify-between">
                <span className="text-mute">{t("shippingFee")}</span>
                <span>₭ {fmtLak(shipping)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-mute">{t("processingFee")} ({settings?.withdrawProcessingPct ?? 0}%)</span>
              <span>₭ {fmtLak(processing)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-line pt-2">
              <span>{t("totalFee")}</span>
              <span className="text-gold">₭ {fmtLak(totalFee)}</span>
            </div>
          </div>
        </div>

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm mb-4 border
            ${msg.ok ? "border-up/40 text-up bg-up/10" : "border-down/40 text-down bg-down/10"}`}>
            {msg.text}
          </div>
        )}

        <button onClick={submit} disabled={busy || n <= 0} className="btn-gold w-full py-4 text-base mb-8">
          {busy ? t("loading") : t("requestWithdraw")}
        </button>

        {wds.length > 0 && (
          <>
            <h2 className="font-bold mb-3">{t("txHistory")}</h2>
            <div className="card divide-y divide-line">
              {wds.map((w) => (
                <div key={w.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
                  <div>
                    <p className="font-semibold">
                      {w.type === "gold" ? t("withdrawGold") : t("withdrawCash")}
                    </p>
                    <p className="text-[11px] text-mute">{fmtDate(w.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {w.type === "gold" ? `${fmtGram(w.gram)} g` : `₭ ${fmtLak(w.lak)}`}
                    </p>
                    <p className={`text-[11px] font-semibold
                      ${w.status === "pending" ? "text-gold" : w.status === "approved" ? "text-up" : "text-down"}`}>
                      {t(`status_${w.status}` as never)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
