"use client";

import "@/lib/antd-compat";
import { useCallback, useEffect, useState } from "react";
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

  const refresh = useCallback(async () => {
    if (!masterId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tareksbeyanname?masterId=${encodeURIComponent(masterId)}`);
      const data = await res.json();
      if (res.ok) setRows(data.rows || []);
      else setError(data.error || "Kayıtlar alınamadı");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("Sunucu hatası: " + msg);
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const columns: ColumnsType<Row> = [
    { title: "Tahakkuk No", dataIndex: "tahakkukno", key: "tahakkukno", width: 160 },
    { title: "Tutar", dataIndex: "tutar", key: "tutar", width: 120 },
    { title: "Döviz", dataIndex: "dovizkod", key: "dovizkod", width: 80 },
    { title: "Tip", dataIndex: "tip", key: "tip", width: 120 },
    { title: "KDV Oran", dataIndex: "kdvoran", key: "kdvoran", width: 100 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="min-w-[280px] flex-1">
          <label className="block text-sm font-medium text-slate-600 mb-1">Master ID</label>
          <Input value={masterId} onChange={(e) => setMasterId(e.target.value)} placeholder="Dosya masterId" />
        </div>
        <div className="flex-none">
          <Button type="primary" onClick={refresh} disabled={!masterId}>Yenile</Button>
        </div>
        <div className="flex-1" />
        <div className="flex-none">
          <Button type="primary" onClick={() => { form.resetFields(); setModalOpen(true); }} disabled={!masterId}>Yeni Kayıt</Button>
        </div>
        <div className="flex-none">
          <Button danger disabled={!selectedId} onClick={async () => {
            if (!selectedId) return;
            Modal.confirm({
              title: "Seçili kaydı sil?",
              onOk: async () => {
                try {
                  const res = await fetch(`/api/tareksbeyanname?id=${encodeURIComponent(selectedId)}`, { method: 'DELETE' });
                  const data = await res.json();
                  if (res.ok) { message.success("Silindi"); setSelectedId(null); refresh(); }
                  else message.error(data.error || "Silme başarısız");
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
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 20 }}
          onRow={(record) => ({ onClick: () => setSelectedId(String(record["paraistemeid"] ?? record["beyannameid"])) })}
          rowClassName={(rec) => (String(rec["paraistemeid"] ?? rec["beyannameid"]) === selectedId ? "bg-amber-50" : "")}
        />
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title="Yeni Para İsteme"
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
            else message.error(data.error || 'Kaydetme başarısız');
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
            <Form.Item label="Döviz" name="dovizkod">
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

