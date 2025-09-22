import winston from 'winston';
import fs from 'fs';
import path from 'path';

// 🛡️ ENTERPRISE SECURITY MONITORING SYSTEM
// Advanced threat detection and real-time alerting

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: any;
  ip?: string;
  userAgent?: string;
  userId?: string;
  timestamp: string;
  threatLevel: number; // 1-10 scale
}

export enum SecurityEventType {
  // Authentication & Authorization
  FAILED_LOGIN = 'FAILED_LOGIN',
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
  
  // Network & Access
  CORS_VIOLATION = 'CORS_VIOLATION',
  IP_BLOCKING_REQUIRED = 'IP_BLOCKING_REQUIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_USER_AGENT = 'SUSPICIOUS_USER_AGENT',
  
  // File & Data
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  MALICIOUS_FILE_UPLOAD = 'MALICIOUS_FILE_UPLOAD',
  DATA_EXFILTRATION_ATTEMPT = 'DATA_EXFILTRATION_ATTEMPT',
  
  // Application Security
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  COMMAND_INJECTION = 'COMMAND_INJECTION',
  VULNERABILITY_EXPLOIT = 'VULNERABILITY_EXPLOIT',
  
  // System Health
  MEMORY_ATTACK = 'MEMORY_ATTACK',
  DOS_ATTACK = 'DOS_ATTACK',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  
  // System Configuration
  SECURITY_CONFIGURATION_CHANGE = 'SECURITY_CONFIGURATION_CHANGE',
  
  // Penetration Testing & Security Auditing
  VULNERABILITY_DETECTED = 'VULNERABILITY_DETECTED',
  AUTHENTICATION_BYPASS = 'AUTHENTICATION_BYPASS',
  PENETRATION_TEST_STARTED = 'PENETRATION_TEST_STARTED',
  PENETRATION_TEST_COMPLETED = 'PENETRATION_TEST_COMPLETED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  AUDIT_LOG_CLEARED = 'AUDIT_LOG_CLEARED'
}

// Kreiraj logs direktorijum ako ne postoji
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Winston security logger sa strukturiranim formatom
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'frigo-security' },
  transports: [
    // Security events log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'security-events.log'),
      level: 'warn'
    }),
    // Critical security events log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'security-critical.log'),
      level: 'error'
    }),
    // Console output u development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

// Threat intelligence - malicious patterns
const MALICIOUS_PATTERNS = {
  userAgents: [
    /sqlmap/i,
    /burpsuite/i,
    /nikto/i,
    /dirb/i,
    /gobuster/i,
    /nmap/i,
    /masscan/i,
    /curl.*\-\-data/i
  ],
  
  sqlInjection: [
    /union\s+select/i,
    /\'\s*or\s*1\s*=\s*1/i,
    /\'\s*;\s*drop\s+table/i,
    /information_schema/i,
    /exec\s*\(/i,
    /xp_cmdshell/i
  ],
  
  xss: [
    /<script[^>]*>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /alert\s*\(/i,
    /document\.cookie/i
  ],
  
  pathTraversal: [
    /\.\.\//,
    /\.\.\\/,
    /\.\.%2f/i,
    /\.\.%5c/i,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i
  ]
};

// IP tracking za rate limiting i blocking
const suspiciousIPs = new Map<string, {
  violations: number;
  lastViolation: Date;
  blocked: boolean;
  threatScore: number;
}>();

// 🚨 Main security event logger
export function logSecurityEvent(
  type: SecurityEventType, 
  details: any, 
  req?: any
): void {
  const ip = req?.ip || req?.connection?.remoteAddress || 'unknown';
  const userAgent = req?.headers?.['user-agent'] || 'unknown';
  const userId = req?.user?.id || req?.user?.userId || undefined;
  
  // Izračunaj threat level
  const threatLevel = calculateThreatLevel(type, details, userAgent);
  
  // Kreiraj security event
  const securityEvent: SecurityEvent = {
    type,
    severity: getThreatSeverity(threatLevel),
    details,
    ip,
    userAgent,
    userId,
    timestamp: new Date().toISOString(),
    threatLevel
  };
  
  // Logguj event
  const logLevel = threatLevel >= 8 ? 'error' : 'warn';
  securityLogger.log(logLevel, 'SECURITY_EVENT', securityEvent);
  
  // Update IP tracking
  updateIPThreatTracking(ip, threatLevel);
  
  // Real-time alerting za kritične događaje
  if (threatLevel >= 8) {
    triggerCriticalAlert(securityEvent);
  }
  
  // Auto-blocking za ekstremne pretnje
  if (threatLevel >= 9) {
    autoBlockIP(ip);
  }
}

// 📊 Threat level calculation (1-10)
function calculateThreatLevel(
  type: SecurityEventType, 
  details: any, 
  userAgent: string
): number {
  let baseLevel = getBaseThreatLevel(type);
  
  // Povećaj level na osnovu patterns
  if (isMaliciousUserAgent(userAgent)) {
    baseLevel += 2;
  }
  
  if (containsMaliciousPatterns(details)) {
    baseLevel += 3;
  }
  
  return Math.min(baseLevel, 10);
}

function getBaseThreatLevel(type: SecurityEventType): number {
  switch (type) {
    case SecurityEventType.SQL_INJECTION_ATTEMPT:
    case SecurityEventType.COMMAND_INJECTION:
    case SecurityEventType.PRIVILEGE_ESCALATION:
      return 8;
    
    case SecurityEventType.PATH_TRAVERSAL_ATTEMPT:
    case SecurityEventType.XSS_ATTEMPT:
    case SecurityEventType.SESSION_HIJACK_ATTEMPT:
      return 6;
    
    case SecurityEventType.CORS_VIOLATION:
    case SecurityEventType.MALICIOUS_FILE_UPLOAD:
    case SecurityEventType.RATE_LIMIT_EXCEEDED:
      return 4;
    
    case SecurityEventType.FAILED_LOGIN:
    case SecurityEventType.SUSPICIOUS_USER_AGENT:
      return 2;
    
    default:
      return 3;
  }
}

function getThreatSeverity(threatLevel: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (threatLevel >= 8) return 'CRITICAL';
  if (threatLevel >= 6) return 'HIGH';
  if (threatLevel >= 4) return 'MEDIUM';
  return 'LOW';
}

// 🔍 Malicious pattern detection
function isMaliciousUserAgent(userAgent: string): boolean {
  return MALICIOUS_PATTERNS.userAgents.some(pattern => pattern.test(userAgent));
}

function containsMaliciousPatterns(details: any): boolean {
  const detailsStr = JSON.stringify(details).toLowerCase();
  
  return [
    ...MALICIOUS_PATTERNS.sqlInjection,
    ...MALICIOUS_PATTERNS.xss,
    ...MALICIOUS_PATTERNS.pathTraversal
  ].some(pattern => pattern.test(detailsStr));
}

// 📈 IP threat tracking
function updateIPThreatTracking(ip: string, threatLevel: number): void {
  if (!suspiciousIPs.has(ip)) {
    suspiciousIPs.set(ip, {
      violations: 0,
      lastViolation: new Date(),
      blocked: false,
      threatScore: 0
    });
  }
  
  const tracking = suspiciousIPs.get(ip)!;
  tracking.violations++;
  tracking.lastViolation = new Date();
  tracking.threatScore += threatLevel;
  
  // Označiti kao blocked ako prekorači threshold
  if (tracking.threatScore >= 20) {
    tracking.blocked = true;
    logSecurityEvent(SecurityEventType.IP_BLOCKING_REQUIRED, {
      ip,
      totalViolations: tracking.violations,
      totalThreatScore: tracking.threatScore
    });
  }
}

// 🚨 Critical alert system
function triggerCriticalAlert(event: SecurityEvent): void {
  const alertMessage = `🚨 CRITICAL SECURITY ALERT 🚨
Type: ${event.type}
IP: ${event.ip}
Threat Level: ${event.threatLevel}/10
Time: ${event.timestamp}
Details: ${JSON.stringify(event.details, null, 2)}`;
  
  // Console alert
  console.error('\n' + '='.repeat(60));
  console.error(alertMessage);
  console.error('='.repeat(60) + '\n');
  
  // TODO: Dodati email/SMS alerting ovde
  // TODO: Dodati Slack/Discord webhook notifikacije
}

// 🔒 Auto IP blocking
function autoBlockIP(ip: string): void {
  console.error(`🔒 AUTO-BLOCKING IP: ${ip} due to extreme threat level`);
  
  // Dodaj u blocked IPs listu
  if (suspiciousIPs.has(ip)) {
    suspiciousIPs.get(ip)!.blocked = true;
  }
  
  // TODO: Implementirati firewall rule za blocking
  // TODO: Dodati u Redis blacklist za production
}

// 🔍 IP checking middleware
export function isIPBlocked(ip: string): boolean {
  const tracking = suspiciousIPs.get(ip);
  return tracking?.blocked || false;
}

// 📊 Security statistics
export function getSecurityStats(): any {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  let blockedIPs = 0;
  let recentViolations = 0;
  
  for (const [ip, tracking] of suspiciousIPs) {
    if (tracking.blocked) blockedIPs++;
    if (tracking.lastViolation > last24h) recentViolations++;
  }
  
  return {
    totalMonitoredIPs: suspiciousIPs.size,
    blockedIPs,
    recentViolations24h: recentViolations,
    systemStatus: blockedIPs > 10 ? 'HIGH_ALERT' : 'NORMAL'
  };
}

// 🔄 Cleanup old tracking data (pozovi periodično)
export function cleanupOldSecurityData(): void {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dana
  
  for (const [ip, tracking] of suspiciousIPs) {
    if (tracking.lastViolation < cutoff && !tracking.blocked) {
      suspiciousIPs.delete(ip);
    }
  }
}

// Pokretanje cleanup-a svakih 24 sata
setInterval(cleanupOldSecurityData, 24 * 60 * 60 * 1000);

export { securityLogger };