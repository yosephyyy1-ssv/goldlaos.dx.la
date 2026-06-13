"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtGram, fmtLak } from "@/lib/format";
import { Prices, User } from "@/lib/types";

const QUICK_LAK = [10_000, 50_000, 100_000, 500_000, 1_000_000];

export default function TradePage() {
  const { t } = useI18n();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [prices, setPrices] = useState<Prices | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = () => {
    fetch("/api/prices").then((r) => r.json()).then(setPrices).catch(() => {});
    fetch("/api/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  };
  useEffect(() => {
    refresh();
    const id = setInterval(
      () => fetch("/api/prices").then((r) => r.json()).then(setPrices).catch(() => {}),
      5000
    );
    return () => clearInterval(id);
  }, []);

  const n = parseFloat(amount) || 0;
  const receiveGram = prices && side === "buy" ? Math.floor((n / prices.sellLakPerGram) * 10_000) / 10_000 : 0;
  const receiveLak = prices && side === "sell" ? Math.floor(n * prices.buyLakPerGram) : 0;

  async function submit() {
    if (!prices || n <= 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(side === "buy" ? { side, lak: n } : { side, gram: n }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMsg({
        ok: true,
        text: side === "buy"
          ? `${t("success")} +${fmtGram(d.gram)} g`
          : `${t("success")} +₭ ${fmtLak(d.lak)}`,
      });
      setAmount("");
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: `${t("error")}: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-1">{t("buyGold")}</h1>
        <p className="text-mute text-sm mb-5 flex items-center gap-1.5">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-up" />
          {t("open247")}
        </p>

        {/* Buy / Sell tabs */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSide(s); setAmount(""); setMsg(null); }}
              className={`py-3 rounded-xl font-bold text-sm transition border
                ${side === s
                  ? s === "buy" ? "bg-up/15 text-up border-up/40" : "bg-down/15 text-down border-down/40"
                  : "text-mute border-line hover:text-white"}`}
            >
              {s === "buy" ? t("buyGold") : t("sellGold")}
            </button>
          ))}
        </div>

        {/* ราคาปัจจุบัน */}
        <div className="card p-4 mb-5 flex items-center justify-between">
          <span className="text-mute text-sm">{t("pricePerGramNow")}</span>
          <span className={`text-lg font-bold ${side === "buy" ? "text-up" : "text-down"}`}>
            ₭ {prices ? fmtLak(side === "buy" ? prices.sellLakPerGram : prices.buyLakPerGram) : "…"}
            <span className="text-xs text-mute font-normal"> /g</span>
          </span>
        </div>

        {/* ยอดคงเหลือ */}
        {user && (
          <div className="flex justify-between text-xs text-mute mb-2 px-1">
            <span>{t("balance")}: ₭ {fmtLak(user.lakBalance)}</span>
            <span>{t("goldBalance")}: {fmtGram(user.goldGram)} g</span>
          </div>
        )}

        {/* Input */}
        <div className="card p-5 mb-4">
          <label className="text-xs text-mute">
            {side === "buy" ? t("amountLak") : t("amountGram")}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step={side === "buy" ? "1000" : "0.0001"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={side === "buy" ? "10,000" : "0.0001"}
            className="input w-full mt-2 px-4 py-3.5 text-xl font-bold"
          />
          {side === "buy" && (
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_LAK.map((q) => (
                <button key={q} onClick={() => setAmount(String(q))}
                  className="btn-ghost px-3 py-1.5 text-xs">
                  {fmtLak(q)}
                </button>
              ))}
            </div>
          )}
          {side === "sell" && user && (
            <button onClick={() => setAmount(String(user.goldGram))}
              className="btn-ghost px-3 py-1.5 text-xs mt-3">
              MAX {fmtGram(user.goldGram)} g
            </button>
          )}

          <div className="border-t border-line mt-4 pt-4 flex items-center justify-between">
            <span className="text-mute text-sm">{t("youReceive")}</span>
            <span className="text-xl font-extrabold gold-text">
              {side === "buy" ? `${fmtGram(receiveGram)} g` : `₭ ${fmtLak(receiveLak)}`}
            </span>
          </div>
          {side === "buy" && (
            <p className="text-[11px] text-mute mt-2">
              {t("minSave")}: ₭ 10,000 · 0.0001 g
            </p>
          )}
        </div>

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm mb-4 border
            ${msg.ok ? "border-up/40 text-up bg-up/10" : "border-down/40 text-down bg-down/10"}`}>
            {msg.text}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy || n <= 0}
          className="btn-gold w-full py-4 text-base"
        >
          {busy ? t("loading") : side === "buy" ? t("confirmBuy") : t("confirmSell")}
        </button>
      </div>
    </AppShell>
  );
}
