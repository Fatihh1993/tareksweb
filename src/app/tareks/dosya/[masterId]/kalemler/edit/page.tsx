"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation"; // <-- eklendi
import { Button, Card, Input, Space, Table, Tag } from "antd"; // + Tag
import type { ColumnsType, ColumnType } from "antd/es/table";

type Row = Record<string, unknown>;

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
  const searchParams = useSearchParams(); // <-- eklendi

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

    const cols: ColumnsType<Row> = keys.map((k) => ({
      title: headerWithFilter(k, k),
      dataIndex: k,
      key: k,
      width: 180,
      render: (v: unknown) => <span>{String(v ?? "")}</span>,
    }));

    const actionsCol: ColumnType<Row> = {
      title: "İşlemler",
      key: "actions",
      fixed: "right",
      width: 120,
      render: () => (
        <Space>
          <Button size="small">Düzenle</Button>
        </Space>
      ),
    };
    cols.push(actionsCol);
    return cols;
  }, [rows, headerWithFilter]);

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

  return (
    <div className="space-y-4">
      {/* üst sağ buton */}
      <div className="flex justify-end">
        <Button type="primary">Kalemleri doldur</Button>
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
          size="small"
          loading={loading}
          dataSource={filteredRows.map((r) => ({ key: getRowKey(r), ...r }))}
          columns={columns}
          scroll={{ x: "max-content", y: 520 }}
          pagination={{ pageSize: 50 }}
        />
      </Card>

      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}
