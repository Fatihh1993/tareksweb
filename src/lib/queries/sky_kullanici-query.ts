import { sql } from 'kysely';
import { getQueryBuilder } from './helpers/kysely-compiler';

export function buildSkyKullaniciQuery(user: string, sifre: string) {
  const db = getQueryBuilder();
  return db
    .selectFrom('sky_kullanici')
    .select((eb) => [
      'sky_kullanici.kullaniciid as kullaniciid',
      'sky_kullanici.kod as kod',
      'sky_kullanici.ad as ad',
      'sky_kullanici.engelle as engelle',
      'sky_kullanici.muhasebekod as muhasebekod',
      sql`dbo.sky_kullanici_ok(${user}, ${sifre})`.as('kullaniciok'),
      'sky_kullanici.email as email',
      'sky_kullanici.bilgeuser as bilgeuser',
    ])
    .where('sky_kullanici.kod', '=', user)
    .compile();
}
