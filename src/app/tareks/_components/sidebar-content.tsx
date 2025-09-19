"use client";

import "@/lib/antd-compat";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Empty, Input, Modal, Space, Spin, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";

type Row = Record<string, unknown>;
type TableRow = Row & { __rowKey: string };

const hiddenKeys = new Set(["tareksmasterid", "masterid", "beyannameid", "musteriid", "key", "__rowkey"]);
const DEFAULT_VISIBLE = 6;
const MAX_VISIBLE = 12;

function formatHeading(raw: string) {
  const cleaned = raw.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  if (!cleaned) return raw;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function getRowKey(row: Row, index: number) {
  const candidates = ["referansno", "refid", "kalemid", "kalemno", "kalem_id", "id"];
  for (const key of candidates) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return `${String(value)}::${index}`;
    }
  }
  return `row-${index}`;
}

function compareValues(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  const sa = String(a ?? "").toLowerCase();
  const sb = String(b ?? "").toLowerCase();
  return sa.localeCompare(sb, "tr");
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function SidebarContent() {
  const pathname = usePathname();

  const masterId = useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/\/tareks\/dosya\/([^/]+)/i);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [pathname]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [revision, setRevision] = useState(0);

  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const perFileState = useRef<Record<string, { order: string[]; visible: string[] }>>({});

  useEffect(() => {
    if (!masterId) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/tareksdetay?id=${encodeURIComponent(masterId)}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Detay alınamadı");
        }
        setRows(Array.isArray(data.rows) ? (data.rows as Row[]) : []);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Sunucu hatası: ${msg}`);
        setRows([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [masterId, revision]);

  useEffect(() => {
    if (!masterId) {
      setColumnOrder([]);
      setVisibleColumns([]);
      return;
    }
    const stored = perFileState.current[masterId];
    if (stored) {
      setColumnOrder(stored.order);
      setVisibleColumns(stored.visible);
    } else {
      setColumnOrder([]);
      setVisibleColumns([]);
    }
  }, [masterId]);

  useEffect(() => {
    if (!masterId) return;
    perFileState.current[masterId] = {
      order: columnOrder,
      visible: visibleColumns,
    };
  }, [masterId, columnOrder, visibleColumns]);

  const allKeys = useMemo(() => {
    if (!rows.length) return [] as string[];
    const found: string[] = [];
    const seen = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        const lower = key.toLowerCase();
        if (hiddenKeys.has(lower)) return;
        if (seen.has(key)) return;
        seen.add(key);
        found.push(key);
      });
    });
    return found;
  }, [rows]);

  useEffect(() => {
    if (!masterId) return;
    if (!allKeys.length) {
      setColumnOrder([]);
      setVisibleColumns([]);
      return;
    }
    setColumnOrder((prev) => {
      if (!prev.length) return allKeys;
      const filtered = prev.filter((key) => allKeys.includes(key));
      const remaining = allKeys.filter((key) => !filtered.includes(key));
      const next = filtered.concat(remaining);
      return arraysEqual(prev, next) ? prev : next;
    });
    setVisibleColumns((prev) => {
      if (!prev.length) {
        return allKeys.slice(0, Math.min(DEFAULT_VISIBLE, allKeys.length));
      }
      const filtered = prev.filter((key) => allKeys.includes(key));
      const remaining = allKeys.filter((key) => !filtered.includes(key));
      const merged = filtered.concat(remaining).slice(0, MAX_VISIBLE);
      return arraysEqual(prev, merged) ? prev : merged;
    });
  }, [masterId, allKeys]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return rows;
    return rows.filter((row) => {
      return visibleColumns.some((key) => {
        const value = row[key];
        if (value === undefined || value === null || value === "") return false;
        return String(value).toLowerCase().includes(normalizedSearch);
      });
    });
  }, [rows, normalizedSearch, visibleColumns]);

  const tableRows = useMemo<TableRow[]>(() => {
    return filteredRows.map((row) => {
      const baseIndex = rows.indexOf(row);
      const index = baseIndex >= 0 ? baseIndex : 0;
      return { __rowKey: getRowKey(row, index), ...row };
    });
  }, [filteredRows, rows]);

  const columns = useMemo<ColumnsType<TableRow>>(() => {
    return visibleColumns.map((key) => ({
      title: formatHeading(key),
      dataIndex: key,
      key,
      width: 200,
      ellipsis: true,
      sorter: (a: TableRow, b: TableRow) => compareValues(a[key], b[key]),
      render: (value: unknown) => {
        const text = formatCellValue(value);
        if (!text) {
          return <span className="text-slate-400">-</span>;
        }
        return (
          <Tooltip title={text} placement="topLeft">
            <span style={{ display: "inline-block", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
          </Tooltip>
        );
      },
    }));
  }, [visibleColumns]);

  const [isModalOpen, setModalOpen] = useState(false);
  const [modalOrder, setModalOrder] = useState<string[]>([]);
  const [modalSelection, setModalSelection] = useState<string[]>([]);

  const openConfigurator = useCallback(() => {
    if (!allKeys.length) return;
    const baseOrder = columnOrder.length ? columnOrder : allKeys;
    const baseVisible = visibleColumns.length ? visibleColumns : baseOrder.slice(0, Math.min(DEFAULT_VISIBLE, baseOrder.length));
    setModalOrder(baseOrder);
    setModalSelection(baseVisible);
    setModalOpen(true);
  }, [allKeys, columnOrder, visibleColumns]);

  const moveModalColumn = useCallback((index: number, delta: number) => {
    setModalOrder((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  const toggleModalSelection = useCallback((key: string, checked: boolean) => {
    setModalSelection((prev) => {
      if (checked) {
        if (prev.includes(key)) return prev;
        const next = [...prev, key];
        return next.slice(0, MAX_VISIBLE);
      }
      return prev.filter((item) => item !== key);
    });
  }, []);

  const handleModalOk = useCallback(() => {
    const nextVisible = modalOrder.filter((key) => modalSelection.includes(key)).slice(0, MAX_VISIBLE);
    setColumnOrder(modalOrder);
    setVisibleColumns(nextVisible);
    setModalOpen(false);
  }, [modalOrder, modalSelection]);

  const handleModalReset = useCallback(() => {
    if (!allKeys.length) {
      setModalOrder([]);
      setModalSelection([]);
      return;
    }
    const defaultVisible = allKeys.slice(0, Math.min(DEFAULT_VISIBLE, allKeys.length));
    setModalOrder(allKeys);
    setModalSelection(defaultVisible);
  }, [allKeys]);

  const handleRefresh = useCallback(() => {
    if (!masterId) return;
    setRevision((rev) => rev + 1);
  }, [masterId]);

  const handleSelectAll = useCallback(() => {
    setModalSelection(modalOrder.slice(0, MAX_VISIBLE));
  }, [modalOrder]);

  const handleSelectNone = useCallback(() => {
    setModalSelection([]);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="text-lg font-semibold tracking-tight">Tareks Portal</div>
        <div className="text-xs text-slate-500">Hızlı erişim menüsü</div>
      </div>
      <nav className="space-y-1 border-b border-slate-100 p-3">
        <Link href="/tareks" className="block rounded px-3 py-2 hover:bg-slate-100">Arama</Link>
        <Link href="/tareks/para-istem" className="block rounded px-3 py-2 hover:bg-slate-100">Para İsteme</Link>
      </nav>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 text-xs uppercase tracking-wide text-slate-400">Kalem İşlemleri</div>
        {!masterId && (
          <div className="px-4 pb-6 text-sm text-slate-500">Dosya seçince görünecek.</div>
        )}
        {masterId && (
          <div className="px-4 pb-6">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-700">Dosya #{masterId}</div>
              <Space size="small">
                <Button size="small" onClick={openConfigurator} disabled={!allKeys.length}>Kolonları Düzenle</Button>
                <Button size="small" onClick={handleRefresh} disabled={loading}>Yenile</Button>
              </Space>
            </div>
            <div className="mt-3">
              <Input
                size="small"
                allowClear
                placeholder="Tabloda ara"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
            <div className="mt-3 rounded border border-slate-200 bg-white">
              {loading ? (
                <div className="flex h-40 items-center justify-center"><Spin size="small" /></div>
              ) : !tableRows.length ? (
                <div className="py-6"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Kalem bulunamadı" /></div>
              ) : (
                <Table<TableRow>
                  size="small"
                  rowKey="__rowKey"
                  dataSource={tableRows}
                  columns={columns}
                  pagination={false}
                  scroll={{ x: "max-content", y: 320 }}
                  showSorterTooltip={false}
                  sticky
                />
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onCancel={() => setModalOpen(false)}
        title="Kolonları Düzenle"
        okText="Kaydet"
        cancelText="İptal"
        onOk={handleModalOk}
        destroyOnClose
        footer={[
          <Button key="reset" onClick={handleModalReset} type="text">Varsayılana dön</Button>,
          <Button key="cancel" onClick={() => setModalOpen(false)}>İptal</Button>,
          <Button key="ok" type="primary" onClick={handleModalOk} disabled={!modalSelection.length}>Kaydet</Button>,
        ]}
      >
        {!modalOrder.length ? (
          <Empty description="Gösterilecek kolon yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>En fazla {MAX_VISIBLE} kolon seçebilirsiniz.</span>
              <Space size="small">
                <Button size="small" type="text" onClick={handleSelectAll}>Tümünü Seç</Button>
                <Button size="small" type="text" onClick={handleSelectNone}>Temizle</Button>
              </Space>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {modalOrder.map((key, index) => {
                const checked = modalSelection.includes(key);
                return (
                  <div key={key} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                    <Checkbox
                      checked={checked}
                      onChange={(e) => toggleModalSelection(key, e.target.checked)}
                      disabled={!checked && modalSelection.length >= MAX_VISIBLE}
                    >
                      {formatHeading(key)}
                    </Checkbox>
                    <Space size="small">
                      <Button size="small" disabled={index === 0} onClick={() => moveModalColumn(index, -1)}>Up</Button>
                      <Button size="small" disabled={index === modalOrder.length - 1} onClick={() => moveModalColumn(index, 1)}>Down</Button>
                    </Space>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
