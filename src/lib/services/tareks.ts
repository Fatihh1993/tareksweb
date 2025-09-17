import { getTareksRepository } from '../repositories';
import { TareksDetayRow, TareksSearchFilters, TareksSearchRow } from '../models/tareks';

export async function searchTareks(filters: TareksSearchFilters = {}): Promise<TareksSearchRow[]> {
  try {
    const repository = getTareksRepository();
    return await repository.search(filters);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[tareksService] search error:', msg);
    throw err;
  }
}

export async function getTareksDetay(tareksMasterId: string): Promise<TareksDetayRow[]> {
  try {
    const repository = getTareksRepository();
    return await repository.getDetay(tareksMasterId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[tareksService] getTareksDetay error:', msg);
    throw err;
  }
}
