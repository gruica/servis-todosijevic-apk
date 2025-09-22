/**
 * 📊 SECURITY DASHBOARD & REAL-TIME ALERTING
 * 
 * Comprehensive security management dashboard featuring:
 * - Real-time security metrics aggregation
 * - Live threat monitoring with WebSocket connectivity  
 * - Interactive security analytics and visualizations
 * - Automated alerting with multiple notification channels
 * - Security KPIs and performance indicators
 * - Threat intelligence feed integration
 * - Executive security reporting
 * - Compliance monitoring and reporting
 */

import { Request, Response } from 'express';
import { logSecurityEvent, SecurityEventType, getSecurityStats } from './security-monitor.js';
import { IntrusionDetectionEngine } from './intrusion-detection.js';
import { PenetrationTestRunner } from './penetration-testing.js';
import WebSocket from 'ws';
import { createServer } from 'http';

// 📊 Security Dashboard Configuration
interface DashboardConfig {
  realTimeUpdates: boolean;
  refreshInterval: number; // milliseconds
  alertThresholds: {
    criticalEvents: number;
    suspiciousIPs: number;
    vulnerabilities: number;
    failedLogins: number;
  };
  notificationChannels: {
    webSocket: boolean;
    email: boolean;
    sms: boolean;
    slack: boolean;
  };
  historicalDataRetention: number; // days
}

// 📈 Security Metrics Interface
interface SecurityMetrics {
  timestamp: string;
  overview: {
    totalSecurityEvents: number;
    criticalAlerts: number;
    blockedIPs: number;
    vulnerabilities: number;
    securityScore: number; // 0-100
    threatLevel: number; // 1-10
  };
  threats: {
    intrusionAttempts: number;
    maliciousRequests: number;
    suspiciousLogins: number;
    rateLimitViolations: number;
    blockedAttacks: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkConnections: number;
  };
  compliance: {
    pciDssCompliance: boolean;
    gdprCompliance: boolean;
    iso27001Compliance: boolean;
    lastAuditDate: string;
    complianceScore: number;
  };
  alerts: SecurityAlert[];
}

// 🚨 Security Alert Interface
interface SecurityAlert {
  id: string;
  type: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  details: any;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  assignedTo?: string;
  actionsTaken: string[];
}

// 🔔 Alert Types
enum AlertType {
  SECURITY_BREACH = 'SECURITY_BREACH',
  VULNERABILITY_DETECTED = 'VULNERABILITY_DETECTED',
  INTRUSION_ATTEMPT = 'INTRUSION_ATTEMPT',
  SYSTEM_COMPROMISE = 'SYSTEM_COMPROMISE',
  DATA_BREACH = 'DATA_BREACH',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE'
}

// 📊 Global Dashboard Configuration
const dashboardConfig: DashboardConfig = {
  realTimeUpdates: true,
  refreshInterval: 5000, // 5 seconds
  alertThresholds: {
    criticalEvents: 5,
    suspiciousIPs: 10,
    vulnerabilities: 3,
    failedLogins: 15
  },
  notificationChannels: {
    webSocket: true,
    email: process.env.NODE_ENV === 'production',
    sms: process.env.NODE_ENV === 'production',
    slack: false
  },
  historicalDataRetention: 90 // 90 days
};

// 📈 Metrics Storage (u production bi ovo bilo Redis/InfluxDB)
const securityMetricsHistory: SecurityMetrics[] = [];
const activeAlerts: SecurityAlert[] = [];
const acknowledgedAlerts: SecurityAlert[] = [];
let wsClients = new Set<WebSocket>();

// 📊 SECURITY METRICS AGGREGATOR
class SecurityMetricsAggregator {
  static async collectMetrics(): Promise<SecurityMetrics> {
    const timestamp = new Date().toISOString();
    
    // Collect security monitoring stats
    const securityStats = getSecurityStats();
    
    // Collect IDS statistics
    const idsStats = IntrusionDetectionEngine.getIDSStatistics();
    
    // Collect penetration test results
    const pentestHistory = PenetrationTestRunner.getTestHistory();
    const recentVulns = pentestHistory.filter(t => 
      t.status === 'VULNERABLE' && 
      new Date(t.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    // Calculate security score (0-100)
    const securityScore = this.calculateSecurityScore(securityStats, idsStats, recentVulns);
    
    // Calculate threat level (1-10)
    const threatLevel = this.calculateThreatLevel(idsStats, securityStats);
    
    const metrics: SecurityMetrics = {
      timestamp,
      overview: {
        totalSecurityEvents: securityStats.totalEvents,
        criticalAlerts: securityStats.criticalAlerts,
        blockedIPs: idsStats.blockedIPs,
        vulnerabilities: recentVulns,
        securityScore,
        threatLevel
      },
      threats: {
        intrusionAttempts: idsStats.totalEvents,
        maliciousRequests: securityStats.suspiciousRequests,
        suspiciousLogins: securityStats.suspiciousLogins,
        rateLimitViolations: securityStats.rateLimitViolations,
        blockedAttacks: idsStats.blockedIPs
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: await this.getCpuUsage(),
        diskUsage: await this.getDiskUsage(),
        networkConnections: await this.getNetworkConnections()
      },
      compliance: {
        pciDssCompliance: this.checkPCICompliance(),
        gdprCompliance: this.checkGDPRCompliance(),
        iso27001Compliance: this.checkISO27001Compliance(),
        lastAuditDate: '2025-09-22T00:00:00.000Z',
        complianceScore: this.calculateComplianceScore()
      },
      alerts: [...activeAlerts]
    };
    
    // Store metrics
    securityMetricsHistory.push(metrics);
    
    // Cleanup old metrics (keep last 1000 entries)
    if (securityMetricsHistory.length > 1000) {
      securityMetricsHistory.splice(0, securityMetricsHistory.length - 1000);
    }
    
    return metrics;
  }
  
  private static calculateSecurityScore(securityStats: any, idsStats: any, vulns: number): number {
    let score = 100;
    
    // Deduct points for security issues
    score -= securityStats.criticalAlerts * 10;
    score -= idsStats.criticalEvents * 15;
    score -= vulns * 20;
    score -= idsStats.blockedIPs * 2;
    
    // Minimum score is 0
    return Math.max(0, Math.min(100, score));
  }
  
  private static calculateThreatLevel(idsStats: any, securityStats: any): number {
    let threatLevel = 1;
    
    // Increase threat level based on active threats
    if (idsStats.criticalEvents > 0) threatLevel += 3;
    if (idsStats.lastHourEvents > 10) threatLevel += 2;
    if (idsStats.blockedIPs > 5) threatLevel += 2;
    if (securityStats.criticalAlerts > 3) threatLevel += 2;
    
    return Math.min(10, threatLevel);
  }
  
  private static async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    return Math.random() * 100; // Mock value
  }
  
  private static async getDiskUsage(): Promise<number> {
    // Simplified disk usage calculation
    return Math.random() * 100; // Mock value
  }
  
  private static async getNetworkConnections(): Promise<number> {
    // Simplified network connections count
    return Math.floor(Math.random() * 50) + 10; // Mock value
  }
  
  private static checkPCICompliance(): boolean {
    // PCI DSS compliance checks
    return true; // Simplified for demo
  }
  
  private static checkGDPRCompliance(): boolean {
    // GDPR compliance checks
    return true; // Simplified for demo
  }
  
  private static checkISO27001Compliance(): boolean {
    // ISO 27001 compliance checks
    return true; // Simplified for demo
  }
  
  private static calculateComplianceScore(): number {
    const checks = [
      this.checkPCICompliance(),
      this.checkGDPRCompliance(),
      this.checkISO27001Compliance()
    ];
    
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }
}

// 🚨 REAL-TIME ALERTING SYSTEM
class RealTimeAlertingSystem {
  static generateAlert(
    type: AlertType,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    title: string,
    description: string,
    details: any = {}
  ): SecurityAlert {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      description,
      details,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
      actionsTaken: []
    };
    
    // Add to active alerts
    activeAlerts.push(alert);
    
    // Send real-time notification
    this.sendRealTimeNotification(alert);
    
    // Log security event
    logSecurityEvent(SecurityEventType.VULNERABILITY_DETECTED, {
      alertType: type,
      severity,
      alertId: alert.id,
      title
    });
    
    console.log(`🚨 [SECURITY ALERT] ${severity}: ${title}`);
    
    return alert;
  }
  
  static acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alertIndex = activeAlerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) return false;
    
    const alert = activeAlerts[alertIndex];
    alert.acknowledged = true;
    alert.actionsTaken.push(`Acknowledged by ${acknowledgedBy} at ${new Date().toISOString()}`);
    
    return true;
  }
  
  static resolveAlert(alertId: string, resolvedBy: string, resolution: string): boolean {
    const alertIndex = activeAlerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) return false;
    
    const alert = activeAlerts.splice(alertIndex, 1)[0];
    alert.resolved = true;
    alert.actionsTaken.push(`Resolved by ${resolvedBy}: ${resolution} at ${new Date().toISOString()}`);
    
    acknowledgedAlerts.push(alert);
    
    // Send resolution notification
    this.sendRealTimeNotification(alert);
    
    return true;
  }
  
  private static sendRealTimeNotification(alert: SecurityAlert): void {
    if (!dashboardConfig.notificationChannels.webSocket) return;
    
    const notification = {
      type: 'security_alert',
      alert,
      timestamp: new Date().toISOString()
    };
    
    // Send to all connected WebSocket clients
    wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(notification));
      }
    });
  }
  
  static checkAlertThresholds(metrics: SecurityMetrics): void {
    const thresholds = dashboardConfig.alertThresholds;
    
    // Check critical events threshold
    if (metrics.overview.criticalAlerts >= thresholds.criticalEvents) {
      this.generateAlert(
        AlertType.SECURITY_BREACH,
        'CRITICAL',
        'Critical Security Events Threshold Exceeded',
        `${metrics.overview.criticalAlerts} critical security events detected in the last hour`,
        { criticalCount: metrics.overview.criticalAlerts, threshold: thresholds.criticalEvents }
      );
    }
    
    // Check blocked IPs threshold
    if (metrics.overview.blockedIPs >= thresholds.suspiciousIPs) {
      this.generateAlert(
        AlertType.INTRUSION_ATTEMPT,
        'HIGH',
        'Multiple IP Addresses Blocked',
        `${metrics.overview.blockedIPs} IP addresses have been automatically blocked`,
        { blockedIPs: metrics.overview.blockedIPs, threshold: thresholds.suspiciousIPs }
      );
    }
    
    // Check vulnerabilities threshold
    if (metrics.overview.vulnerabilities >= thresholds.vulnerabilities) {
      this.generateAlert(
        AlertType.VULNERABILITY_DETECTED,
        'HIGH',
        'Security Vulnerabilities Detected',
        `${metrics.overview.vulnerabilities} vulnerabilities found in recent security scans`,
        { vulnerabilities: metrics.overview.vulnerabilities, threshold: thresholds.vulnerabilities }
      );
    }
  }
}

// 📊 SECURITY DASHBOARD ENDPOINTS

// Get real-time security dashboard
export async function getSecurityDashboardData(req: Request, res: Response) {
  try {
    const metrics = await SecurityMetricsAggregator.collectMetrics();
    
    // Check alert thresholds
    RealTimeAlertingSystem.checkAlertThresholds(metrics);
    
    res.json({
      success: true,
      data: metrics,
      config: dashboardConfig,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [SECURITY DASHBOARD] Error:', error);
    res.status(500).json({
      error: 'Failed to load security dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get historical security metrics
export function getSecurityMetricsHistory(req: Request, res: Response) {
  const { 
    hours = 24, 
    interval = 'hour',
    metric 
  } = req.query;
  
  const hoursBack = parseInt(hours as string);
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  let historicalData = securityMetricsHistory.filter(m => 
    new Date(m.timestamp) > cutoffTime
  );
  
  // Apply interval aggregation if needed
  if (interval === 'hour' && historicalData.length > 24) {
    historicalData = this.aggregateByHour(historicalData);
  }
  
  res.json({
    total: historicalData.length,
    timeRange: {
      from: cutoffTime.toISOString(),
      to: new Date().toISOString(),
      hours: hoursBack
    },
    data: historicalData,
    interval
  });
}

// Get security alerts
export function getSecurityAlerts(req: Request, res: Response) {
  const { 
    severity, 
    acknowledged = 'all',
    limit = 50 
  } = req.query;
  
  let alerts = [...activeAlerts, ...acknowledgedAlerts];
  
  // Filter by severity
  if (severity) {
    alerts = alerts.filter(a => a.severity === severity);
  }
  
  // Filter by acknowledgment status
  if (acknowledged === 'true') {
    alerts = alerts.filter(a => a.acknowledged);
  } else if (acknowledged === 'false') {
    alerts = alerts.filter(a => !a.acknowledged);
  }
  
  // Sort by timestamp (newest first)
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Limit results
  alerts = alerts.slice(0, parseInt(limit as string));
  
  res.json({
    total: alerts.length,
    active: activeAlerts.length,
    acknowledged: acknowledgedAlerts.length,
    alerts,
    availableFilters: {
      severities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      types: Object.values(AlertType)
    }
  });
}

// Acknowledge security alert
export function acknowledgeSecurityAlert(req: Request, res: Response) {
  const { alertId } = req.params;
  const acknowledgedBy = (req.user as any)?.username || 'unknown';
  
  const success = RealTimeAlertingSystem.acknowledgeAlert(alertId, acknowledgedBy);
  
  if (success) {
    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alertId,
      acknowledgedBy,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      error: 'Alert not found',
      alertId
    });
  }
}

// Resolve security alert
export function resolveSecurityAlert(req: Request, res: Response) {
  const { alertId } = req.params;
  const { resolution } = req.body;
  const resolvedBy = (req.user as any)?.username || 'unknown';
  
  if (!resolution) {
    return res.status(400).json({ error: 'Resolution description is required' });
  }
  
  const success = RealTimeAlertingSystem.resolveAlert(alertId, resolvedBy, resolution);
  
  if (success) {
    res.json({
      success: true,
      message: 'Alert resolved successfully',
      alertId,
      resolvedBy,
      resolution,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      error: 'Alert not found',
      alertId
    });
  }
}

// Get security executive summary
export async function getSecurityExecutiveSummary(req: Request, res: Response) {
  try {
    const currentMetrics = await SecurityMetricsAggregator.collectMetrics();
    const last24h = securityMetricsHistory.filter(m => 
      new Date(m.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    const summary = {
      currentSecurityPosture: {
        securityScore: currentMetrics.overview.securityScore,
        threatLevel: currentMetrics.overview.threatLevel,
        complianceScore: currentMetrics.compliance.complianceScore,
        status: currentMetrics.overview.securityScore >= 80 ? 'SECURE' : 
               currentMetrics.overview.securityScore >= 60 ? 'MODERATE' : 'AT_RISK'
      },
      last24Hours: {
        totalIncidents: last24h.reduce((sum, m) => sum + m.overview.criticalAlerts, 0),
        blockedAttacks: last24h.reduce((sum, m) => sum + m.threats.blockedAttacks, 0),
        vulnerabilitiesFound: last24h.reduce((sum, m) => sum + m.overview.vulnerabilities, 0),
        systemUptime: currentMetrics.system.uptime / 3600 // hours
      },
      recommendations: this.generateSecurityRecommendations(currentMetrics),
      complianceStatus: {
        pciDss: currentMetrics.compliance.pciDssCompliance,
        gdpr: currentMetrics.compliance.gdprCompliance,
        iso27001: currentMetrics.compliance.iso27001Compliance
      },
      generatedAt: new Date().toISOString()
    };
    
    res.json(summary);
    
  } catch (error) {
    console.error('❌ [EXECUTIVE SUMMARY] Error:', error);
    res.status(500).json({
      error: 'Failed to generate executive summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Update dashboard configuration
export function updateDashboardConfig(req: Request, res: Response) {
  const { 
    refreshInterval, 
    alertThresholds, 
    notificationChannels 
  } = req.body;
  
  if (refreshInterval && refreshInterval >= 1000 && refreshInterval <= 60000) {
    dashboardConfig.refreshInterval = refreshInterval;
  }
  
  if (alertThresholds) {
    Object.assign(dashboardConfig.alertThresholds, alertThresholds);
  }
  
  if (notificationChannels) {
    Object.assign(dashboardConfig.notificationChannels, notificationChannels);
  }
  
  logSecurityEvent(SecurityEventType.SECURITY_CONFIGURATION_CHANGE, {
    action: 'dashboard_config_updated',
    newConfig: dashboardConfig,
    updatedBy: (req.user as any)?.username || 'unknown'
  });
  
  res.json({
    success: true,
    message: 'Dashboard configuration updated',
    config: dashboardConfig,
    timestamp: new Date().toISOString()
  });
}

// Helper functions
function aggregateByHour(data: SecurityMetrics[]): SecurityMetrics[] {
  // Simplified aggregation - in production would use proper time-series aggregation
  return data.filter((_, index) => index % Math.ceil(data.length / 24) === 0);
}

function generateSecurityRecommendations(metrics: SecurityMetrics): string[] {
  const recommendations: string[] = [];
  
  if (metrics.overview.securityScore < 80) {
    recommendations.push('🔐 Improve overall security posture by addressing identified vulnerabilities');
  }
  
  if (metrics.overview.threatLevel > 7) {
    recommendations.push('🚨 High threat level detected - consider increasing monitoring frequency');
  }
  
  if (metrics.overview.blockedIPs > 10) {
    recommendations.push('🛡️ Multiple IP blocks indicate potential coordinated attack - review patterns');
  }
  
  if (metrics.overview.vulnerabilities > 0) {
    recommendations.push('🔍 Address identified vulnerabilities immediately');
  }
  
  if (activeAlerts.filter(a => a.severity === 'CRITICAL').length > 0) {
    recommendations.push('⚡ Critical alerts require immediate attention');
  }
  
  return recommendations.length > 0 ? recommendations : ['✅ Security posture is good - continue monitoring'];
}

// Initialize real-time metrics collection
let metricsCollectionInterval: NodeJS.Timeout;

export function startRealTimeMetricsCollection(): void {
  if (metricsCollectionInterval) {
    clearInterval(metricsCollectionInterval);
  }
  
  metricsCollectionInterval = setInterval(async () => {
    try {
      await SecurityMetricsAggregator.collectMetrics();
    } catch (error) {
      console.error('❌ [METRICS COLLECTION] Error:', error);
    }
  }, dashboardConfig.refreshInterval);
  
  console.log('📊 [SECURITY DASHBOARD] Real-time metrics collection started');
}

export function stopRealTimeMetricsCollection(): void {
  if (metricsCollectionInterval) {
    clearInterval(metricsCollectionInterval);
    console.log('📊 [SECURITY DASHBOARD] Real-time metrics collection stopped');
  }
}

// WebSocket setup for real-time updates
export function setupWebSocketForDashboard(server: any): void {
  const wss = new WebSocket.Server({ server, path: '/api/security/dashboard/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('📊 [DASHBOARD] New WebSocket client connected');
    wsClients.add(ws);
    
    // Send current dashboard data
    SecurityMetricsAggregator.collectMetrics().then(metrics => {
      ws.send(JSON.stringify({
        type: 'dashboard_data',
        data: metrics,
        timestamp: new Date().toISOString()
      }));
    });
    
    ws.on('close', () => {
      console.log('📊 [DASHBOARD] WebSocket client disconnected');
      wsClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('📊 [DASHBOARD] WebSocket error:', error);
      wsClients.delete(ws);
    });
  });
  
  console.log('📊 [SECURITY DASHBOARD] WebSocket server started on /api/security/dashboard/ws');
}