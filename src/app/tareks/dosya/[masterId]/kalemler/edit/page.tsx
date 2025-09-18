"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input, Space, Table, Tooltip, message } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";

type Row = Record<string, unknown>;

export default function KalemlerEditPage() {
  const params = useParams<{ masterId: string }>();
  const masterId = params?.masterId as string;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Row>({});

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

  const columns = useMemo<ColumnsType<Row>>(() => {
    const hidden = new Set(["tareksmasterid", "beyannameid", "musteriid"]);
    const first = rows[0] || {};
    const keys = Object.keys(first).filter((k) => !hidden.has(k));
    const cols: ColumnsType<Row> = keys.map((k) => ({
      title: k,
      dataIndex: k,
      key: k,
      width: 160,
      render: (v: unknown, record: Row) => {
        const rowKey = getRowKey(record);
        const editing = selectedKey === rowKey;
        if (!editing) return <span>{String(v ?? "")}</span>;
        return (
          <Input
            size="small"
            value={String((editBuffer[k] as string | number | undefined) ?? (v as string | number | undefined) ?? "")}
            onChange={(e) => setEditBuffer((s) => ({ ...s, [k]: e.target.value }))}
          />
        );
      },
    })) as ColumnsType<Row>;
    const actionsCol: ColumnType<Row> = {
      title: "İşlemler",
      key: "actions",
      fixed: "right" as const,
      width: 160,
      render: (_: unknown, record: Row) => {
        const rowKey = getRowKey(record);
        const editing = selectedKey === rowKey;
        return (
          <Space>
            {!editing ? (
              <Button size="small" onClick={() => {
                setSelectedKey(rowKey);
                setEditBuffer(record);
              }}>Düzenle</Button>
            ) : (
              <>
                <Button size="small" type="primary" onClick={() => {
                  message.info("Kaydet servisi eklenecek (placeholder)");
                  setSelectedKey(null);
                }}>Kaydet</Button>
                <Button size="small" onClick={() => setSelectedKey(null)}>İptal</Button>
              </>
            )}
          </Space>
        );
      },
    };
    cols.push(actionsCol);
    return cols;
  }, [rows, selectedKey, editBuffer]);

  function getRowKey(r: Row) {
    return String(
      (r["referansno"] as string | undefined) ||
        (r["refid"] as string | undefined) ||
        (r["key"] as string | undefined) ||
        Math.random()
    );
  }

  const selectedRow = useMemo(() => rows.find((r) => getRowKey(r) === selectedKey) || null, [rows, selectedKey]);

  function toCSV(items: Row[]) {
    if (!items.length) return "";
    const headers = Object.keys(items[0]);
    const lines = [headers.join(",")];
    for (const it of items) {
      const line = headers.map((h) => {
        const raw = it[h];
        const s = raw === null || raw === undefined ? "" : String(raw);
        const needsQuote = s.includes(",") || s.includes("\n") || s.includes("\"");
        return needsQuote ? `"${s.replace(/\"/g, '""')}` + '"' : s;
      }).join(",");
      lines.push(line);
    }
    return lines.join("\n");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Master ID</div>
          <div className="font-semibold">{String(masterId)}</div>
        </div>
        <Space>
          <Tooltip title="Seçili satırdaki GTIP bilgisini kopyalar (alan adı: gtip)">
            <Button
              disabled={!selectedRow || !("gtip" in (selectedRow || {}))}
              onClick={() => {
                const val = String((selectedRow as Row)["gtip"] ?? "");
                navigator.clipboard.writeText(val);
                message.success("GTIP panoya kopyalandı");
              }}
            >GTIP Kopyala</Button>
          </Tooltip>
          <Button onClick={() => {
            const csv = toCSV(rows);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `kalemler-${masterId}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>Excel (CSV)</Button>
          <Button disabled>XML İndir</Button>
          <Button disabled>Arşiv İndir</Button>
        </Space>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="bg-white rounded border border-slate-200">
        <Table
          size="small"
          loading={loading}
          dataSource={rows.map((r) => ({ key: getRowKey(r), ...r }))}
          columns={columns}
          scroll={{ x: "max-content", y: 520 }}
          pagination={{ pageSize: 50 }}
          onRow={(record) => ({
            onClick: () => setSelectedKey(record.key as string),
          })}
          rowClassName={(rec) => (rec.key === selectedKey ? "bg-amber-50" : "")}
        />
      </div>
    </div>
  );
}
