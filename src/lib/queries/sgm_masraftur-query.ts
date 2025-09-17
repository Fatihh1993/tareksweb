import { getQueryBuilder } from './helpers/kysely-compiler';

export function buildSgmMasrafTurQuery() {
  const db = getQueryBuilder();
  return db
    .selectFrom('sgm_masraftur')
    .select(['sgm_masraftur.kdvoran as kdvoran', 'sgm_masraftur.tarekskayittip as tarekskayittip', 'sgm_masraftur.adi as adi'])
    .where('sgm_masraftur.tarekskayittip', 'in', [0, 1, 2])
    .orderBy('sgm_masraftur.tarekskayittip')
    .compile();
}
