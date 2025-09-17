import { TareksDetayRow, TareksSearchFilters, TareksSearchRow } from '../models/tareks';

export interface ITareksRepository {
  search(filters: TareksSearchFilters): Promise<TareksSearchRow[]>;
  getDetay(tareksMasterId: string): Promise<TareksDetayRow[]>;
}
