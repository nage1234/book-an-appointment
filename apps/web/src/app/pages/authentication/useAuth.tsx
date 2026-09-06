import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@baa/types';
import type { AuthResponse, LoginCredentials, RegisterData } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const STORAGE_KEY = 'baa.auth';

interface StoredAuth {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  /** Creates the account. Does NOT log in - the flow sends the user to /login. */
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

// base64 - obfuscation, not security. HTTPS is what protects the password in
// transit; this just keeps the plain text out of the JSON body / server logs.
function encodePassword(plain: string): string {
  const bytes = new TextEncoder().encode(plain);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(readStored);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_id: credentials.email_id.trim(),
        password: encodePassword(credentials.password),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as Partial<AuthResponse>;
    if (!res.ok || !data.token || !data.user) {
      throw new Error(data.message || 'Login failed. Check your email and password.');
    }

    const next: StoredAuth = { token: data.token, user: data.user };
    setAuth(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked - session just won't survive a refresh */
    }
    return data.user;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name.trim(),
        email_id: data.email_id.trim(),
        password: encodePassword(data.password),
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message || 'Registration failed. Please try again.');
    }
    // Intentionally ignore the returned token - the user signs in fresh at /login.
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage blocked - session just won't survive a refresh */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      isAuthenticated: !!auth?.token,
      login,
      register,
      logout,
    }),
    [auth, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
