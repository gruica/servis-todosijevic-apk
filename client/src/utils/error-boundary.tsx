// 🟡 SREDNJI PRIORITET: Error Handling Standardizacija

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error za production monitoring
    console.error(`🚨 [ERROR BOUNDARY] ${this.props.componentName || 'Admin Panel'}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/admin';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Greška u administraciji</CardTitle>
              <CardDescription>
                Došlo je do neočekivane greške u {this.props.componentName || 'admin panelu'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                  <p className="font-medium text-red-800 mb-1">Detalji greške:</p>
                  <p className="text-red-700 font-mono text-xs">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Pokušaj ponovo
                </Button>
                
                <Button 
                  onClick={this.handleReload}
                  className="w-full"
                  variant="outline"
                >
                  Osvježi stranicu
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  className="w-full"
                  variant="ghost"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Nazad na početnu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook za standardized error handling
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`🚨 [ERROR] ${context || 'Admin Panel'}:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Možete dodati external error reporting ovde
    // Primer: Sentry.captureException(error, { tags: { context } });
  };

  const handleApiError = (error: any, endpoint: string) => {
    const errorMessage = error?.message || error?.response?.data?.message || 'Nepoznata greška';
    
    console.error(`🚨 [API ERROR] ${endpoint}:`, {
      message: errorMessage,
      status: error?.response?.status,
      endpoint,
      timestamp: new Date().toISOString()
    });

    return {
      title: "Greška pri komunikaciji sa serverom",
      description: errorMessage,
      variant: "destructive" as const
    };
  };

  return {
    handleError,
    handleApiError
  };
}

// HOC za wrapping komponenti sa error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => (
    <AdminErrorBoundary componentName={componentName}>
      <Component {...props} />
    </AdminErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}