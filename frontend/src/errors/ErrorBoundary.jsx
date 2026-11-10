import { isChunkError } from './chunkError.js';
import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import FailureState from './FailureState.jsx';

export class ErrorBoundary extends Component {
  state = { failed: false, chunk: false };
  static getDerivedStateFromError(error) { return { failed: true, chunk: isChunkError(error) }; }
  // Do not log exception messages, component props or request details.
  render() {
    if (this.state.failed) return <FailureState kind={this.state.chunk ? 'chunk' : 'application'} onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname + location.search}>{children}</ErrorBoundary>;
}
