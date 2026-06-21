import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { name: string; children: ReactNode }
interface State { err: Error | null }

/** Per-page boundary so one broken Eru import does not take down all of Eru. */
export default class EruErrorBoundary extends Component<Props, State> {
  state: State = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: unknown) {
    console.error(`[eru/${this.props.name}]`, err, info);
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="mb-3 flex items-center gap-2 text-amber-300">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-semibold">Eru module unavailable: {this.props.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            This page was imported from Eru but depends on infrastructure not yet wired
            (Base44 app id, missing entity, or platform-specific API). The rest of Jackie is unaffected.
          </p>
          <pre className="mt-3 max-h-48 overflow-auto rounded bg-background/60 p-3 text-xs text-muted-foreground">
{String(this.state.err?.stack || this.state.err?.message || this.state.err)}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ err: null })}
            className="mt-3 rounded border border-border px-3 py-1 text-xs hover:bg-accent"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
