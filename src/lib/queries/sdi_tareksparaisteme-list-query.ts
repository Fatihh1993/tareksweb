import { getQueryBuilder } from './helpers/kysely-compiler';

export function buildSdiTareksparaistemeListQuery(masterId: string) {
  const db = getQueryBuilder();
  return db
    .selectFrom('sdi_tareksparaisteme')
    .select((eb) => [
      eb.ref('sdi_tareksparaisteme.tareksparaistemeid').as('ParaIstemeId'),
      eb.ref('sdi_tareksparaisteme.tutar').as('Tutar'),
      eb.ref('sdi_tareksparaisteme.dovizkod').as('Doviz Kod'),
      eb.ref('sdi_tareksparaisteme.tip').as('Tip'),
      eb.ref('sdi_tareksparaisteme.kdvoran').as('KDV Oran'),
      eb.ref('sdi_tareksparaisteme.tahakkukno').as('Tahakkuk No'),
      eb.ref('sdi_tareksparaisteme.insuser').as('Kayit Kullanici'),
      eb.ref('sdi_tareksparaisteme.instime').as('Kayit Tarihi'),
      eb.ref('sdi_tareksparaisteme.upduser').as('Son Islem Kullanici'),
      eb.ref('sdi_tareksparaisteme.updtime').as('Son Islem Tarihi'),
      eb.ref('sdi_tareksparaisteme.tediyeistemeid').as('TediyeId'),
    ])
    .where('sdi_tareksparaisteme.tareksmasterid', '=', masterId)
    .orderBy('sdi_tareksparaisteme.instime', 'desc')
    .compile();
}
