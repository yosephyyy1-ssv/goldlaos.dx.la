// เครื่องคำนวณราคาอัตโนมัติ
//
// ราคาจริง (LAK/กรัม) = (XAU/USD ÷ 31.1034768) × USD/LAK
// Markup รวม = ความเสี่ยงค่าเงิน + ความเสี่ยงราคาทอง + ค่าดำเนินงาน + กำไรบริษัท
// ราคาขายลูกค้า  = ราคาจริง × (1 + Markup รวม)     (ค่าเริ่มต้น ×1.06... ปรับได้จาก Admin)
// ราคารับซื้อคืน = ราคาจริง × (1 − ส่วนลดรับซื้อคืน)  (ค่าเริ่มต้น ×0.98)
import { GRAMS_PER_OZ, getMarketRates } from "./prices";
import { getRepo } from "./repo";
import { Prices, Settings } from "./types";

export function markupPct(s: Settings) {
  return s.fxRiskPct + s.goldRiskPct + s.opCostPct + s.profitPct;
}

export function computePrices(xauUsd: number, usdLak: number, s: Settings) {
  const realLakPerGram = (xauUsd / GRAMS_PER_OZ) * usdLak;
  const m = markupPct(s);
  return {
    realLakPerGram,
    sellLakPerGram: realLakPerGram * (1 + m / 100),
    buyLakPerGram: realLakPerGram * (1 - s.buybackDiscountPct / 100),
    markupPct: m,
  };
}

export async function getLivePrices(): Promise<Prices> {
  const [{ xauUsd, usdLak }, s] = await Promise.all([
    getMarketRates(),
    getRepo().getSettings(),
  ]);
  const p = computePrices(xauUsd.value, usdLak.value, s);
  return {
    xauUsd: xauUsd.value,
    usdLak: usdLak.value,
    ...p,
    buybackDiscountPct: s.buybackDiscountPct,
    source: xauUsd.source === "demo" || usdLak.source === "demo"
      ? "demo"
      : `${xauUsd.source} + ${usdLak.source}`,
    updatedAt: new Date().toISOString(),
  };
}
