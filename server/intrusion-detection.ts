/**
 * 🛡️ ADVANCED INTRUSION DETECTION SYSTEM (IDS)
 * 
 * Napredni sistem za detekciju upada koji monitoring-uje i analizira:
 * - Anomalous traffic patterns
 * - Behavioral analytics za users
 * - Real-time threat intelligence
 * - Automated response mechanisms  
 * - Machine learning-based anomaly detection
 * - Geolocation anomaly detection
 * - Session anomaly detection
 * - API abuse detection
 */

import { Request, Response } from 'express';
import { logSecurityEvent, SecurityEventType } from './security-monitor.js';

// 🔍 Intrusion Detection Configuration
interface IDSConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high' | 'paranoid';
  realTimeMonitoring: boolean;
  automaticBlocking: boolean;
  geoAnomalyDetection: boolean;
  behavioralAnalytics: boolean;
  maxSuspiciousScore: number;
  blockingThreshold: number;
}

// 📊 User Behavior Profile
interface UserBehaviorProfile {
  userId: string;
  username: string;
  normalLoginTimes: number[]; // Hour of day (0-23)
  normalLocations: string[]; // Countries/Cities
  normalUserAgents: string[];
  normalEndpoints: string[];
  averageSessionDuration: number;
  typicalRequestRate: number;
  createdAt: string;
  lastUpdated: string;
  trustScore: number; // 0-100
}

// 🚨 Intrusion Event
interface IntrusionEvent {
  id: string;
  type: IntrusionType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suspiciousScore: number; // 0-100
  details: {
    ip: string;
    userAgent: string;
    userId?: string;
    username?: string;
    endpoint: string;
    method: string;
    location?: string;
    anomalies: string[];
    indicators: any;
  };
  timestamp: string;
  blocked: boolean;
  resolved: boolean;
}

// 🔍 Intrusion Types
enum IntrusionType {
  BRUTE_FORCE_ATTACK = 'BRUTE_FORCE_ATTACK',
  CREDENTIAL_STUFFING = 'CREDENTIAL_STUFFING',
  UNUSUAL_LOGIN_PATTERN = 'UNUSUAL_LOGIN_PATTERN',
  GEOLOCATION_ANOMALY = 'GEOLOCATION_ANOMALY',
  USER_AGENT_ANOMALY = 'USER_AGENT_ANOMALY',
  RAPID_API_REQUESTS = 'RAPID_API_REQUESTS',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  SESSION_HIJACKING = 'SESSION_HIJACKING',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  BOT_BEHAVIOR = 'BOT_BEHAVIOR',
  ENDPOINT_SCANNING = 'ENDPOINT_SCANNING',
  ABNORMAL_REQUEST_SIZE = 'ABNORMAL_REQUEST_SIZE'
}

// 🛡️ Global IDS Configuration
const idsConfig: IDSConfig = {
  enabled: true,
  sensitivity: process.env.NODE_ENV === 'production' ? 'high' : 'medium',
  realTimeMonitoring: true,
  automaticBlocking: process.env.NODE_ENV === 'production',
  geoAnomalyDetection: true,
  behavioralAnalytics: true,
  maxSuspiciousScore: 75,
  blockingThreshold: 85
};

// 📈 In-memory stores (u production bi ovo bilo Redis/Database)
const userBehaviorProfiles = new Map<string, UserBehaviorProfile>();
const intrusionEvents: IntrusionEvent[] = [];
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, number>(); // IP -> suspicion score
const requestFrequency = new Map<string, { count: number; lastReset: number }>();

// 🕒 Time-based Analytics
class TimeAnalytics {
  static isUnusualLoginTime(userId: string, currentHour: number): boolean {
    const profile = userBehaviorProfiles.get(userId);
    if (!profile || profile.normalLoginTimes.length === 0) return false;
    
    // Proverava da li je trenutni čas ±2 sata od normalnih login časova
    return !profile.normalLoginTimes.some(hour => Math.abs(hour - currentHour) <= 2);
  }
  
  static isRapidRequests(ip: string, threshold: number = 10): boolean {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${ip}_${minute}`;
    
    const freq = requestFrequency.get(key) || { count: 0, lastReset: minute };
    
    if (freq.lastReset !== minute) {
      // Reset counter for new minute
      requestFrequency.set(key, { count: 1, lastReset: minute });
      return false;
    }
    
    freq.count++;
    requestFrequency.set(key, freq);
    
    return freq.count > threshold;
  }
}

// 🌍 Geolocation Analytics  
class GeoAnalytics {
  // Simplifikovana geolocation detection (u production bi koristio MaxMind GeoIP2)
  static getLocationFromIP(ip: string): string {
    // Mock implementation - u stvarnosti bi koristio pravu GeoIP bazu
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '127.0.0.1') {
      return 'Local';
    }
    
    // Mock locations za testiranje
    const mockLocations = ['Serbia', 'Montenegro', 'Germany', 'United States', 'Unknown'];
    const index = ip.split('.').reduce((sum, part) => sum + parseInt(part), 0) % mockLocations.length;
    return mockLocations[index];
  }
  
  static isUnusualLocation(userId: string, currentLocation: string): boolean {
    const profile = userBehaviorProfiles.get(userId);
    if (!profile || profile.normalLocations.length === 0) return false;
    
    return !profile.normalLocations.includes(currentLocation);
  }
}

// 🤖 Behavioral Analytics Engine
class BehavioralAnalytics {
  static analyzeUserBehavior(req: Request, userId?: string): {
    anomalies: string[];
    suspiciousScore: number;
  } {
    const anomalies: string[] = [];
    let suspiciousScore = 0;
    
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    const currentHour = new Date().getHours();
    const location = GeoAnalytics.getLocationFromIP(ip);
    
    // 1. Time-based anomalies
    if (userId && TimeAnalytics.isUnusualLoginTime(userId, currentHour)) {
      anomalies.push('Unusual login time detected');
      suspiciousScore += 15;
    }
    
    // 2. Rapid requests detection
    if (TimeAnalytics.isRapidRequests(ip, 20)) {
      anomalies.push('Rapid API requests detected');
      suspiciousScore += 25;
    }
    
    // 3. Geolocation anomalies
    if (userId && GeoAnalytics.isUnusualLocation(userId, location)) {
      anomalies.push('Unusual geolocation detected');
      suspiciousScore += 20;
    }
    
    // 4. User-Agent anomalies
    const profile = userId ? userBehaviorProfiles.get(userId) : null;
    if (profile && !profile.normalUserAgents.some(ua => userAgent.includes(ua.split(' ')[0]))) {
      anomalies.push('Unusual user agent detected');
      suspiciousScore += 10;
    }
    
    // 5. Suspicious User-Agent patterns
    const suspiciousUAPatterns = [
      /curl/i, /wget/i, /python/i, /java/i, /go-http/i, 
      /bot/i, /crawler/i, /spider/i, /scan/i
    ];
    if (suspiciousUAPatterns.some(pattern => pattern.test(userAgent))) {
      anomalies.push('Potentially automated traffic detected');
      suspiciousScore += 30;
    }
    
    // 6. Malicious payload indicators in URL/Body
    const url = req.url;
    const maliciousPatterns = [
      /union\s+select/i, /drop\s+table/i, /<script>/i, /javascript:/i,
      /\.\.\//, /etc\/passwd/, /cmd\.exe/, /powershell/i
    ];
    if (maliciousPatterns.some(pattern => pattern.test(url))) {
      anomalies.push('Malicious payload detected in request');
      suspiciousScore += 40;
    }
    
    // 7. Abnormal request size
    const contentLength = parseInt(req.get('Content-Length') || '0');
    if (contentLength > 1048576) { // 1MB
      anomalies.push('Abnormally large request detected');
      suspiciousScore += 15;
    }
    
    return { anomalies, suspiciousScore };
  }
  
  static updateUserProfile(userId: string, username: string, req: Request): void {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    const currentHour = new Date().getHours();
    const location = GeoAnalytics.getLocationFromIP(ip);
    const endpoint = req.path;
    
    let profile = userBehaviorProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        username,
        normalLoginTimes: [currentHour],
        normalLocations: [location],
        normalUserAgents: [userAgent],
        normalEndpoints: [endpoint],
        averageSessionDuration: 0,
        typicalRequestRate: 1,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        trustScore: 50
      };
    } else {
      // Update existing profile
      if (!profile.normalLoginTimes.includes(currentHour)) {
        profile.normalLoginTimes.push(currentHour);
        // Keep only last 10 login times
        if (profile.normalLoginTimes.length > 10) {
          profile.normalLoginTimes = profile.normalLoginTimes.slice(-10);
        }
      }
      
      if (!profile.normalLocations.includes(location)) {
        profile.normalLocations.push(location);
      }
      
      // Add user agent if it's new but similar to existing ones
      const browserFamily = userAgent.split(' ')[0];
      if (!profile.normalUserAgents.some(ua => ua.includes(browserFamily))) {
        profile.normalUserAgents.push(userAgent);
        if (profile.normalUserAgents.length > 5) {
          profile.normalUserAgents = profile.normalUserAgents.slice(-5);
        }
      }
      
      if (!profile.normalEndpoints.includes(endpoint)) {
        profile.normalEndpoints.push(endpoint);
      }
      
      profile.lastUpdated = new Date().toISOString();
    }
    
    userBehaviorProfiles.set(userId, profile);
  }
}

// 🚨 Intrusion Event Handler
class IntrusionEventHandler {
  static generateIntrusionEvent(
    type: IntrusionType,
    req: Request,
    anomalies: string[],
    suspiciousScore: number,
    userId?: string,
    username?: string
  ): IntrusionEvent {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    const location = GeoAnalytics.getLocationFromIP(ip);
    
    const severity = this.calculateSeverity(suspiciousScore);
    const shouldBlock = idsConfig.automaticBlocking && suspiciousScore >= idsConfig.blockingThreshold;
    
    const event: IntrusionEvent = {
      id: `intrusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      suspiciousScore,
      details: {
        ip,
        userAgent,
        userId,
        username,
        endpoint: req.path,
        method: req.method,
        location,
        anomalies,
        indicators: {
          requestSize: req.get('Content-Length'),
          timestamp: new Date().toISOString(),
          referer: req.get('Referer'),
          acceptLanguage: req.get('Accept-Language')
        }
      },
      timestamp: new Date().toISOString(),
      blocked: shouldBlock,
      resolved: false
    };
    
    // Store event
    intrusionEvents.push(event);
    
    // Update suspicious IP tracking
    suspiciousIPs.set(ip, (suspiciousIPs.get(ip) || 0) + suspiciousScore);
    
    // Auto-block if threshold exceeded
    if (shouldBlock) {
      blockedIPs.add(ip);
      console.log(`🚫 [IDS] Auto-blocked IP ${ip} - Suspicious score: ${suspiciousScore}`);
    }
    
    // Log to security monitoring
    logSecurityEvent(this.mapToSecurityEventType(type), {
      intrusionEvent: event,
      automaticBlock: shouldBlock,
      totalSuspiciousScore: suspiciousIPs.get(ip)
    });
    
    return event;
  }
  
  private static calculateSeverity(suspiciousScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (suspiciousScore >= 80) return 'CRITICAL';
    if (suspiciousScore >= 60) return 'HIGH';
    if (suspiciousScore >= 30) return 'MEDIUM';
    return 'LOW';
  }
  
  private static mapToSecurityEventType(intrusionType: IntrusionType): SecurityEventType {
    const mapping: { [key in IntrusionType]: SecurityEventType } = {
      [IntrusionType.BRUTE_FORCE_ATTACK]: SecurityEventType.MULTIPLE_FAILED_LOGINS,
      [IntrusionType.CREDENTIAL_STUFFING]: SecurityEventType.SUSPICIOUS_LOGIN,
      [IntrusionType.UNUSUAL_LOGIN_PATTERN]: SecurityEventType.SUSPICIOUS_LOGIN,
      [IntrusionType.GEOLOCATION_ANOMALY]: SecurityEventType.SUSPICIOUS_LOGIN,
      [IntrusionType.USER_AGENT_ANOMALY]: SecurityEventType.SUSPICIOUS_USER_AGENT,
      [IntrusionType.RAPID_API_REQUESTS]: SecurityEventType.RATE_LIMIT_EXCEEDED,
      [IntrusionType.PRIVILEGE_ESCALATION_ATTEMPT]: SecurityEventType.PRIVILEGE_ESCALATION,
      [IntrusionType.SESSION_HIJACKING]: SecurityEventType.SESSION_HIJACK_ATTEMPT,
      [IntrusionType.DATA_EXFILTRATION]: SecurityEventType.DATA_EXFILTRATION_ATTEMPT,
      [IntrusionType.BOT_BEHAVIOR]: SecurityEventType.SUSPICIOUS_USER_AGENT,
      [IntrusionType.ENDPOINT_SCANNING]: SecurityEventType.VULNERABILITY_EXPLOIT,
      [IntrusionType.ABNORMAL_REQUEST_SIZE]: SecurityEventType.DOS_ATTACK
    };
    
    return mapping[intrusionType] || SecurityEventType.VULNERABILITY_EXPLOIT;
  }
}

// 🛡️ MAIN INTRUSION DETECTION ENGINE
export class IntrusionDetectionEngine {
  static analyzeRequest(req: Request, userId?: string, username?: string): {
    isIntrusion: boolean;
    events: IntrusionEvent[];
    shouldBlock: boolean;
  } {
    if (!idsConfig.enabled) {
      return { isIntrusion: false, events: [], shouldBlock: false };
    }
    
    const events: IntrusionEvent[] = [];
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Skip analysis for already blocked IPs
    if (blockedIPs.has(ip)) {
      return { isIntrusion: true, events: [], shouldBlock: true };
    }
    
    // Analyze user behavior
    const { anomalies, suspiciousScore } = BehavioralAnalytics.analyzeUserBehavior(req, userId);
    
    // Update user profile if authenticated
    if (userId && username) {
      BehavioralAnalytics.updateUserProfile(userId, username, req);
    }
    
    // Generate intrusion events based on anomalies
    if (anomalies.length > 0 && suspiciousScore >= idsConfig.maxSuspiciousScore) {
      let intrusionType = IntrusionType.BOT_BEHAVIOR;
      
      // Determine specific intrusion type based on anomalies
      if (anomalies.some(a => a.includes('rapid'))) {
        intrusionType = IntrusionType.RAPID_API_REQUESTS;
      } else if (anomalies.some(a => a.includes('geolocation'))) {
        intrusionType = IntrusionType.GEOLOCATION_ANOMALY;
      } else if (anomalies.some(a => a.includes('user agent'))) {
        intrusionType = IntrusionType.USER_AGENT_ANOMALY;
      } else if (anomalies.some(a => a.includes('payload'))) {
        intrusionType = IntrusionType.ENDPOINT_SCANNING;
      } else if (anomalies.some(a => a.includes('time'))) {
        intrusionType = IntrusionType.UNUSUAL_LOGIN_PATTERN;
      }
      
      const event = IntrusionEventHandler.generateIntrusionEvent(
        intrusionType,
        req,
        anomalies,
        suspiciousScore,
        userId,
        username
      );
      
      events.push(event);
    }
    
    const shouldBlock = events.some(e => e.blocked) || blockedIPs.has(ip);
    const isIntrusion = events.length > 0 || shouldBlock;
    
    return { isIntrusion, events, shouldBlock };
  }
  
  static getIntrusionHistory(): IntrusionEvent[] {
    return [...intrusionEvents].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  static getBlockedIPs(): string[] {
    return Array.from(blockedIPs);
  }
  
  static unblockIP(ip: string): boolean {
    const wasBlocked = blockedIPs.has(ip);
    blockedIPs.delete(ip);
    suspiciousIPs.delete(ip);
    return wasBlocked;
  }
  
  static getUserBehaviorProfiles(): UserBehaviorProfile[] {
    return Array.from(userBehaviorProfiles.values());
  }
  
  static getIDSStatistics(): {
    totalEvents: number;
    blockedIPs: number;
    suspiciousIPs: number;
    criticalEvents: number;
    lastHourEvents: number;
  } {
    const lastHour = new Date(Date.now() - 3600000).toISOString();
    
    return {
      totalEvents: intrusionEvents.length,
      blockedIPs: blockedIPs.size,
      suspiciousIPs: suspiciousIPs.size,
      criticalEvents: intrusionEvents.filter(e => e.severity === 'CRITICAL').length,
      lastHourEvents: intrusionEvents.filter(e => e.timestamp > lastHour).length
    };
  }
}

// 📊 IDS MANAGEMENT ENDPOINTS

// Get IDS status and configuration
export function getIDSStatus(req: Request, res: Response) {
  const statistics = IntrusionDetectionEngine.getIDSStatistics();
  
  res.json({
    config: idsConfig,
    statistics,
    currentTime: new Date().toISOString(),
    systemStatus: idsConfig.enabled ? 'ACTIVE' : 'DISABLED'
  });
}

// Get intrusion events
export function getIntrusionEvents(req: Request, res: Response) {
  const { 
    limit = 100, 
    severity, 
    type, 
    resolved,
    since 
  } = req.query;
  
  let events = IntrusionDetectionEngine.getIntrusionHistory();
  
  // Apply filters
  if (severity) {
    events = events.filter(e => e.severity === severity);
  }
  
  if (type) {
    events = events.filter(e => e.type === type);
  }
  
  if (resolved !== undefined) {
    events = events.filter(e => e.resolved === (resolved === 'true'));
  }
  
  if (since) {
    events = events.filter(e => e.timestamp > since);
  }
  
  // Limit results
  events = events.slice(0, parseInt(limit as string));
  
  res.json({
    total: events.length,
    events,
    availableFilters: {
      severities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      types: Object.values(IntrusionType)
    }
  });
}

// Get blocked IPs
export function getIDSBlockedIPs(req: Request, res: Response) {
  const blockedList = IntrusionDetectionEngine.getBlockedIPs();
  
  res.json({
    total: blockedList.length,
    blockedIPs: blockedList,
    suspiciousIPs: Object.fromEntries(suspiciousIPs),
    lastUpdated: new Date().toISOString()
  });
}

// Unblock IP address
export function unblockIPAddress(req: Request, res: Response) {
  const { ip } = req.body;
  
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }
  
  const wasBlocked = IntrusionDetectionEngine.unblockIP(ip);
  
  logSecurityEvent(SecurityEventType.SECURITY_CONFIGURATION_CHANGE, {
    action: 'ip_unblocked',
    ip,
    unblockedBy: (req.user as any)?.username || 'unknown',
    wasBlocked
  });
  
  res.json({
    success: true,
    message: wasBlocked ? `IP ${ip} has been unblocked` : `IP ${ip} was not blocked`,
    ip,
    timestamp: new Date().toISOString()
  });
}

// Get user behavior profiles
export function getUserBehaviorProfiles(req: Request, res: Response) {
  const profiles = IntrusionDetectionEngine.getUserBehaviorProfiles();
  
  res.json({
    total: profiles.length,
    profiles: profiles.slice(0, 100), // Limit to 100 profiles
    lastUpdated: new Date().toISOString()
  });
}

// Update IDS configuration
export function updateIDSConfig(req: Request, res: Response) {
  const { sensitivity, automaticBlocking, geoAnomalyDetection, maxSuspiciousScore } = req.body;
  
  if (sensitivity && ['low', 'medium', 'high', 'paranoid'].includes(sensitivity)) {
    idsConfig.sensitivity = sensitivity;
  }
  
  if (automaticBlocking !== undefined) {
    idsConfig.automaticBlocking = automaticBlocking;
  }
  
  if (geoAnomalyDetection !== undefined) {
    idsConfig.geoAnomalyDetection = geoAnomalyDetection;
  }
  
  if (maxSuspiciousScore && maxSuspiciousScore >= 0 && maxSuspiciousScore <= 100) {
    idsConfig.maxSuspiciousScore = maxSuspiciousScore;
  }
  
  logSecurityEvent(SecurityEventType.SECURITY_CONFIGURATION_CHANGE, {
    action: 'ids_config_updated',
    newConfig: idsConfig,
    updatedBy: (req.user as any)?.username || 'unknown'
  });
  
  res.json({
    success: true,
    message: 'IDS configuration updated',
    config: idsConfig,
    timestamp: new Date().toISOString()
  });
}