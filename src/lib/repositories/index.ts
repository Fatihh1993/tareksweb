import { IAuthRepository } from '../interfaces/auth-repository';
import { IMasrafTurRepository } from '../interfaces/masraf-tur-repository';
import { ITareksBeyanRepository } from '../interfaces/tareks-beyan-repository';
import { ITareksRepository } from '../interfaces/tareks-repository';
import { IParaIstemeRepository } from '../interfaces/para-isteme-repository';
import { MssqlAuthRepository } from './mssql/auth.repository';
import { MssqlMasrafTurRepository } from './mssql/masraf-tur.repository';
import { MssqlTareksBeyanRepository } from './mssql/tareks-beyan.repository';
import { MssqlTareksRepository } from './mssql/tareks.repository';
import { MssqlParaIstemeRepository } from './mssql/para-isteme.repository';

const authRepository: IAuthRepository = new MssqlAuthRepository();
const tareksRepository: ITareksRepository = new MssqlTareksRepository();
const tareksBeyanRepository: ITareksBeyanRepository = new MssqlTareksBeyanRepository();
const masrafTurRepository: IMasrafTurRepository = new MssqlMasrafTurRepository();
const paraIstemeRepository: IParaIstemeRepository = new MssqlParaIstemeRepository();

export function getAuthRepository(): IAuthRepository {
  return authRepository;
}

export function getTareksRepository(): ITareksRepository {
  return tareksRepository;
}

export function getTareksBeyanRepository(): ITareksBeyanRepository {
  return tareksBeyanRepository;
}

export function getMasrafTurRepository(): IMasrafTurRepository {
  return masrafTurRepository;
}

export function getParaIstemeRepository(): IParaIstemeRepository {
  return paraIstemeRepository;
}
