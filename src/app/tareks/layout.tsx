import Link from "next/link";
import type { ReactNode } from "react";

export default function TareksLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex h-screen">
        {/* make aside a column so we can pin the portal area to the bottom */}
        <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="text-lg font-semibold tracking-tight">Tareks Portal</div>
            <div className="text-xs text-slate-500">Hızlı erişim menüsü</div>
          </div>
          {/* nav grows and scrolls */}
          <nav className="p-3 space-y-1 overflow-auto flex-1">
            <Link href="/tareks" className="block rounded px-3 py-2 hover:bg-slate-100">🔎 Arama</Link>
            <Link href="/tareks/para-istem" className="block rounded px-3 py-2 hover:bg-slate-100">💳 Para İsteme</Link>
            <div className="pt-2 text-xs uppercase tracking-wide text-slate-400 px-3">Kalem İşlemleri</div>

            {/* sidebar-aux moved here so kalemler panel appears under "Kalem İşlemleri" and grows downward */}
            <div id="sidebar-aux" className="mt-2 overflow-auto" style={{ maxHeight: "60vh" }} />
          </nav>

          {/* optional footer / aux area */}
          <div className="p-3 border-t border-slate-100" />
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

