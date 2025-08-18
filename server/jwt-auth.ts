import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('🚨 SECURITY WARNING: JWT_SECRET environment variable is required');
  throw new Error('JWT_SECRET environment variable must be set for security');
})();
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
  console.log('🔒 JWT Debug - Raw Authorization header:', authHeader);
  
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔒 JWT Debug - Extracted Bearer token:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('🔒 JWT Debug - Authorization header exists but no Bearer prefix');
    }
  }
  
  // Check cookie as fallback
  if (req.cookies && req.cookies.auth_token) {
    console.log('🔒 JWT Debug - Found token in cookies');
    return req.cookies.auth_token;
  }
  
  console.log('🔒 JWT Debug - No token found in headers or cookies');
  return null;
}

export async function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromRequest(req);
  
  console.log('🔒 JWT Auth Debug - Request path:', req.path);
  console.log('🔒 JWT Auth Debug - Authorization header:', req.headers.authorization ? 'postoji' : 'ne postoji');
  
  if (!token) {
    console.log('🔒 JWT Auth: Token nije pronađen u zahtev');
    return res.status(401).json({ error: 'Potrebna je prijava' });
  }
  
  console.log('🔒 JWT Auth: Verifikujem token:', token.substring(0, 50) + '...');
  const payload = verifyToken(token);
  if (!payload) {
    console.log('🔒 JWT Auth: Token verifikacija neuspešna');
    return res.status(401).json({ error: 'Nevažeći token' });
  }
  
  console.log('🔒 JWT Auth: Token uspešno verifikovan:', payload);
  
  // Get full user data from database to include technicianId
  const user = await storage.getUser(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'Korisnik nije pronađen' });
  }
  
  // Attach user info to request
  (req as any).user = {
    id: payload.userId,
    username: payload.username,
    role: payload.role,
    technicianId: user.technicianId,
    fullName: user.fullName,
    email: user.email,
    companyName: user.companyName
  };
  
  next();
}

// Alias for backwards compatibility
export const jwtAuth = jwtAuthMiddleware;

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