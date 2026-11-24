// Isolates parts built by other agents in parallel (body map, diagrams, 3D) so a failure never takes the page down.
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Changing this resets the boundary. */
  resetKey?: unknown;
}

interface State {
  error: Error | null;
  key: unknown;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error) {
    // Keep a trace for developers without surfacing an error overlay to users.
    console.warn('[TriBody] section failed to render:', error.message);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="placeholder" role="status">
            <div>
              <strong>表示できませんでした</strong>
              <span>この部分は現在準備中です。</span>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
