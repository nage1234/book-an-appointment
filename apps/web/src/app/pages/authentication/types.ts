import type { AuthUser } from '@baa/types';

/**
 * What the login form collects. `password` is plain here - `useAuth` base64-encodes
 * it before it goes in the request body. No `type`: the account already has one,
 * and the server returns it - the client never chooses it.
 */
export interface LoginCredentials {
  email_id: string;
  password: string;
}

/** What the registration form sends. `confirm password` is checked in the form only. */
export interface RegisterData {
  name: string;
  email_id: string;
  password: string;
}

/** Body returned by POST /api/auth/login and /api/auth/register. */
export interface AuthResponse {
  message?: string;
  token: string;
  user: AuthUser;
}
