import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("ScamShield render failed", error, info); }
  render() {
    if (this.state.failed) return <main className="fatal-error"><h1>ScamShield needs a reset</h1><p>The interface stopped before taking any action.</p><button type="button" onClick={() => window.location.reload()}>Reload safely</button></main>;
    return this.props.children;
  }
}
