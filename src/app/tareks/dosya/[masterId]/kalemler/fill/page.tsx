"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button, Form, Input, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";

type Row = Record<string, unknown>;

export default function KalemlerFillPage() {
  const params = useParams<{ masterId: string }>();
  const searchParams = useSearchParams();
  const masterId = params?.masterId as string;
  const refId = searchParams.get("ref") || undefined;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [form] = Form.useForm();

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

  const cols = useMemo<ColumnsType<Row>>(() => {
    const hidden = new Set(["tareksmasterid", "beyannameid", "musteriid"]);
    const first = rows[0] || {};
    return Object.keys(first)
      .filter((k) => !hidden.has(k))
      .slice(0, 10) // show top 10 for compact grid
      .map((k) => ({ title: k, dataIndex: k, key: k, width: 160 })) as ColumnsType<Row>;
  }, [rows]);

  function getKey(r: Row) {
    return String(
      (r["referansno"] as string | undefined) ||
        (r["refid"] as string | undefined) ||
        (r["key"] as string | undefined) ||
        Math.random()
    );
  }

  const selectedRow = useMemo(() => rows.find((r) => getKey(r) === selectedKey) || null, [rows, selectedKey]);

  const mapToForm = useCallback((row: Row) => {
    return {
      gtip: row["gtip"] ?? "",
      miktar: row["miktar"] ?? (row["Miktar"] as unknown) ?? "",
      birim: row["birim"] ?? (row["Birim"] as unknown) ?? "",
      mense: row["mense"] ?? row["Menşe"] ?? row["menseulke"] ?? "",
      aciklama: row["aciklama"] ?? row["malaciklama"] ?? "",
      referans: row["referansno"] ?? refId ?? "",
    } as Record<string, unknown>;
  }, [refId]);

  useEffect(() => {
    if (selectedRow) {
      form.setFieldsValue(mapToForm(selectedRow));
    }
  }, [selectedRow, form, mapToForm]);

  function tryFillInIframe() {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return message.warning("Sayfa yüklenmedi");
    try {
      const doc = iframe.contentWindow.document;
      const values = form.getFieldsValue();
      const setVal = (sel: string, val: unknown) => {
        const el = doc.querySelector(sel) as (HTMLInputElement | HTMLTextAreaElement | null);
        if (!el) return;
        if ("value" in el) {
          (el as HTMLInputElement | HTMLTextAreaElement).value = String(val ?? "");
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };
      // Best-effort: adjust selectors as needed on target page
      setVal('input[name="gtip"]', values.gtip);
      setVal('input[name="miktar"]', values.miktar);
      setVal('input[name="birim"]', values.birim);
      setVal('input[name="mense"]', values.mense);
      setVal('textarea[name="aciklama"]', values.aciklama);
      message.success("Form değerleri iframe içine aktarıldı (deneysel)");
    } catch (e) {
      message.error("Iframe içine yazılamadı: " + (e as Error).message);
    }
  }

  function tryFillInIframeFromRow(row: Row | null) {
    if (!row) return message.warning("Lütfen bir kalem seçin");
    form.setFieldsValue(mapToForm(row));
    tryFillInIframe();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 p-2">
        <div className="flex items-center justify-between p-2">
          <div className="text-sm text-slate-600">Kalemler</div>
          <div className="flex items-center gap-8">
            <div className="text-xs text-slate-400">Çift tıkla → satırı seç</div>
            <Space>
              <Button type="primary" onClick={() => {
                if (!selectedRow) return message.warning("Lütfen bir kalem seçin");
                form.setFieldsValue(mapToForm(selectedRow));
                message.success("Seçili satır form alanlarına aktarıldı");
              }}>Seçili Satırı Forma Al</Button>
              <Button onClick={() => tryFillInIframeFromRow(selectedRow)}>Seçili Satırı Webe Doldur</Button>
            </Space>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm px-2">{error}</div>}
        <Table
          size="small"
          loading={loading}
          columns={cols}
          dataSource={rows.map((r) => ({ key: getKey(r), ...r }))}
          pagination={{ pageSize: 30 }}
          scroll={{ x: "max-content", y: 360 }}
          onRow={(record) => ({
            onDoubleClick: () => setSelectedKey(record.key as string),
          })}
          rowClassName={(rec) => (rec.key === selectedKey ? "bg-amber-50" : "")}
        />
      </div>

      <div className="bg-white rounded border border-slate-200 p-3">
        <div className="font-medium mb-2">Form (Gerekirse düzenleyin)</div>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Form.Item label="GTIP" name="gtip"><Input /></Form.Item>
            <Form.Item label="Miktar" name="miktar"><Input /></Form.Item>
            <Form.Item label="Birim" name="birim"><Input /></Form.Item>
            <Form.Item label="Menşe" name="mense"><Input /></Form.Item>
            <Form.Item label="Açıklama" name="aciklama"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item label="Referans" name="referans"><Input /></Form.Item>
          </div>
        </Form>
        <Space>
          <Button onClick={() => tryFillInIframe()}>Sayfadaki Formu Doldur</Button>
          <Button onClick={() => navigator.clipboard.writeText(JSON.stringify(form.getFieldsValue()))}>Formu Panoya Kopyala</Button>
        </Space>
      </div>

      <div className="bg-white rounded border border-slate-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Web Sayfası</div>
          <Button onClick={() => window.open("/api/proxy?url=" + encodeURIComponent("https://eortak.dtm.gov.tr/eortak/login/selectApplication.htm"), "_blank")}>
            Yeni Pencerede Aç
          </Button>
        </div>
        <div className="h-[520px] rounded overflow-hidden border">
          <iframe
            ref={iframeRef}
            title="Proxy Web"
            src={"/api/proxy?url=" + encodeURIComponent("https://eortak.dtm.gov.tr/eortak/login/selectApplication.htm")}
            className="w-full h-full"
          />
        </div>
        <div className="text-xs text-slate-500 mt-2">Not: Proksi ile yüklenen sayfaya basit alan doldurma yapılır. Gelişmiş doldurma için alan seçicileri hedef sayfaya göre güncellenmelidir.</div>
      </div>
    </div>
  );
}
