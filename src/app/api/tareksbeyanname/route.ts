import { NextResponse } from 'next/server';
import { getTareksBeyan } from '../../../lib/services/tareksBeyan';
import { getPool } from '../../../lib/db';
import mssql from 'mssql';

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
    const { masterId, tutar = 0, dovizkod = 'TL', tip = null, kdvoran = null, tahakkukno = null, insuser = null } = body || {};
    if (!masterId) return NextResponse.json({ error: 'masterId is required' }, { status: 400 });

    const pool = await getPool();
    const request = pool.request();
    request.input('id', masterId);

    // Use a table-variable insertion to get the new id similar to InsertInline
  const insertSql = `
DECLARE @newid TABLE(id uniqueidentifier);

INSERT INTO sdi_tareksparaisteme
( tareksmasterid, tutar, dovizkod, tip, kdvoran, tahakkukno, insuser, instime)
OUTPUT inserted.tareksparaistemeid INTO @newid(id)
VALUES (@id, @tutar, @dovizkod, @tip, @kdvoran, @tahakkukno, @insuser, GETDATE());

SELECT id FROM @newid;`;

    // prepare inputs
    request.input('tutar', tutar);
    request.input('dovizkod', dovizkod);
    if (tip === null || tip === undefined) request.input('tip', null);
    else request.input('tip', tip);
    if (kdvoran === null || kdvoran === undefined) request.input('kdvoran', null);
    else request.input('kdvoran', kdvoran);
    request.input('tahakkukno', tahakkukno);
    request.input('insuser', insuser);

  const res = await request.query(insertSql);
    const newid = (res.recordset && res.recordset[0] && res.recordset[0].id) ? res.recordset[0].id : null;

    // If insert succeeded, attempt to run the tediye stored procedure to populate tediyeistemeid
    if (newid) {
      try {
        // 1) get beyannameid for this master
        const beyanReq = pool.request();
        beyanReq.input('id', masterId);
        const beyanQ = `SELECT TOP 1 beyannameid FROM sdi_tareksarama_view WHERE tareksmasterid = @id`;
        const beyanRes = await beyanReq.query(beyanQ);
        const beyanId = beyanRes.recordset && beyanRes.recordset[0] ? beyanRes.recordset[0].beyannameid : null;

        if (beyanId) {
          const procReq = pool.request();
          procReq.input('beyannameid', mssql.UniqueIdentifier, beyanId);
          procReq.input('tutar', mssql.Decimal(18, 2), Number(tutar || 0));
          procReq.input('kullanici', mssql.NVarChar(128), insuser || null);
          if (tip === null || tip === undefined) procReq.input('kayittipi', mssql.Int, null);
          else procReq.input('kayittipi', mssql.Int, tip);
          procReq.input('tareksparaistemeid', mssql.UniqueIdentifier, newid);
          procReq.input('tediyeistemeid', mssql.UniqueIdentifier, '00000000-0000-0000-0000-000000000000');
          procReq.output('ErrorOutCode', mssql.TinyInt);
          // execute and ignore any non-fatal errors from the procedure; log them
          await procReq.execute('sgm_tediyeisteme_update_tareksbelgesi');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[api/tareksbeyanname] tediye proc warning:', msg);
        // don't fail the request if procedure failed — C# also swallows this
      }
    }
    return NextResponse.json({ id: newid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/tareksbeyanname POST] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // support id in query or body
    const url = new URL(req.url);
    const qid = url.searchParams.get('id');
    let id = qid || null;
    if (!id) {
      try {
        const body = await req.json();
        id = body && (body.id || body.paraIstemeId || body.paraistemeid) ? (body.id || body.paraIstemeId || body.paraistemeid) : null;
      } catch {
        // ignore
      }
    }

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const pool = await getPool();
    const request = pool.request();
    request.input('id', id);
    const q = `DELETE FROM sdi_tareksparaisteme WHERE tareksparaistemeid = @id`;
    await request.query(q);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/tareksbeyanname DELETE] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
