import sql from 'mssql';
import { getPool } from '@/lib/db';

export type ArsivRow = {
  arsivid: string;
  ad: string;
  arsivftpklasor: string | null;
  ftpad: string | null;
  modulkod: string | null;
  modulid: string;
  kayitgiristarih?: string | Date | null;
  guncellemetarih?: string | Date | null;
};

/**
 * List archive entries for a given modulid (beyannameid) from sbr_arsiv.
 */
export async function listArsivByModulId(modulid: string, top = 100): Promise<ArsivRow[]> {
  const pool = await getPool();
  const req = pool.request();
  req.input('modulid', sql.VarChar(100), modulid);
  req.input('top', sql.Int, top);
  const result = await req.query<ArsivRow>(`
    SELECT TOP (@top)
      arsivid,
      ad,
      arsivftpklasor,
      ftpad,
      modulkod,
      modulid,
      kayitgiristarih,
      guncellemetarih
    FROM sbr_arsiv WITH (NOLOCK)
    WHERE modulid = @modulid
    ORDER BY ISNULL(guncellemetarih, kayitgiristarih) DESC, arsivid DESC;
  `);
  return result.recordset || [];
}
