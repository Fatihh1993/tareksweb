import { getQueryBuilder } from './helpers/kysely-compiler';

export function buildSdiTareksdetayViewQuery(tareksMasterId: string) {
  const db = getQueryBuilder();
  return db
    .selectFrom('sdi_tareksdetay_view')
    .selectAll()
    .where('sdi_tareksdetay_view.tareksmasterid', '=', tareksMasterId)
    .compile();
}
