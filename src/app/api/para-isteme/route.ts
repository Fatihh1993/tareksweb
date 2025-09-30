import { NextRequest, NextResponse } from 'next/server';
import { getParaIstemeRepository } from '../../../lib/repositories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const masterId = req.nextUrl.searchParams.get('masterId');
  if (!masterId) return NextResponse.json({ error: 'masterId gerekli' }, { status: 400 });
  try {
    const repo = getParaIstemeRepository();
    const list = await repo.listByMasterId(masterId);
    return NextResponse.json({ success: true, data: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log('[API][POST]/para-isteme incoming');
  try {
    const body = await req.json();
    console.log('[API][POST]/para-isteme body', body);
    const required = ['tareksmasterid', 'tutar', 'dovizkod', 'insuser'];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === '') {
        return NextResponse.json({ error: `${k} zorunlu` }, { status: 400 });
      }
    }
    const repo = getParaIstemeRepository();
    const id = await repo.create({
      tareksmasterid: body.tareksmasterid,
      tutar: Number(body.tutar),
      dovizkod: body.dovizkod,
      tip: body.tip ?? null,
      kdvoran: body.kdvoran ?? null,
      tahakkukno: body.tahakkukno ?? null,
      insuser: body.insuser
    });
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error('[API][POST]/para-isteme error', err);
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}