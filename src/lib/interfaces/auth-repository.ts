import { AuthUser } from '../models/auth-user';

export interface IAuthRepository {
  findByCredentials(username: string, password: string): Promise<AuthUser | null>;
}
