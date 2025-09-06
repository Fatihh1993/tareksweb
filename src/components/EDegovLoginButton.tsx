"use client";

import { MouseEvent, useEffect } from "react";

type Props = {
  activeTareksMasterId: string;
  /**
   * Optional fully-qualified host to use for the redirect_uri (must be HTTPS in production).
   * If not provided, falls back to window.location.origin.
   */
  redirectHost?: string;
  className?: string;
  onSuccess?: (payload: { state?: string; code?: string; [k: string]: string | undefined }) => void;
};

export function EDegovLoginButton({
  activeTareksMasterId,
  redirectHost,
  className,
  onSuccess,
}: Props) {
  const handleLogin = (e?: MouseEvent) => {
    if (e) e.preventDefault();

    // 1) Durumu sakla (geri dönünce kaldığın yerden devam için)
    try {
      localStorage.setItem("tareks.masterId", activeTareksMasterId);
    } catch (err) {
      try { console.warn("localStorage set failed for tareks.masterId", err); } catch {}
    }

    // 2) Redirect URI (tercihen public HTTPS: ngrok / Cloudflare Tunnel / gerçek domain)
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectBase = redirectHost ? redirectHost.replace(/\/$/, "") : origin;
    const redirectUri = encodeURIComponent(`${redirectBase}/edv/callback`);

    // 3) CSRF için state & nonce üret (gerçekte backend'ten alıp doğrulamak daha güvenli)
    const generateId = () => {
      try {
        const webCrypto = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
        if (webCrypto && typeof webCrypto.randomUUID === "function") {
          return webCrypto.randomUUID();
        }
      } catch (e) {
        try { console.warn("crypto check failed", e); } catch {}
      }
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    };

    const state = generateId();
    const nonce = generateId();

    try {
      localStorage.setItem("edv.state", state);
      localStorage.setItem("edv.nonce", nonce);
    } catch (err) {
      try { console.warn("localStorage set failed for edv.state/nonce", err); } catch {}
    }

    // 4) e-Devlet yetkilendirme URL'si
    const authUrl = `https://giris.turkiye.gov.tr/Giris/?redirect_uri=${redirectUri}&state=${state}&nonce=${nonce}`;

    // 5) Open in centered popup to avoid iframe/X-Frame-Options issues; fallback to redirect.
    try {
      const width = 1000;
      const height = 700;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
      const features = `toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=yes,width=${width},height=${height},top=${top},left=${left}`;
      const popup = window.open(authUrl, 'edv_login', features);
      if (!popup) {
        // popup blocked — open in same tab
        window.location.assign(authUrl);
        return;
      }

      try { popup.focus(); } catch {}

      const poll = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(poll);
            // popup closed — app can re-check localStorage or call backend to confirm auth
          }
        } catch {
          // cross-origin access will throw until redirected back to same origin; ignore
        }
      }, 500);
    } catch (err) {
      try { console.warn('popup failed, redirecting', err); } catch {}
      window.location.assign(authUrl);
    }
  };

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      try {
        if (!ev.data || ev.data.type !== 'edv_callback') return;
        const q = typeof ev.data.query === 'string' ? ev.data.query : '';
        const params = new URLSearchParams(q.replace(/^\?/, ''));
        const state = params.get('state') || undefined;
        const code = params.get('code') || undefined;

        // Validate state against localStorage (best-effort — server verification still recommended)
        const stored = (() => { try { return localStorage.getItem('edv.state'); } catch { return null; } })();
        if (state && stored && state === stored) {
          // success — clear stored state/nonce
          try { localStorage.removeItem('edv.state'); localStorage.removeItem('edv.nonce'); } catch {}
          const payload: { state?: string; code?: string } = { state, code };
          // call optional callback
          try { if (typeof onSuccess === 'function') onSuccess(payload); } catch {}
          // dispatch DOM event for other listeners
          try { window.dispatchEvent(new CustomEvent('edv:login', { detail: payload })); } catch {}
        } else {
          // state mismatch or missing — still dispatch event with raw params
          try { window.dispatchEvent(new CustomEvent('edv:login:failed', { detail: { state, code } })); } catch {}
        }
      } catch (err) {
        try { console.warn('edv callback handling failed', err); } catch {}
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onSuccess]);

  return (
    <button onClick={handleLogin} className={className}>
      e-Devlet ile Devam Et
    </button>
  );
}

export default EDegovLoginButton;
