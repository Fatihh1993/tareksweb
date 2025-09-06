import { getPool } from '../db';
import sql from 'mssql';

export type AuthUser = {
  kullaniciid?: number;
  kod?: string;
  ad?: string;
  email?: string;
  bilgeuser?: unknown;
};

export async function authenticate(username: string, password: string): Promise<{ success: boolean; user?: AuthUser; message?: string }>{
  try {
    const pool = await getPool();
    const passwordUpper = String(password).toUpperCase();

    const request = pool.request();
    request.input('user', sql.VarChar(128), username);
    request.input('sifre', sql.VarChar(50), passwordUpper);

    const query = `
      SELECT kullaniciid, kod, ad, engelle, muhasebekod,
        dbo.sky_kullanici_ok(@user,@sifre) AS kullaniciok, email, bilgeuser
      FROM sky_kullanici
      WHERE kod = @user
    `;

    const result = await request.query(query);
    if (result.recordset && result.recordset.length > 0) {
      const row = result.recordset[0];
      const ok = row.kullaniciok === true || row.kullaniciok === 1;

      if (ok) {
        const user: AuthUser = {
          kullaniciid: row.kullaniciid,
          kod: row.kod,
          ad: row.ad,
          email: row.email,
          bilgeuser: row.bilgeuser,
        };
        return { success: true, user };
      }
    }

    return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth service] authenticate error:', msg);
    throw err;
  }
}
