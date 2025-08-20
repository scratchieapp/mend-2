import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class BuilderErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // If it's the gptengineer cloning error, suppress it
    if (error.message.includes("Request object could not be cloned")) {
      return { hasError: false };
    }
    // Otherwise, show the error UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Only log errors that aren't the cloning error
    if (!error.message.includes("Request object could not be cloned")) {
      console.error("Builder error:", error);
      console.error("Error info:", info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
