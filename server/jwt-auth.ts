import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'frigo-sistem-jwt-secret-key-2025';
const JWT_EXPIRES_IN = '30d';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie as fallback
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }
  
  return null;
}

export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    console.log('JWT: No token found in request');
    return res.status(401).json({ error: 'Potrebna je prijava' });
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    console.log('JWT: Invalid token');
    return res.status(401).json({ error: 'Nevažeći token' });
  }
  
  // Attach user info to request
  (req as any).user = {
    id: payload.userId,
    username: payload.username,
    role: payload.role
  };
  
  console.log(`JWT: Authenticated user ${payload.username} (${payload.role})`);
  next();
}

export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Potrebna je prijava' });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Nemate dozvolu za ovu akciju' });
    }
    
    next();
  };
}