"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Space, Tag, Table, Input, Tooltip, message } from "antd";
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
          const match = data.rows.find((r: Row) => String(r["tareksmasterid"] ?? r["masterid"] ?? "") === String(masterId))
            || data.rows[0] || null;
          setSearchRow(match);
        }
      } catch {
        // ignore
      }
    })();
    return () => { active = false; };
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

  function getRowKey(r: Row) {
    return String(
      (r["referansno"] as string | undefined) ||
        (r["refid"] as string | undefined) ||
        (r["key"] as string | undefined) ||
        Math.random()
    );
  }

  // Inline edit state (same deneyim: Kalemleri Düzenle)
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Row>({});

  const detailColumns = useMemo<ColumnsType<Row>>(() => {
    if (!detailRows || !detailRows[0]) return [];
    const hidden = new Set(["tareksmasterid", "beyannameid", "musteriid"]);
    const keySet = new Set<string>();
    for (const r of detailRows) {
      Object.keys(r).forEach((k) => { if (!hidden.has(k)) keySet.add(k); });
    }
    const keys = Array.from(keySet);
    const cols: ColumnsType<Row> = keys
      .filter((k) => !hidden.has(k))
      .map((k) => ({
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
      fixed: "right",
      width: 160,
      render: (_: unknown, record: Row) => {
        const rowKey = getRowKey(record);
        const editing = selectedKey === rowKey;
        return (
          <Space>
            {!editing ? (
              <Button size="small" onClick={() => { setSelectedKey(rowKey); setEditBuffer(record); }}>Düzenle</Button>
            ) : (
              <>
                <Tooltip title="Sunucu kaydetmesi için servis eklenecek">
                  <Button size="small" type="primary" onClick={() => { message.info("Kaydet servisi eklenecek (placeholder)"); setSelectedKey(null); }}>Kaydet</Button>
                </Tooltip>
                <Button size="small" onClick={() => setSelectedKey(null)}>İptal</Button>
              </>
            )}
          </Space>
        );
      },
    };
    cols.push(actionsCol);
    return cols;
  }, [detailRows, selectedKey, editBuffer]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Firma</div>
          <div className="font-semibold text-lg">{summary.firma || '-'}</div>
          <div className="text-xs text-slate-400 mt-1">Master ID: {String(masterId)}</div>
        </div>
        <Space wrap>
          <Link href={`/tareks/dosya/${encodeURIComponent(String(masterId))}/kalemler/fill${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`}>
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
        <div className="text-sm text-slate-500 mb-2">Kalemler üzerinde hızlı düzenleme yapabilirsiniz.</div>
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
    </div>
  );
}

