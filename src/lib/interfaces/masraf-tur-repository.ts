import { MasrafTurRow } from '../models/masraf-tur';

export interface IMasrafTurRepository {
  listKayitTipleri(): Promise<MasrafTurRow[]>;
}
