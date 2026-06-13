"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Chart from "@/components/Chart";
import { useI18n } from "@/lib/i18n";
import { fmtGram, fmtLak, fmtUsd } from "@/lib/format";
import { Prices, Tx, User } from "@/lib/types";
import { Range } from "@/lib/history";

const RANGES: Range[] = ["1d", "7d", "30d", "1y"];

export default function Dashboard() {
  const { t } = useI18n();
  const [prices, setPrices] = useState<Prices | null>(null);
  const [prev, setPrev] = useState<number | null>(null);
  const [me, setMe] = useState<{ user: User; txs: Tx[] } | null>(null);
  const [range, setRange] = useState<Range>("7d");
  const [points, setPoints] = useState<{ t: number; v: number }[]>([]);

  // ราคา Real-Time — โพลทุก 5 วินาที
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const p: Prices = await fetch("/api/prices").then((r) => r.json());
        if (!live) return;
        setPrices((old) => {
          if (old) setPrev(old.sellLakPerGram);
          return p;
        });
      } catch {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => { live = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/history?range=${range}`)
      .then((r) => r.json())
      .then((d) => setPoints(d.points ?? []))
      .catch(() => {});
  }, [range]);

  const dir = prices && prev !== null ? Math.sign(prices.sellLakPerGram - prev) : 0;
  const holdingValue = me && prices ? me.user.goldGram * prices.buyLakPerGram : 0;

  return (
    <AppShell>
      {/* Hero — ทองที่ถือครอง */}
      <section className="card p-5 lg:p-7 mb-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold/10 blur-2xl" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-mute text-sm mb-1">{t("yourGold")}</p>
            <p className="text-4xl lg:text-5xl font-extrabold gold-text tracking-tight">
              {me ? fmtGram(me.user.goldGram) : "—"} <span className="text-xl">g</span>
            </p>
            <p className="text-mute text-sm mt-2">
              {t("portfolioValue")}:{" "}
              <span className="text-white font-semibold">₭ {fmtLak(holdingValue)}</span>
            </p>
          </div>
          <div className="flex gap-2.5">
            <Link href="/trade" className="btn-gold px-5 py-2.5 text-sm">{t("quickBuy")}</Link>
            <Link href="/withdraw" className="btn-ghost px-5 py-2.5 text-sm">{t("quickWithdraw")}</Link>
          </div>
        </div>
      </section>

      {/* ราคา Real-Time 3 ช่อง */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <PriceCard
          label={t("goldWorld")}
          value={prices ? `$ ${fmtUsd(prices.xauUsd)}` : "…"}
          sub={t("perOz")}
          dir={dir}
        />
        <PriceCard
          label={t("fxRate")}
          value={prices ? `₭ ${fmtLak(prices.usdLak, 0)}` : "…"}
          sub="1 USD"
          dir={0}
        />
        <PriceCard
          label={t("goldLak")}
          value={prices ? `₭ ${fmtLak(prices.sellLakPerGram)}` : "…"}
          sub={t("perGram")}
          dir={dir}
          highlight
        />
      </section>

      {/* ราคาขาย/รับซื้อ */}
      {prices && (
        <section className="grid grid-cols-2 gap-4 mb-5">
          <div className="card p-4">
            <p className="text-mute text-xs">{t("sellPrice")} (+{prices.markupPct}%)</p>
            <p className="text-xl font-bold text-up mt-1">₭ {fmtLak(prices.sellLakPerGram)}</p>
          </div>
          <div className="card p-4">
            <p className="text-mute text-xs">{t("buybackPrice")} (−{prices.buybackDiscountPct}%)</p>
            <p className="text-xl font-bold text-down mt-1">₭ {fmtLak(prices.buyLakPerGram)}</p>
          </div>
        </section>
      )}

      {/* กราฟ */}
      <section className="card p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold">{t("priceChart")}</h2>
            <span className="flex items-center gap-1.5 text-[10px] text-up border border-up/30 rounded-full px-2 py-0.5">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-up" />
              {prices?.source === "demo" ? t("demoSource") : t("live")}
            </span>
          </div>
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition
                  ${range === r ? "bg-gold text-black" : "text-mute hover:text-white border border-line"}`}
              >
                {t(`range${r}` as never)}
              </button>
            ))}
          </div>
        </div>
        <Chart points={points} range={range} />
      </section>
    </AppShell>
  );
}

function PriceCard({
  label, value, sub, dir, highlight,
}: { label: string; value: string; sub: string; dir: number; highlight?: boolean }) {
  return (
    <div className={`card p-4 lg:p-5 ${highlight ? "border-gold/40" : ""}`}>
      <p className="text-mute text-xs mb-1.5">{label}</p>
      <p className={`text-2xl font-extrabold tracking-tight transition-colors
        ${dir > 0 ? "text-up" : dir < 0 ? "text-down" : highlight ? "gold-text" : "text-white"}`}>
        {value}
      </p>
      <p className="text-mute text-[11px] mt-1">{sub}</p>
    </div>
  );
}
