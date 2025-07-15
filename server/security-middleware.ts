import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiting konfiguracija
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 100, // Maksimalno 100 zahteva po IP adresi
  message: {
    error: 'Previše zahteva sa ove IP adrese. Pokušajte ponovo za 15 minuta.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5, // Maksimalno 5 pokušaja prijavljivanja
  message: {
    error: 'Previše pokušaja prijavljivanja. Pokušajte ponovo za 15 minuta.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware za validaciju parametara
export function validateRouteParams(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  
  // Provera da li je ID valjan broj
  if (id && (isNaN(Number(id)) || Number(id) <= 0)) {
    return res.status(400).json({ 
      error: 'Nevaljan ID parametar' 
    });
  }
  
  next();
}

// Middleware za sanitizaciju input podataka
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Uklanjanje potencijalno opasnih karaktera iz svih stringova
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Uklanja script tagove
        .replace(/<[^>]*>/g, '') // Uklanja HTML tagove
        .replace(/javascript:/gi, '') // Uklanja javascript: protokol
        .replace(/on\w+\s*=/gi, '') // Uklanja event handlere
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

// Middleware za SQL injection zaštitu
export function sqlInjectionProtection(req: Request, res: Response, next: NextFunction) {
  const checkSqlInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
        /(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/i,
        /(--|#|\/\*|\*\/)/,
        /(\b(WAITFOR|DELAY)\b)/i,
        /(\b(xp_|sp_)\w+)/i
      ];
      
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    
    if (Array.isArray(value)) {
      return value.some(checkSqlInjection);
    }
    
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkSqlInjection);
    }
    
    return false;
  };
  
  if (checkSqlInjection(req.body) || checkSqlInjection(req.query) || checkSqlInjection(req.params)) {
    return res.status(400).json({
      error: 'Otkriveni potencijalno opasni podaci u zahtevu'
    });
  }
  
  next();
}

// Middleware za autentifikaciju
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Neautorizovan pristup. Molimo prijavite se.'
    });
  }
  next();
}

// Middleware za autorizaciju po ulogama
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Neautorizovan pristup. Molimo prijavite se.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Nemate dozvolu za pristup ovom resursu.'
      });
    }
    
    next();
  };
}

// Middleware za zaštitu od CSRF napada
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Provera da li je zahtev došao iz dozvoljenog origine
  const allowedOrigins = [
    'http://localhost:5000',
    'https://localhost:5000',
    process.env.REPLIT_DOMAINS || '',
    process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.replit.app` : ''
  ].filter(Boolean);
  
  const origin = req.headers.origin || req.headers.referer;
  
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!origin || !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return res.status(403).json({
        error: 'Nevaljan origin zahteva'
      });
    }
  }
  
  next();
}

// Middleware za logovanje sigurnosnih događaja
export function securityLogging(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      user: req.user ? `${req.user.username} (${req.user.role})` : 'Anonymous',
      status: res.statusCode,
      duration: `${duration}ms`
    };
    
    // Loguj sumnjive aktivnosti
    if (res.statusCode >= 400 || duration > 5000) {
      console.log('🔒 Sigurnosni događaj:', JSON.stringify(logData));
    }
  });
  
  next();
}

// Middleware za ograničavanje pristupa osetljivim operacijama
export function sensitiveOperationProtection(req: Request, res: Response, next: NextFunction) {
  const sensitiveEndpoints = [
    '/api/users',
    '/api/admin',
    '/api/excel',
    '/api/services/assign',
    '/api/notifications/send'
  ];
  
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );
  
  if (isSensitive) {
    // Dodatna provera za admin ulogu
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Pristup ograničen na administratore'
      });
    }
    
    // Dodatno logovanje za osetljive operacije
    console.log('🔐 Osetljiva operacija:', {
      user: req.user.username,
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}