import { getPool } from '../../db';
import { IMasrafTurRepository } from '../../interfaces/masraf-tur-repository';
import { MasrafTurRow } from '../../models/masraf-tur';
import { executeCompiledQuery } from '../../queries/helpers/execute-compiled-query';
import { buildSgmMasrafTurQuery } from '../../queries/sgm_masraftur-query';

export class MssqlMasrafTurRepository implements IMasrafTurRepository {
  async listKayitTipleri(): Promise<MasrafTurRow[]> {
    const pool = await getPool();
    const request = pool.request();
    const compiled = buildSgmMasrafTurQuery();
    const result = await executeCompiledQuery(request, compiled);
    return result.recordset || [];
  }
}
