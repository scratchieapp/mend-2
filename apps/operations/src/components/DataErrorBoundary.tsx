import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ErrorBoundary from './ErrorBoundary';

interface DataErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  errorTitle?: string;
  errorDescription?: string;
}

const DataErrorFallback: React.FC<{
  error?: Error;
  onRetry?: () => void;
  title?: string;
  description?: string;
}> = ({ error, onRetry, title, description }) => {
  return (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title || 'Failed to load data'}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{description || 'There was a problem loading the data. Please try again.'}</p>
        {error && process.env.NODE_ENV === 'development' && (
          <p className="mt-2 text-sm font-mono">{error.message}</p>
        )}
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export const DataErrorBoundary: React.FC<DataErrorBoundaryProps> = ({
  children,
  onRetry,
  errorTitle,
  errorDescription,
}) => {
  return (
    <ErrorBoundary
      fallback={
        <DataErrorFallback
          onRetry={onRetry}
          title={errorTitle}
          description={errorDescription}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default DataErrorBoundary;