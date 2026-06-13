"use client";
import { useEffect, useState } from "react";
import { fmtGram, fmtLak } from "@/lib/format";

type Stats = {
  profitToday: number; profitMonth: number; profitAll: number;
  customers: number; kycVerified: number;
  customerGoldGram: number; goldReserveGram: number;
  aumLak: number; pendingWithdrawals: number; txCount: number;
};

export default function AdminDashboard() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/admin/stats").then((r) => r.json()).then(setS).catch(() => {});
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  const cards = s ? [
    { label: "กำไรวันนี้", value: `₭ ${fmtLak(s.profitToday)}`, accent: "text-up" },
    { label: "กำไรเดือนนี้", value: `₭ ${fmtLak(s.profitMonth)}`, accent: "text-up" },
    { label: "กำไรสะสมทั้งหมด", value: `₭ ${fmtLak(s.profitAll)}`, accent: "gold-text" },
    { label: "มูลค่าทรัพย์สินรวม (AUM)", value: `₭ ${fmtLak(s.aumLak)}`, accent: "text-white" },
    { label: "ทองของลูกค้า", value: `${fmtGram(s.customerGoldGram)} g`, accent: "text-white" },
    { label: "ทองสำรองบริษัท (110%)", value: `${fmtGram(s.goldReserveGram)} g`, accent: "gold-text" },
    { label: "จำนวนลูกค้า", value: `${s.customers} (KYC ${s.kycVerified})`, accent: "text-white" },
    { label: "คำขอถอนรออนุมัติ", value: String(s.pendingWithdrawals), accent: s.pendingWithdrawals > 0 ? "text-down" : "text-up" },
  ] : [];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4 lg:p-5">
            <p className="text-mute text-[11px] mb-1.5">{c.label}</p>
            <p className={`text-lg lg:text-xl font-extrabold tracking-tight ${c.accent}`}>{c.value}</p>
          </div>
        ))}
        {!s && <p className="text-mute text-sm col-span-full">กำลังโหลด...</p>}
      </div>

      <div className="card p-5 mt-5">
        <h2 className="font-bold text-sm mb-3">เป้าหมายธุรกิจ</h2>
        <ul className="space-y-2 text-sm text-mute">
          <li>✓ Risk Buffer ค่าเงิน 4% + ราคาทอง 2% — บริษัทไม่ขาดทุนจากความผันผวน</li>
          <li>✓ Spread ซื้อ-ขายปรับได้จากหน้าตั้งค่า — กำไรขั้นต่ำ 4–8% ต่อธุรกรรม</li>
          <li>✓ ทองสำรอง 110% ของยอดลูกค้า — รองรับการถอนทุกกรณี</li>
          <li>✓ สถาปัตยกรรม Supabase + PostgreSQL — รองรับผู้ใช้ 100,000+ คน</li>
        </ul>
      </div>
    </div>
  );
}
