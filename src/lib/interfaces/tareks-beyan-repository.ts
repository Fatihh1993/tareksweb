import { TareksParaIstemeCreateInput, TareksParaIstemeRow } from '../models/tareks';

export interface ITareksBeyanRepository {
  listByMaster(masterId: string): Promise<TareksParaIstemeRow[]>;
  create(input: TareksParaIstemeCreateInput): Promise<string | null>;
  delete(id: string): Promise<boolean>;
}
