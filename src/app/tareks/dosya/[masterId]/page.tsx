"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Space, Tag, Table, Input, Tooltip, message, Modal, Typography } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";

type Row = Record<string, unknown>;

export default function DosyaDetayPage() {
  const params = useParams<{ masterId: string }>();
  const searchParams = useSearchParams();
  const masterId = params?.masterId;
  const ref = searchParams.get("ref") || undefined;
  const beyannameIdFromQuery = searchParams.get("beyannameid") || undefined;

  const [detailRows, setDetailRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchRow, setSearchRow] = useState<Row | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [arsivOpen, setArsivOpen] = useState(false);
  const [arsivLoading, setArsivLoading] = useState(false);
  const [arsivRows, setArsivRows] = useState<Row[]>([]);
  const [arsivError, setArsivError] = useState<string | null>(null);
  const [arsivSelectedKeys, setArsivSelectedKeys] = useState<React.Key[]>([]);
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        if (!masterId) return;
        const res = await fetch(`/api/tareksdetay?id=${encodeURIComponent(String(masterId))}`);
        const data = await res.json();
        if (!active) return;
        if (res.ok) setDetailRows((data.rows as Row[]) || []);
        else setError(data.error || "Detay alinamadi");
      } catch (e) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError("Sunucu hatasi: " + msg);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [masterId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!ref) return;
        const res = await fetch(`/api/tareksarama?limit=50&term=${encodeURIComponent(ref)}`);
        const data = await res.json();
        if (!active) return;
        if (res.ok && Array.isArray(data.rows)) {
          const match =
            data.rows.find(
              (r: Row) => String(r["tareksmasterid"] ?? r["masterid"] ?? "") === String(masterId)
            ) || data.rows[0] || null;
          setSearchRow(match);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [ref, masterId]);


  const summary = useMemo(() => {
    const source = (searchRow ?? detailRows[0]) as Row | undefined;
    const pick = (keys: string[]): string => {
      if (!source) return "-";
      for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null) {
          const text = String(value).trim();
          if (text.length) return text;
        }
      }
      return "-";
    };
    return {
      firma: pick(["musteriad", "firma", "firmaad", "firmaadi", "MUSTERIAD", "MUSTERAD", "FIRMA", "FIRMAAD", "FIRMAADI"]),
      durum: pick(["durum", "Durum", "DURUM"]),
      sube: pick(["subeadi", "sube", "SUBEADI", "SUBE"]),
      belge: pick(["belgeturad", "belge", "belgetur", "BELGETURAD", "BELGE"]),
      yil: pick(["yil", "YIL", "Yil"]),
      referans: pick(["referansno", "refid", "REFERANSNO", "REFID"]),
    };
  }, [searchRow, detailRows]);
  const displayRef = summary.referans !== "-" ? summary.referans : (ref ?? null);
  const applyFilter = useCallback((field: string, value: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (value.trim().length === 0) {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
  }, []);

  function getRowKey(r: Row) {
    return String(
      (r["referansno"] as string | undefined) ||
        (r["refid"] as string | undefined) ||
        (r["key"] as string | undefined) ||
        Math.random()
    );
  }

  const filteredDetailRows = useMemo(() => {
    const active = Object.entries(columnFilters).filter(([, value]) => value.trim().length > 0);
    if (!active.length) return detailRows;
    return detailRows.filter((row) =>
      active.every(([key, value]) => {
        const source = row[key];
        if (source === undefined || source === null) return false;
        return String(source).toLowerCase().includes(value.trim().toLowerCase());
      })
    );
  }, [detailRows, columnFilters]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Row>({});

  // Central beyannameId source: prefer query -> searchRow -> detailRows
  const beyannameId = useMemo(() => {
    const fromQuery = beyannameIdFromQuery;
    if (fromQuery && String(fromQuery).trim()) return String(fromQuery);
    const fromSearch = searchRow?.["beyannameid"] ?? searchRow?.["BeyannameId"] ?? searchRow?.["BEYANNAMEID"];
    if (fromSearch && String(fromSearch).trim()) return String(fromSearch);
    const src = (detailRows[0] as Row | undefined) || {};
    const fromDetail = src["beyannameid"] ?? src["BeyannameId"] ?? src["BEYANNAMEID"];
    if (fromDetail && String(fromDetail).trim()) return String(fromDetail);
    return "";
  }, [beyannameIdFromQuery, searchRow, detailRows]);

  // Helper: download a ZIP with given archive ids (or all)
  const downloadZip = useCallback(async (ids: string[]) => {
    if (!beyannameId) {
      message.warning('BeyannameId yok');
      return;
    }
    if (!ids.length) {
      message.warning('Seçili arşiv yok');
      return;
    }
    try {
      setZipBusy(true);
      const url = `/api/tareks/arsiv/zip?beyannameid=${encodeURIComponent(beyannameId)}&ids=${encodeURIComponent(ids.join(','))}`;
      const res = await fetch(url);
      if (!res.ok) { message.error('Arşiv hazırlanamadı'); return; }
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
  }, [beyannameId]);

  const headerWithFilter = useCallback(
    (label: string) => (
      <div className="col-header">
        <span>{label}</span>
        <Input
          size="small"
          allowClear
          value={columnFilters[label] ?? ""}
          onChange={(e) => applyFilter(label, e.target.value)}
        />
      </div>
    ),
    [columnFilters, applyFilter]
  );

  const detailColumns = useMemo<ColumnsType<Row>>(() => {
    if (!detailRows || !detailRows.length) return [];
    const hidden = new Set(["tareksmasterid", "beyannameid", "musteriid"]);
    const keySet = new Set<string>();
    for (const r of detailRows) {
      Object.keys(r).forEach((k) => {
        if (!hidden.has(k)) keySet.add(k);
      });
    }
    const keys = Array.from(keySet);
    const cols: ColumnsType<Row> = keys.map((k) => ({
      title: headerWithFilter(k),
      dataIndex: k,
      key: k,
      width: 160,
      render: (value: unknown, record: Row) => {
        const rowKey = getRowKey(record);
        const editing = selectedKey === rowKey;
        if (!editing) return <span>{String(value ?? "")}</span>;
        return (
          <Input
            size="small"
            value={String(
              (editBuffer[k] as string | number | undefined) ??
                (value as string | number | undefined) ??
                ""
            )}
            onChange={(e) => setEditBuffer((state) => ({ ...state, [k]: e.target.value }))}
          />
        );
      },
    })) as ColumnsType<Row>;

    const actionsCol: ColumnType<Row> = {
      title: "Islemler",
      key: "actions",
      fixed: "right",
      width: 160,
      render: (_: unknown, record: Row) => {
        const rowKey = getRowKey(record);
        const editing = selectedKey === rowKey;
        return (
          <Space>
            {!editing ? (
              <Button
                size="small"
                onClick={() => {
                  setSelectedKey(rowKey);
                  setEditBuffer(record);
                }}
              >
                Duzenle
              </Button>
            ) : (
              <>
                <Tooltip title="Sunucu kaydi icin servis eklenecek">
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      message.info("Kaydet servisi eklenecek (placeholder)");
                      setSelectedKey(null);
                    }}
                  >
                    Kaydet
                  </Button>
                </Tooltip>
                <Button size="small" onClick={() => setSelectedKey(null)}>
                  Iptal
                </Button>
              </>
            )}
          </Space>
        );
      },
    };
    cols.push(actionsCol);
    return cols;
  }, [detailRows, headerWithFilter, selectedKey, editBuffer]);

  async function openArsivModal() {
    const beyannameid = beyannameId;
    if (!beyannameid) {
      message.warning("Bu dosyada beyannameid bulunamadı");
      return;
    }
    setArsivOpen(true);
    setArsivError(null);
    setArsivLoading(true);
    try {
      const res = await fetch(`/api/tareks/arsiv/list?beyannameid=${encodeURIComponent(beyannameid)}&top=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.detail || "Arşiv listesi alınamadı");
      setArsivRows((data.rows as Row[]) || []);
    } catch (e) {
      setArsivError(e instanceof Error ? e.message : String(e));
    } finally {
      setArsivLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card
        size="small"
        loading={loading}
        bodyStyle={{ display: "grid", gap: 8 }}
        className="detail-summary-card"
      >
        <div className="detail-summary-header">
          <span className="detail-firma">{summary.firma || "-"}</span>
          <Space size={8} wrap>
            <span className="detail-meta">Master ID: {String(masterId)}</span>
            {displayRef ? <span className="detail-meta">Referans: {displayRef}</span> : null}
          </Space>
        </div>
        {error ? (
          <div className="text-danger">{error}</div>
        ) : (
          <div className="detail-summary-grid">
            <div>
              <span className="summary-label">Durum</span>
              <Tag color="blue">{summary.durum}</Tag>
            </div>
            <div>
              <span className="summary-label">Sube</span>
              <span className="summary-value">{summary.sube}</span>
            </div>
            <div>
              <span className="summary-label">Belge Tur</span>
              <span className="summary-value">{summary.belge}</span>
            </div>
            <div>
              <span className="summary-label">Yil</span>
              <span className="summary-value">{summary.yil}</span>
            </div>
          </div>
        )}
        <Space size={8} wrap>
          <Link
            href={`/tareks/dosya/${encodeURIComponent(String(masterId))}/kalemler/fill${
              ref ? `?ref=${encodeURIComponent(ref)}` : ""
            }`}
          >
            <Button size="small" type="primary">
              Kalemleri doldur
            </Button>
          </Link>
          <Button size="small" onClick={openArsivModal}>Arşiv indir</Button>
        </Space>
      </Card>

      <Card size="small" title="Detay">
        <div className="table-meta">Kalemler uzerinde hizli duzenleme yapabilirsiniz.</div>
        <div id="tareks-table-container" className="tareks-compact">
          <Table
            size="small"
            dataSource={filteredDetailRows.map((r) => ({ key: getRowKey(r), ...r }))}
            columns={detailColumns}
            scroll={{ x: "max-content" }}
            pagination={false}
            onRow={(record) => ({ onClick: () => setSelectedKey(record.key as string) })}
            rowClassName={(record) => (record.key === selectedKey ? "tareks-row-selected" : "")}
          />
        </div>
      </Card>

      <Modal
        open={arsivOpen}
        onCancel={() => setArsivOpen(false)}
        title="Arşiv"
        footer={null}
        width={820}
      >
        {arsivError && <div className="text-danger">{arsivError}</div>}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>Arşiv Dosyaları</Typography.Title>
            <Typography.Text type="secondary">Seçili: {arsivSelectedKeys.length} / Toplam: {arsivRows.length}</Typography.Text>
          </div>
          <Space wrap>
            <Button size="small" type="primary" disabled={!arsivSelectedKeys.length || zipBusy}
              onClick={async () => {
                const ids = arsivSelectedKeys.map(String);
                await downloadZip(ids);
              }}
            >Seçili indir</Button>
            <Button size="small" type="primary" disabled={!arsivRows.length || zipBusy}
              onClick={async () => {
                const ids = arsivRows.map(r => String(r['arsivid']));
                await downloadZip(ids);
              }}
            >Tümünü indir</Button>
          </Space>
        </div>
        {zipBusy && (<div className="mb-3"><Typography.Text>Arşiv hazırlanıyor…</Typography.Text></div>)}
        <Table
          size="small"
          rowKey={(r) => String(r['arsivid'] ?? Math.random())}
          loading={arsivLoading}
          dataSource={arsivRows}
          pagination={{ pageSize: 10 }}
          scroll={{ y: 360, x: 'max-content' }}
          rowSelection={{
            selectedRowKeys: arsivSelectedKeys,
            preserveSelectedRowKeys: true,
            onChange: (keys) => setArsivSelectedKeys(keys),
            onSelectAll: (selected) => {
              if (selected) {
                const allKeys = arsivRows.map(r => String(r['arsivid']));
                setArsivSelectedKeys(allKeys);
              } else {
                setArsivSelectedKeys([]);
              }
            },
          }}
          columns={[
            { title: 'Ad', dataIndex: 'ad', key: 'ad' },
            { title: 'Tarih', key: 'tarih', sorter: (a: Row, b: Row) => new Date(String(a['guncellemetarih'] ?? a['kayitgiristarih'] ?? 0)).getTime() - new Date(String(b['guncellemetarih'] ?? b['kayitgiristarih'] ?? 0)).getTime(), render: (_: unknown, it: Row) => String(it['guncellemetarih'] ?? it['kayitgiristarih'] ?? '') },
            { title: 'İşlem', key: 'act', width: 120, render: (_: unknown, it: Row) => (
              <Button size="small" disabled={zipBusy} onClick={async () => { const id = String(it['arsivid'] ?? ''); if (id) await downloadZip([id]); }}>İndir</Button>
            )},
          ]}
        />
      </Modal>
    </div>
  );
}
