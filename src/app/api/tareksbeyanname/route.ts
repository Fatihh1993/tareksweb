import { NextResponse } from 'next/server';
import { createTareksBeyan, deleteTareksBeyan, getTareksBeyan } from '../../../lib/services/tareksBeyan';

// local param type to avoid `any` cast errors (mirror service shape)
type CreateTareksBeyanParams = {
  masterId: string;
  tutar: number;
  dovizkod?: string | null;
  tip?: number | string | { value?: number | string; label?: string } | null;
  kdvoran?: number | null;
  tahakkukno?: string | null;
  insuser?: string | null;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const masterId = url.searchParams.get('masterId') || '';
    if (!masterId) {
      return NextResponse.json({ error: 'masterId is required' }, { status: 400 });
    }

    const rows = await getTareksBeyan(masterId);
    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/tareksbeyanname] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[api/tareksbeyanname POST] incoming body:', JSON.stringify(body));

    const masterId = body?.masterId ?? body?.tareksmasterid ?? body?.tareksMasterId;
    if (!masterId || typeof masterId !== 'string') {
      return NextResponse.json({ error: 'masterId is required' }, { status: 400 });
    }

    const rawTutar = body?.tutar ?? body?.amount;
    const tutar = rawTutar === undefined || rawTutar === null ? 0 : Number(rawTutar);
    if (Number.isNaN(tutar)) {
      return NextResponse.json({ error: 'Invalid tutar' }, { status: 400 });
    }

    const tip = body?.tip ?? body?.Tip ?? null;
    const rawKdvoran = body?.kdvoran ?? body?.kdvOran ?? null;
    const kdvoran = rawKdvoran === null || rawKdvoran === undefined || rawKdvoran === '' 
      ? null 
      : Number(rawKdvoran);

    if (kdvoran !== null && Number.isNaN(kdvoran)) {
      return NextResponse.json({ error: 'Invalid kdvoran' }, { status: 400 });
    }

    const tahakkukno = body?.tahakkukno ?? null;
    // resolve insuser: prefer body, then cookie "username", then header "x-username"
    let insuser = body?.insuser ?? null;
    if (!insuser) {
      const cookieHeader = req.headers.get('cookie') ?? '';
      const m = cookieHeader.match(/(?:^|;\s*)username=([^;]+)/);
      if (m) insuser = decodeURIComponent(m[1]);
    }
    if (!insuser) {
      const headerUser = req.headers.get('x-username');
      if (headerUser) insuser = headerUser;
    }
    console.log('[api/tareksbeyanname POST] resolved insuser:', insuser);
    const dovizkod = body?.dovizkod ?? 'TL';
    
    const payload: CreateTareksBeyanParams = {
      masterId,
      tutar,
      dovizkod,
      tip,
      kdvoran,
      tahakkukno,
      insuser
    };

    console.log('[api/tareksbeyanname POST] calling createTareksBeyan with:', payload);
    const id = await createTareksBeyan(payload);

    console.log('[api/tareksbeyanname POST] created id:', id);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/tareksbeyanname POST] error:', msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get('id');
    let id = queryId || null;

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || body?.paraIstemeId || body?.paraistemeid || null;
      } catch {
        // ignore body parse errors
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await deleteTareksBeyan(id);
    return NextResponse.json({ deleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/tareksbeyanname DELETE] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
