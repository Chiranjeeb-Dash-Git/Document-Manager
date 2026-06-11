import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info);
  }

  handleReset = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            color: '#e5e7eb',
            background: '#0a0518',
          }}
        >
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: 'rgba(196, 181, 253, 0.7)', maxWidth: '32rem' }}>
            The app ran into an unexpected error. Try reloading — if it keeps happening,
            click below to reset your session.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'linear-gradient(135deg, #6d28d9, #4c1d95)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset &amp; reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
