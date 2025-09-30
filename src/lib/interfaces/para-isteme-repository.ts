export interface CreateParaIstemeDto {
  tareksmasterid: string;
  tutar: number;
  dovizkod: string;
  tip: number | null;
  kdvoran: number | null;
  tahakkukno: string | null;
  insuser: string;
}

export interface ParaIstemeItem {
  tareksparaistemeid: string;
  tareksmasterid: string;
  tutar: number | null;
  dovizkod: string | null;
  tip: number | null;
  kdvoran: number | null;
  tahakkukno: string | null;
  insuser: string | null;
  instime: Date | null;
  upduser: string | null;
  updtime: Date | null;
  tediyeistemeid: string | null;
}

export interface IParaIstemeRepository {
  listByMasterId(masterId: string): Promise<ParaIstemeItem[]>;
  create(data: CreateParaIstemeDto): Promise<string>; // returns new id
  delete(id: string): Promise<void>;
}