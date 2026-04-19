import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Globaler ErrorBoundary.
 * Fängt Render-Fehler in der gesamten App ab und zeigt eine freundliche Fehlerseite,
 * statt einen weissen Bildschirm. Nur Render-/Lifecycle-Fehler – keine async/event-Handler.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Konsole für Debugging im Dev/Prod
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message ?? "Unbekannter Fehler";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-destructive"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold">Etwas ist schiefgelaufen</h1>
            <p className="text-sm text-muted-foreground">
              Die Seite konnte nicht angezeigt werden. Bitte lade die App neu.
            </p>
          </div>

          <details className="text-left rounded-md border border-border bg-muted/40 p-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none">
              Fehlerdetails anzeigen
            </summary>
            <pre className="mt-2 text-[11px] font-mono text-destructive whitespace-pre-wrap break-words">
              {message}
            </pre>
          </details>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition"
            >
              Neu laden
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition"
            >
              Zur Startseite
            </button>
          </div>
        </div>
      </div>
    );
  }
}
