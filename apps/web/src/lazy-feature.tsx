import {
  Component,
  Suspense,
  lazy,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";

/** All copy of the lazy-loading helper (fixed, English only; never an error message). */
export const lazyCopy = {
  loading: "Loading this part of the page.",
  failed: "This part of the page could not be loaded. Check your connection and try again.",
  retry: "Try again",
} as const;

export type FeatureLoader<P extends object> = () => Promise<{ default: ComponentType<P> }>;

interface Props<P extends object> {
  readonly initial: LazyExoticComponent<ComponentType<P>>;
  readonly load: FeatureLoader<P>;
  readonly featureProps: P;
}
interface State<P extends object> {
  readonly failed: boolean;
  readonly Feature: LazyExoticComponent<ComponentType<P>>;
}

/**
 * Pending state: visible text in a polite status region, no spinner and no animation, so there is nothing
 * for `prefers-reduced-motion` to switch off and the meaning never depends on motion.
 */
function Pending(): ReactNode {
  return <output>{lazyCopy.loading}</output>;
}

/**
 * Class component because React has no hook for error boundaries. A rejected `import()` (offline, chunk
 * 404) throws when React reads the lazy component and lands here. React caches a rejected `lazy`
 * component, so Retry builds a fresh one from the loader, which asks the network again once per click. The
 * error is not kept or rendered; the root callbacks in `report-error.ts` log only its built-in class name.
 */
class FeatureBoundary<P extends object> extends Component<Props<P>, State<P>> {
  override state: State<P> = { failed: false, Feature: this.props.initial };
  private readonly focusAlert = (node: HTMLElement | null): void => {
    node?.focus();
  };

  static getDerivedStateFromError(_error: unknown): { failed: boolean } {
    return { failed: true };
  }

  private readonly retry = (): void => {
    this.setState({ failed: false, Feature: lazy(this.props.load) });
  };

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <div ref={this.focusAlert} role="alert" tabIndex={-1}>
          <p>{lazyCopy.failed}</p>
          <button type="button" onClick={this.retry}>
            {lazyCopy.retry}
          </button>
        </div>
      );
    }
    const { Feature } = this.state;
    return (
      <Suspense fallback={<Pending />}>
        <Feature {...this.props.featureProps} />
      </Suspense>
    );
  }
}

/**
 * The route-level lazy-loading pattern (ADR-0020): `lazyFeature(() => import("./features/x/X"))` returns a
 * component that loads its chunk on first render, shows the fixed pending status meanwhile, and shows the
 * fixed failure message with a Retry button when the chunk cannot be fetched. The chunk stays out of the
 * first-visit bundle budget because Vite lists a dynamic import under `dynamicImports`, not `imports`.
 */
export function lazyFeature<P extends object>(load: FeatureLoader<P>): ComponentType<P> {
  const initial = lazy(load);
  return function LazyFeature(props: P): ReactNode {
    return <FeatureBoundary initial={initial} load={load} featureProps={props} />;
  };
}
