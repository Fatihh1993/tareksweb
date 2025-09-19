"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Space, Tag, Table, Input, Tooltip, message, Modal, Checkbox } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";

type Row = Record<string, unknown>;

export default function DosyaOzetPage() {
  const params = useParams<{ masterId: string }>();
  const searchParams = useSearchParams();
  const masterId = params?.masterId;
  const ref = searchParams.get("ref") || undefined;

  const [detailRows, setDetailRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchRow, setSearchRow] = useState<Row | null>(null);

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

  // fetch a single summary row from search results (by referans)
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
    const s = searchRow || {};
    const firma = String((s as Row)["musteriad"] ?? "-");
    const durum = String((s as Row)["durum"] ?? "-");
    const sube = String((s as Row)["subeadi"] ?? "-");
    const belge = String((s as Row)["belgeturad"] ?? "-");
    const yil = String((s as Row)["yil"] ?? "-");
    return { firma, durum, sube, belge, yil };
  }, [searchRow]);

  // Inline edit state (same deneyim: Kalemleri Düzenle)
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Row>({});

  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [isConfigOpen, setConfigOpen] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draftSelection, setDraftSelection] = useState<string[]>([]);

  const hiddenKeys = useMemo(() => new Set(["tareksmasterid", "beyannameid", "musteriid"]), []);

  const availableColumnKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of detailRows) {
      Object.keys(row).forEach((key) => {
        if (!hiddenKeys.has(key)) keys.add(key);
      });
    }
    return Array.from(keys);
  }, [detailRows, hiddenKeys]);

  useEffect(() => {
    if (!availableColumnKeys.length) {
      setColumnOrder([]);
      setVisibleColumns([]);
      return;
    }
    setColumnOrder((prev) => {
      if (!prev.length) return availableColumnKeys;
      const filtered = prev.filter((key) => availableColumnKeys.includes(key));
      const appended = availableColumnKeys.filter((key) => !filtered.includes(key));
      const next = [...filtered, ...appended];
      return next.length === prev.length && next.every((k, i) => k === prev[i]) ? prev : next;
    });
    setVisibleColumns((prev) => {
      if (!prev.length) return availableColumnKeys;
      const filtered = prev.filter((key) => availableColumnKeys.includes(key));
      if (!filtered.length) return availableColumnKeys;
      return filtered.length === prev.length && filtered.every((k, i) => k === prev[i]) ? prev : filtered;
    });
  }, [availableColumnKeys]);

  const getRowKey = useCallback((r: Row) => {
    return String(
      (r["referansno"] as string | undefined) ||
        (r["refid"] as string | undefined) ||
        (r["key"] as string | undefined) ||
        Math.random()
    );
  }, []);

  const detailColumns = useMemo<ColumnsType<Row>>(() => {
    const activeKeys = columnOrder.filter((key) => visibleColumns.includes(key));
    if (!activeKeys.length) return [];
    const cols: ColumnsType<Row> = activeKeys.map((key) => ({
      title: key,
      dataIndex: key,
      key,
      width: 160,
      render: (value: unknown, record: Row) => {
        const rowKey = getRowKey(record);
        const editing = selectedKey === rowKey;
        if (!editing) return <span>{String(value ?? "")}</span>;
        return (
          <Input
            size="small"
            value={String(
              (editBuffer[key] as string | number | undefined) ??
                (value as string | number | undefined) ??
                ""
            )}
            onChange={(e) => setEditBuffer((state) => ({ ...state, [key]: e.target.value }))}
          />
        );
      },
    })) as ColumnsType<Row>;

    const actionsCol: ColumnType<Row> = {
      title: "İşlemler",
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
                Düzenle
              </Button>
            ) : (
              <>
                <Tooltip title="Sunucu kaydetmesi için servis eklenecek">
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
                  İptal
                </Button>
              </>
            )}
          </Space>
        );
      },
    };
    cols.push(actionsCol);
    return cols;
  }, [columnOrder, visibleColumns, selectedKey, editBuffer, getRowKey]);

  function openColumnConfig() {
    if (!availableColumnKeys.length) return;
    setDraftOrder(columnOrder.length ? [...columnOrder] : [...availableColumnKeys]);
    setDraftSelection(visibleColumns.length ? [...visibleColumns] : [...availableColumnKeys]);
    setConfigOpen(true);
  }

  function moveDraft(key: string, offset: number) {
    setDraftOrder((prev) => {
      const index = prev.indexOf(key);
      if (index === -1) return prev;
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      next.splice(index, 1);
      next.splice(nextIndex, 0, key);
      return next;
    });
  }

  function toggleDraftSelection(key: string, checked: boolean) {
    setDraftSelection((prev) => {
      if (checked) {
        if (prev.includes(key)) return prev;
        return [...prev, key];
      }
      return prev.filter((item) => item !== key);
    });
  }

  function handleConfigSave() {
    if (!draftSelection.length) {
      message.warning("En az bir alan seçmelisiniz.");
      return;
    }
    const orderedSelection = draftOrder.filter((key) => draftSelection.includes(key));
    setColumnOrder([...draftOrder]);
    setVisibleColumns([...orderedSelection]);
    setConfigOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Firma</div>
          <div className="font-semibold text-lg">{summary.firma || '-'}</div>
          <div className="text-xs text-slate-400 mt-1">Master ID: {String(masterId)}</div>
        </div>
        <Space wrap>
          <Link
            href={`/tareks/dosya/${encodeURIComponent(String(masterId))}/kalemler/fill${
              ref ? `?ref=${encodeURIComponent(ref)}` : ""
            }`}
          >
            <Button>Kalemlerle Doldur (Web)</Button>
          </Link>
          <Link href={`/tareks/para-istem?masterId=${encodeURIComponent(String(masterId))}`}>
            <Button>Para İsteme</Button>
          </Link>
        </Space>
      </div>

      <Card title="Dosya Özeti" loading={loading}>
        {error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Firma</div>
              <div className="font-medium">{summary.firma}</div>
            </div>
            <div>
              <div className="text-slate-500">Durum</div>
              <div>
                <Tag color="blue">{summary.durum}</Tag>
              </div>
            </div>
            <div>
              <div className="text-slate-500">Şube</div>
              <div className="font-medium">{summary.sube}</div>
            </div>
            <div>
              <div className="text-slate-500">Belge Tür</div>
              <div className="font-medium">{summary.belge}</div>
            </div>
            <div>
              <div className="text-slate-500">Yıl</div>
              <div className="font-medium">{summary.yil}</div>
            </div>
            <div>
              <div className="text-slate-500">Referans</div>
              <div className="font-medium">{ref || "-"}</div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Tareks Detay">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-2">
          <div className="text-sm text-slate-500">Kalemler üzerinde hızlı düzenleme yapabilirsiniz.</div>
          {visibleColumns.length > 0 && (
            <Space>
              <Button size="small" onClick={openColumnConfig}>
                Kolonları Özelleştir
              </Button>
            </Space>
          )}
        </div>
        <div className="bg-white rounded border border-slate-100">
          <Table
            size="small"
            dataSource={detailRows.map((r) => ({ key: getRowKey(r), ...r }))}
            columns={detailColumns}
            scroll={{ x: "max-content", y: 520 }}
            pagination={{ pageSize: 50, showSizeChanger: true }}
            onRow={(record) => ({ onClick: () => setSelectedKey(record.key as string) })}
            rowClassName={(rec) => (rec.key === selectedKey ? "bg-amber-50" : "")}
          />
        </div>
      </Card>

      <Modal
        open={isConfigOpen}
        title="Kolonları Özelleştir"
        okText="Kaydet"
        cancelText="Kapat"
        onCancel={() => setConfigOpen(false)}
        onOk={handleConfigSave}
      >
        <div className="space-y-2">
          {draftOrder.length ? (
            draftOrder.map((key, index) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded border border-slate-200 px-2 py-1"
              >
                <Checkbox
                  checked={draftSelection.includes(key)}
                  onChange={(e) => toggleDraftSelection(key, e.target.checked)}
                >
                  <span className="font-mono text-xs sm:text-sm">{key}</span>
                </Checkbox>
                <div className="flex items-center gap-1">
                  <Button size="small" onClick={() => moveDraft(key, -1)} disabled={index === 0}>
                    ↑
                  </Button>
                  <Button
                    size="small"
                    onClick={() => moveDraft(key, 1)}
                    disabled={index === draftOrder.length - 1}
                  >
                    ↓
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">Gösterilecek kolon bulunamadı.</div>
          )}
          {draftOrder.length ? (
            <div className="flex items-center justify-between pt-1">
              <Button type="link" size="small" onClick={() => setDraftSelection([...draftOrder])}>
                Tümünü Seç
              </Button>
              <Button type="link" size="small" onClick={() => setDraftSelection([])}>
                Tümünü Kaldır
              </Button>
            </div>
          ) : null}
          <div className="text-xs text-slate-500">Not: İşlemler alanı her zaman gösterilir.</div>
        </div>
      </Modal>
    </div>
  );
}
