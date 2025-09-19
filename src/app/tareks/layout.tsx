"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type DynamicLink = {
  href: string;
  path: string;
  label: string;
};

function navItemClass(active: boolean) {
  return [
    "block rounded px-3 py-2 text-sm transition",
    active ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-100",
  ].join(" ");
}

export default function TareksLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeRef, setActiveRef] = useState<string | null>(null);

  const activeMasterId = useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/\/tareks\/dosya\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [pathname]);

  const refParam = searchParams?.get("ref") ?? null;

  useEffect(() => {
    if (!activeMasterId) {
      setActiveRef(null);
      return;
    }
    const storageKey = `tareks:last-ref:${activeMasterId}`;
    if (refParam !== null) {
      setActiveRef(refParam);
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(storageKey, refParam);
        } catch {
          // ignore storage errors
        }
      }
      return;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = window.sessionStorage.getItem(storageKey);
        if (saved !== null) setActiveRef(saved);
      } catch {
        // ignore storage errors
      }
    }
  }, [activeMasterId, refParam]);

  const dynamicLinks = useMemo<DynamicLink[]>(() => {
    if (!activeMasterId) return [];
    const base = `/tareks/dosya/${encodeURIComponent(activeMasterId)}`;
    const query = activeRef ? `?ref=${encodeURIComponent(activeRef)}` : "";
    return [
      { href: `${base}${query}`, path: base, label: "Dosya Özeti" },
      { href: `${base}/kalemler/edit${query}`, path: `${base}/kalemler/edit`, label: "Kalemleri Düzenle" },
      { href: `${base}/kalemler/fill${query}`, path: `${base}/kalemler/fill`, label: "Kalemleri Web'e Doldur" },
    ];
  }, [activeMasterId, activeRef]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex h-screen">
        <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="text-lg font-semibold tracking-tight">Tareks Portal</div>
            <div className="text-xs text-slate-500">Hızlı erişim menüsü</div>
          </div>
          <nav className="p-3 space-y-1">
            <Link href="/tareks" className="block rounded px-3 py-2 hover:bg-slate-100">🔎 Arama</Link>
            <Link href="/tareks/para-istem" className="block rounded px-3 py-2 hover:bg-slate-100">💳 Para İsteme</Link>
            <div className="pt-2 text-xs uppercase tracking-wide text-slate-400 px-3">Kalem İşlemleri</div>
            {dynamicLinks.length ? (
              <div className="space-y-2">
                <div className="px-3 py-2 rounded border border-slate-100 bg-slate-50">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Aktif Dosya</div>
                  <div className="text-sm font-medium text-slate-800 break-all">{activeMasterId}</div>
                  {activeRef ? (
                    <div className="text-xs text-slate-500 mt-1">Referans: {activeRef}</div>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {dynamicLinks.map((link) => {
                    const isActive = pathname === link.path || pathname.startsWith(`${link.path}/`);
                    return (
                      <Link key={link.path} href={link.href} className={navItemClass(isActive)}>
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="px-3 text-sm text-slate-500">Dosya seçince görünecek</div>
            )}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
              <div className="font-medium">Tareks</div>
              <div className="text-sm text-slate-500">Kullanıcı arayüzü yenilendi</div>
            </div>
          </header>
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

