import { getPool } from '../../db';
import { IAuthRepository } from '../../interfaces/auth-repository';
import { AuthUser } from '../../models/auth-user';
import { executeCompiledQuery } from '../../queries/helpers/execute-compiled-query';
import { buildSkyKullaniciQuery } from '../../queries/sky_kullanici-query';

export class MssqlAuthRepository implements IAuthRepository {
  async findByCredentials(username: string, password: string): Promise<AuthUser | null> {
    const pool = await getPool();
    const request = pool.request();

    const compiled = buildSkyKullaniciQuery(username, password.toUpperCase());
    const result = await executeCompiledQuery(request, compiled);
    const row = result.recordset?.[0];
    if (!row) return null;

    const ok = row.kullaniciok === true || row.kullaniciok === 1;
    if (!ok) return null;

    const user: AuthUser = {
      kullaniciid: row.kullaniciid,
      kod: row.kod,
      ad: row.ad,
      email: row.email,
      bilgeuser: row.bilgeuser,
    };

    return user;
  }
}
