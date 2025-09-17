import { NextResponse } from 'next/server';
import { listMasrafTur } from '../../../lib/services/masrafTur';

export async function GET() {
  try {
    const rows = await listMasrafTur();
    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/masraftur] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
