import { getQueryBuilder } from './helpers/kysely-compiler';

// MSSQL uyumlu INSERT (RETURNING kaldırıldı). NEWID ile id üretip geri döndürür.
export interface SdiTareksparaistemeInsertValues {
  tareksmasterid: string;
  tutar?: number | null;
  dovizkod?: string | null;
  tip?: number | null;
  kdvoran?: number | null;
  tahakkukno?: string | null;
  insuser?: string | null;
}

export function buildSdiTareksparaistemeInsertQuery(values: SdiTareksparaistemeInsertValues) {
  const tareksmasterid = values.tareksmasterid;
  if (!tareksmasterid) {
    throw new Error('tareksmasterid zorunlu');
  }

  // Parametre sırası (@1 .. @7)
  const params = [
    tareksmasterid,
    values.tutar ?? 0,
    values.dovizkod ?? 'TL',
    values.tip ?? null,
    values.kdvoran ?? null,
    values.tahakkukno ?? null,
    values.insuser ?? null
  ] as const;

  return {
    sql: `
      DECLARE @nid UNIQUEIDENTIFIER = NEWID();
      INSERT INTO sdi_tareksparaisteme
        (tareksparaistemeid, tareksmasterid, tutar, dovizkod, tip, kdvoran, tahakkukno, insuser)
      VALUES
        (@nid, @1, @2, @3, @4, @5, @6, @7);
      SELECT @nid AS tareksparaistemeid;
    `,
    parameters: params
  };
}
