import { getQueryBuilder } from './helpers/kysely-compiler';

export function buildSdiTareksparaistemeDeleteQuery(id: string) {
  const db = getQueryBuilder();
  return db
    .deleteFrom('sdi_tareksparaisteme')
    .where('sdi_tareksparaisteme.tareksparaistemeid', '=', id)
    .compile();
}
