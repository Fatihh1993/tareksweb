import { getQueryBuilder } from './helpers/kysely-compiler';

type SearchOptions = {
  limit: number;
  term?: string | null;
  durum?: string | null;
};

export function buildSdiTareksaramaSearchQuery({ limit, term, durum }: SearchOptions) {
  const db = getQueryBuilder();
  let query = db.selectFrom('sdi_tareksarama_view').selectAll();

  if (term) {
    const likeTerm = `%${term}%`;
    query = query.where((eb) =>
      eb.or([
        eb('sdi_tareksarama_view.musteriad', 'like', likeTerm),
        eb('sdi_tareksarama_view.referansno', 'like', likeTerm),
        eb('sdi_tareksarama_view.subeadi', 'like', likeTerm),
      ]),
    );
  }

  if (durum) {
    query = query.where('sdi_tareksarama_view.durum', '=', durum);
  }

  return query.limit(limit).compile();
}
