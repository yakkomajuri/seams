import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class EditorErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[EditorErrorBoundary] caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid h-full place-items-center" style={{ alignContent: 'center', paddingBottom: '10%' }}>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--txt-3)' }}>
              The editor crashed unexpectedly
            </p>
            <button
              className="mt-4 rounded-md px-4 py-2 text-sm transition-colors"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--txt)',
                border: '1px solid var(--bd)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; }}
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
