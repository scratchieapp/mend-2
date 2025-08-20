import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export function LoadingState({ 
  className, 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false 
}: LoadingStateProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className={cn('mt-2 text-muted-foreground', textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingSpinner({ className, size = 'md' }: Omit<LoadingStateProps, 'text' | 'fullScreen'>) {
  return <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />;
}

export function LoadingCard({ text = 'Loading content...' }: { text?: string }) {
  return (
    <div className="rounded-lg border bg-card p-8">
      <LoadingState text={text} />
    </div>
  );
}

export function LoadingOverlay({ text = 'Processing...' }: { text?: string }) {
  return <LoadingState fullScreen text={text} size="lg" />;
}