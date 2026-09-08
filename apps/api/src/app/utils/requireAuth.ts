import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '@app/utils/jwt';

export interface AuthUser {
  id: number;
  email: string;
  type: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: Number(payload.sub), email: payload.email, type: payload.type };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.type !== 'admin') {
      res.status(403).json({ message: 'Admin only' });
      return;
    }
    next();
  });
}
