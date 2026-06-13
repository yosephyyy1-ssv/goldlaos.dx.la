"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtGram, fmtLak } from "@/lib/format";
import { Tx, User } from "@/lib/types";

const TX_ICON: Record<string, string> = {
  buy: "↗", sell: "↘", deposit: "+", withdraw_cash: "−", withdraw_gold: "⤓",
};

export default function WalletPage() {
  const { t } = useI18n();
  const [me, setMe] = useState<{ user: User; txs: Tx[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetch("/api/me").then((r) => r.json()).then(setMe).catch(() => {});
  useEffect(() => { load(); }, []);

  async function topup() {
    setBusy(true);
    await fetch("/api/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lak: 1_000_000 }),
    });
    await load();
    setBusy(false);
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold mb-5">{t("wallet")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-mute text-xs mb-1">{t("lakWallet")}</p>
          <p className="text-3xl font-extrabold">₭ {me ? fmtLak(me.user.lakBalance) : "—"}</p>
          <button onClick={topup} disabled={busy} className="btn-gold px-4 py-2 text-xs mt-4">
            {busy ? t("loading") : `${t("topup")} +₭ 1,000,000`}
          </button>
          <p className="text-[10px] text-mute mt-2">{t("topupNote")}</p>
        </div>
        <div className="card p-5 border-gold/30">
          <p className="text-mute text-xs mb-1">{t("goldWallet")}</p>
          <p className="text-3xl font-extrabold gold-text">
            {me ? fmtGram(me.user.goldGram) : "—"} <span className="text-base">g</span>
          </p>
        </div>
      </div>

      <h2 className="font-bold mb-3">{t("txHistory")}</h2>
      <div className="card divide-y divide-line">
        {me?.txs.length === 0 && <p className="p-5 text-mute text-sm">{t("noTx")}</p>}
        {me?.txs.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3.5 px-4 py-3.5">
            <span className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-base font-bold border
              ${tx.type === "buy" || tx.type === "deposit"
                ? "text-up border-up/30 bg-up/10" : "text-down border-down/30 bg-down/10"}`}>
              {TX_ICON[tx.type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t(`tx_${tx.type}` as never)}</p>
              <p className="text-[11px] text-mute">{fmtDate(tx.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">
                {tx.gram > 0 ? `${tx.type === "buy" ? "+" : "−"}${fmtGram(tx.gram)} g` : `₭ ${fmtLak(tx.lak)}`}
              </p>
              <p className="text-[11px] text-mute">
                {tx.gram > 0 && tx.lak > 0 ? `₭ ${fmtLak(tx.lak)}` : ""}
                {tx.status !== "completed" && (
                  <span className={tx.status === "pending" ? "text-gold" : "text-down"}>
                    {" "}· {t(`status_${tx.status}` as never)}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
