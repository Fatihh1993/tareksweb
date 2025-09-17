import { getTareksBeyanRepository } from '../repositories';
import { getPool } from '../db';
import mssql from 'mssql';

export interface TareksParaIstemeRow {
  tareksparaistemeid: string;
  tutar: number;
  dovizkod?: string | null;
  tip?: number | null;
  kdvoran?: number | null;
  tahakkukno?: string | null;
  insuser?: string | null;
  instime?: string | null;
}

export async function getTareksBeyan(masterId: string): Promise<TareksParaIstemeRow[]> {
  const pool = await getPool();
  const req = pool.request();
  req.input('id', mssql.UniqueIdentifier, masterId);

  const sql = `
    SELECT
      tareksparaistemeid,
      tutar,
      dovizkod,
      tip,
      kdvoran,
      tahakkukno,
      insuser,    -- ensure insuser is selected
      instime
    FROM sdi_tareksparaisteme
    WHERE tareksmasterid = @id
    ORDER BY instime DESC;
  `;

  const r = await req.query(sql);

  type DbRecord = {
    tareksparaistemeid: string | { toString(): string } | null;
    tutar: number;
    dovizkod?: string | null;
    tip?: number | null;
    kdvoran?: number | null;
    tahakkukno?: string | null;
    insuser?: string | null;
    instime?: Date | string | null;
  };

  // helper: format to "gün.ay.yıl" (dd.MM.yyyy) in TR locale safely
  function formatDateDMY(v?: Date | string | null): string | null {
    if (!v) return null;
    const d = typeof v === 'string' ? new Date(v) : v;
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (r.recordset || []).map((row: DbRecord) => ({
    tareksparaistemeid: row.tareksparaistemeid ? String(row.tareksparaistemeid) : '',
    tutar: row.tutar,
    dovizkod: row.dovizkod ?? null,
    tip: row.tip ?? null,
    kdvoran: row.kdvoran ?? null,
    tahakkukno: row.tahakkukno ?? null,
    insuser: row.insuser ?? null,
    instime: formatDateDMY(row.instime),
  }));
}

export async function createTareksBeyan(params: {
  masterId: string;
  tutar: number;
  dovizkod?: string | null;
  tip?: number | string | { value?: number | string | null; label?: string } | null;
  kdvoran?: number | null;
  tahakkukno?: string | null;
  insuser?: string | null;
}) {
  const {
    masterId,
    tutar,
    dovizkod = 'TL',
    tip = 0,
    kdvoran = null,
    tahakkukno = null,
    insuser = null,
  } = params;

  // Debug incoming tip
  console.log('[tareksBeyan] createTareksBeyan incoming tip:', tip);

  let tipNum: number = 0;
  let kdvoranVal: number | null = kdvoran ?? null;

  const pool = await getPool();

  // Normalize common shapes (object from select, numeric string, display text)
  let tipCandidate: unknown = tip;
  if (tip && typeof tip === 'object') {
    if ('value' in tip && tip.value != null) tipCandidate = tip.value;
    else if ('label' in tip && tip.label != null) tipCandidate = tip.label;
  }

  if (typeof tipCandidate === 'number') {
    tipNum = Number(tipCandidate ?? 0);
  } else if (typeof tipCandidate === 'string') {
    const s = tipCandidate.trim();
    if (/^\d+$/.test(s)) {
      tipNum = parseInt(s, 10);
    } else if (s.length > 0) {
      // lookup by display text (case-insensitive)
      try {
        const lookupReq = pool.request();
        lookupReq.input('adi', mssql.NVarChar(200), s.toLowerCase());
        const lookup = await lookupReq.query(
          `SELECT TOP 1 tarekskayittip, kdvoran FROM sgm_masraftur WHERE LOWER(adi) = @adi`
        );

        if ((!lookup.recordset || lookup.recordset.length === 0) && s.length > 0) {
          // fallback to LIKE match if exact match not found
          const lookupReq2 = pool.request();
          lookupReq2.input('adiLike', mssql.NVarChar(200), `%${s.toLowerCase()}%`);
          const lookup2 = await lookupReq2.query(
            `SELECT TOP 1 tarekskayittip, kdvoran FROM sgm_masraftur WHERE LOWER(adi) LIKE @adiLike`
          );
          if (lookup2.recordset && lookup2.recordset[0]) {
            tipNum = Number(lookup2.recordset[0].tarekskayittip ?? 0);
            if (kdvoranVal == null) {
              const k = lookup2.recordset[0].kdvoran;
              kdvoranVal = k == null ? null : Number(k);
            }
            console.log('[tareksBeyan] lookup (LIKE) result:', lookup2.recordset[0]);
          } else {
            tipNum = 0;
            console.warn('[tareksBeyan] tip lookup not found for:', s);
          }
        } else if (lookup.recordset && lookup.recordset[0]) {
          tipNum = Number(lookup.recordset[0].tarekskayittip ?? 0);
          if (kdvoranVal == null) {
            const k = lookup.recordset[0].kdvoran;
            kdvoranVal = k == null ? null : Number(k);
          }
          console.log('[tareksBeyan] lookup result:', lookup.recordset[0]);
        }
      } catch (ex) {
        console.error('[tareksBeyan] lookup error:', ex);
        tipNum = 0;
      }
    } else {
      tipNum = 0;
    }
  } else {
    tipNum = Number(tipCandidate ?? 0);
  }

  console.log('[tareksBeyan] resolved tipNum:', tipNum, 'kdvoranVal:', kdvoranVal);

  const request = pool.request();

  // explicit SQL types and values
  request.input('id', mssql.UniqueIdentifier, masterId);
  request.input('tutar', mssql.Decimal(18, 2), Number(tutar ?? 0));
  request.input('dovizkod', mssql.NVarChar(10), dovizkod ?? 'TL');

  // always send an integer for tip (DB does not allow NULL)
  request.input('tip', mssql.Int, Number(tipNum ?? 0));

  request.input(
    'kdvoran',
    mssql.Decimal(5, 2),
    kdvoranVal === null || kdvoranVal === undefined ? null : Number(kdvoranVal)
  );

  request.input('tahakkukno', mssql.NVarChar(128), tahakkukno ?? null);
  request.input('insuser', mssql.NVarChar(128), insuser ?? null);

  const insertSql = `
DECLARE @newid TABLE(id uniqueidentifier);

INSERT INTO sdi_tareksparaisteme
( tareksmasterid, tutar, dovizkod, tip, kdvoran, tahakkukno, insuser, instime)
OUTPUT inserted.tareksparaistemeid INTO @newid(id)
VALUES (@id, @tutar, @dovizkod, @tip, @kdvoran, @tahakkukno, @insuser, GETDATE());

SELECT id FROM @newid;
`;

  const res = await request.query(insertSql);
  const newid = res.recordset && res.recordset[0] ? res.recordset[0].id : null;
  return newid;
}

export async function deleteTareksBeyan(id: string): Promise<boolean> {
  try {
    const repository = getTareksBeyanRepository();
    return await repository.delete(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[tareksBeyan] deleteTareksBeyan error:', msg);
    throw err;
  }
}
