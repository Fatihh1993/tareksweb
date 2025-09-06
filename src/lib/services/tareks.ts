import { getPool } from '../db';

export async function searchTareks(opts?: { limit?: number; term?: string; durum?: string; }): Promise<Record<string, unknown>[]> {
  const limit = opts?.limit ?? 500; // default cap to avoid huge payloads
  const term = opts?.term?.trim();
  const durum = opts?.durum?.trim();

  try {
    const pool = await getPool();
    const req = pool.request();

    // build query dynamically based on provided filters
    const clauses: string[] = [];
    if (term) {
      clauses.push('(musteriad LIKE @term OR referansno LIKE @term OR subeadi LIKE @term)');
      req.input('term', `%${term}%`);
    }
    if (durum) {
      clauses.push('durum = @durum');
      req.input('durum', durum);
    }

    req.input('limit', limit);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const q = `SELECT TOP (@limit) * FROM sdi_tareksarama_view ${where}`;
    const result = await req.query(q);
    return result.recordset || [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[tareksService] search error:', msg);
    throw err;
  }
}

export async function getTareksDetay(tareksmasterid: string): Promise<Record<string, unknown>[]> {
  try {
    const pool = await getPool();
    const req = pool.request();
    req.input('id', tareksmasterid);
    const q = `SELECT * FROM sdi_tareksdetay_view WHERE tareksmasterid = @id`;
    const result = await req.query(q);
    return result.recordset || [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[tareksService] getTareksDetay error:', msg);
    throw err;
  }
}
