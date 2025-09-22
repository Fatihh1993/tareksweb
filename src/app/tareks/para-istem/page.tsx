"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Select, Table, message, Modal, Form } from "antd";
import type { ColumnsType } from "antd/es/table";

type Row = Record<string, unknown>;

export default function ParaIstemPage() {
  const searchParams = useSearchParams();
  const [masterId, setMasterId] = useState<string>(searchParams.get("masterId") || "");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

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

  const filteredRows = useMemo(() => {
    const active = Object.entries(columnFilters).filter(([, value]) => value.trim().length > 0);
    if (!active.length) return rows;
    return rows.filter((row) =>
      active.every(([key, value]) => {
        const target = row[key];
        if (target === undefined || target === null) return false;
        return String(target).toLowerCase().includes(value.trim().toLowerCase());
      })
    );
  }, [rows, columnFilters]);

  const headerWithFilter = useCallback(
    (label: string, field: string) => (
      <div className="col-header">
        <span>{label}</span>
        <Input
          size="small"
          allowClear
          value={columnFilters[field] ?? ""}
          onChange={(e) => applyFilter(field, e.target.value)}
        />
      </div>
    ),
    [columnFilters, applyFilter]
  );

  const refresh = useCallback(async () => {
    if (!masterId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tareksbeyanname?masterId=${encodeURIComponent(masterId)}`);
      const data = await res.json();
      if (res.ok) setRows(data.rows || []);
      else setError(data.error || "Kayitlar alinamadi");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("Sunucu hatasi: " + msg);
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const columns = useMemo<ColumnsType<Row>>(() => [
    { title: headerWithFilter("Tahakkuk No", "tahakkukno"), dataIndex: "tahakkukno", key: "tahakkukno", width: 160 },
    { title: headerWithFilter("Tutar", "tutar"), dataIndex: "tutar", key: "tutar", width: 120 },
    { title: headerWithFilter("Doviz", "dovizkod"), dataIndex: "dovizkod", key: "dovizkod", width: 80 },
    { title: headerWithFilter("Tip", "tip"), dataIndex: "tip", key: "tip", width: 120 },
    { title: headerWithFilter("KDV Oran", "kdvoran"), dataIndex: "kdvoran", key: "kdvoran", width: 100 },
  ], [headerWithFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="min-w-[280px] flex-1">
          <label className="block text-sm text-slate-600 mb-1">Master ID</label>
          <Input value={masterId} onChange={(e) => setMasterId(e.target.value)} placeholder="Dosya masterId" />
        </div>
        <div className="flex-none">
          <Button type="primary" onClick={refresh} disabled={!masterId}>Yenile</Button>
        </div>
        <div className="flex-1" />
        <div className="flex-none">
          <Button type="primary" onClick={() => { form.resetFields(); setModalOpen(true); }} disabled={!masterId}>Yeni Kayit</Button>
        </div>
        <div className="flex-none">
          <Button danger disabled={!selectedId} onClick={async () => {
            if (!selectedId) return;
            Modal.confirm({
              title: "Secili kaydi sil?",
              onOk: async () => {
                try {
                  const res = await fetch(`/api/tareksbeyanname?id=${encodeURIComponent(selectedId)}`, { method: 'DELETE' });
                  const data = await res.json();
                  if (res.ok) { message.success("Silindi"); setSelectedId(null); refresh(); }
                  else message.error(data.error || "Silme basarisiz");
                } catch (e) { message.error(String(e)); }
              }
            });
          }}>Sil</Button>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="bg-white rounded border border-slate-200">
        <Table
          size="small"
          rowKey={(r) => String(r["paraistemeid"] ?? r["beyannameid"] ?? Math.random())}
          columns={columns}
          dataSource={filteredRows}
          loading={loading}
          pagination={{ pageSize: 20 }}
          onRow={(record) => ({ onClick: () => setSelectedId(String(record["paraistemeid"] ?? record["beyannameid"])) })}
          rowClassName={(rec) => (String(rec["paraistemeid"] ?? rec["beyannameid"]) === selectedId ? "tareks-row-selected" : "")}
        />
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title="Yeni para isteme"
        okText="Kaydet"
        onOk={async () => {
          try {
            const values = await form.validateFields();
            const body = {
              masterId,
              tutar: Number(values.tutar || 0),
              dovizkod: values.dovizkod || 'TL',
              tip: values.tip ?? null,
              kdvoran: values.kdvoran === '' ? null : Number(values.kdvoran),
              tahakkukno: values.tahakkukno || null,
            };
            const res = await fetch('/api/tareksbeyanname', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (res.ok) { message.success('Kaydedildi'); setModalOpen(false); refresh(); }
            else message.error(data.error || 'Kaydetme basarisiz');
          } catch (e) {
            if (e) message.error(String((e as Error).message || e));
          }
        }}
      >
        <Form layout="vertical" form={form} initialValues={{ dovizkod: 'TL' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item label="Tutar" name="tutar" rules={[{ required: true, message: 'Tutar gerekli' }]}>
              <Input type="number" min={0} step="0.01" />
            </Form.Item>
            <Form.Item label="Doviz" name="dovizkod">
              <Select options={[{ label: 'TL', value: 'TL' }, { label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }]} />
            </Form.Item>
            <Form.Item label="Tip" name="tip">
              <Input placeholder="Tip (opsiyonel)" />
            </Form.Item>
            <Form.Item label="KDV Oran" name="kdvoran">
              <Input type="number" min={0} max={100} step="0.01" />
            </Form.Item>
            <Form.Item label="Tahakkuk No" name="tahakkukno">
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

