import { useEffect, useRef } from "react";

type AriaPoliteness = "polite" | "assertive";

/**
 * Creates an accessible live region for screen reader announcements.
 * The region is visually hidden but accessible to assistive technologies.
 * Use "polite" for non-urgent updates, "assertive" for critical alerts.
 */
export function useLiveRegion(polite: AriaPoliteness = "polite") {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create off-screen live region following WCAG 2.2 patterns
    const node = document.createElement("div");
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", polite);
    node.setAttribute("aria-atomic", "true");
    node.style.position = "absolute";
    node.style.width = "1px";
    node.style.height = "1px";
    node.style.margin = "-1px";
    node.style.border = "0";
    node.style.padding = "0";
    node.style.overflow = "hidden";
    node.style.clip = "rect(0 0 0 0)";
    document.body.appendChild(node);
    nodeRef.current = node;
    return () => {
      node.remove();
    };
  }, [polite]);

  const announce = (message: string) => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }
    // Clear and re-populate to force screen reader announcement
    node.textContent = "";
    window.requestAnimationFrame(() => {
      node.textContent = message;
    });
  };

  return { announce } as const;
}
