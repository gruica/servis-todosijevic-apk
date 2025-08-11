// 🟢 NIZAK PRIORITET: Production Logging System (zamena console.log)

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: string;
  component?: string;
}

class ProductionLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private createLogEntry(level: LogLevel, message: string, data?: any, context?: string, component?: string): LogEntry {
    return {
      level,
      message,
      context,
      data,
      timestamp: new Date().toISOString(),
      component
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  debug(message: string, data?: any, context?: string, component?: string) {
    const entry = this.createLogEntry('debug', message, data, context, component);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      console.debug(`🔍 [DEBUG] ${context ? `${context}: ` : ''}${message}`, data);
    }
  }

  info(message: string, data?: any, context?: string, component?: string) {
    const entry = this.createLogEntry('info', message, data, context, component);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      console.info(`ℹ️ [INFO] ${context ? `${context}: ` : ''}${message}`, data);
    }
  }

  warn(message: string, data?: any, context?: string, component?: string) {
    const entry = this.createLogEntry('warn', message, data, context, component);
    this.addLog(entry);
    
    console.warn(`⚠️ [WARN] ${context ? `${context}: ` : ''}${message}`, data);
  }

  error(message: string, data?: any, context?: string, component?: string) {
    const entry = this.createLogEntry('error', message, data, context, component);
    this.addLog(entry);
    
    console.error(`🚨 [ERROR] ${context ? `${context}: ` : ''}${message}`, data);
  }

  // Admin panel specific logging methods
  adminAction(action: string, details?: any, component?: string) {
    this.info(`Admin akcija: ${action}`, details, 'ADMIN_PANEL', component);
  }

  queryPerformance(queryKey: string, duration: number, component?: string) {
    const message = `Query performance: ${queryKey} - ${duration}ms`;
    
    if (duration > 1000) {
      this.warn(message, { queryKey, duration }, 'QUERY_PERFORMANCE', component);
    } else {
      this.debug(message, { queryKey, duration }, 'QUERY_PERFORMANCE', component);
    }
  }

  invalidationTracking(queryKeys: string[], reason?: string, component?: string) {
    this.debug(
      `Query invalidation: ${queryKeys.join(', ')}`, 
      { queryKeys, reason }, 
      'QUERY_INVALIDATION', 
      component
    );
  }

  // Get logs for debugging
  getLogs(level?: LogLevel, context?: string, component?: string): LogEntry[] {
    return this.logs.filter(log => {
      if (level && log.level !== level) return false;
      if (context && log.context !== context) return false;
      if (component && log.component !== component) return false;
      return true;
    });
  }

  // Export logs for analysis
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Get performance summary
  getPerformanceSummary(): {
    slowQueries: Array<{queryKey: string, avgDuration: number, count: number}>;
    errorCount: number;
    warningCount: number;
    mostActiveComponents: Array<{component: string, logCount: number}>;
  } {
    const performanceLogs = this.logs.filter(log => log.context === 'QUERY_PERFORMANCE' && log.data?.duration);
    const errorLogs = this.logs.filter(log => log.level === 'error');
    const warningLogs = this.logs.filter(log => log.level === 'warn');

    // Analyze slow queries
    const queryStats = new Map<string, {totalDuration: number, count: number}>();
    performanceLogs.forEach(log => {
      const queryKey = log.data.queryKey;
      const duration = log.data.duration;
      
      if (queryStats.has(queryKey)) {
        const stats = queryStats.get(queryKey)!;
        stats.totalDuration += duration;
        stats.count += 1;
      } else {
        queryStats.set(queryKey, { totalDuration: duration, count: 1 });
      }
    });

    const slowQueries = Array.from(queryStats.entries())
      .map(([queryKey, stats]) => ({
        queryKey,
        avgDuration: stats.totalDuration / stats.count,
        count: stats.count
      }))
      .filter(q => q.avgDuration > 500) // Show queries slower than 500ms
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // Analyze component activity
    const componentStats = new Map<string, number>();
    this.logs.forEach(log => {
      if (log.component) {
        componentStats.set(log.component, (componentStats.get(log.component) || 0) + 1);
      }
    });

    const mostActiveComponents = Array.from(componentStats.entries())
      .map(([component, logCount]) => ({ component, logCount }))
      .sort((a, b) => b.logCount - a.logCount)
      .slice(0, 10);

    return {
      slowQueries,
      errorCount: errorLogs.length,
      warningCount: warningLogs.length,
      mostActiveComponents
    };
  }
}

// Global logger instance
export const logger = new ProductionLogger();

// React hook for component-specific logging
export function useComponentLogger(componentName: string) {
  return {
    debug: (message: string, data?: any, context?: string) => 
      logger.debug(message, data, context, componentName),
    info: (message: string, data?: any, context?: string) => 
      logger.info(message, data, context, componentName),
    warn: (message: string, data?: any, context?: string) => 
      logger.warn(message, data, context, componentName),
    error: (message: string, data?: any, context?: string) => 
      logger.error(message, data, context, componentName),
    adminAction: (action: string, details?: any) => 
      logger.adminAction(action, details, componentName),
    queryPerformance: (queryKey: string, duration: number) => 
      logger.queryPerformance(queryKey, duration, componentName),
    invalidationTracking: (queryKeys: string[], reason?: string) => 
      logger.invalidationTracking(queryKeys, reason, componentName)
  };
}