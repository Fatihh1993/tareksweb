import { MasrafTurRow } from '../models/masraf-tur';
import { getMasrafTurRepository } from '../repositories';

export async function listMasrafTur(): Promise<MasrafTurRow[]> {
  try {
    const repository = getMasrafTurRepository();
    return await repository.listKayitTipleri();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[masrafTurService] listMasrafTur error:', msg);
    throw err;
  }
}
