// Error logging and monitoring service
// This can be easily extended to integrate with Sentry, LogRocket, or other services

interface ErrorLogContext {
  userId?: string;
  userRole?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
  sessionId?: string;
  additionalContext?: Record<string, any>;
}

interface ErrorLog {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  error?: Error;
  context: ErrorLogContext;
  stack?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100; // Keep only last 100 logs in memory
  private isDevelopment = process.env.NODE_ENV === 'development';

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getContext(additionalContext?: Record<string, any>): ErrorLogContext {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      additionalContext,
    };
  }

  private getSessionId(): string {
    // Simple session ID based on session storage
    let sessionId = sessionStorage.getItem('error-logger-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-logger-session-id', sessionId);
    }
    return sessionId;
  }

  private addLog(log: ErrorLog): void {
    this.logs.push(log);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In development, log to console
    if (this.isDevelopment) {
      const style = log.level === 'error' ? 'color: red' : 
                   log.level === 'warn' ? 'color: orange' : 'color: blue';
      console.group(`%c[${log.level.toUpperCase()}] ${log.message}`, style);
      console.log('Context:', log.context);
      if (log.error) {
        console.error('Error:', log.error);
      }
      if (log.stack) {
        console.log('Stack:', log.stack);
      }
      console.groupEnd();
    }

    // TODO: Send to external logging service in production
    if (!this.isDevelopment) {
      this.sendToExternalService(log);
    }
  }

  private async sendToExternalService(log: ErrorLog): Promise<void> {
    // TODO: Implement Sentry, LogRocket, or custom API integration
    // Example for future Sentry integration:
    /*
    if (window.Sentry) {
      window.Sentry.captureException(log.error || new Error(log.message), {
        level: log.level,
        contexts: {
          custom: log.context,
        },
        tags: {
          component: log.context.additionalContext?.component,
          userId: log.context.userId,
        },
      });
    }
    */

    // For now, we could send to our own API endpoint
    try {
      // Placeholder for API call
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(log),
      // });
    } catch (err) {
      // Silently fail - don't want logging to break the app
      console.warn('Failed to send error to logging service:', err);
    }
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const log: ErrorLog = {
      id: this.generateId(),
      level: 'error',
      message,
      error,
      context: this.getContext(context),
      stack: error?.stack,
    };
    this.addLog(log);
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: Record<string, any>): void {
    const log: ErrorLog = {
      id: this.generateId(),
      level: 'warn',
      message,
      context: this.getContext(context),
    };
    this.addLog(log);
  }

  /**
   * Log info
   */
  info(message: string, context?: Record<string, any>): void {
    const log: ErrorLog = {
      id: this.generateId(),
      level: 'info',
      message,
      context: this.getContext(context),
    };
    this.addLog(log);
  }

  /**
   * Set user context for future logs
   */
  setUserContext(userId: string, userRole?: string): void {
    // Store in session storage for persistence across page reloads
    sessionStorage.setItem('error-logger-user-id', userId);
    if (userRole) {
      sessionStorage.setItem('error-logger-user-role', userRole);
    }
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext(): void {
    sessionStorage.removeItem('error-logger-user-id');
    sessionStorage.removeItem('error-logger-user-role');
  }

  /**
   * Get all logs (for debugging)
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Log React component errors
   */
  logComponentError(error: Error, errorInfo: React.ErrorInfo, componentName?: string): void {
    this.error('React component error', error, {
      component: componentName,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  /**
   * Log API errors
   */
  logApiError(
    endpoint: string, 
    method: string, 
    error: Error | string, 
    statusCode?: number,
    responseData?: any
  ): void {
    this.error('API request failed', error instanceof Error ? error : new Error(error), {
      api: {
        endpoint,
        method,
        statusCode,
        responseData,
      },
    });
  }

  /**
   * Log authentication errors
   */
  logAuthError(action: string, error: Error | string, context?: Record<string, any>): void {
    this.error(`Authentication ${action} failed`, error instanceof Error ? error : new Error(error), {
      auth: {
        action,
        ...context,
      },
    });
  }

  /**
   * Log form validation errors
   */
  logValidationError(formName: string, errors: Record<string, any>): void {
    this.warn('Form validation failed', {
      form: {
        name: formName,
        errors,
      },
    });
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Export types for TypeScript
export type { ErrorLog, ErrorLogContext };

// Helper functions for common error types
export const logApiError = errorLogger.logApiError.bind(errorLogger);
export const logAuthError = errorLogger.logAuthError.bind(errorLogger);
export const logValidationError = errorLogger.logValidationError.bind(errorLogger);
export const logComponentError = errorLogger.logComponentError.bind(errorLogger);