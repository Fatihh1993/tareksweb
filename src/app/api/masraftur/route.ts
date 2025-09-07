import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const req = pool.request();
    const q = `SELECT kdvoran, tarekskayittip, adi FROM sgm_masraftur WHERE tarekskayittip IN (0,1,2) ORDER BY tarekskayittip`;
    const result = await req.query(q);
    return NextResponse.json({ rows: result.recordset || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/masraftur] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
