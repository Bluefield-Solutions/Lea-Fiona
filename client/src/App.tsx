import { Component, ErrorInfo, ReactNode } from "react";
import GamePage from "@/pages/game";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? "Unbekannter Fehler" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log so it shows up in the dev console; never silently swallow.
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#0a0a0a",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
            zIndex: 9999,
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Ups, da ist etwas schief gelaufen</h1>
          <p style={{ opacity: 0.8, marginBottom: "1.5rem", maxWidth: 480 }}>
            {this.state.message}
          </p>
          <button
            data-testid="button-reload"
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#ffd700",
              color: "#000",
              border: "none",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Spiel neu laden
          </button>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <GamePage />
    </ErrorBoundary>
  );
}

export default App;
