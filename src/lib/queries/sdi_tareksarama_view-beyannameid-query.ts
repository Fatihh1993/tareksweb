import { getQueryBuilder } from './helpers/kysely-compiler';

export function buildSdiTareksaramaViewBeyannameIdQuery(tareksMasterId: string) {
  const db = getQueryBuilder();
  return db
    .selectFrom('sdi_tareksarama_view')
    .select(['sdi_tareksarama_view.beyannameid as beyannameid'])
    .where('sdi_tareksarama_view.tareksmasterid', '=', tareksMasterId)
    .limit(1)
    .compile();
}
