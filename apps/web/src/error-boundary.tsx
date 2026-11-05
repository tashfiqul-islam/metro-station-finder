import { Component, type ReactNode } from "react";

/** All user-visible error copy of the web app lives here (fallback and request error; English only for now). */
export const errorCopy = {
  heading: "Something went wrong",
  body: "The page hit an unexpected problem. Try again, or reload the page if it keeps happening.",
  retry: "Try again",
  statusUnavailable: "Scaffold status unavailable. Reload the page to try again.",
} as const;

interface Props {
  readonly children: ReactNode;
}
interface State {
  readonly failed: boolean;
}

/**
 * Class component because React has no hook for error boundaries (Context7-verified, react.dev
 * Component reference). The error itself is deliberately not kept in state or rendered: reporting
 * is done by the root callbacks in `report-error.ts`, which log only a safe error class.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };
  /** Stable ref callback: focus moves to the fallback once, when it mounts. */
  private readonly focusAlert = (node: HTMLElement | null): void => {
    node?.focus();
  };

  static getDerivedStateFromError(_error: unknown): State {
    return { failed: true };
  }

  private readonly retry = (): void => {
    this.setState({ failed: false });
  };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main>
        <section ref={this.focusAlert} role="alert" aria-labelledby="error-heading" tabIndex={-1}>
          <h1 id="error-heading">{errorCopy.heading}</h1>
          <p>{errorCopy.body}</p>
          <button type="button" onClick={this.retry}>
            {errorCopy.retry}
          </button>
        </section>
      </main>
    );
  }
}
