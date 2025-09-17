import { AuthUser } from '../models/auth-user';
import { getAuthRepository } from '../repositories';

export type { AuthUser } from '../models/auth-user';

export async function authenticate(
  username: string,
  password: string,
): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
  try {
    const repository = getAuthRepository();
    const user = await repository.findByCredentials(username, password);

    if (user) {
      return { success: true, user };
    }

    return { success: false, message: 'Kullanici adi veya sifre hatali' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth service] authenticate error:', msg);
    throw err;
  }
}
