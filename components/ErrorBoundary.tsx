import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fix: Changed to extend React.Component directly to resolve a TypeScript error
// where `this.props` was not being recognized on line 52. This makes the dependency on
// React's Component class explicit and can prevent type resolution issues.
class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Initialize state as a class property to fix TypeScript errors.
  // The original constructor-based initialization was causing `this.state` to be unrecognized.
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="text-white bg-red-900 min-h-screen flex flex-col items-center justify-center p-4">
          <div className="bg-red-800/50 border border-red-600 p-8 rounded-lg max-w-2xl text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
            <p className="text-red-200 mb-4">The application encountered a critical error and cannot continue. Please check your browser's console for more details.</p>
            <pre className="mt-2 p-2 bg-gray-900 rounded text-left text-sm whitespace-pre-wrap overflow-x-auto">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
