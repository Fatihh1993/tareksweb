"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation"; // + useRouter
import { Button, Card, Input, Space, Table, Tag, Modal, Form, DatePicker, message } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";
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
    (label: string, key: string) => (
      <div className="col-header">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <Input
          size="small"
          allowClear
          value={columnFilters[key] ?? ""}
          onChange={(e) => applyFilter(key, e.target.value)}
        />
      </div>
    ),
    [columnFilters, applyFilter]
  );

  // Sadece başlık (filtre yok) — yükseklik aynı olsun diye 24px spacer
  const headerOnly = useCallback(
    (label: string) => (
      <div className="col-header">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div style={{ height: 24 }} />
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

  const columns = useMemo<ColumnsType<Row>>(() => {
    // discover keys from data and hide ID-like ones
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
        width: 180,
        render: (v: unknown) => {
          const d = parseDate(v);
          if (dateCol && d) return <span>{formatDDMMYYYY(d)}</span>;
          if (!dateCol && d && typeof v === "string") return <span>{formatDDMMYYYY(d)}</span>;
          return <span>{String(v ?? "")}</span>;
        },
      } as ColumnType<Row>;
    });

    const actionsCol: ColumnType<Row> = {
      title: headerOnly("İşlemler"),
      key: "actions",
      fixed: "right",
      width: 120,
      render: (_: unknown, record: Row) => (
        <Space>
          <Button size="small" onClick={() => onEdit(record)}>Düzenle</Button>
        </Space>
      ),
    };
    cols.push(actionsCol);
    return cols;
  }, [rows, headerWithFilter, headerOnly]);

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

  // küçük bilgi öğesi (value artık ReactNode)
  const InfoItem = ({
    label,
    value,
    strong = false,
  }: { label: string; value: React.ReactNode; strong?: boolean }) => (
    <div className="inline-flex flex-col gap-1 shrink-0 min-w-[200px]">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-800" style={strong ? { fontWeight: 700 } : undefined}>
        {value}
      </div>
    </div>
  );

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>(); // <-- RowPatch yerine FormValues

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

  function onEdit(row: Row) {
    const key = getRowKey(row);
    setEditKey(key);
    const init: Partial<FormValues> = {}; // <-- FormValues
    Object.entries(row as Record<string, unknown>).forEach(([k, v]) => {
      if (HIDE_KEYS.has(k)) return;
      if (isDateKey(k)) {
        const d = parseDate(v);
        init[k] = d ? dayjs(d) : null;
      } else {
        init[k] = (v as string | number | null) ?? null;
      }
    });
    form.setFieldsValue(init); // <-- artık hata yok
    setEditOpen(true);
  }

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

  // İndirme butonları için örnek handler
  async function handleDownload(kind: "zip" | "xml" | "xlsx") {
    try {
      message.loading({ content: "İndiriliyor...", key: "dl" });
      // TODO: gerçek endpoint ile değiştirin
      const url = `/api/tareks/exports?masterId=${encodeURIComponent(masterId)}&format=${kind}`;
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

        <Button size="small" icon={emojiIcon("📦")} onClick={() => handleDownload("zip")}>
          Arşiv indir
        </Button>
        <Button size="small" icon={emojiIcon("🧾")} onClick={() => handleDownload("xml")}>
          XML indir
        </Button>
        <Button size="small" icon={emojiIcon("📊")} onClick={() => handleDownload("xlsx")}>
          Excel indir
        </Button>
      </div>

      {/* Üst bilgi: tek satır */}
      <Card size="small" bodyStyle={{ padding: 16 }}>
        <div className="overflow-x-auto">
          <div className="flex items-start gap-8 whitespace-nowrap">
            <InfoItem label="Firma" value={companyName} strong />
            <InfoItem
              label="Durum"
              value={<Tag color={durumColors[durumName] ?? "default"}>{durumName}</Tag>}
            />
            <InfoItem label="Şube" value={sube} />
            <InfoItem label="Belge Tür" value={belgeTur} />
            <InfoItem label="Yıl" value={yil} />
          </div>
        </div>
      </Card>

      <Card size="small" title="Detay" bodyStyle={{ padding: 0 }}>
        <Table
          className="kalemler-nowrap"
          size="small"
          loading={loading}
          dataSource={filteredRows.map((r) => ({ key: getRowKey(r), ...r }))}
          columns={columns}
          scroll={{ x: "max-content", y: 520 }}
          pagination={{ pageSize: 50 }}
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

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Hücreleri tek satır yap */}
      <style jsx global>{`
        .kalemler-nowrap .ant-table-cell {
          white-space: nowrap !important;
        }
        /* Başlıkları üstten hizala */
        .kalemler-nowrap .ant-table-thead .ant-table-cell {
          vertical-align: top;
        }
      `}</style>
    </div>
  );
}
