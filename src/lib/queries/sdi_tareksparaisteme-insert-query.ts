import { getQueryBuilder } from './helpers/kysely-compiler';

export interface SdiTareksparaistemeInsertValues {
  tareksmasterid: string;
  tutar?: number | null;
  dovizkod?: string | null;
  tip?: number | null;
  kdvoran?: number | null;
  tahakkukno?: string | null;
  insuser?: string | null;
}

export function buildSdiTareksparaistemeInsertQuery(values: SdiTareksparaistemeInsertValues & { masterId?: string }) {
  const db = getQueryBuilder();
  const tareksmasterid = values.tareksmasterid ?? values.masterId;
  if (!tareksmasterid) throw new Error('Missing required parameter: tareksmasterid');

  return db
    .insertInto('sdi_tareksparaisteme')
    .values({
      tareksmasterid,
      tutar: values.tutar ?? 0,
      dovizkod: values.dovizkod ?? 'TL',
      tip: values.tip ?? null,
      kdvoran: values.kdvoran ?? null,
      tahakkukno: values.tahakkukno ?? null,
      insuser: values.insuser ?? null,
      // instime: db.raw('GETDATE()') // eğer gerekli ise Kysely helper'ına göre burayı aç
    })
    .returning('tareksparaistemeid')
    .compile();
}
