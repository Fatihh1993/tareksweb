import { NextResponse } from 'next/server';
import { getTareksDetay } from '@/lib/services/tareks';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id param required' }, { status: 400 });
    const rows = await getTareksDetay(id);
    return NextResponse.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tareksdetay] error:', message);
    return NextResponse.json({ error: 'Sunucu hatası', detail: process.env.NODE_ENV !== 'production' ? message : undefined }, { status: 500 });
  }
}
