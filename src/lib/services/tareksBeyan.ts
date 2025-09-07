
import { getPool } from '../db';

export async function getTareksBeyan(masterId: string): Promise<Record<string, unknown>[]> {
  if (!masterId) return [];
  try {
    const pool = await getPool();
    const req = pool.request();
    // match the columns and ordering used by the Windows form manager
    req.input('id', masterId);
    const q = `
SELECT
    tareksparaistemeid AS ParaIstemeId,
    tutar             AS Tutar,
    dovizkod          AS [Döviz Kod],
    tip               AS Tip,
    kdvoran           AS [KDV Oran],
    tahakkukno        AS [Tahakkuk No],
    insuser           AS [Kayıt Kullanıcı],
    instime           AS [Kayıt Tarihi],
    upduser           AS [Son İşlem Kullanıcı],
    updtime           AS [Son İşlem Tarihi],
    tediyeistemeid    AS TediyeId
FROM sdi_tareksparaisteme
WHERE tareksmasterid = @id
ORDER BY instime DESC`;
    const result = await req.query(q);
    return result.recordset || [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[tareksBeyan] getTareksBeyan error:', msg);
    throw err;
  }
}
