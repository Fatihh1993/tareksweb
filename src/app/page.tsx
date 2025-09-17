"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Giriş başarılı');
        // store minimal user info in session
        try { sessionStorage.setItem('user', JSON.stringify(data.user)); } catch {}
        // persist username for server-side inserts (insuser)
        try {
          document.cookie = `username=${encodeURIComponent(username)}; path=/; max-age=${60*60*24}`;
        } catch {}
        // redirect to tabbed Tareks Web page
        try { router.push('/tareks'); } catch { /* ignore */ }
        return;
      } else {
        setError(data.message || data.error || 'Giriş başarısız');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Sunucuya bağlanırken hata oluştu: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
  <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#000',
      background: 'linear-gradient(135deg, #e0f7fa 0%, #ffffff 100%)',
    }}>
      <style>{`.login-input::placeholder{color:#000 !important; opacity:1 !important;} .login-input{color:#000;}`}</style>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '32px 24px',
        minWidth: 320,
        maxWidth: 360,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h2 style={{ color: '#26b6d4', marginBottom: 24, fontWeight: 700 }}>Giriş Yap</h2>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            className="login-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            placeholder="Kullanıcı adı"
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: 16,
              borderRadius: 8,
              border: '1px solid #000000ff',
              fontSize: 16,
            }}
            required
          />
          <input
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Şifre"
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: 24,
              borderRadius: 8,
              border: '1px solid #000000ff',
              fontSize: 16,
            }}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#26b6d4',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        {error && <div style={{ color: '#dc2626', marginTop: 12 }}>{error}</div>}
        {success && <div style={{ color: '#16a34a', marginTop: 12 }}>{success}</div>}
        <a href="#" style={{ marginTop: 16, color: '#7c3aed', textDecoration: 'none', fontSize: 14 }}>
          Şifremi unuttum
        </a>
      </div>
    </div>
  );
}
