import { Component } from "react";
import type { ReactNode } from "react";

import { nearbyCopy } from "./copy";

import "../../styles/components/button.css";

interface Props {
  readonly children: ReactNode;
  /** Replaces the page reload in tests. */
  readonly reload?: () => void;
}

const reloadPage = (): void => {
  window.location.reload();
};

/**
 * Contains a render error of the line map. The map is drawn in the shell, outside the Nearby screen's tree, so
 * without this a map error would reach the root boundary and replace the whole app. Here only the map's frame
 * shows a fixed message and a Reload button; the picker and the rest of the page keep working. The error itself
 * is dropped (its message can carry coordinates or URLs; `report-error.ts` logs only a class name). The region is
 * an alert and takes no focus: the user is not in the map.
 */
export class MapBoundary extends Component<Props, { readonly failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="map-failed" role="alert">
        <p>{nearbyCopy.mapFailed}</p>
        <button
          type="button"
          className="btn btn--quiet btn--sm"
          onClick={this.props.reload ?? reloadPage}
        >
          {nearbyCopy.reload}
        </button>
      </section>
    );
  }
}
