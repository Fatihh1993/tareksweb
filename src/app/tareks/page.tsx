"use client";

import React, { useState } from 'react';

export default function TareksPage() {
  const [tab, setTab] = useState<'arama' | 'web'>('arama');

  return (
  <div style={{ minHeight: '100vh', padding: 24, background: '#f8fafc', color: '#000' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Tareks Web</h1>
      </header>

      <nav style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <button onClick={() => setTab('arama')} style={{ padding: '8px 16px', borderRadius: 8, border: tab === 'arama' ? '2px solid #2563eb' : '1px solid #e5e7eb', background: tab === 'arama' ? '#e0f2fe' : '#fff' }}>
          Tareks Arama
        </button>
        <button onClick={() => setTab('web')} style={{ padding: '8px 16px', borderRadius: 8, border: tab === 'web' ? '2px solid #2563eb' : '1px solid #e5e7eb', background: tab === 'web' ? '#e0f2fe' : '#fff' }}>
          Tareks Web
        </button>
      </nav>

      <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(2,6,23,0.06)' }}>
        {tab === 'arama' && (
          <div>
            <h2>Tareks Arama</h2>
            <p>Burada arama bileşeni yer alacak. (Örnek içerik)</p>
            <input placeholder="Arama terimi" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
          </div>
        )}

        {tab === 'web' && (
          <div>
            <h2>Tareks Web</h2>
            <p>Burada Tareks Web ile ilgili içerik ve kontrol panelleri yer alacak.</p>
          </div>
        )}
      </section>
    </div>
  );
}
