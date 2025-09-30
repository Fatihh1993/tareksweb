import { NextResponse } from 'next/server';
import { buildSdiTareksparaistemeListQuery } from '@/lib/queries/sdi_tareksparaisteme-list-query';
import { buildSdiTareksparaistemeDeleteQuery } from '@/lib/queries/sdi_tareksparaisteme-delete-query';
import { buildSdiTareksparaistemeInsertQuery } from '@/lib/queries/sdi_tareksparaisteme-insert-query';
import { buildSdiTareksparaistemeLookupsQuery } from '@/lib/queries/sdi_tareksparaisteme-lookups-query';
import { buildSdiTareksparaistemeUpdateQuery } from '@/lib/queries/sdi_tareksparaisteme-update-query';
import { runQuery } from '../../../../lib/queries/helpers/run-query'; // '@/...' yerine relative

function getUser() { return 'system'; }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const masterId = searchParams.get('masterId');
  if (!masterId) {
    return NextResponse.json({ error: 'masterId gerekli' }, { status: 400 });
  }
  try {
    const { sql, parameters } = buildSdiTareksparaistemeListQuery(masterId);
    const rows = await runQuery(sql, parameters);
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { masterId, amount, currency, tip, kdvOran, tahakkukNo } = body;
    if (!masterId || amount == null || currency == null) {
      return NextResponse.json({ error: 'masterId, amount, currency gerekli' }, { status: 400 });
    }
    const ins = buildSdiTareksparaistemeInsertQuery({
      masterId,
      tutar: Number(amount),
      dovizkod: String(currency),
      tip: tip ?? null,
      kdvoran: kdvOran ?? null,
      tahakkukno: tahakkukNo ?? null,
      user: getUser()
    });
    const rows = await runQuery(ins.compiled.sql, ins.compiled.parameters);
    return NextResponse.json({ inserted: rows?.[0], id: ins.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
    const { sql, parameters } = buildSdiTareksparaistemeDeleteQuery(id);
    await runQuery(sql, parameters);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, tutar, dovizkod, tip, kdvoran, tahakkukno } = body;
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
    const { sql, parameters } = buildSdiTareksparaistemeUpdateQuery(id, {
      tutar: tutar ?? null,
      dovizkod: dovizkod ?? null,
      tip: tip ?? null,
      kdvoran: kdvoran ?? null,
      tahakkukno: tahakkukno ?? null,
      user: getUser()
    });
    const rows = await runQuery(sql, parameters);
    return NextResponse.json({ updated: rows?.[0] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// Lookup endpoint: /api/tareks/para-iste/lookups
export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}