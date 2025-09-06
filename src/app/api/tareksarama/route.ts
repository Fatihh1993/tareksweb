import { NextResponse } from 'next/server';
import { searchTareks } from '@/lib/services/tareks';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined;
    const term = url.searchParams.get('term') ?? undefined;
    const durum = url.searchParams.get('durum') ?? undefined;

    const rows = await searchTareks({ limit, term, durum });
    return NextResponse.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tareksarama] error:', message);
    return NextResponse.json({ error: 'Sunucu hatası', detail: process.env.NODE_ENV !== 'production' ? message : undefined }, { status: 500 });
  }
}
