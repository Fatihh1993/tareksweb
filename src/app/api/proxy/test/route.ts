import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

async function tryFetch(url: string) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow' });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    const errMsg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    const errStack = e instanceof Error && e.stack ? e.stack : undefined;
    // try native http/https as a fallback
    try {
      const native = await (async function nativeFetch(u: string) {
        return new Promise<{ status?: number; headers?: Record<string, string | string[]>; body?: string }>((resolve, reject) => {
          try {
            const parsed = new URL(u);
            const lib = parsed.protocol === 'http:' ? http : https;
            const req = lib.request(parsed, { method: 'GET', headers: { 'user-agent': 'node' } }, (res: http.IncomingMessage) => {
              const chunks: Buffer[] = [];
              res.on('data', (c: Buffer) => chunks.push(c));
              res.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                const headers: Record<string, string | string[]> = {};
                if (res.headers) {
                  for (const [k, v] of Object.entries(res.headers)) {
                    if (v !== undefined) headers[k] = v;
                  }
                }
                resolve({ status: res.statusCode ?? undefined, headers, body });
              });
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            req.on('error', (err: any) => reject(err));
            req.end();
          } catch (err) {
            reject(err);
          }
        });
      })(url);

      if (native && typeof native.status === 'number') {
        return { ok: true, status: native.status };
      }
      return { ok: false, error: errMsg, stack: errStack };
    } catch (nativeErr) {
      return { ok: false, error: errMsg, stack: errStack, native: nativeErr instanceof Error ? `${nativeErr.name}: ${nativeErr.message}` : String(nativeErr) };
    }
  }
}

export async function GET() {
  const targets = [
    'https://example.com',
    'https://eortak.dtm.gov.tr',
    'https://giris.turkiye.gov.tr',
  ];

  const results: Record<string, unknown> = {};
  for (const t of targets) {
    results[t] = await tryFetch(t);
  }

  return NextResponse.json({ ok: true, results });
}
