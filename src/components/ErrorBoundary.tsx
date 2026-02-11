import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-empresarial flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900/50 rounded-lg border border-gray-800 p-8 text-center space-y-6">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
            <div>
              <h1 className="text-xl font-bold text-dorado mb-2">Algo salió mal</h1>
              <p className="text-gray-400 text-sm">
                La aplicación encontró un error inesperado. Intente recargar la página.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-xs text-red-400 bg-red-900/20 p-3 rounded overflow-auto max-h-32 text-left">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <Button onClick={this.handleReload} className="flex-1 bg-dorado text-empresarial hover:bg-dorado/90">
                Recargar página
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                Ir al inicio
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
