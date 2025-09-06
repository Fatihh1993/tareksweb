"use client";

import React, { useMemo, useState, ChangeEvent } from 'react';
import { Table, Input, Button, Space, Tooltip, Select, Modal } from 'antd';

export default function TareksPage() {
  const [menuOpen, setMenuOpen] = useState(true);
  const [tareksOpen, setTareksOpen] = useState(true);
  // default to 'web' so the embedded Tareks/Eortak page is shown first
  const [selection, setSelection] = useState<'arama' | 'web' | 'detay'>('web');

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedDurum, setSelectedDurum] = useState<string | undefined>(undefined);
  const [selectedMasterId, setSelectedMasterId] = useState<string | undefined>(undefined);
  const [selectedRefId, setSelectedRefId] = useState<string | undefined>(undefined);
  const [detailRows, setDetailRows] = useState<Record<string, unknown>[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailModalRow, setDetailModalRow] = useState<Record<string, unknown> | null>(null);
  const [detailColumnFilters, setDetailColumnFilters] = useState<Record<string, string>>({});

  // (moved below into useMemo for stability)

  async function doSearch() {
    setError(null);
    setLoading(true);
    try {
  const params = new URLSearchParams();
  params.set('limit', String(200));
  if (searchTerm && searchTerm.trim()) params.set('term', searchTerm.trim());
  if (selectedDurum) params.set('durum', selectedDurum);
  const res = await fetch(`/api/tareksarama?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setRows(data.rows || []);
      else setError(data.error || 'Arama sırasında hata');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Sunucu hatası: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDetail(id?: string) {
    if (!id) return;
    try {
  const res = await fetch(`/api/tareksdetay?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok) {
  setDetailRows(data.rows || []);
  console.debug('[fetchDetail] rows:', Array.isArray(data.rows) ? data.rows.length : 'no rows', data.rows ? data.rows.slice(0,3) : null);
  // do not open modal here; show rows under 'web' section
      } else {
        setError(data.error || 'Detay alınamadı');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Sunucu hatası: ' + msg);
    }
  }

  const columns = useMemo(() => {
    // columns that should be kept in row data but not shown to the user
    const hiddenColumns = new Set(['tareksmasterid', 'beyannameid', 'musteriid']);

    // user-friendly column titles
    const columnTitles: Record<string, string> = {
      subeadi: 'Şube Adı',

      musteriad: 'Müşteri Adı',
      formsayi: 'Form Sayısı',
      tarekesbelgekullanici: 'Belge Kullanıcı',
      universalislemkullanici: 'Universal Kullanıcı',
      durum: 'Durum',
      referansno: 'Referans No',
      departmanad: 'Departman',
      bolgead: 'Bölge',
      basvuruno: 'Başvuru No',
      formsayisi: 'Form Sayısı',
      musavironaytarih: 'Müşavir Onay Tarihi',
      belgeturad: 'Belge Türü',
      firmaGrup: 'Firma Grup',
      yil: 'Yıl',
      // add more mappings as needed
    };

    if (!rows[0]) return [];
    // explicit width overrides for important columns so they can expand horizontally
    const columnWidthOverrides: Record<string, number> = {
      musteriad: 300,
      bolgead: 180,
      subeadi: 140,
      referansno: 120,
      formsayi: 100,
      durum: 140,
      basvuruno: 140,
    };

    return Object.keys(rows[0])
      .filter((k) => !hiddenColumns.has(k))
      .map((k) => {
        const titleText = columnTitles[k] ?? k;
        // estimate width from title length (characters * px) and clamp
        const estimatedWidth = Math.ceil(titleText.length * 10 + 16);
        const defaultWidth = Math.max(60, Math.min(360, estimatedWidth));
        const colWidth = columnWidthOverrides[k] ?? defaultWidth;

        return {
          title: (
            <div className="col-header" style={{ display: 'flex', flexDirection: 'column', gap: 6, boxSizing: 'border-box' }}>
              {/* top row: title text — allow normal flow so Ant's sorter icons are visible */}
              <div style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{titleText}</div>
              {/* filter input sits below title and will not overlap sorter icons due to onHeaderCell spacing */}
              <Input
                size="small"
                value={columnFilters[k] ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setColumnFilters((s) => ({ ...s, [k]: e.target.value }))}
                placeholder="Filtre"
                style={{ width: '100%', boxSizing: 'border-box' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
              />
            </div>
          ),
          dataIndex: k,
          key: k,
          width: colWidth,
          // ensure header cell allows multiple lines and has extra padding so icons and inputs don't overlap
          onHeaderCell: () => ({ style: { whiteSpace: 'normal', paddingTop: 8, paddingBottom: 8, verticalAlign: 'top' } }),
          sorter: (a: Record<string, unknown>, b: Record<string, unknown>) =>
            String(a[k] ?? '').localeCompare(String(b[k] ?? '')),
          render: (v: unknown) => (
            <Tooltip title={String(v ?? '')} placement="topLeft">
              <div style={{ maxWidth: colWidth - 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(v ?? '')}</div>
            </Tooltip>
          ),
        };
      });
  }, [rows, columnFilters]);

  const detailColumns = useMemo(() => {
    if (!detailRows[0]) return [];
    const hiddenColumns = new Set(['tareksmasterid', 'beyannameid', 'musteriid']);
    const columnTitles: Record<string, string> = {
      subeadi: 'Şube Adı',
      musteriad: 'Müşteri Adı',
      formsayi: 'Form Sayısı',
      tarekesbelgekullanici: 'Belge Kullanıcı',
      universalislemkullanici: 'Universal Kullanıcı',
      durum: 'Durum',
      referansno: 'Referans No',
      departmanad: 'Departman',
      bolgead: 'Bölge',
      basvuruno: 'Başvuru No',
      formsayisi: 'Form Sayısı',
      musavironaytarih: 'Müşavir Onay Tarihi',
      belgeturad: 'Belge Türü',
      firmaGrup: 'Firma Grup',
      yil: 'Yıl',
    };

    const columnWidthOverrides: Record<string, number> = {
      musteriad: 300,
      bolgead: 180,
      subeadi: 140,
      referansno: 120,
      formsayi: 100,
      durum: 140,
      basvuruno: 140,
    };

    return Object.keys(detailRows[0])
      .filter((k) => !hiddenColumns.has(k))
      .map((k) => {
        const titleText = columnTitles[k] ?? k;
        const estimatedWidth = Math.ceil(titleText.length * 10 + 16);
        const defaultWidth = Math.max(60, Math.min(360, estimatedWidth));
        const colWidth = columnWidthOverrides[k] ?? defaultWidth;
        return {
          title: (
            <div className="col-header" style={{ display: 'flex', flexDirection: 'column', gap: 6, boxSizing: 'border-box' }}>
              <div style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{titleText}</div>
              <Input
                size="small"
                value={detailColumnFilters[k] ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDetailColumnFilters((s) => ({ ...s, [k]: e.target.value }))}
                placeholder="Filtre"
                style={{ width: '100%', boxSizing: 'border-box' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
              />
            </div>
          ),
          dataIndex: k,
          key: k,
          width: colWidth,
          // reserve header space so filter input and sorter icons render without overlap
          onHeaderCell: () => ({ style: { whiteSpace: 'normal', paddingTop: 8, paddingBottom: 8, verticalAlign: 'top' } }),
          sorter: (a: Record<string, unknown>, b: Record<string, unknown>) => String(a[k] ?? '').localeCompare(String(b[k] ?? '')),
          render: (v: unknown) => (
            <Tooltip title={String(v ?? '')} placement="topLeft">
              <div style={{ maxWidth: colWidth - 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(v ?? '')}</div>
            </Tooltip>
          ),
        };
      });
  }, [detailRows, detailColumnFilters]);

  const filteredDetailRows = useMemo(() => {
    const filters = Object.entries(detailColumnFilters).filter(([, v]) => v && v.trim() !== '');
    if (!filters.length) return detailRows;
    return detailRows.filter((row) => {
      return filters.every(([col, val]) => {
        const cell = String(row[col] ?? '').toLowerCase();
        return cell.includes(String(val).toLowerCase());
      });
    });
  }, [detailRows, detailColumnFilters]);

  const filteredRows = useMemo(() => {
    const filters = Object.entries(columnFilters).filter(([, v]) => v && v.trim() !== '');
    if (!filters.length) return rows;
    return rows.filter((row) => {
      return filters.every(([col, val]) => {
        const cell = String(row[col] ?? '').toLowerCase();
        return cell.includes(String(val).toLowerCase());
      });
    });
  }, [rows, columnFilters]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', background: '#f8fafc', color: '#000' }}>
      {/* local style overrides to ensure Ant Table header reserves space for sorter icons and multi-line header content */}
      <style>{`
        /* header cell allow wrapping and space for sorter icon */
        .ant-table-thead > tr > th {
          white-space: normal !important;
          vertical-align: top !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        .ant-table-column-sorter {
          right: 8px !important;
        }
        /* ensure our column header inner div doesn't overlap icons */
        .col-header { padding-right: 24px; }
        /* make small inputs full-width within header cell */
        .col-header .ant-input { width: 100%; box-sizing: border-box; }
        /* selected row highlight: target Ant table body rows and their cells */
        .ant-table-tbody > tr.tareks-row-selected > td,
        .ant-table-tbody > tr.tareks-row-selected td {
          background: #fffbeb !important;
        }
        /* ensure header isn't affected */
        .ant-table-thead > tr.tareks-row-selected > th { background: transparent !important; }
      `}</style>
      <aside
        className={`tareks-sider ${menuOpen ? '' : 'collapsed'}`}
        style={{
          width: menuOpen ? 220 : 0,
          minWidth: menuOpen ? 220 : 0,
          maxWidth: menuOpen ? 220 : 0,
          padding: menuOpen ? 12 : 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: menuOpen ? 'space-between' : 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="sider-logo">T</div>
            <div className="sider-brand"><span className="label">TAREKS</span></div>
          </div>
          <button aria-label="Toggle menu" onClick={() => setMenuOpen((s) => !s)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>{menuOpen ? '◀' : '▶'}</button>
        </div>

        <div style={{ marginTop: 18 }}>
          <div onClick={() => setTareksOpen((s) => !s)} className={`menu-item ${tareksOpen ? 'active' : ''}`} style={{ justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="menu-icon" style={{ width: 8, height: 8, borderRadius: 2 }} />
              <div className="section-title"><span className="label">TAREKS</span></div>
            </div>
            {menuOpen && <span style={{ opacity: 0.9 }}>{tareksOpen ? '▾' : '▸'}</span>}
          </div>

          {tareksOpen && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => setSelection('arama')} className={`menu-item ${selection === 'arama' ? 'active' : ''}`}><span className="label">Tareks Arama</span></button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
                <button onClick={() => setSelection('web')} className={`menu-item ${selection === 'web' ? 'active' : ''}`}><span className="label">Tareks Web</span></button>
                <button
                  onClick={() => {
                    if (selectedMasterId) {
                      setSelection('detay');
                      fetchDetail(selectedMasterId);
                    }
                  }}
                  className={`menu-item ${selection === 'detay' ? 'active' : ''}`}
                  disabled={!selectedMasterId}
                >
                  <span className="label">Tareks Detay</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
      {!menuOpen && (
        <button
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          style={{
            position: 'absolute',
            left: 0,
            top: 12,
            background: 'rgb(33,79,115)',
            color: '#fff',
            border: 'none',
            padding: '4px 6px',
            borderRadius: '0 8px 8px 0',
            cursor: 'pointer',
          }}
        >
          ▶
        </button>
      )}

      <main style={{ flex: 1, padding: 24 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>Tareks Web</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {selectedRefId ? (
              <div style={{ background: '#f1f5f9', padding: '6px 10px', borderRadius: 8, color: '#0f172a', fontWeight: 600, boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.04)' }}>Seçili Ref: {selectedRefId}</div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Seçili Ref yok</div>
            )}

            {/* e-Devlet giriş removed */}
          </div>
        </header>

  <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(2,6,23,0.06)' }}>
          {selection === 'arama' && (
            <div>
              <h2>Tareks Arama</h2>
              <p>Arama için butona basın, sonuçlar aşağıdaki gridde görünür.</p>
              <Space style={{ display: 'flex', marginBottom: 12, alignItems: 'center' }}>
                <Input placeholder="Firma" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 360 }} />
                <Select
                  allowClear
                  placeholder="Durum seçin"
                  style={{ width: 300 }}
                  value={selectedDurum}
                  onChange={(val) => setSelectedDurum(val)}
                  options={[
                    { label: 'Başvuru Sonuçlandı', value: 'Başvuru Sonuçlandı' },
                    { label: 'Denetim Sonucu Bekleniyor', value: 'Denetim Sonucu Bekleniyor' },
                    { label: 'Eksik Evrak - Hatalı Form', value: 'Eksik Evrak - Hatalı Form' },
                    { label: 'Form Oluşturuluyor', value: 'Form Oluşturuluyor' },
                    { label: 'Gümrük Müşaviri Kontrolü', value: 'Gümrük Müşaviri Kontrolü' },
                    { label: 'Koşullu Kabul', value: 'Koşullu Kabul' },
                    { label: 'Muhasebe', value: 'Muhasebe' },
                    { label: 'Ön İnceleme', value: 'Ön İnceleme' },
                    { label: 'RED Denetleme Sonucu', value: 'RED Denetleme Sonucu' },
                    { label: 'Tareks Denetleme', value: 'Tareks Denetleme' },
                    { label: 'Tareks Müracaat', value: 'Tareks Müracaat' },
                    { label: 'TSE Denetleme', value: 'TSE Denetleme' },
                    { label: 'TSE Evrak Yükleme', value: 'TSE Evrak Yükleme' },
                    { label: 'TSE Heyet Aşaması', value: 'TSE Heyet Aşaması' },
                    { label: 'TSE Heyet Sonrası Teknik İnceleme', value: 'TSE Heyet Sonrası Teknik İnceleme' },
                    { label: 'TSE Ön İnceleme', value: 'TSE Ön İnceleme' },
                  ]}
                />
                <Button type="primary" onClick={doSearch} loading={loading}>Ara</Button>
              </Space>

              {error && <div style={{ color: '#dc2626', marginBottom: 8 }}>{error}</div>}

              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div><strong style={{ color: '#0f172a' }}>Ref: </strong> {selectedRefId ?? <span style={{ color: '#94a3b8' }}>seçili değil</span>}</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div id="tareks-table-container" style={{ background: '#fff', borderRadius: 8, padding: 8, overflow: 'auto' }}>
                  <Table
                    columns={columns}
                    dataSource={filteredRows.map((r, i) => ({ key: i, ...r }))}
                    rowKey={(r: Record<string, unknown>) => {
                      const rec = r as Record<string, unknown>;
                      const ref = String(rec['referansno'] ?? rec['refid'] ?? rec['RefId'] ?? rec['REFID'] ?? rec['key'] ?? '');
                      return ref || String(rec['key'] ?? '');
                    }}
                    rowClassName={(record: Record<string, unknown>) => {
                      const rec = record as Record<string, unknown>;
                      const ref = String(rec['referansno'] ?? rec['refid'] ?? rec['RefId'] ?? rec['REFID'] ?? '');
                      return ref && selectedRefId === ref ? 'tareks-row-selected' : '';
                    }}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 520 }}
                    style={{ background: '#fff' }}
                    sticky={{ offsetHeader: 0 }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        const rec = record as unknown as Record<string, unknown>;
                        const id = String(rec['tareksmasterid'] ?? rec['masterid'] ?? '');
                        const ref = String(rec['referansno'] ?? rec['refid'] ?? rec['RefId'] ?? rec['REFID'] ?? '');
                        if (id) {
                          setSelectedMasterId(id || undefined);
                          setSelectedRefId(ref || undefined);
                          setSelection('detay');
                          fetchDetail(id);
                        }
                      },
                    })}
                  />
                  {/* modal for inspecting a single detail row */}
                  <Modal title={`Detay`} open={detailOpen} onOk={() => setDetailOpen(false)} onCancel={() => setDetailOpen(false)} width={900}>
                    <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                      {!detailModalRow && <div>Seçili detay yok.</div>}
                      {detailModalRow && (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            {Object.keys(detailModalRow).map((k) => (
                              <tr key={k}>
                                <td style={{ padding: 8, fontWeight: 700, verticalAlign: 'top', width: 260, borderBottom: '1px solid #eee' }}>{k}</td>
                                <td style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>{String(detailModalRow[k] ?? '')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </Modal>
                </div>
              </div>
            </div>
          )}

          {selection === 'web' && (
            <div>
              <h2>Tareks Web</h2>
              <p>Burada Tareks Detay bilgileri yer alacak. Arama bölümünden bir satırı çift tıklayarak buraya geçip detayları görebilirsiniz.</p>
              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div><strong style={{ color: '#0f172a' }}>Ref: </strong> {selectedRefId ?? <span style={{ color: '#94a3b8' }}>seçili değil</span>}</div>
                </div>
                {/* Primary Eortak Aç button removed from web view */}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ background: '#fff', borderRadius: 8, padding: 8, overflow: 'hidden', position: 'relative' }}>
                  {/* Overlay area for future buttons */}
                  {/* iframe overlay buttons removed - single button now shown under header ref */}
                  {/* Embedded external page - adjust height as needed */}
                  <div style={{ width: '100%', height: 520, borderRadius: 6, overflow: 'hidden' }}>
                    <iframe
                      id="tareks-web-iframe"
                      title="Tareks Webframe"
                      src={`https://eortak.dtm.gov.tr/eortak/login/selectApplication.htm`}
                      style={{ width: '100%', height: '100%', border: '0' }}
                    />
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>Not: Bazı siteler iframe içinde görüntülenmeyi engelleyebilir (X-Frame-Options/CSP). Eğer iframe yüklenmiyorsa, sayfayı yeni pencerede açın.</div>
                    <Button type="default" onClick={() => window.open('https://eortak.dtm.gov.tr/eortak/login/selectApplication.htm', '_blank')}>Yeni pencerede aç</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selection === 'detay' && (
            <div>
              <h2>Tareks Detay</h2>
              <p>Detay gridi. Arama bölümünden bir satırı çift tıklayarak buraya geçip detayları görebilirsiniz.</p>
              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div><strong style={{ color: '#0f172a' }}>Ref: </strong> {selectedRefId ?? <span style={{ color: '#94a3b8' }}>seçili değil</span>}</div>
                </div>
                {/* Eortak Aç button removed from detay view */}
              </div>
              <div style={{ marginTop: 6, marginBottom: 6, color: '#374151' }}>Satır sayısı: {detailRows.length}</div>
              <div style={{ marginTop: 12 }}>
                <div id="tareks-table-container" style={{ background: '#fff', borderRadius: 8, padding: 8, overflow: 'auto' }}>
                  <Table
                    columns={detailColumns}
                    dataSource={filteredDetailRows.map((r, i) => ({ key: i, ...r }))}
                    rowKey={(r: Record<string, unknown>) => {
                      const rec = r as Record<string, unknown>;
                      const ref = String(rec['referansno'] ?? rec['refid'] ?? rec['RefId'] ?? rec['REFID'] ?? rec['key'] ?? '');
                      return ref || String(rec['key'] ?? '');
                    }}
                    rowClassName={(record: Record<string, unknown>) => {
                      const rec = record as Record<string, unknown>;
                      const ref = String(rec['referansno'] ?? rec['refid'] ?? rec['RefId'] ?? rec['REFID'] ?? '');
                      return ref && selectedRefId === ref ? 'tareks-row-selected' : '';
                    }}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 520 }}
                    sticky={{ offsetHeader: 0 }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        const rec = record as unknown as Record<string, unknown>;
                        const ref = String(rec['referansno'] ?? rec['refid'] ?? rec['RefId'] ?? rec['REFID'] ?? '');
                        setSelectedRefId(ref || undefined);
                        setDetailModalRow(rec);
                        setDetailOpen(true);
                      },
                    })}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
