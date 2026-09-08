import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/**
 * The one shared fetch wrapper. Prefixes VITE_API_URL, attaches the bearer token
 * from AuthContext, throws on non-2xx, and logs out + redirects on 401.
 */
export function useApiFetch() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  return useCallback(
    async <T = unknown>(path: string, opts: RequestInit = {}): Promise<T> => {
      const res = await fetch(`${API_URL}${path}`, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...opts.headers,
        },
      });

      if (res.status === 401) {
        logout();
        navigate('/login');
        throw new Error('Your session has expired. Please sign in again.');
      }

      const data = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const message = (data as { message?: string }).message ?? `Request failed (${res.status})`;
        throw new Error(message);
      }
      return data as T;
    },
    [token, logout, navigate]
  );
}
