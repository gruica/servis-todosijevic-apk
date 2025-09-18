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
    const result = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return result;
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : String(error));
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

export async function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromRequest(req);
  

  
  if (!token) {

    return res.status(401).json({ error: 'Potrebna je prijava' });
  }
  

  const payload = verifyToken(token);
  if (!payload) {

    return res.status(401).json({ error: 'Nevažeći token' });
  }
  

  
  // Get full user data from database to include technicianId
  const user = await storage.getUser(payload.userId);
  if (!user) {
    console.error(`❌ [JWT-AUTH] User not found in database for ID: ${payload.userId}`);
    return res.status(401).json({ error: 'Korisnik nije pronađen' });
  }
  
  // DEBUG: Log user data for supplier role troubleshooting
  if (user.role?.startsWith('supplier_')) {
    console.log(`🔍 [JWT-AUTH-DEBUG] Supplier user loaded from DB:`, {
      id: user.id,
      username: user.username,
      role: user.role,
      supplierId: user.supplierId,
      fullName: user.fullName,
      email: user.email
    });
  }
  
  // Attach user info to request
  (req as any).user = {
    id: payload.userId,
    username: payload.username,
    role: payload.role,
    technicianId: user.technicianId,
    fullName: user.fullName,
    email: user.email,
    companyName: user.companyName,
    supplierId: user.supplierId // CRITICAL: Add supplierId for supplier authorization
  };
  
  // Additional DEBUG: Log the final req.user object for suppliers
  if ((req as any).user.role?.startsWith('supplier_')) {
    console.log(`🔍 [JWT-AUTH-DEBUG] req.user object created:`, {
      id: (req as any).user.id,
      username: (req as any).user.username,
      role: (req as any).user.role,
      supplierId: (req as any).user.supplierId,
      requestUrl: req.url
    });
  }
  
  next();
}

// Alias for backwards compatibility
export const jwtAuth = jwtAuthMiddleware;

export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    // DEBUG: Log role validation details
    console.log(`🔍 [REQUIRE-ROLE-DEBUG] Role validation check:`, {
      requestUrl: req.url,
      requestMethod: req.method,
      userExists: !!user,
      userId: user?.id,
      username: user?.username,
      userRole: user?.role,
      userRoleType: typeof user?.role,
      allowedRoles: allowedRoles,
      roleMatch: user?.role ? allowedRoles.includes(user.role) : false,
      roleIncludes: allowedRoles.map(role => ({ role, matches: user?.role === role }))
    });
    
    if (!user) {
      console.error(`❌ [REQUIRE-ROLE-DEBUG] No user object found for ${req.url}`);
      return res.status(401).json({ error: 'Potrebna je prijava' });
    }
    
    if (!allowedRoles.includes(user.role)) {
      console.error(`❌ [REQUIRE-ROLE-DEBUG] Role authorization failed:`, {
        requestUrl: req.url,
        userId: user.id,
        username: user.username,
        actualRole: user.role,
        allowedRoles: allowedRoles,
        roleComparisons: allowedRoles.map(role => `'${role}' === '${user.role}' = ${role === user.role}`)
      });
      return res.status(403).json({ error: 'Nemate dozvolu za ovu akciju' });
    }
    
    console.log(`✅ [REQUIRE-ROLE-DEBUG] Role authorization success for ${user.username} (${user.role}) accessing ${req.url}`);
    next();
  };
}