"use client";
import { useEffect, useMemo, useState } from "react";
import { Settings } from "@/lib/types";

const FIELDS: { key: keyof Settings; label: string; unit: string; group: string }[] = [
  { key: "fxRiskPct", label: "ความเสี่ยงค่าเงิน (FX Risk)", unit: "%", group: "Risk Buffer — ราคาขาย" },
  { key: "goldRiskPct", label: "ความเสี่ยงราคาทอง (Gold Risk)", unit: "%", group: "Risk Buffer — ราคาขาย" },
  { key: "opCostPct", label: "ค่าดำเนินงาน (Operating Cost)", unit: "%", group: "Risk Buffer — ราคาขาย" },
  { key: "profitPct", label: "กำไรบริษัท (Company Profit)", unit: "%", group: "Risk Buffer — ราคาขาย" },
  { key: "buybackDiscountPct", label: "ส่วนลดราคารับซื้อคืน", unit: "%", group: "ราคารับซื้อคืน" },
  { key: "minSaveLak", label: "ขั้นต่ำการออม", unit: "LAK", group: "เงื่อนไขการทำรายการ" },
  { key: "minWithdrawGram", label: "ขั้นต่ำถอนทองจริง", unit: "กรัม", group: "เงื่อนไขการทำรายการ" },
  { key: "shippingFlatLak", label: "ค่าจัดส่งทองคำจริง", unit: "LAK", group: "ค่าธรรมเนียมการถอน" },
  { key: "withdrawProcessingPct", label: "ค่าดำเนินการถอน", unit: "%", group: "ค่าธรรมเนียมการถอน" },
  { key: "cashWithdrawFeeLak", label: "ค่าธรรมเนียมถอนเงินสด", unit: "LAK", group: "ค่าธรรมเนียมการถอน" },
];

export default function AdminSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then(setS);
  }, []);

  const markup = useMemo(
    () => (s ? s.fxRiskPct + s.goldRiskPct + s.opCostPct + s.profitPct : 0),
    [s]
  );

  async function save() {
    if (!s) return;
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    if (res.ok) {
      setS(await res.json());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setBusy(false);
  }

  if (!s) return <p className="text-mute text-sm">กำลังโหลด...</p>;

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <div className="max-w-2xl">
      {/* สรุปสูตรราคาแบบ Live */}
      <div className="card p-5 mb-5 border-gold/30">
        <p className="text-xs text-mute mb-2">สูตรราคาปัจจุบัน</p>
        <p className="text-sm leading-relaxed">
          ราคาจริง = (XAU/USD / 31.1035) × USD/LAK<br />
          ราคาขายลูกค้า = ราคาจริง × <span className="gold-text font-bold">{(1 + markup / 100).toFixed(4)}</span>
          <span className="text-mute"> ({s.fxRiskPct}% + {s.goldRiskPct}% + {s.opCostPct}% + {s.profitPct}% = {markup}%)</span><br />
          ราคารับซื้อคืน = ราคาจริง × <span className="gold-text font-bold">{(1 - s.buybackDiscountPct / 100).toFixed(4)}</span>
          <span className="text-mute"> (−{s.buybackDiscountPct}%)</span><br />
          <span className="text-up">Spread รวม = {(markup + s.buybackDiscountPct).toFixed(1)}% ต่อรอบซื้อ-ขาย</span>
        </p>
      </div>

      {groups.map((gname) => (
        <div key={gname} className="card p-5 mb-4">
          <h2 className="font-bold text-sm mb-4 text-gold">{gname}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FIELDS.filter((f) => f.group === gname).map((f) => (
              <label key={f.key} className="block">
                <span className="text-xs text-mute">{f.label}</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={s[f.key]}
                    onChange={(e) => setS({ ...s, [f.key]: parseFloat(e.target.value) || 0 })}
                    className="input w-full px-3 py-2.5 text-sm font-semibold"
                  />
                  <span className="text-xs text-mute w-12">{f.unit}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-gold px-6 py-3 text-sm">
          {busy ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
        {saved && <span className="text-up text-sm font-semibold">✓ บันทึกแล้ว — มีผลทันที</span>}
      </div>
    </div>
  );
}
