// ระบบดึงราคา Real-Time พร้อม fallback หลายชั้น:
//   XAU/USD: GoldAPI / Metals.dev (key) → gold-api.com → Swissquote (ฟรี ไม่ต้องมี key)
//   USD/LAK: ExchangeRate-API (key) → open.er-api.com (ฟรี)
// ถ้าดึงไม่ได้ชั่วคราว → ใช้ราคาล่าสุดที่ดึงสำเร็จ (stale)
// ถ้าไม่เคยดึงได้เลย (ออฟไลน์สนิท) → Demo Mode ราคาจำลอง

export const GRAMS_PER_OZ = 31.1034768;

type Quote = { value: number; source: string };

const g = globalThis as unknown as {
  __gsPriceCache?: { t: number; xau: Quote; lak: Quote };
  __gsLastGood?: { xau?: Quote & { t: number }; lak?: Quote & { t: number } };
  __gsSim?: { xau: number; lak: number };
};

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GoldSaveLaos/1.0" };

// ฐานราคาจำลอง — ใช้เฉพาะออฟไลน์สนิทเท่านั้น
function sim() {
  if (!g.__gsSim) g.__gsSim = { xau: 4218, lak: 21974 };
  g.__gsSim.xau += (Math.random() - 0.5) * 3;
  g.__gsSim.lak += (Math.random() - 0.5) * 6;
  return g.__gsSim;
}

async function fetchJson(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, {
    headers: { ...UA, ...headers },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function remember(kind: "xau" | "lak", q: Quote): Quote {
  if (!g.__gsLastGood) g.__gsLastGood = {};
  g.__gsLastGood[kind] = { ...q, t: Date.now() };
  return q;
}

// ราคาล่าสุดที่ดึงสำเร็จ ยอมใช้ได้ไม่เกิน 1 ชั่วโมง
function lastGood(kind: "xau" | "lak"): Quote | null {
  const lg = g.__gsLastGood?.[kind];
  if (lg && Date.now() - lg.t < 3_600_000) {
    return { value: lg.value, source: `${lg.source} (cached)` };
  }
  return null;
}

async function getXauUsd(): Promise<Quote> {
  // 1) GoldAPI (มี key)
  if (process.env.GOLDAPI_KEY) {
    try {
      const j = await fetchJson("https://www.goldapi.io/api/XAU/USD", {
        "x-access-token": process.env.GOLDAPI_KEY,
      });
      if (j.price > 0) return remember("xau", { value: j.price, source: "goldapi.io" });
    } catch {}
  }
  // 2) Metals.dev (มี key)
  if (process.env.METALS_DEV_KEY) {
    try {
      const j = await fetchJson(
        `https://api.metals.dev/v1/latest?api_key=${process.env.METALS_DEV_KEY}&currency=USD&unit=toz`
      );
      if (j?.metals?.gold > 0)
        return remember("xau", { value: j.metals.gold, source: "metals.dev" });
    } catch {}
  }
  // 3) gold-api.com — ฟรี ไม่ต้องมี key อัปเดตเรียลไทม์
  try {
    const j = await fetchJson("https://api.gold-api.com/price/XAU");
    if (j?.price > 0) return remember("xau", { value: j.price, source: "gold-api.com" });
  } catch {}
  // 4) Swissquote — ฟรี ไม่ต้องมี key (ใช้ราคากลาง bid/ask)
  try {
    const j = await fetchJson(
      "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD"
    );
    const p = j?.[0]?.spreadProfilePrices?.[0];
    if (p?.bid > 0 && p?.ask > 0)
      return remember("xau", { value: (p.bid + p.ask) / 2, source: "swissquote.com" });
  } catch {}
  // 5) ราคาล่าสุดที่เคยดึงได้ → 6) จำลอง
  return lastGood("xau") ?? { value: sim().xau, source: "demo" };
}

async function getUsdLak(): Promise<Quote> {
  if (process.env.EXCHANGERATE_API_KEY) {
    try {
      const j = await fetchJson(
        `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/latest/USD`
      );
      if (j?.conversion_rates?.LAK > 0)
        return remember("lak", { value: j.conversion_rates.LAK, source: "exchangerate-api.com" });
    } catch {}
  }
  try {
    const j = await fetchJson("https://open.er-api.com/v6/latest/USD");
    if (j?.rates?.LAK > 0)
      return remember("lak", { value: j.rates.LAK, source: "open.er-api.com" });
  } catch {}
  return lastGood("lak") ?? { value: sim().lak, source: "demo" };
}

export async function getMarketRates(): Promise<{ xauUsd: Quote; usdLak: Quote }> {
  const now = Date.now();
  // cache 10 วินาที กันยิง API ถี่เกินไป
  if (g.__gsPriceCache && now - g.__gsPriceCache.t < 10_000) {
    return { xauUsd: g.__gsPriceCache.xau, usdLak: g.__gsPriceCache.lak };
  }
  const [xau, lak] = await Promise.all([getXauUsd(), getUsdLak()]);
  g.__gsPriceCache = { t: now, xau, lak };
  return { xauUsd: xau, usdLak: lak };
}
