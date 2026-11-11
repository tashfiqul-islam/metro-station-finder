import type { ReactElement } from "react";

import { Icon } from "../icons/Icon";
import type { IconShapes } from "../icons/Icon";

import "../styles/components/nav.css";
import { shellCopy } from "./copy";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: IconShapes;
  /** The page this link opens is the one on screen: `aria-current="page"`. Links, never `role="tab"`. */
  readonly current?: boolean;
}

interface SectionNavProps {
  readonly items: readonly NavItem[];
}

/**
 * The section links: a pill bar at the bottom below 768 px, a segmented bar at the top of the sidebar above
 * (the same DOM; CSS moves it). Pass it to `AppShell` as `nav`. Inactive labels stay in the accessibility
 * tree, only their width collapses.
 */
export function SectionNav({ items }: SectionNavProps): ReactElement {
  return (
    <nav className="tabs" aria-label={shellCopy.navLabel}>
      {items.map((item) => (
        <a
          key={item.href}
          className="tabs__item"
          href={item.href}
          {...(item.current === true ? { "aria-current": "page" as const } : {})}
        >
          <Icon icon={item.icon} />
          <span className="tabs__label">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
