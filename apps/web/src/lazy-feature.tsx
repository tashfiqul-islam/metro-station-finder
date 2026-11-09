import { Component, Suspense, lazy, type ComponentType, type ReactNode } from "react";

/** All copy of the lazy-loading helper (fixed, English only; never an error message). */
export const lazyCopy = {
  loading: "Loading this part of the page.",
  failed: "This part of the page could not be loaded. Reload the page to try again.",
  reload: "Reload the page",
} as const;

export type FeatureLoader<P extends object> = () => Promise<{ default: ComponentType<P> }>;
export type Reload = () => void;

const reloadPage: Reload = () => {
  window.location.reload();
};

interface Props<P extends object> {
  readonly Feature: ComponentType<P>;
  readonly featureProps: P;
  readonly reload: Reload;
  /** What shows while the chunk loads. */
  readonly pending: ReactNode;
}
interface State {
  readonly failed: boolean;
  /** An error that did not come from loading the chunk: the feature's own render error. Rethrown, never shown. */
  readonly foreign: { readonly error: unknown } | null;
}

/** Errors a loader rejected with. Only these mean "the chunk could not be loaded"; any other error is the feature's own. */
const loadErrors = new WeakSet();

/**
 * Pending state: visible text in a polite status region, no spinner and no animation, so there is nothing
 * for `prefers-reduced-motion` to switch off and the meaning never depends on motion. On a fast load it
 * can flash for a moment; accepted as a known minor (ADR-0020).
 */
function Pending(): ReactNode {
  return <output>{lazyCopy.loading}</output>;
}

/**
 * Class component because React has no hook for error boundaries. A rejected `import()` (offline, chunk
 * 404) throws when React reads the lazy component and lands here. The button reloads the page instead of
 * importing again: React caches a rejected `lazy` result, a browser may cache a failed `import()` of the
 * same specifier for the life of the document (Unverified), and after a deploy an old page asks for hashed
 * chunks that no longer exist; only a reload fetches the new HTML and chunk names. The error is not kept
 * or rendered; the root callbacks in `report-error.ts` log only its built-in class name.
 *
 * Accessibility: like a route change, the failure takes focus (a `tabIndex={-1}` region named by the fixed
 * text, which is read once when focus lands) and has NO `role="alert"`; an alert plus moved focus can
 * announce the same text twice. The visible focus ring comes from `base.css` (`section:focus`, forced on script focus; METRO-118).
 */
class FeatureBoundary<P extends object> extends Component<Props<P>, State> {
  override state: State = { failed: false, foreign: null };
  private readonly focusRegion = (node: HTMLElement | null): void => {
    node?.focus();
  };

  static getDerivedStateFromError(error: unknown): State {
    const fromLoader = typeof error === "object" && error !== null && loadErrors.has(error);
    return fromLoader ? { failed: true, foreign: null } : { failed: false, foreign: { error } };
  }

  override render(): ReactNode {
    // The feature's own render error is not a load failure: pass it up to the root error boundary unchanged
    // (METRO-105: the landing slice is a lazy feature, and its render errors keep the "Try again" fallback).
    if (this.state.foreign !== null) {
      const { error } = this.state.foreign;
      throw error instanceof Error
        ? error
        : new Error("A feature threw a value that is not an error");
    }
    if (this.state.failed) {
      return (
        <section ref={this.focusRegion} aria-label={lazyCopy.failed} tabIndex={-1}>
          <p>{lazyCopy.failed}</p>
          <button type="button" onClick={this.props.reload}>
            {lazyCopy.reload}
          </button>
        </section>
      );
    }
    const { Feature, featureProps, pending } = this.props;
    return (
      <Suspense fallback={pending}>
        <Feature {...featureProps} />
      </Suspense>
    );
  }
}

/**
 * The route-level lazy-loading pattern (ADR-0020): `lazyFeature(() => import("./features/x/X"))` returns a
 * component that loads its chunk on first render, shows the fixed pending status meanwhile, and shows the
 * fixed failure message with a Reload button when the chunk cannot be fetched. The chunk stays out of the
 * first-visit bundle budget because Vite lists a dynamic import under `dynamicImports`, not `imports`.
 * `reload` is injectable for tests. `pending` replaces the status text while loading: a feature that is not
 * the page's main content (the line map beside the screen, METRO-111) passes `null` so one load does not
 * announce two statuses; the failure region and its Reload button are the same either way.
 */
export function lazyFeature<P extends object>(
  load: FeatureLoader<P>,
  reload: Reload = reloadPage,
  pending: ReactNode = <Pending />,
): ComponentType<P> {
  const Feature = lazy(async () => {
    try {
      return await load();
    } catch (error) {
      const failure = error instanceof Error ? error : new Error("load failed");
      loadErrors.add(failure);
      throw failure;
    }
  });
  return function LazyFeature(props: P): ReactNode {
    return (
      <FeatureBoundary Feature={Feature} featureProps={props} reload={reload} pending={pending} />
    );
  };
}
