import { NextResponse } from 'next/server';
import { searchTareks } from '@/lib/services/tareks';

export async function GET(req: Request) {
  try {
    // Güvenli query parse ve basit validation
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit') ?? '200';
    const limit = parseInt(limitParam, 10);
    if (Number.isNaN(limit) || limit <= 0) {
      return new Response(JSON.stringify({ error: true, message: 'Invalid "limit" query param' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const term = url.searchParams.get('term') ?? undefined;
    const durum = url.searchParams.get('durum') ?? undefined;

    const rows = await searchTareks({ limit, term, durum });
    return NextResponse.json({ rows });
  } catch (err) {
    console.error('API /api/tareksarama error:', err);
    const body = {
      error: true,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    };
    return new Response(JSON.stringify(body), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
