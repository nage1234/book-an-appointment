import jwt from 'jsonwebtoken';

// Stateless auth: nothing is stored server-side. The signature + expiry on the
// token itself is the only "storage" — verifying a request means re-checking
// the signature against JWT_SECRET, not looking anything up in a DB/session table.
export interface AuthTokenPayload {
  sub: number; // customer id
  email: string;
  type: string; // 'customer' | 'admin'
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function signToken(payload: AuthTokenPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '12h') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getSecret()) as unknown as AuthTokenPayload;
}
