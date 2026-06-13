"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n, TKey } from "@/lib/i18n";

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M3 12l9-9 9 9" /><path d="M5 10v10h5v-6h4v6h5V10" />
    </svg>
  ),
  trade: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M7 4v12M7 16l-3-3m3 3l3-3M17 20V8m0-4l3 3m-3-3l-3 3" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" />
    </svg>
  ),
  withdraw: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" /><path d="M4 21h16" />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  ),
};

const NAV: { href: string; key: TKey }[] = [
  { href: "/", key: "dashboard" },
  { href: "/trade", key: "trade" },
  { href: "/wallet", key: "wallet" },
  { href: "/withdraw", key: "withdraw" },
  { href: "/security", key: "security" },
  { href: "/admin", key: "admin" },
];

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex rounded-lg border border-line overflow-hidden text-xs font-semibold">
      {(["lo", "th"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1.5 ${lang === l ? "bg-gold text-black" : "text-mute hover:text-white"}`}
        >
          {l === "lo" ? "ລາວ" : "ไทย"}
        </button>
      ))}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => {
      if (r.status === 401) { router.replace("/login"); return null; }
      return r.json();
    }).then((d) => d && setMe(d.user)).catch(() => {});
  }, [router]);

  const nav = NAV.filter((n) => n.href !== "/admin" || me?.role === "admin");
  const iconKey = (href: string) => NAV.find((n) => n.href === href)?.key ?? "dashboard";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line p-5 sticky top-0 h-dvh">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <img src="/icon.svg" alt="" className="h-10 w-10 rounded-xl" />
          <div>
            <div className="font-extrabold text-lg gold-text leading-tight">GoldSave</div>
            <div className="text-[11px] text-mute -mt-0.5 tracking-widest">LAOS</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition
                  ${active ? "bg-gold/10 text-gold border border-gold/25" : "text-mute hover:text-white hover:bg-white/5 border border-transparent"}`}
              >
                {ICONS[n.key]}
                {t(n.key)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-6">
          {me && (
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <span className="h-8 w-8 rounded-full bg-gold/15 border border-gold/30 grid place-items-center text-gold text-xs font-bold">
                {me.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{me.name}</p>
                {me.role === "admin" && <p className="text-[9px] text-gold">ADMIN</p>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <LangToggle />
            <button onClick={logout} title={t("logout")}
              className="btn-ghost px-2.5 py-1.5 text-xs text-down">
              ⎋ {t("logout")}
            </button>
          </div>
          <p className="text-[10px] text-mute mt-4 leading-relaxed">
            © 2026 GoldSave Laos<br />Demo Mode — ບໍ່ແມ່ນເງິນຈິງ
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur-md bg-bg/80 border-b border-line">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-extrabold gold-text">GoldSave Laos</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <button onClick={logout} title={t("logout")} className="btn-ghost px-2 py-1.5 text-xs text-down">
            ⎋
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 lg:px-10 lg:py-8 pb-24 lg:pb-8 max-w-6xl w-full mx-auto">
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav className={`lg:hidden fixed bottom-0 inset-x-0 z-30 grid border-t border-line backdrop-blur-md bg-bg/90 ${nav.length === 6 ? "grid-cols-6" : "grid-cols-5"}`}>
        {nav.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-medium
                ${active ? "text-gold" : "text-mute"}`}
            >
              {ICONS[iconKey(n.href)]}
              {t(n.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
