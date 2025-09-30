import { NextResponse } from 'next/server';
import { buildSdiTareksparaistemeLookupsQuery } from '@/lib/queries/sdi_tareksparaisteme-lookups-query';
import { runQuery } from '@/lib/queries/helpers/run-query';

export async function GET() {
  try {
    const { sql, parameters } = buildSdiTareksparaistemeLookupsQuery();
    const rows = await runQuery(sql, parameters);
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}