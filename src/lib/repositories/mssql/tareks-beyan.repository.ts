import mssql from 'mssql';
import { getPool } from '../../db';
import { ITareksBeyanRepository } from '../../interfaces/tareks-beyan-repository';
import { TareksParaIstemeCreateInput, TareksParaIstemeRow } from '../../models/tareks';
import { executeCompiledQuery } from '../../queries/helpers/execute-compiled-query';
import { buildSdiTareksaramaViewBeyannameIdQuery } from '../../queries/sdi_tareksarama_view-beyannameid-query';
import { buildSdiTareksparaistemeDeleteQuery } from '../../queries/sdi_tareksparaisteme-delete-query';
import { buildSdiTareksparaistemeInsertQuery } from '../../queries/sdi_tareksparaisteme-insert-query';
import { buildSdiTareksparaistemeListQuery } from '../../queries/sdi_tareksparaisteme-list-query';

export class MssqlTareksBeyanRepository implements ITareksBeyanRepository {
  async listByMaster(masterId: string): Promise<TareksParaIstemeRow[]> {
    const pool = await getPool();
    const request = pool.request();
    const compiled = buildSdiTareksparaistemeListQuery(masterId);
    const result = await executeCompiledQuery(request, compiled);
    return result.recordset || [];
  }

  async create(input: TareksParaIstemeCreateInput): Promise<string | null> {
    const pool = await getPool();
    const request = pool.request();

    const compiledInsert = buildSdiTareksparaistemeInsertQuery({
      masterId: input.masterId,
      tutar: input.tutar,
      dovizkod: input.dovizkod,
      tip: input.tip ?? null,
      kdvoran: input.kdvoran ?? null,
      tahakkukno: input.tahakkukno ?? null,
      insuser: input.insuser ?? null,
    });

    const insertResult = await executeCompiledQuery(request, compiledInsert);
    const newId = insertResult.recordset?.[0]?.id ?? null;

    if (newId) {
      await this.trySyncTediye(pool, input.masterId, newId, input);
    }

    return newId;
  }

  async delete(id: string): Promise<boolean> {
    const pool = await getPool();
    const request = pool.request();
    const compiled = buildSdiTareksparaistemeDeleteQuery(id);
    const result = await executeCompiledQuery(request, compiled);
    const affected = result.rowsAffected?.[0] ?? 0;
    return affected > 0;
  }

  private async trySyncTediye(pool: mssql.ConnectionPool, masterId: string, newId: string, input: TareksParaIstemeCreateInput) {
    try {
      const beyanReq = pool.request();
      const compiledBeyan = buildSdiTareksaramaViewBeyannameIdQuery(masterId);
      const beyanRes = await executeCompiledQuery(beyanReq, compiledBeyan);
      const beyanId = beyanRes.recordset?.[0]?.beyannameid;
      if (!beyanId) return;

      const procedureReq = pool.request();
      procedureReq.input('beyannameid', mssql.UniqueIdentifier, beyanId);
      procedureReq.input('tutar', mssql.Decimal(18, 2), Number(input.tutar ?? 0));
      procedureReq.input('kullanici', mssql.NVarChar(128), input.insuser ?? null);
      procedureReq.input('kayittipi', mssql.Int, input.tip ?? null);
      procedureReq.input('tareksparaistemeid', mssql.UniqueIdentifier, newId);
      procedureReq.input('tediyeistemeid', mssql.UniqueIdentifier, '00000000-0000-0000-0000-000000000000');
      procedureReq.output('ErrorOutCode', mssql.TinyInt);
      await procedureReq.execute('sgm_tediyeisteme_update_tareksbelgesi');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[tareksBeyanRepository] tediye proc warning:', message);
    }
  }
}
