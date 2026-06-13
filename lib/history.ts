// สร้างข้อมูลกราฟย้อนหลังแบบ deterministic (seeded random walk)
// ยึดปลายกราฟกับราคาปัจจุบันเสมอ เพื่อให้กราฟต่อเนื่องกับราคา Real-Time
export type Range = "1d" | "7d" | "30d" | "1y";

const CONFIG: Record<Range, { points: number; stepMs: number; vol: number }> = {
  "1d": { points: 96, stepMs: 15 * 60_000, vol: 0.0012 },
  "7d": { points: 168, stepMs: 60 * 60_000, vol: 0.003 },
  "30d": { points: 120, stepMs: 6 * 60 * 60_000, vol: 0.006 },
  "1y": { points: 365, stepMs: 24 * 60 * 60_000, vol: 0.012 },
};

// seeded PRNG (mulberry32)
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildHistory(range: Range, currentPrice: number) {
  const { points, stepMs, vol } = CONFIG[range];
  const rand = rng(range.charCodeAt(0) * 7919 + points);
  const now = Date.now();
  // เดินถอยหลังจากราคาปัจจุบัน
  const values: number[] = [currentPrice];
  let v = currentPrice;
  for (let i = 1; i < points; i++) {
    const drift = (rand() - 0.485) * vol; // เอนเอียงขาขึ้นเล็กน้อยตามแนวโน้มทองระยะยาว
    v = v / (1 + drift);
    values.unshift(v);
  }
  return values.map((value, i) => ({
    t: now - (points - 1 - i) * stepMs,
    v: Math.round(value),
  }));
}
