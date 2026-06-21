import { Component } from 'react';

/**
 * App-level error boundary. Without this, any render-time error in a page
 * unmounts the whole React tree and leaves the user on a blank white screen.
 * Here we catch it, log it, and show a recoverable fallback.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Hook for a real reporter (Sentry, etc.) later.
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground break-words">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReset}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              Try again
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="h-10 px-4 rounded-xl border border-border text-sm font-medium"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
