"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const TABS = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/settings", label: "ตั้งค่าราคา/ค่าธรรมเนียม" },
  { href: "/admin/withdrawals", label: "อนุมัติการถอน" },
  { href: "/admin/customers", label: "ลูกค้า" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json())
      .then((d) => setRole(d.user?.role ?? "customer"))
      .catch(() => setRole("customer"));
  }, []);

  if (role === null) {
    return <AppShell><p className="text-mute text-sm">...</p></AppShell>;
  }
  if (role !== "admin") {
    return (
      <AppShell>
        <div className="card p-8 text-center max-w-md mx-auto mt-10">
          <p className="text-3xl mb-3">🔒</p>
          <p className="font-bold mb-1">ສະເພາະຜູ້ດູແລລະບົບ</p>
          <p className="text-mute text-sm">บัญชีนี้ไม่มีสิทธิ์เข้าถึง Admin Panel</p>
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-extrabold">Admin Panel</h1>
        <span className="text-[10px] border border-gold/40 text-gold rounded-full px-2 py-0.5">
          ผู้ดูแลระบบ
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-semibold border transition
              ${path === tab.href
                ? "bg-gold text-black border-gold"
                : "text-mute border-line hover:text-white"}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </AppShell>
  );
}
