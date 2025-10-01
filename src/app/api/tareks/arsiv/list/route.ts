import { NextResponse } from 'next/server';
import { listArsivByModulId } from '@/lib/services/arsiv';

// GET /api/tareks/arsiv/list?beyannameid=GUID&top=50
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const beyannameid = url.searchParams.get('beyannameid') || url.searchParams.get('modulid');
    const topParam = url.searchParams.get('top');
    if (!beyannameid) {
      return NextResponse.json({ error: 'beyannameid (modulid) gerekli' }, { status: 400 });
    }
    const top = topParam ? Math.max(1, Math.min(500, parseInt(topParam, 10) || 100)) : 100;
    const rows = await listArsivByModulId(beyannameid, top);
    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[arsiv list] error:', msg);
    return NextResponse.json({ error: 'Sunucu hatası', detail: process.env.NODE_ENV !== 'production' ? msg : undefined }, { status: 500 });
  }
}
