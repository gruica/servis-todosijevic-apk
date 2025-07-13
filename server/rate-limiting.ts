import { Request, Response } from 'express';
import { storage } from './storage';

interface RateLimitConfig {
  windowMs: number; // Vremenski okvir u milisekundama
  maxRequests: number; // Maksimalni broj zahteva u vremenskom okviru
  requestType: string; // Tip zahteva (service_request, registration, etc.)
  roleSpecific?: string; // Specifična uloga (customer, etc.)
}

// Konfiguracija rate limita
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  service_request_customer: {
    windowMs: 24 * 60 * 60 * 1000, // 24 sata
    maxRequests: 1, // Jedan zahtev dnevno
    requestType: 'service_request',
    roleSpecific: 'customer'
  },
  registration: {
    windowMs: 60 * 60 * 1000, // 1 sat
    maxRequests: 3, // 3 pokušaja registracije po satu
    requestType: 'registration'
  }
};

export async function checkRateLimit(req: Request, res: Response, next: Function) {
  try {
    const user = req.user;
    const requestType = req.body.requestType || 'service_request';
    const userRole = user?.role || 'anonymous';
    
    // Određuje koji rate limit config koristiti
    let configKey = requestType;
    if (userRole === 'customer' && requestType === 'service_request') {
      configKey = 'service_request_customer';
    }
    
    const config = rateLimitConfigs[configKey];
    if (!config) {
      return next(); // Nema rate limit konfiguracije za ovaj tip zahteva
    }
    
    // Proverava da li je uloga ograničena
    if (config.roleSpecific && userRole !== config.roleSpecific) {
      return next(); // Rate limit ne važi za ovu ulogu
    }
    
    if (!user || !user.id) {
      return res.status(401).json({
        error: "Neautentifikovani korisnik",
        message: "Molimo prijavite se da biste poslali zahtev."
      });
    }
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    
    // Broji zahteve u određenom vremenskom okviru
    const requestCount = await storage.getRequestCount(
      user.id,
      config.requestType,
      windowStart
    );
    
    if (requestCount >= config.maxRequests) {
      const nextAllowedTime = new Date(windowStart.getTime() + config.windowMs);
      
      return res.status(429).json({
        error: "Previše zahteva",
        message: `Možete poslati samo ${config.maxRequests} ${getRequestTypeDisplay(config.requestType)} u periodu od ${getTimeDisplay(config.windowMs)}. Pokušajte ponovo ${formatTime(nextAllowedTime)}.`,
        retryAfter: Math.ceil((nextAllowedTime.getTime() - now.getTime()) / 1000),
        nextAllowedTime: nextAllowedTime.toISOString()
      });
    }
    
    // Dodaje trenutni zahtev u tracking
    await storage.addRequestTracking({
      userId: user.id,
      requestType: config.requestType,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      requestDate: now,
      successful: true
    });
    
    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    res.status(500).json({
      error: "Greška sistema",
      message: "Pokušajte ponovo kasnije."
    });
  }
}

// Middleware specifično za zahteve za servis od klijenata
export async function checkServiceRequestRateLimit(req: Request, res: Response, next: Function) {
  req.body.requestType = 'service_request';
  return checkRateLimit(req, res, next);
}

// Middleware za registraciju
export async function checkRegistrationRateLimit(req: Request, res: Response, next: Function) {
  req.body.requestType = 'registration';
  return checkRateLimit(req, res, next);
}

// Pomoćne funkcije za formatiranje poruka
function getRequestTypeDisplay(requestType: string): string {
  switch (requestType) {
    case 'service_request':
      return 'zahtev za servis';
    case 'registration':
      return 'pokušaj registracije';
    default:
      return 'zahtev';
  }
}

function getTimeDisplay(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    return `${Math.floor(hours / 24)} dan${hours / 24 > 1 ? 'a' : ''}`;
  } else if (hours > 0) {
    return `${hours} sat${hours > 1 ? 'a' : ''}`;
  } else {
    return `${minutes} minut${minutes > 1 ? 'a' : ''}`;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleString('sr-RS', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// API endpoint za proveru trenutnog statusa rate limita
export async function getRateLimitStatus(req: Request, res: Response) {
  try {
    const user = req.user;
    const requestType = req.query.requestType as string || 'service_request';
    
    if (!user || !user.id) {
      return res.status(401).json({
        error: "Neautentifikovani korisnik",
        message: "Molimo prijavite se."
      });
    }
    
    const userRole = user.role || 'anonymous';
    let configKey = requestType;
    if (userRole === 'customer' && requestType === 'service_request') {
      configKey = 'service_request_customer';
    }
    
    const config = rateLimitConfigs[configKey];
    if (!config) {
      return res.json({
        rateLimited: false,
        message: "Nema ograničenja za ovaj tip zahteva."
      });
    }
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    
    const requestCount = await storage.getRequestCount(
      user.id,
      config.requestType,
      windowStart
    );
    
    const isRateLimited = requestCount >= config.maxRequests;
    const nextAllowedTime = isRateLimited 
      ? new Date(windowStart.getTime() + config.windowMs)
      : null;
    
    res.json({
      rateLimited: isRateLimited,
      requestCount,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      nextAllowedTime: nextAllowedTime?.toISOString() || null,
      message: isRateLimited 
        ? `Dostigli ste maksimalni broj zahteva (${config.maxRequests}) u periodu od ${getTimeDisplay(config.windowMs)}.`
        : `Možete poslati još ${config.maxRequests - requestCount} zahtev${config.maxRequests - requestCount > 1 ? 'a' : ''}.`
    });
  } catch (error) {
    console.error('Get rate limit status error:', error);
    res.status(500).json({
      error: "Greška sistema",
      message: "Pokušajte ponovo kasnije."
    });
  }
}