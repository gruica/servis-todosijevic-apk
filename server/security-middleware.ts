import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent, SecurityEventType, isIPBlocked } from './security-monitor.js';

// 🛡️ SECURITY MIDDLEWARE STACK
// Real-time threat detection and blocking

// 🚫 IP Blocking Middleware
export function ipBlockingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  
  if (isIPBlocked(ip)) {
    logSecurityEvent(SecurityEventType.IP_BLOCKING_REQUIRED, {
      action: 'blocked_request',
      ip,
      path: req.path,
      method: req.method
    }, req);
    
    res.status(403).json({ 
      error: 'Access denied - IP blocked due to security violations',
      code: 'IP_BLOCKED'
    });
    return;
  }
  
  next();
}

// 🔍 Malicious Request Detection
export function maliciousRequestDetector(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.headers['user-agent'] || '';
  const path = req.path;
  const query = JSON.stringify(req.query);
  const body = req.method === 'POST' ? JSON.stringify(req.body) : '';
  
  // Detect scanning tools u User-Agent
  const scannerPatterns = [
    /sqlmap/i, /burpsuite/i, /nikto/i, /dirb/i, /gobuster/i, 
    /nmap/i, /masscan/i, /curl.*\-\-data/i, /wget/i, /python\-requests/i
  ];
  
  if (scannerPatterns.some(pattern => pattern.test(userAgent))) {
    logSecurityEvent(SecurityEventType.SUSPICIOUS_USER_AGENT, {
      userAgent,
      path,
      suspiciousPattern: 'scanner_tool_detected'
    }, req);
  }
  
  // SQL Injection detection
  const sqlPatterns = [
    /union\s+select/i, /\'\s*or\s*1\s*=\s*1/i, /\'\s*;\s*drop\s+table/i,
    /information_schema/i, /exec\s*\(/i, /xp_cmdshell/i, /load_file\s*\(/i
  ];
  
  const requestContent = `${path} ${query} ${body}`;
  if (sqlPatterns.some(pattern => pattern.test(requestContent))) {
    logSecurityEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, {
      path,
      query: req.query,
      body: req.body,
      detectedPattern: 'sql_injection_pattern'
    }, req);
  }
  
  // XSS detection
  const xssPatterns = [
    /<script[^>]*>/i, /javascript:/i, /onerror\s*=/i, /onclick\s*=/i,
    /alert\s*\(/i, /document\.cookie/i, /eval\s*\(/i
  ];
  
  if (xssPatterns.some(pattern => pattern.test(requestContent))) {
    logSecurityEvent(SecurityEventType.XSS_ATTEMPT, {
      path,
      query: req.query,
      body: req.body,
      detectedPattern: 'xss_pattern'
    }, req);
  }
  
  // Command Injection detection
  const cmdPatterns = [
    /\|\s*cat\s+/i, /\|\s*ls\s+/i, /\|\s*whoami/i, /\|\s*id\s*/i,
    /\;\s*cat\s+/i, /\;\s*ls\s+/i, /\&\&\s*cat\s+/i, /`.*`/i
  ];
  
  if (cmdPatterns.some(pattern => pattern.test(requestContent))) {
    logSecurityEvent(SecurityEventType.COMMAND_INJECTION, {
      path,
      query: req.query,
      body: req.body,
      detectedPattern: 'command_injection_pattern'
    }, req);
  }
  
  next();
}

// 📊 Request Analysis Middleware  
export function requestAnalysisMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Monitor za memory exhaustion attacks
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 10 * 1024 * 1024) { // 10MB
    logSecurityEvent(SecurityEventType.MEMORY_ATTACK, {
      contentLength,
      path: req.path,
      suspiciousActivity: 'large_payload_attack'
    }, req);
  }
  
  // Monitor za path traversal u URL-u
  if (req.path.includes('..')) {
    logSecurityEvent(SecurityEventType.PATH_TRAVERSAL_ATTEMPT, {
      path: req.path,
      originalUrl: req.originalUrl,
      detectedPattern: 'path_traversal_in_url'
    }, req);
  }
  
  // Hook into response to measure response time (DoS detection)
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    
    // Detect potential DoS patterns (very slow responses)
    if (duration > 5000) { // 5+ seconds
      logSecurityEvent(SecurityEventType.DOS_ATTACK, {
        path: req.path,
        duration,
        method: req.method,
        suspiciousActivity: 'slow_response_attack'
      }, req);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

// 🔐 Authentication Security Middleware
export function authSecurityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Monitor za brute force attacks
  if (req.path.includes('/login') || req.path.includes('/auth')) {
    const ip = req.ip || 'unknown';
    
    // Check za multiple rapid requests (brute force indicator)
    // Ovo će biti prošireno sa Redis tracking-om kasnije
    
    res.on('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        logSecurityEvent(SecurityEventType.FAILED_LOGIN, {
          path: req.path,
          statusCode: res.statusCode,
          username: req.body?.username || 'unknown',
          suspiciousActivity: 'authentication_failure'
        }, req);
      }
    });
  }
  
  // Monitor privileged endpoints
  const privilegedPaths = ['/api/admin', '/api/security', '/api/users'];
  if (privilegedPaths.some(path => req.path.startsWith(path))) {
    const userRole = req.user?.role || 'unauthenticated';
    
    if (userRole !== 'admin') {
      logSecurityEvent(SecurityEventType.PRIVILEGE_ESCALATION, {
        path: req.path,
        userRole,
        attemptedAccess: 'privileged_endpoint',
        suspiciousActivity: 'unauthorized_access_attempt'
      }, req);
    }
  }
  
  next();
}

// 🌐 Advanced CORS Security
export function advancedCorsSecurityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  
  // Log sve CORS zahteve za analizu
  if (origin) {
    const allowedOrigins = [
      'https://tehnikamne.me',
      'https://www.tehnikamne.me',
      'http://127.0.0.1:5000',
      'http://localhost:5000'
    ];
    
    if (!allowedOrigins.includes(origin)) {
      logSecurityEvent(SecurityEventType.CORS_VIOLATION, {
        origin,
        path: req.path,
        method: req.method,
        referer: req.headers.referer,
        suspiciousActivity: 'unauthorized_origin'
      }, req);
    }
  }
  
  next();
}

// 📝 Security Headers Middleware
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Dodatni security headers
  res.setHeader('X-Request-ID', generateRequestID());
  res.setHeader('X-Security-Policy', 'strict');
  
  // Content Type validation
  if (req.method === 'POST' && req.headers['content-type']) {
    const allowedTypes = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'];
    const contentType = req.headers['content-type'].split(';')[0];
    
    if (!allowedTypes.some(type => contentType.includes(type))) {
      logSecurityEvent(SecurityEventType.MALICIOUS_FILE_UPLOAD, {
        contentType,
        path: req.path,
        suspiciousActivity: 'unusual_content_type'
      }, req);
    }
  }
  
  next();
}

// 🔢 Request ID generator
function generateRequestID(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 🛡️ Complete Security Stack - kombinirani middleware
export function completeSecurityStack() {
  return [
    ipBlockingMiddleware,
    requestAnalysisMiddleware,
    maliciousRequestDetector,
    authSecurityMiddleware,
    advancedCorsSecurityMiddleware,
    securityHeadersMiddleware
  ];
}