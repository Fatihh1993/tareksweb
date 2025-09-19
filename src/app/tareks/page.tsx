"use client";

import "@/lib/antd-compat";
import React, { useMemo, useState } from "react";
import { Table, Input, Select, Button, Space, Tag, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";

type Row = Record<string, unknown>;

export default function TareksSearchPage() {
  const [term, setTerm] = useState("");
  const [durum, setDurum] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (term.trim()) params.set("term", term.trim());
      if (durum) params.set("durum", durum);
      const res = await fetch(`/api/tareksarama?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows || []);
      } else {
        setError(data.error || "Arama başarısız");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("Sunucu hatası: " + msg);
    } finally {
      setLoading(false);
    }
  }

  const columns = useMemo<ColumnsType<Row>>(() => {
    return [
      {
        title: "Firma",
        dataIndex: "musteriad",
        key: "musteriad",
        width: 260,
        render: (v: unknown) => <span className="font-medium text-slate-800">{String(v ?? "-")}</span>,
      },
      {
        title: "Referans No",
        dataIndex: "referansno",
        key: "referansno",
        width: 140,
        render: (v: unknown) => <code className="text-slate-700">{String(v ?? "-")}</code>,
      },
      {
        title: "Durum",
        dataIndex: "durum",
        key: "durum",
        width: 140,
        render: (v: unknown) => <Tag color="blue">{String(v ?? "-")}</Tag>,
      },
      {
        title: "Şube",
        dataIndex: "subeadi",
        key: "subeadi",
        width: 160,
      },
      {
        title: "Belge Tür",
        dataIndex: "belgeturad",
        key: "belgeturad",
        width: 140,
      },
      {
        title: "Yıl",
        dataIndex: "yil",
        key: "yil",
        width: 80,
      },
      {
        title: "İşlem",
        key: "actions",
        fixed: "right" as const,
        width: 160,
        render: (_: unknown, record: Row) => {
          const id = String(
            (record["tareksmasterid"] as string | undefined) ||
              (record["masterid"] as string | undefined) ||
              (record["TAREKSMASTERID"] as string | undefined) ||
              ""
          );
          const ref = String(
            (record["referansno"] as string | undefined) ||
              (record["refid"] as string | undefined) ||
              ""
          );
          const disabled = !id;
          return (
            <Space>
              <Tooltip title={disabled ? "Geçersiz kayıt" : "Dosyayı aç"}>
                <Button type="primary" size="small" disabled={disabled}
                  href={disabled ? undefined : `/tareks/dosya/${encodeURIComponent(id)}?ref=${encodeURIComponent(ref)}`}
                >
                  Dosyayı Aç
                </Button>
              </Tooltip>
            </Space>
          );
        },
      },
    ] as ColumnsType<Row>;
  }, []);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-sm font-medium text-slate-600 mb-1">Arama</label>
            <Input
              placeholder="Firma, referans, şube..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onPressEnter={onSearch}
              allowClear
            />
          </div>
          <div className="w-56">
            <label className="block text-sm font-medium text-slate-600 mb-1">Durum</label>
            <Select
              allowClear
              placeholder="Seçiniz"
              className="w-full"
              value={durum}
              onChange={(v) => setDurum(v)}
              options={[
                { label: "Tümü", value: undefined },
                { label: "Yeni", value: "Yeni" },
                { label: "Onaylı", value: "Onaylı" },
                { label: "Beklemede", value: "Beklemede" },
              ]}
            />
          </div>
          <div className="flex-none">
            <Button type="primary" onClick={onSearch} loading={loading}>
              Ara
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-600">{error}</div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-500">
            {loading ? "Aranıyor..." : `${rows.length} kayıt bulundu`}
          </div>
          <div className="text-sm text-slate-400">
            Çift tıklama ile de dosyayı açabilirsiniz.
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200">
          <Table
            size="small"
            loading={loading}
            scroll={{ x: "max-content" }}
            rowKey={(r) =>
              String(
                (r["referansno"] as string | undefined) ||
                  (r["tareksmasterid"] as string | undefined) ||
                  (r["masterid"] as string | undefined) ||
                  Math.random()
              )
            }
            dataSource={rows}
            columns={columns}
            pagination={{ pageSize: 25, showSizeChanger: true }}
            onRow={(record) => ({
              onDoubleClick: () => {
                const id = String(
                  (record["tareksmasterid"] as string | undefined) ||
                    (record["masterid"] as string | undefined) ||
                    ""
                );
                const ref = String((record["referansno"] as string | undefined) || "");
                if (!id) return message.warning("Geçerli bir kayıt seçilemedi");
                window.location.href = `/tareks/dosya/${encodeURIComponent(id)}?ref=${encodeURIComponent(ref)}`;
              },
            })}
          />
        </div>
      </section>
    </div>
  );
}

