import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../database/db';

const JWT_SECRET = process.env.SESSION_SECRET || 'upi_pay_super_secure_jwt_secret_key_2026';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  avatar_url?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.upipay_token;
  
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Verify user still exists in database
    const dbUser = await queryOne(
      'SELECT id, email, username, role, avatar_url, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (dbUser && dbUser.status === 'ACTIVE') {
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        role: dbUser.role,
        avatar_url: dbUser.avatar_url
      };
    }
  } catch (err) {
    // Invalid/expired token - continue unauthenticated
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action.'
    });
    return;
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required.'
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Admin privileges required for this action.'
    });
    return;
  }

  next();
}
