/**
 * SSL/TLS Security Configuration
 * Implementacija SSL protokola za bezbednost aplikacije
 */

import { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// SSL Security Headers
export interface SSLConfig {
  enableHTTPS?: boolean;
  enableHSTS?: boolean;
  enableCSP?: boolean;
  enableRateLimit?: boolean;
  maxRequests?: number;
  windowMs?: number;
}

const defaultSSLConfig: SSLConfig = {
  enableHTTPS: true,
  enableHSTS: true,
  enableCSP: true,
  enableRateLimit: true,
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minuta
};

/**
 * Middleware za HTTPS redirekciju
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction) {
  // Proveravamo da li je zahtev preko HTTPS-a
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    const httpsUrl = `https://${req.header('host')}${req.url}`;
    return res.redirect(301, httpsUrl);
  }
  next();
}

/**
 * Konfiguracija Helmet-a za bezbednost
 */
function getHelmetConfig() {
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "wss:"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000, // 1 godina
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  };
}

/**
 * Rate Limiting konfiguracija
 */
function getRateLimitConfig(config: SSLConfig) {
  // Više limite za development
  const isDevelopment = process.env.NODE_ENV === 'development';
  const maxRequests = isDevelopment ? 1000 : (config.maxRequests || 100);
  const windowMs = isDevelopment ? 60 * 1000 : (config.windowMs || 15 * 60 * 1000);
  
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      error: 'Previše zahteva',
      message: 'Molimo pokušajte ponovo nakon nekoliko minuta',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Excluduj Vite dev server zahteve
    skip: (req) => {
      return isDevelopment && (
        req.url?.includes('/@vite/') ||
        req.url?.includes('/@fs/') ||
        req.url?.includes('/@id/') ||
        req.url?.includes('/src/') ||
        req.url?.includes('/node_modules/')
      );
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Previše zahteva',
        message: 'Molimo pokušajte ponovo nakon nekoliko minuta',
        retryAfter: Math.round(windowMs / 1000),
      });
    },
  });
}

/**
 * Glavna funkcija za konfiguraciju SSL-a
 */
export function configureSSL(app: Express, config: SSLConfig = defaultSSLConfig) {
  console.log('[SSL] Konfiguracija SSL/TLS bezbednosti...');

  // HTTPS redirekcija
  if (config.enableHTTPS) {
    app.use(httpsRedirect);
    console.log('[SSL] HTTPS redirekcija aktivirana');
  }

  // Helmet za bezbednosne zaglavlja
  app.use(helmet(getHelmetConfig()));
  console.log('[SSL] Helmet bezbednosni zaglavlja aktivirana');

  // Kompresija za bolje performanse
  app.use(compression());
  console.log('[SSL] Kompresija aktivirana');

  // Rate limiting
  if (config.enableRateLimit) {
    app.use(getRateLimitConfig(config));
    console.log('[SSL] Rate limiting aktiviran');
  }

  // Custom security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Dodatni bezbednosni zaglavlja
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // HSTS za HTTPS
    if (config.enableHSTS && req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
  });

  console.log('[SSL] Sve SSL/TLS bezbednosne mere aktivirane');
}

/**
 * Middleware za logovanje bezbednosnih događaja
 */
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    // Loguj sumnjive aktivnosti
    if (res.statusCode >= 400) {
      console.log('[SECURITY]', JSON.stringify(logData));
    }
  });

  next();
}

/**
 * Middleware za CORS sa SSL podrškom
 */
export function configureSSLCORS(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://www.frigosistemtodosijevic.me',
      'https://frigosistemtodosijevic.me',
      'https://admin.frigosistemtodosijevic.me',
      process.env.REPLIT_DOMAIN ? `https://${process.env.REPLIT_DOMAIN}` : null,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  });
}