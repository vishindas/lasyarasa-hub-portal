export type UserRole = 'CLIENT' | 'PROVIDER' | 'SCHOOL_ADMIN' | 'HUB_ADMIN' | 'SUPER_ADMIN';

export interface AuthResponse {
  token: string;
  email: string;
  role: UserRole;
  providerId: number | null;
}

export interface CurrentUser {
  email: string;
  role: UserRole;
  providerId: number | null;
}
