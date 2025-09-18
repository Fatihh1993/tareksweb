import Link from "next/link";
import type { ReactNode } from "react";

export default function TareksLayout({ children }: { children: ReactNode }) {
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
            <div className="px-3 text-sm text-slate-500">Dosya seçince görünecek</div>
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

