import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

const allowedHosts = [
  'eortak.dtm.gov.tr',
  'giris.turkiye.gov.tr',
  'eortak.dtm.gov.tr',
];

function isAllowed(url: URL) {
  return allowedHosts.includes(url.hostname);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get('url')?.trim();
    const isTest = url.pathname.endsWith('/test');
    if (isTest) {
      // quick connectivity check
      try {
        const r = await fetch('https://example.com', { method: 'GET' });
        return NextResponse.json({ ok: r.ok, status: r.status });
      } catch (e) {
        const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        return NextResponse.json({ ok: false, error: msg }, { status: 502 });
      }
    }
    if (!target) return NextResponse.json({ error: 'url param required' }, { status: 400 });

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return NextResponse.json({ error: 'invalid url' }, { status: 400 });
    }

    if (!isAllowed(targetUrl)) {
      return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
    }

    let res: Response;
    try {
      res = await fetch(targetUrl.toString(), { method: 'GET', redirect: 'follow' });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? `${fetchErr.name}: ${fetchErr.message}` : String(fetchErr);
      const stack = fetchErr instanceof Error && fetchErr.stack ? fetchErr.stack : undefined;
      console.error('[proxy] fetch failed for', targetUrl.toString(), msg, stack);
      // Try a native Node https/http request as a fallback (some Windows/undici TLS edge cases)
      try {
        const native = await (async function nativeFetch(u: string) {
          return new Promise<{ status?: number; headers?: Record<string, string | string[]>; body?: string }>((resolve, reject) => {
            try {
              const parsed = new URL(u);
              const lib = parsed.protocol === 'http:' ? http : https;
              const opts: http.RequestOptions = { method: 'GET', headers: { 'user-agent': 'node' } };
              const req = lib.request(parsed, opts, (res: http.IncomingMessage) => {
                const chunks: Buffer[] = [];
                res.on('data', (c: Buffer) => chunks.push(c));
                res.on('end', () => {
                  const body = Buffer.concat(chunks).toString('utf8');
                  const headers: Record<string, string | string[]> = {};
                  const rawHeaders = (res.headers || {}) as Record<string, string | string[] | undefined>;
                  Object.keys(rawHeaders).forEach((k) => {
                    const v = rawHeaders[k];
                    if (v !== undefined) headers[k] = v as string | string[];
                  });
                  resolve({ status: res.statusCode, headers, body });
                });
              });
              req.on('error', (e: NodeJS.ErrnoException) => reject(e));
              req.end();
            } catch (e) {
              reject(e);
            }
          });
        })(targetUrl.toString());

        if (native && native.body && typeof native.body === 'string') {
          const contentType = (native.headers && (native.headers['content-type'] as string)) || '';
          if (!contentType.includes('text/html')) {
            return new NextResponse(native.body, { status: native.status || 200, headers: { 'content-type': contentType || 'application/octet-stream' } });
          }
          let body = native.body;
          const baseTag = `<base href="${targetUrl.origin}" />`;
          if (/<head[^>]*>/i.test(body)) {
            body = body.replace(/<head([^>]*)>/i, (m) => `${m}\n    ${baseTag}`);
          } else {
            body = `${baseTag}\n${body}`;
          }
          body = body.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/ig, '');
          for (const host of allowedHosts) {
            const re = new RegExp(`https?:\\/\\/${host}([^"'<>\\s]*)`, 'ig');
            body = body.replace(re, (m: string, p1: string) => {
              const path = p1 || '';
              const safe = encodeURIComponent(`https://${host}${path}`);
              return `/api/proxy?url=${safe}`;
            });
          }
          return new NextResponse(body, { status: native.status || 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
        }
      } catch (nativeErr) {
        const nmsg = nativeErr instanceof Error ? `${nativeErr.name}: ${nativeErr.message}` : String(nativeErr);
        const nstack = nativeErr instanceof Error && nativeErr.stack ? nativeErr.stack : undefined;
        console.error('[proxy] native fetch also failed for', targetUrl.toString(), nmsg, nstack);
        return NextResponse.json({ error: 'proxy fetch failed', detail: msg, stack, nativeError: nmsg, nativeStack: nstack }, { status: 502 });
      }
      return NextResponse.json({ error: 'proxy fetch failed', detail: msg, stack }, { status: 502 });
    }
    const contentType = res.headers.get('content-type') || '';

    // If not HTML, proxy bytes directly (images, etc.)
    if (!contentType.includes('text/html')) {
      const bytes = await res.arrayBuffer();
      const headers: Record<string, string> = {};
      const type = contentType || 'application/octet-stream';
      headers['content-type'] = type;
      return new NextResponse(Buffer.from(bytes), { status: 200, headers });
    }

    let body = await res.text();

    // inject a <base> tag so relative URLs resolve against the original site
    const baseTag = `<base href="${targetUrl.origin}" />`;
    if (/<head[^>]*>/i.test(body)) {
      body = body.replace(/<head([^>]*)>/i, (m) => `${m}\n    ${baseTag}`);
    } else {
      body = `${baseTag}\n${body}`;
    }

    // remove meta CSP that might block resources (best-effort)
    body = body.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/ig, '');

    // rewrite absolute links to route through proxy so navigation stays proxied
    // replace occurrences of allowed hosts (http/https) with proxy route
    for (const host of allowedHosts) {
      const re = new RegExp(`https?:\\/\\/${host}([^"'<>\\s]*)`, 'ig');
      body = body.replace(re, (m: string, p1: string) => {
        const path = p1 || '';
        const safe = encodeURIComponent(`https://${host}${path}`);
        return `/api/proxy?url=${safe}`;
      });
    }

    // return HTML without forwarding framing headers
    return new NextResponse(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error('[proxy] error:', message);
    return NextResponse.json({ error: 'proxy error', detail: message }, { status: 500 });
  }
}
