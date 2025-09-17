export type TareksSearchRow = Record<string, unknown>;
export type TareksDetayRow = Record<string, unknown>;
export type TareksParaIstemeRow = Record<string, unknown>;

export type TareksSearchFilters = {
  limit?: number;
  term?: string;
  durum?: string;
};

export type TareksParaIstemeCreateInput = {
  masterId: string;
  tutar?: number;
  dovizkod?: string;
  tip?: number | null;
  kdvoran?: number | null;
  tahakkukno?: string | null;
  insuser?: string | null;
};
