"use client";
import { useEffect, useState } from "react";
import { fmtDate, fmtGram, fmtLak } from "@/lib/format";
import { WithdrawRequest } from "@/lib/types";

export default function AdminWithdrawals() {
  const [list, setList] = useState<WithdrawRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetch("/api/admin/withdrawals").then((r) => r.json()).then(setList);
  useEffect(() => { load(); }, []);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    await fetch("/api/admin/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load();
    setBusy(null);
  }

  return (
    <div className="card divide-y divide-line">
      {list.length === 0 && <p className="p-5 text-mute text-sm">ไม่มีคำขอถอน</p>}
      {list.map((w) => (
        <div key={w.id} className="px-4 py-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <p className="text-sm font-semibold">{w.userName}</p>
            <p className="text-[11px] text-mute">
              {w.type === "gold" ? "ถอนทองคำจริง" : "ถอนเงินสด"} · {fmtDate(w.createdAt)}
            </p>
          </div>
          <div className="text-right min-w-[120px]">
            <p className="font-bold text-sm">
              {w.type === "gold" ? `${fmtGram(w.gram)} g` : `₭ ${fmtLak(w.lak)}`}
            </p>
            <p className="text-[11px] text-mute">ค่าธรรมเนียม ₭ {fmtLak(w.fee)}</p>
          </div>
          {w.status === "pending" ? (
            <div className="flex gap-2">
              <button
                onClick={() => decide(w.id, "approve")}
                disabled={busy === w.id}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-up/15 text-up border border-up/40 hover:bg-up/25 disabled:opacity-40"
              >
                อนุมัติ
              </button>
              <button
                onClick={() => decide(w.id, "reject")}
                disabled={busy === w.id}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-down/15 text-down border border-down/40 hover:bg-down/25 disabled:opacity-40"
              >
                ปฏิเสธ
              </button>
            </div>
          ) : (
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border
              ${w.status === "approved"
                ? "text-up border-up/40 bg-up/10"
                : "text-down border-down/40 bg-down/10"}`}>
              {w.status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธ"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
