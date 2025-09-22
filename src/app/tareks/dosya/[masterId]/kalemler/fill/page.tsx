"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import ReactDOM from "react-dom";

type Row = Record<string, unknown>;

export default function KalemlerFillPage() {
  const params = useParams<{ masterId: string }>();
  const searchParams = useSearchParams();
  const masterId = params?.masterId as string;
  const refId = searchParams.get("ref") || undefined;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState<string>('auto');
  const [iframeWidth, setIframeWidth] = useState<string>('auto');
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHRef = useRef(120);
  const [tableHeight, setTableHeight] = useState<number>(120);
  const [mode, setMode] = useState<'proxy' | 'direct'>('proxy');
  // try to auto-resize iframe if same-origin; otherwise keep natural/browser height
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentWindow?.document;
        if (!doc) return;
        const body = doc.body;
        const html = doc.documentElement;
        const h = Math.max(
          400,
          body?.scrollHeight || html?.scrollHeight || iframe.clientHeight || 400
        );
        setIframeHeight(`${h}px`);
      } catch {
        // cross-origin -> cannot measure content. leave iframe to default browser height (or previously set)
        // use viewport-based fallback so iframe can grow downwards instead of being clipped
        setIframeHeight('80vh');
      }
    };
    iframe.addEventListener('load', onLoad);
    return () => { iframe.removeEventListener('load', onLoad); };
  }, [iframeRef, mode, refId]);

  // keep iframe width responsive to viewport minus sidebar (w-64 => 16rem => 256px) and some padding
  useEffect(() => {
    const sidebarPx = 16 * 16; // tailwind w-64 = 16rem, 1rem ~= 16px => 256px
    const pagePadding = 48; // approximate container horizontal padding (adjust if your layout differs)
    const update = () => {
      const w = Math.max(300, window.innerWidth - sidebarPx - pagePadding);
      setIframeWidth(`${w}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/tareksdetay?id=${encodeURIComponent(String(masterId))}`);
        const data = await res.json();
        if (!active) return;
        if (res.ok) setRows((data.rows as Row[]) || []);
        else setError(data.error || "Detay alınamadı");
      } catch (e) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError("Sunucu hatası: " + msg);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [masterId]);

  const cols = useMemo<ColumnsType<Row>>(() => {
    const hidden = new Set(["tareksmasterid", "beyannameid", "musteriid"]);
    const first = rows[0] || {};
    const keys = Object.keys(first).filter((k) => !hidden.has(k)).slice(0, 10);
    const fillCol = {
      title: '',
      key: 'doldur',
      fixed: 'left' as const,
      width: 80,
      render: (_: unknown, record: Row) => {
        return (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setSelectedKey(getKey(record));
              tryFillInIframeFromRow(record);
            }}
          >
            Doldur
          </Button>
        );
      },
    };
    const dataCols = keys.map((k) => ({ title: k, dataIndex: k, key: k, width: 160 }));
    return [fillCol, ...dataCols] as ColumnsType<Row>;
  }, [rows]);

  function getKey(r: Row) {
    return String(
      (r["referansno"] as string | undefined) ||
        (r["refid"] as string | undefined) ||
        (r["key"] as string | undefined) ||
        Math.random()
    );
  }

  const selectedRow = useMemo(() => rows.find((r) => getKey(r) === selectedKey) || null, [rows, selectedKey]);

  const mapToForm = useCallback((row: Row) => {
    return {
      gtip: row["gtip"] ?? "",
      miktar: row["miktar"] ?? (row["Miktar"] as unknown) ?? "",
      birim: row["birim"] ?? (row["Birim"] as unknown) ?? "",
      mense: row["mense"] ?? row["Menşe"] ?? row["menseulke"] ?? "",
      aciklama: row["aciklama"] ?? row["malaciklama"] ?? "",
      referans: row["referansno"] ?? refId ?? "",
    } as Record<string, unknown>;
  }, [refId]);

  function tryFillInIframe(values?: Record<string, unknown>) {
    if (mode !== 'proxy') {
      message.warning('Doldurma sadece Proxy modunda mümkündür');
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return message.warning("Sayfa yüklenmedi");
    try {
      const doc = iframe.contentWindow.document;
      const vals = values || (selectedRow ? mapToForm(selectedRow) : {});
      const vo = vals as Record<string, unknown>;
      const setVal = (sel: string, val: unknown) => {
        const el = doc.querySelector(sel) as (HTMLInputElement | HTMLTextAreaElement | null);
        if (!el) return;
        if ("value" in el) {
          (el as HTMLInputElement | HTMLTextAreaElement).value = String(val ?? "");
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };
      // Best-effort: adjust selectors as needed on target page
      setVal('input[name="gtip"]', vo.gtip);
      setVal('input[name="miktar"]', vo.miktar);
      setVal('input[name="birim"]', vo.birim);
      setVal('input[name="mense"]', vo.mense);
      setVal('textarea[name="aciklama"]', vo.aciklama);
      message.success("Form değerleri iframe içine aktarıldı (deneysel)");
    } catch (e) {
      message.error("Iframe içine yazılamadı: " + (e as Error).message);
    }
  }

  function tryFillInIframeFromRow(row: Row | null) {
    if (!row) return message.warning("Lütfen bir kalem seçin");
    tryFillInIframe(mapToForm(row));
  }

  // prepare the kalemler panel JSX so it can be portaled into the sidebar
  const kalemPanel = (
    <div className="bg-white rounded border border-slate-200 p-2 tareks-compact">
      <div className="flex items-center justify-between p-2">
        <div className="text-sm text-slate-600">Kalemler</div>
        <div className="flex items-center gap-8">
          <div className="text-xs text-slate-400">Çift tıkla → satırı seç</div>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm px-2">{error}</div>}
      <div style={{ height: `${tableHeight}px`, overflow: 'hidden' }}>
        <Table
          size="small"
          loading={loading}
          columns={cols}
          dataSource={rows.map((r) => ({ key: getKey(r), ...r }))}
          pagination={false}
          scroll={{ x: "max-content", y: Math.max(32, tableHeight - 32) }}
          onRow={(record) => ({
            onClick: () => setSelectedKey(record.key as string),
          })}
          rowClassName={(rec) => (rec.key === selectedKey ? "bg-sky-100" : "")}
        />
      </div>
      <div
        onMouseDown={(e) => {
          draggingRef.current = true;
          startYRef.current = e.clientY;
          startHRef.current = tableHeight;
          const onMove = (ev: MouseEvent) => {
            if (!draggingRef.current) return;
            const dy = ev.clientY - startYRef.current;
            const next = Math.max(56, Math.min(420, startHRef.current + dy));
            setTableHeight(next);
          };
          const onUp = () => {
            draggingRef.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
        style={{ cursor: 'ns-resize', height: 6, marginTop: 4, background: '#e5e7eb', borderRadius: 3 }}
        title="Yüksekliği sürükleyerek ayarlayın"
      />
    </div>
  );

  // if sidebar-aux exists, portal the panel there; otherwise render it inline above web area
  const sidebarTarget = typeof window !== "undefined" ? document.getElementById("sidebar-aux") : null;

  // when rows or selectedKey change, ensure the sidebar target remains top-aligned
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = document.getElementById("sidebar-aux");
    if (!t) return;
    // keep panel scrolled to top so it stays under the header and grows downward
    const id = window.setTimeout(() => {
      t.scrollTop = 0;
    }, 0);
    return () => window.clearTimeout(id);
  }, [rows, selectedKey]);

  return (
    <div className="space-y-4">
      {/* render kalemler into sidebar if possible */}
      {sidebarTarget ? ReactDOM.createPortal(kalemPanel, sidebarTarget) : kalemPanel}

      {/* Right column: Web Sayfası (main content) */}
      <div className="bg-white rounded border border-slate-200 p-3" style={{ marginLeft: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Web Sayfası</div>
          <Button onClick={() => window.open("/api/proxy?url=" + encodeURIComponent("https://eortak.dtm.gov.tr/eortak/login/selectApplication.htm"), "_blank")}>
            Yeni Pencerede Aç
          </Button>
        </div>
        <div className="rounded overflow-hidden border" style={{ width: iframeWidth }}>
          <iframe
            ref={iframeRef}
            title="Proxy Web"
            src={"https://eortak.dtm.gov.tr/eortak/login/selectApplication.htm"}
            style={{ width: '100%', height: iframeHeight, border: 0, display: 'block' }}
          />
        </div>
        <div className="text-xs text-slate-500 mt-2">Not: Proksi ile yüklenen sayfaya basit alan doldurma yapılır. Gelişmiş doldurma için alan seçicileri hedef sayfaya göre güncellenmelidir.</div>
      </div>
    </div>
  );
}

