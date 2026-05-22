import { Component } from "react";
import { C, FONT } from "../lib/theme";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[IOC Enricher] Unhandled error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.bg,
        fontFamily: FONT,
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480,
          background: C.bgCard,
          border: `1px solid rgba(248,113,113,0.3)`,
          borderRadius: 16,
          padding: "32px 36px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.red, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: `linear-gradient(135deg, #3b82f6, #1d4ed8)`,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}
