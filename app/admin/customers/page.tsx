"use client";
import { useEffect, useState } from "react";
import { fmtDate, fmtGram, fmtLak } from "@/lib/format";
import { User } from "@/lib/types";

const KYC_BADGE: Record<User["kycStatus"], { label: string; cls: string }> = {
  verified: { label: "KYC ✓", cls: "text-up border-up/40 bg-up/10" },
  pending: { label: "KYC รอตรวจ", cls: "text-gold border-gold/40 bg-gold/10" },
  unverified: { label: "ยังไม่ KYC", cls: "text-mute border-line bg-white/5" },
};

export default function AdminCustomers() {
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/customers").then((r) => r.json()).then(setUsers);
  }, []);

  const filtered = users.filter(
    (u) => u.name.includes(q) || u.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
  );

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาชื่อ / เบอร์โทร..."
        className="input w-full max-w-sm px-4 py-2.5 text-sm mb-4"
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[11px] text-mute border-b border-line">
              <th className="px-4 py-3 font-medium">ลูกค้า</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium text-right">เงินกีบ (LAK)</th>
              <th className="px-4 py-3 font-medium text-right">ทอง (g)</th>
              <th className="px-4 py-3 font-medium text-right">สมัครเมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-[11px] text-mute">{u.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${KYC_BADGE[u.kycStatus].cls}`}>
                    {KYC_BADGE[u.kycStatus].label}
                  </span>
                  {u.twoFa && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full border text-up border-up/40 bg-up/10 ml-1">
                      2FA
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold">₭ {fmtLak(u.lakBalance)}</td>
                <td className="px-4 py-3 text-right font-semibold gold-text">{fmtGram(u.goldGram)}</td>
                <td className="px-4 py-3 text-right text-[11px] text-mute">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
