"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

type Row = Record<string, unknown>;

const durumColors: Record<string, string> = {
  // ✅ Olumlu (yeşil)
  "Başvuru Sonuçlandı": "green",
  "Koşullu Kabul": "green",

  // ❌ Olumsuz (kırmızı)
  "RED Denetleme Sonucu": "red",
  "Eksik Evrak - Hatalı Form": "red",

  // ⏳ Bekleyen (sarı tonları)
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

function getMasterId(r: Row) {
  return (
    (r["tareksmasterid"] as string) ??
    (r["masterid"] as string) ??
    (r["MasterId"] as string) ??
    (r["MasterID"] as string) ??
    ""
  );
}

function getRef(r: Row) {
  return (
    (r["referansno"] as string) ??
    (r["refid"] as string) ??
    (r["RefId"] as string) ??
    ""
  );
}

export default function TareksListPage() {
  const [term, setTerm] = useState("");
  const [durum, setDurum] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const applyFilter = useCallback((key: string, value: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      const v = value.trim();
      if (!v) delete next[key];
      else next[key] = v;
      return next;
    });
  }, []);

  async function onSearch() {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (term.trim()) params.set("term", term.trim());
      if (durum) params.set("durum", durum);
      const res = await fetch(`/api/tareks/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "Liste alınamadı");
      setRows((data.rows as Row[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const active = Object.entries(columnFilters).filter(([, v]) => v.trim().length > 0);
    if (!active.length) return rows;
    return rows.filter((row) =>
      active.every(([key, value]) => {
        const src = row[key];
        if (src === undefined || src === null) return false;
        return String(src).toLowerCase().includes(value.toLowerCase());
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
          placeholder={placeholder}
        />
      </div>
    ),
    [columnFilters, applyFilter]
  );

  // Filtre olmayan başlık (Yıl ile aynı stil ve yükseklik)
  const headerOnly = useCallback(
    (label: string) => (
      <div className="col-header">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div style={{ height: 24 }} />
      </div>
    ),
    []
  );

  const columns = useMemo<ColumnsType<Row>>(() => {
    return [
      {
        title: headerWithFilter("Firma", "musteriad", "Filtrele"),
        dataIndex: "musteriad",
        key: "musteriad",
        width: 280,
        render: (v: unknown) => <span className="font-medium">{String(v ?? "")}</span>,
      },
      {
        title: headerWithFilter("Referans No", "referansno"),
        dataIndex: "referansno",
        key: "referansno",
        width: 120,
        render: (v: unknown) => <span>{String(v ?? "")}</span>,
      },
      {
        title: headerWithFilter("Durum", "durum"),
        dataIndex: "durum",
        key: "durum",
        width: 180,
        render: (v: unknown) => {
          const text = String(v ?? "");
          const color = durumColors[text] || "default";
          return <Tag color={color}>{text}</Tag>;
        },
      },
      {
        title: headerWithFilter("Şube", "subeadi"),
        dataIndex: "subeadi",
        key: "subeadi",
        width: 160,
      },
      {
        title: headerWithFilter("Belge Tür", "belgeturad"),
        dataIndex: "belgeturad",
        key: "belgeturad",
        width: 160,
      },
      {
        title: headerWithFilter("Yıl", "yil"),
        dataIndex: "yil",
        key: "yil",
        width: 80,
      },
      {
        title: headerOnly("İşlem"),
        key: "actions",
        fixed: "right",
        width: 150,
        render: (_: unknown, record: Row) => {
          const id = getMasterId(record);
          const ref = getRef(record);
          const beyannameid = String(record["beyannameid"] ?? record["BeyannameId"] ?? "");
          const disabled = !id;

          // Üst bilgi alanlarını URL’e ekle (detay sayfasında yedek olarak kullanılıyor)
          const firma = encodeURIComponent(String(record["musteriad"] ?? ""));
          const d = encodeURIComponent(String(record["durum"] ?? ""));
          const sube = encodeURIComponent(String(record["subeadi"] ?? ""));
          const belgetur = encodeURIComponent(String(record["belgeturad"] ?? ""));
          const yil = encodeURIComponent(String(record["yil"] ?? ""));

          const href = disabled
            ? undefined
            : `/tareks/dosya/${encodeURIComponent(id)}/kalemler/edit?ref=${encodeURIComponent(ref || "")}&firma=${firma}&durum=${d}&sube=${sube}&belgetur=${belgetur}&yil=${yil}${beyannameid ? `&beyannameid=${encodeURIComponent(beyannameid)}` : ""}`;

          return (
            <Button type="link" disabled={disabled} href={href}>
              Dosyayı Aç
            </Button>
          );
        },
      },
    ];
  }, [headerWithFilter, headerOnly]);

  return (
    <div className="space-y-4">
      <Card title="Tareks Listesi" size="small">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7">
            <div className="text-xs text-slate-500 mb-1">Arama metni</div>
            <Input
              placeholder="Firma, referans, şube..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onPressEnter={onSearch}
            />
          </div>
          <div className="md:col-span-3">
            <div className="text-xs text-slate-500 mb-1">Durum</div>
            <Select
              allowClear
              className="w-full"
              placeholder="Seçiniz"
              value={durum}
              onChange={(v) => setDurum(v)}
              options={Object.keys(durumColors).map((d) => ({ value: d, label: d }))}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button type="primary" onClick={onSearch} block>
              Listele
            </Button>
          </div>
        </div>
      </Card>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <Table
        size="middle"
        rowKey={(r) => String(r["referansno"] ?? r["tareksmasterid"] ?? r["key"] ?? Math.random())}
        loading={loading}
        dataSource={filteredRows}
        columns={columns}
        pagination={{ pageSize: 50 }}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
