"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation"; // + useRouter
import { Button, Card, Input, Table, Tag, Modal, Form, DatePicker, message, Select, Popconfirm, Space, Divider, Typography, Progress } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
// import { FormOutlined, FileZipOutlined, CodeOutlined, FileExcelOutlined } from "@ant-design/icons"; // <-- kaldırıldı

// Küçük yardımcı: emoji'yi icon prop'unda kullan
const emojiIcon = (e: string) => (
  <span role="img" aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
    {e}
  </span>
);

type Row = Record<string, unknown>;
type RowPatch = Partial<Row>;
type FormValues = Record<string, string | number | Dayjs | null>; // <-- eklendi

const HIDE_KEYS = new Set([
  "tareksmasterid",
  "masterid",
  "MasterId",
  "MasterID",
  "beyannameid",
  "musteriid",
]);

interface MoneyItem {
  tareksparaistemeid: string;
  tareksmasterid: string;
  tutar: number | null;
  dovizkod: string | null;
  tip: number | null;
  kdvoran: number | null;
  tahakkukno: string | null;
  insuser: string | null;
  instime: string | null;
  upduser?: string | null;
  updtime?: string | null;
  tediyeistemeid?: string | null;
}

interface MoneyFormValues {
  tutar: number;
  dovizkod: string;
  tip?: number | null;
  kdvoran?: number | null;
  tahakkukno?: string | null;
}

type MasrafTur = { tip: number; kdvoran: number; adi: string }; // <-- eklendi

export default function KalemlerEditPage() {
  const params = useParams<{ masterId: string }>();
  const masterId = params?.masterId as string;
  const searchParams = useSearchParams();
  const router = useRouter(); // <-- eklendi

  // ref parametresi ve açılacak fill sayfası URL’i
  const refId = searchParams.get("ref") || "";
  const fillUrl = useMemo(() => {
    const qs = refId ? `?ref=${encodeURIComponent(refId)}` : "";
    return `/tareks/dosya/${encodeURIComponent(masterId)}/kalemler/fill${qs}`;
  }, [masterId, refId]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Arsiv modal state
  const [arsivOpen, setArsivOpen] = useState(false);
  const [arsivLoading, setArsivLoading] = useState(false);
  const [arsivRows, setArsivRows] = useState<Row[]>([]);
  const [arsivError, setArsivError] = useState<string | null>(null);
  const [arsivSelectedKeys, setArsivSelectedKeys] = useState<React.Key[]>([]);
  const [dlBusy, setDlBusy] = useState(false);
  const [dlDone, setDlDone] = useState(0);
  const [dlTotal, setDlTotal] = useState(0);
  const [zipBusy, setZipBusy] = useState(false);

  // simple column filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const applyFilter = useCallback((field: string, value: string) => {
    setColumnFilters((prev) => {
      const v = value.trim();
      const next = { ...prev };
      if (!v) delete next[field];
      else next[field] = v;
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // fetch detay rows by masterId
        const res = await fetch(`/api/tareks/detay?id=${encodeURIComponent(masterId)}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(data?.detail || data?.error || "Detay alınamadı");
        setRows((data?.rows as Row[]) ?? []);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [masterId]);

  // Robust beyannameid source: query -> rows[0]
  const beyannameId = useMemo(() => {
    const fromQS = (searchParams.get("beyannameid") || "").trim();
    if (fromQS) return fromQS;
    const src = (rows[0] as Row | undefined) || {};
    const v = src["beyannameid"] ?? src["BeyannameId"] ?? src["BEYANNAMEID"];
    return v ? String(v) : "";
  }, [searchParams, rows]);

  async function openArsivModal() {
    if (!beyannameId) {
      message.warning("Bu dosyada beyannameid bulunamadı");
      return;
    }
    setArsivOpen(true);
    setArsivError(null);
    setArsivLoading(true);
    try {
      const res = await fetch(`/api/tareks/arsiv/list?beyannameid=${encodeURIComponent(beyannameId)}&top=100`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.detail || "Arşiv listesi alınamadı");
      setArsivRows((data.rows as Row[]) || []);
      setArsivSelectedKeys([]);
    } catch (e) {
      setArsivError(e instanceof Error ? e.message : String(e));
    } finally {
      setArsivLoading(false);
    }
  }

  const downloadArsivItems = useCallback(async (items: Row[]) => {
    if (!beyannameId) {
      message.warning('BeyannameId yok');
      return;
    }
    setDlBusy(true);
    setDlDone(0);
    setDlTotal(items.length);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const arsivid = String(it['arsivid'] ?? '');
      if (!arsivid) continue;
      const url = `/api/tareks/arsiv/download?beyannameid=${encodeURIComponent(beyannameId)}&arsivid=${encodeURIComponent(arsivid)}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error((await res.text()) || 'İndirme hatası');
        const blob = await res.blob();
        const cd = res.headers.get('Content-Disposition') || '';
        const m = cd.match(/filename=\"?([^\";]+)\"?/i);
        const fn = m?.[1] || `${String(it['ad'] ?? 'arsiv')}.pdf`;
        const a = document.createElement('a');
        const href = URL.createObjectURL(blob);
        a.href = href;
        a.download = fn;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      } catch (e) {
        console.error('download error', e);
      }
      setDlDone((n) => n + 1);
    }
    setTimeout(() => { setDlBusy(false); }, 300);
  }, [beyannameId]);

  const filteredRows = useMemo(() => {
    const active = Object.entries(columnFilters).filter(([, v]) => v.trim());
    if (!active.length) return rows;
    return rows.filter((r) =>
      active.every(([k, v]) => {
        const src = r[k];
        if (src === undefined || src === null) return false;
        return String(src).toLowerCase().includes(v.toLowerCase());
      })
    );
  }, [rows, columnFilters]);

  const headerWithFilter = useCallback(
    (label: string, key: string, placeholder?: string) => (
      <div className="col-header">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <Input
          size="small"
          allowClear
          value={columnFilters[key] ?? ""}
          onChange={(e) => applyFilter(key, e.target.value)}
          placeholder={placeholder || "Filtrele"}
        />
      </div>
    ),
    [columnFilters, applyFilter]
  );

  // Sadece başlık (filtre yok) — yükseklik aynı olsun diye 24px spacer
  const headerOnly = useCallback(
    (label: string) => (
      <div className="col-header col-header--nofilter">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="col-header-spacer" />
      </div>
    ),
    []
  );

  // Tarih yardımcıları
  function isDateKey(key: string) {
    return /tarih|date/i.test(key);
  }
  function parseDate(val: unknown): Date | null {
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === "number") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === "string") {
      const s = val.trim();
      if (!s) return null;
      // ISO vb.
      const dIso = new Date(s);
      if (!isNaN(dIso.getTime())) return dIso;
      // dd.MM.yyyy | dd/MM/yyyy | dd-MM-yyyy
      const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
      if (m) {
        const dd = Number(m[1]), mm = Number(m[2]), yyyy = Number(m[3]);
        const d = new Date(yyyy, mm - 1, dd);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    return null;
  }
  function formatDDMMYYYY(d: Date) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // onEdit will be defined after 'form' is declared

  // columns will be defined after onEdit is available

  // Arama sayfasındaki renkler
  const durumColors: Record<string, string> = {
    "Başvuru Sonuçlandı": "green",
    "Koşullu Kabul": "green",
    "RED Denetleme Sonucu": "red",
    "Eksik Evrak - Hatalı Form": "red",
    "Form Oluşturuluyor": "gold",
    "Gümrük Müşaviri Kontrolü": "gold",
    "Ön İnceleme": "gold",
    "Muhasebe": "gold",
    "Tareks Müracaat": "gold",
    "Tareks Denetleme": "gold",
    "Denetim Sonucu Bekleniyor": "gold",
    "TSE Denetleme": "gold",
    "TSE Evrak Yükleme": "gold",
    "TSE Heyet Aşaması": "gold",
    "TSE Heyet Sonrası Teknik İnceleme": "gold",
    "TSE Ön İnceleme": "gold",
  };

  // Tüm satırlar üzerinde akıllı alan bulucu (metin alanlarına öncelik ver; boolean-like'ları yok say)
  function scanForValue(
    allRows: Row[],
    candidates: string[],
    opts?: { ignoreBooleanLike?: boolean }
  ): string {
    if (!allRows.length) return "";
    const cand = candidates.map((c) => c.toLowerCase());

    // 1) Önce tam eşleşme
    for (const c of cand) {
      for (const row of allRows) {
        const keys = Object.keys(row);
        for (const key of keys) {
          if (key.toLowerCase() === c) {
            const v = row[key];
            if (v !== null && v !== undefined) {
              const s = String(v).trim();
              const sl = s.toLowerCase();
              if (opts?.ignoreBooleanLike && (sl === "true" || sl === "false" || sl === "1" || sl === "0")) {
                continue;
              }
              if (sl !== "null" && sl !== "undefined" && s) return s;
            }
          }
        }
      }
    }

    // 2) Sonra kısmi eşleşme
    for (const row of allRows) {
      for (const key of Object.keys(row)) {
        const lk = key.toLowerCase();
        if (cand.some((c) => lk.includes(c))) {
          const v = row[key];
          if (v !== null && v !== undefined) {
            const s = String(v).trim();
            const sl = s.toLowerCase();
            if (opts?.ignoreBooleanLike && (sl === "true" || sl === "false" || sl === "1" || sl === "0")) {
              continue;
            }
            if (sl !== "null" && sl !== "undefined" && s) return s;
          }
        }
      }
    }
    return "";
  }

  // Üst bilgi alanları: önce querystring, sonra satırlardan tara
  const companyName = useMemo(() => {
    const fromQS = (searchParams.get("firma") ?? "").trim();
    if (fromQS) return fromQS;
    const v = scanForValue(
      rows,
      ["musteriad", "musteri", "firmaadi", "firmaad", "firma", "unvan"],
      { ignoreBooleanLike: true }
    );
    return v || "-";
  }, [rows, searchParams]);

  const durumName = useMemo(() => {
    const fromQS = (searchParams.get("durum") ?? "").trim();
    if (fromQS) return fromQS;
    // sadece gerçek durum alanlarını tara; boolean/statü türlerini alma
    const v = scanForValue(rows, ["durumad", "durumadi", "durum"], {
      ignoreBooleanLike: true,
    });
    return v || "-";
  }, [rows, searchParams]);

  const sube = useMemo(() => {
    const fromQS = (searchParams.get("sube") ?? "").trim();
    if (fromQS) return fromQS;
    const v = scanForValue(rows, ["subeadi", "sube", "branch"], {
      ignoreBooleanLike: true,
    });
    return v || "-";
  }, [rows, searchParams]);

  const belgeTur = useMemo(() => {
    const fromQS = (searchParams.get("belgetur") ?? "").trim();
    if (fromQS) return fromQS;
    const v = scanForValue(rows, ["belgeturad", "belgetur", "belgeturu"], {
      ignoreBooleanLike: true,
    });
    return v || "-";
  }, [rows, searchParams]);

  const yil = useMemo(() => {
    const fromQS = (searchParams.get("yil") ?? "").trim();
    if (fromQS) return fromQS;
    const v = scanForValue(rows, ["yil", "year"], { ignoreBooleanLike: true });
    return v || "-";
  }, [rows, searchParams]);

  function getRowKey(r: Row) {
    return String(
      r["referansno"] ?? r["refid"] ?? r["rowid"] ?? r["key"] ?? Math.random()
    );
  }

  // küçük bilgi öğesi (value artık ReactNode) – min-width küçültüld
  const InfoItem = ({
    label,
    value,
    strong = false,
  }: { label: string; value: React.ReactNode; strong?: boolean }) => (
    <div className="info-item">
      <div className="info-item-label">{label}</div>
      <div className="info-item-value" style={strong ? { fontWeight: 600 } : undefined}>
        {value}
      </div>
    </div>
  );

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>(); // <-- RowPatch yerine FormValues

  const onEdit = useCallback((row: Row) => {
    const key = getRowKey(row);
    setEditKey(key);
    const init: Partial<FormValues> = {};
    Object.entries(row as Record<string, unknown>).forEach(([k, v]) => {
      if (HIDE_KEYS.has(k)) return;
      if (isDateKey(k)) {
        const d = parseDate(v);
        init[k] = d ? dayjs(d) : null;
      } else {
        init[k] = (v as string | number | null) ?? null;
      }
    });
    form.setFieldsValue(init);
    setEditOpen(true);
  }, [form]);

  const columns = useMemo<ColumnsType<Row>>(() => {
    const keys = Array.from(
      rows.reduce<Set<string>>((set, r) => {
        Object.keys(r).forEach((k) => {
          if (!HIDE_KEYS.has(k)) set.add(k);
        });
        return set;
      }, new Set<string>())
    );

    const cols: ColumnsType<Row> = keys.map((k) => {
      const dateCol = isDateKey(k);
      return {
        title: headerWithFilter(k, k),
        dataIndex: k,
        key: k,
        render: (v: unknown) => {
          const d = parseDate(v);
          if (dateCol && d) return <span>{formatDDMMYYYY(d)}</span>;
          if (!dateCol && d && typeof v === "string") return <span>{formatDDMMYYYY(d)}</span>;
          return <span>{String(v ?? "")}</span>;
        },
      };
    });

    cols.push({
      title: headerOnly("İşlemler"),
      key: "actions",
      fixed: "right",
      width: 150,
      render: (_: unknown, record: Row) => (
        <Button size="small" onClick={() => onEdit(record)}>
          Düzenle
        </Button>
      ),
    });
    return cols;
  }, [rows, headerWithFilter, headerOnly, onEdit]);

  // Görünen kolon anahtarları (formu da aynı sırayla kurmak için)
  const visibleKeys = useMemo(() => {
    return Array.from(
      rows.reduce<Set<string>>((set, r) => {
        Object.keys(r).forEach((k) => {
          if (!HIDE_KEYS.has(k)) set.add(k);
        });
        return set;
      }, new Set<string>())
    );
  }, [rows]);

  function renderEditorForKey(key: string) {
    if (isDateKey(key)) {
      return <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />;
    }
    return <Input />;
  }

  // (moved below after form)

  async function handleSave() {
    try {
      const values = await form.validateFields(); // FormValues
      const payload: RowPatch = {};
      for (const [k, v] of Object.entries(values as FormValues)) {
        if (isDateKey(k)) {
          payload[k] = v ? (v as Dayjs).format("DD/MM/YYYY") : null;
        } else {
          payload[k] = v as unknown;
        }
      }
      setRows((prev) => prev.map((r) => (getRowKey(r) === editKey ? { ...r, ...payload } : r)));
      message.success("Kaydedildi");
      setEditOpen(false);
    } catch { /* no-op */ }
  }

  // +++ NEW: Excel export helper +++
  async function exportToExcel() {
    try {
      if (!filteredRows.length) {
        message.warning("İndirilecek veri yok");
        return;
      }

      message.loading({ key: "xlsx", content: "Excel hazırlanıyor..." });

      // Dynamic import – browser ESM build with proper typings
      const XLSX = (await import("xlsx/xlsx.mjs")).default;

      // Build data with only visible columns and formatted dates
      const headers = visibleKeys;
      const data = filteredRows.map((r) => {
        const o: Record<string, unknown> = {};
        for (const k of headers) {
          const val = r[k];
          const d = isDateKey(k) ? parseDate(val) : null;
          o[k] = d ? formatDDMMYYYY(d) : (val ?? "");
        }
        return o;
      });

      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detay");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fname = `Tareks_${masterId}_${new Date().toISOString().slice(0,10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      message.success({ key: "xlsx", content: "Excel indirildi" });
    } catch {
      message.error({ key: "xlsx", content: "Excel oluşturulamadı" });
      // Optional CSV fallback (no dependency)
      try {
        const headers = visibleKeys;
        const csv =
          headers.join(";") +
          "\n" +
          filteredRows
            .map((r) =>
              headers
                .map((k) => {
                  const v = r[k];
                  const d = isDateKey(k) ? parseDate(v) : null;
                  const cell = d ? formatDDMMYYYY(d) : (v ?? "");
                  const s = String(cell).replace(/"/g, '""');
                  return `"${s}"`;
                })
                .join(";")
            )
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tareks_${masterId}_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        message.info("Excel yerine CSV indirildi");
      } catch {
        // ignore
      }
    }
  }
  // +++ END NEW +++

  // İndirme butonları için örnek handler
  async function handleDownload(kind: "zip" | "xml" | "xlsx") {
    if (kind === "xlsx") {
      await exportToExcel();
      return;
    }
    if (kind === "xml") {
      try {
        message.loading({ content: "XML hazırlanıyor...", key: "xml" });

        const res = await fetch(`/api/tareks/xml?masterId=${encodeURIComponent(masterId)}`, { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || "XML indirilemedi");
        }
        const xmlText = await res.text();

        // Dosya adı: departman + referans (yoksa masterId)
        const depart = scanForValue(rows, ["departmankisakod", "departman", "departmanKisaKod"]) || "";
        const ref = scanForValue(rows, ["referansno", "refid", "ref"]) || masterId;
        const fileName = `TareksXML-${depart}${ref}.xml`;

        const blob = new Blob([xmlText], { type: "application/xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        message.success({ content: "XML indirildi", key: "xml" });
      } catch (err: unknown) {
        message.error({ content: err instanceof Error ? err.message : "XML oluşturulamadı", key: "xml" });
      }
      return;
    }

    try {
      message.loading({ content: "İndiriliyor...", key: "dl" });
      // TODO: gerçek endpoint ile değiştirin
  // const url = `/api/tareks/exports?masterId=${encodeURIComponent(masterId)}&format=${kind}`;
      // const res = await fetch(url); const blob = await res.blob(); saveAs(blob, `dosya.${kind}`);
      message.success({ content: "İndirme hazır (örnek).", key: "dl" });
    } catch {
      message.error({ content: "İndirme başarısız." });
    }
  }

  function handleFillLines() {
    // fill sayfasını aynı sekmede aç
    router.push(fillUrl);
  }

  // Yeni para iste handler
  const [moneyModalOpen, setMoneyModalOpen] = useState(false);
  const [moneyForm] = Form.useForm<MoneyFormValues>();
  const [moneyList, setMoneyList] = useState<MoneyItem[]>([]);
  const [moneyLoading, setMoneyLoading] = useState(false);
  const [moneySaving, setMoneySaving] = useState(false);
  const [moneyDeletingId, setMoneyDeletingId] = useState<string | null>(null);

  // Masraf tür listesi (Tip + KDV)  <-- eklendi
  const [masrafTur, setMasrafTur] = useState<MasrafTur[]>([]);
  const [masrafLoading, setMasrafLoading] = useState(false);

  function handleRequestMoney() {
    setMoneyModalOpen(true);
    if (moneyList.length === 0) void loadMoneyList();
    if (masrafTur.length === 0) void loadMasrafTur(); // <-- eklendi
  }

  async function loadMasrafTur() { // <-- eklendi
    setMasrafLoading(true);
    try {
      const res = await fetch('/api/para-isteme/masraf-tur', { cache: 'no-store' });
      const data: { success?: boolean; data?: { kdvoran: number; tarekskayittip: number; adi: string }[]; error?: string } =
        await res.json();
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Masraf türleri alınamadı');
      }
      const mapped: MasrafTur[] = data.data.map(r => ({
        tip: r.tarekskayittip,
        kdvoran: Number(r.kdvoran),
        adi: r.adi
      }));
      setMasrafTur(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg);
    } finally {
      setMasrafLoading(false);
    }
  }

  async function loadMoneyList() {
    if (!masterId) return;
    setMoneyLoading(true);
    try {
      const res = await fetch(`/api/para-isteme?masterId=${masterId}`);
      const data: { success?: boolean; data?: MoneyItem[]; error?: string } = await res.json();
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Para isteme listesi alınamadı');
      }
      // Tarihi string’e çevir
      const mapped = data.data.map(d => ({
        ...d,
        instime: d.instime ? new Date(d.instime).toLocaleString('tr-TR') : null,
        updtime: d.updtime ? new Date(d.updtime).toLocaleString('tr-TR') : null
      }));
      setMoneyList(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg);
    } finally {
      setMoneyLoading(false);
    }
  }

  async function submitMoneyForm() {
    try {
      const values = await moneyForm.validateFields();
      setMoneySaving(true);
      const insuser =
        localStorage.getItem('insuser') ||
        (() => {
          try {
            const u = JSON.parse(sessionStorage.getItem('user') || '{}');
            return u?.username || 'web';
          } catch { return 'web'; }
        })();

      const res = await fetch('/api/para-isteme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareksmasterid: masterId,
          tutar: Number(values.tutar),
          dovizkod: values.dovizkod,
          tip: values.tip ?? null,
          kdvoran: values.kdvoran ?? null,
          tahakkukno: values.tahakkukno || null,
          insuser
        })
      });
      const data: { success?: boolean; id?: string; error?: string } = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Kayıt başarısız');
      message.success('Para isteme kaydedildi');
      moneyForm.resetFields();
      await loadMoneyList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg);
    } finally {
      setMoneySaving(false);
    }
  }

  async function handleDeleteMoney(id: string) {
    setMoneyDeletingId(id);
    try {
      const res = await fetch(`/api/para-isteme/${id}`, { method: 'DELETE' });
      const data: { success?: boolean; error?: string } = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Silme başarısız');
      message.success('Silindi');
      setMoneyList(prev => prev.filter(m => m.tareksparaistemeid !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg);
    } finally {
      setMoneyDeletingId(null);
    }
  }

  // Para isteme tablo kolonları
  const moneyColumns: ColumnsType<MoneyItem> = [
    {
      title: "Tutar",
      dataIndex: "tutar",
      key: "tutar",
      render: (v: number | null, r) => (v != null ? `${v} ${r.dovizkod || ""}` : "")
    },
    { title: "Döviz", dataIndex: "dovizkod", key: "dovizkod" },
    { title: "Tip", dataIndex: "tip", key: "tip" },
    { title: "KDV Oran", dataIndex: "kdvoran", key: "kdvoran" },
    { title: "Tahakkuk No", dataIndex: "tahakkukno", key: "tahakkukno" },
    { title: "Kayıt Kullanıcı", dataIndex: "insuser", key: "insuser" },
    { title: "Kayıt Tarihi", dataIndex: "instime", key: "instime" },
    {
      title: "İşlem",
      key: "actions",
      render: (_value, row) => (
        <Popconfirm
          title="Silinsin mi?"
            okText="Evet"
            cancelText="Hayır"
          onConfirm={() => void handleDeleteMoney(row.tareksparaistemeid)}
        >
          <Button
            size="small"
            danger
            loading={moneyDeletingId === row.tareksparaistemeid}
          >
            Sil
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* üst butonlar: sola hizalı */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Geri butonu */}
        <Button size="small" icon={emojiIcon("⬅️")} onClick={() => router.back()}>
          Geri
        </Button>

        <Button
          type="primary"
          ghost
          size="small"
          icon={emojiIcon("📝")}
          onClick={handleFillLines}   // href kaldırıldı, aynı sekme
        >
          Kalemleri doldur
        </Button>

        <Button size="small" icon={emojiIcon("📦")} onClick={openArsivModal}>
          Arşiv indir
        </Button>
        <Button size="small" icon={emojiIcon("🧾")} onClick={() => handleDownload("xml")}>
          XML indir
        </Button>
        <Button size="small" icon={emojiIcon("📊")} onClick={() => handleDownload("xlsx")}>
          Excel indir
        </Button>

        {/* Yeni Para İste butonu */}
        <Button size="small" type="dashed" icon={emojiIcon("💰")} onClick={handleRequestMoney}>
          Para İste
        </Button>
      </div>

      {/* Üst bilgi: tek satır */}
      <Card
        size="small"
        bodyStyle={{ padding: 12 }}
        className="info-card"
      >
        <div className="info-strip">
          <InfoItem label="Firma" value={companyName} strong />
          <InfoItem
            label="Durum"
            value={<Tag color={durumColors[durumName] ?? "default"}>{durumName}</Tag>}
          />
            <InfoItem label="Şube" value={sube} />
            <InfoItem label="Belge Tür" value={belgeTur} />
            <InfoItem label="Yıl" value={yil} />
        </div>
      </Card>

      <Card size="small" title="Detay" bodyStyle={{ padding: 0 }}>
        <Table
          className="tareks-grid tareks-grid-singleline"
          size="small"
          loading={loading}
          dataSource={filteredRows.map((r) => ({ key: getRowKey(r), ...r }))}
          columns={columns}
          // scroll.y büyük boşluk oluşturuyorsa dinamik ver; satır adedi azsa kaldır
          scroll={filteredRows.length > 10 ? { x: "max-content", y: 520 } : { x: "max-content" }}
          pagination={{ pageSize: 50, showSizeChanger: false }}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        title="Kalem Düzenle"
        onCancel={() => setEditOpen(false)}
        onOk={handleSave}
        okText="Kaydet"
        cancelText="İptal"
        width={900}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleKeys.map((k) => (
              <Form.Item key={k} name={k} label={k}>
                {renderEditorForKey(k)}
              </Form.Item>
            ))}
          </div>
        </Form>
      </Modal>

      {/* Arşiv Modal */}
      <Modal
        open={arsivOpen}
        onCancel={() => setArsivOpen(false)}
        title="Arşiv"
        footer={null}
        width={820}
        destroyOnClose
      >
        {arsivError && <div className="text-danger">{arsivError}</div>}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>Arşiv Dosyaları</Typography.Title>
            <Typography.Text type="secondary">Seçili: {arsivSelectedKeys.length} / Toplam: {arsivRows.length}</Typography.Text>
          </div>
          <Space wrap>
            <Button size="small" onClick={() => setArsivSelectedKeys(arsivRows.map(r => String(r['arsivid']) ))} disabled={!arsivRows.length}>Tümünü seç</Button>
            <Button size="small" onClick={() => setArsivSelectedKeys([])} disabled={!arsivSelectedKeys.length}>Seçimi temizle</Button>
            <Divider type="vertical" />
            <Button size="small" disabled={!arsivSelectedKeys.length || dlBusy || zipBusy} onClick={async () => {
              const selected = arsivRows.filter(r => arsivSelectedKeys.includes(String(r['arsivid'])));
              await downloadArsivItems(selected);
            }}>Seçili PDF indir</Button>
            <Button size="small" disabled={!arsivRows.length || dlBusy || zipBusy} onClick={async () => {
              await downloadArsivItems(arsivRows);
            }}>Tümü PDF indir</Button>
            <Button size="small" type="primary" disabled={!arsivSelectedKeys.length || dlBusy || zipBusy}
              onClick={async () => {
                try {
                  setZipBusy(true);
                  const ids = arsivSelectedKeys.map(String).join(',');
                  const url = `/api/tareks/arsiv/zip?beyannameid=${encodeURIComponent(beyannameId)}&ids=${encodeURIComponent(ids)}`;
                  const res = await fetch(url);
                  if (!res.ok) { message.error('Zip oluşturulamadı'); return; }
                  const blob = await res.blob();
                  const a = document.createElement('a');
                  const href = URL.createObjectURL(blob);
                  a.href = href;
                  a.download = `arsiv_${beyannameId}.zip`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(href);
                } finally {
                  setZipBusy(false);
                }
              }}
            >Seçili ZIP</Button>
            <Button size="small" type="primary" disabled={!arsivRows.length || dlBusy || zipBusy}
              onClick={async () => {
                try {
                  setZipBusy(true);
                  const ids = arsivRows.map(r => String(r['arsivid'])).join(',');
                  const url = `/api/tareks/arsiv/zip?beyannameid=${encodeURIComponent(beyannameId)}&ids=${encodeURIComponent(ids)}`;
                  const res = await fetch(url);
                  if (!res.ok) { message.error('Zip oluşturulamadı'); return; }
                  const blob = await res.blob();
                  const a = document.createElement('a');
                  const href = URL.createObjectURL(blob);
                  a.href = href;
                  a.download = `arsiv_${beyannameId}.zip`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(href);
                } finally {
                  setZipBusy(false);
                }
              }}
            >Tümü ZIP</Button>
          </Space>
        </div>
        {(dlBusy || zipBusy) && (
          <div className="mb-3">
            {dlBusy ? (
              <div>
                <Typography.Text>PDF indiriliyor… {dlDone}/{dlTotal}</Typography.Text>
                <Progress percent={dlTotal ? Math.round((dlDone / dlTotal) * 100) : 0} size="small" />
              </div>
            ) : (
              <Typography.Text>ZIP hazırlanıyor…</Typography.Text>
            )}
          </div>
        )}
        <Table
          size="small"
          rowKey={(r) => String(r['arsivid'] ?? Math.random())}
          loading={arsivLoading}
          dataSource={arsivRows}
          pagination={{ pageSize: 10 }}
          scroll={{ y: 360, x: 'max-content' }}
          rowSelection={{
            selectedRowKeys: arsivSelectedKeys,
            onChange: (keys) => setArsivSelectedKeys(keys),
          }}
          columns={[
            { title: 'Ad', dataIndex: 'ad', key: 'ad' },
            { title: 'Tarih', key: 'tarih', sorter: (a: Row, b: Row) => new Date(String(a['guncellemetarih'] ?? a['kayitgiristarih'] ?? 0)).getTime() - new Date(String(b['guncellemetarih'] ?? b['kayitgiristarih'] ?? 0)).getTime(), render: (_: unknown, it: Row) => String(it['guncellemetarih'] ?? it['kayitgiristarih'] ?? '') },
            { title: 'İşlem', key: 'act', width: 120, render: (_: unknown, it: Row) => (
              <Button size="small" disabled={dlBusy || zipBusy} onClick={async () => { await downloadArsivItems([it]); }}>İndir</Button>
            )},
          ]}
        />
      </Modal>

      {/* Para İste Modal */}
      <Modal
        title="Para İste"
        open={moneyModalOpen}
        onCancel={() => setMoneyModalOpen(false)}
        onOk={submitMoneyForm}
        okText="Kaydet"
        cancelText="Vazgeç"
        confirmLoading={moneySaving}
        destroyOnClose={false}
        width={900}
      >
        <div className="money-form-wrapper">
          <Form
            form={moneyForm}
            layout="inline"
            initialValues={{ dovizkod: "TL" }}
            className="money-form-inline"
          >
            <Form.Item
              label="Tutar"
              name="tutar"
              rules={[{ required: true, message: "Tutar girin" }]}
            >
              <Input size="small" type="number" min={0} step="0.01" placeholder="Tutar" />
            </Form.Item>

            <Form.Item
              label="Döviz"
              name="dovizkod"
              rules={[{ required: true, message: "Döviz seçin" }]}
            >
              <Select
                size="small"
                style={{ minWidth: 90 }}
                options={[
                  { value: "TL", label: "TL" },
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                ]}
              />
            </Form.Item>

            {/* Tip: dinamik masraf türleri */}
            <Form.Item label="Tip" name="tip">
              <Select<number>
                size="small"
                placeholder={masrafLoading ? "Yükleniyor..." : "Tip"}
                loading={masrafLoading}
                style={{ minWidth: 180 }}
                showSearch
                optionFilterProp="label"
                options={masrafTur.map(m => ({
                  value: m.tip,
                  label: m.adi, // sadece isim göster
                }))}
                onChange={(val) => {
                  const found = masrafTur.find(x => x.tip === val);
                  if (found) moneyForm.setFieldsValue({ kdvoran: found.kdvoran });
                }}
              />
            </Form.Item>

            <Form.Item label="KDV Oran" name="kdvoran">
              <Input size="small" type="number" step="0.01" placeholder="KDV" />
            </Form.Item>

            <Form.Item label="Tahakkuk No" name="tahakkukno">
              <Input size="small" placeholder="Tahakkuk No" />
            </Form.Item>
          </Form>

          <Table
            style={{ marginTop: 12 }}
            size="small"
            bordered
            rowKey="tareksparaistemeid"
            dataSource={moneyList}
            columns={moneyColumns}
            loading={moneyLoading}
            pagination={{ pageSize: 5, size: "small" }}
            locale={{
              emptyText: moneyLoading ? "Yükleniyor..." : "Kayıt yok",
            }}
          />
          <div style={{ marginTop: 8, textAlign: "right" }}>
            <Button size="small" onClick={() => void loadMoneyList()}>
              Yenile
            </Button>
          </div>
        </div>
      </Modal>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* TEK GLOBAL STIL BLOĞU */}
      <style jsx global>{`
        /* Üst bilgi şeridi (geri yüklendi & tek satır) */
        .info-card {
          margin-bottom: 0;
        }
        .info-strip {
          display: flex;
          flex-wrap: nowrap;         /* tek satır */
          gap: 28px;
          align-items: flex-start;
          overflow: hidden;          /* taşan uzun firma adlarını kes */
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 110px;
        }
        .info-item-label {
          font-size: 11px;
          color: #64748b;
          line-height: 1;
          white-space: nowrap;
        }
        .info-item-value {
          font-size: 13px;
          line-height: 1.15;
          color: #1e293b;
          white-space: nowrap;
          font-weight: 500;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Tablo başlık + filtre */
        .col-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .col-header .ant-input {
          height: 30px;
          font-size: 12px;
        }
        .col-header-spacer {
          height: 30px;
          display: block;
        }
        .tareks-grid .ant-table-thead .ant-table-cell {
          vertical-align: bottom;
        }

        /* Tek satır body hücreleri */
        .tareks-grid-singleline .ant-table-tbody > tr > td {
          white-space: nowrap !important;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          padding: 4px 8px;
        }
      `}</style>
    </div>
  );
}
