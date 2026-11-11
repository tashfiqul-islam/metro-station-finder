import type { Coordinate, StationId } from "@metro/core";
import type { ReactElement } from "react";

import { Icon } from "../../icons/Icon";
import { maximize } from "../../icons/shapes/maximize";
import { minus } from "../../icons/shapes/minus";
import { plus } from "../../icons/shapes/plus";
import { mapCopy } from "./copy";
import { layoutLabels } from "./labels";
import { lineStops, project, round1 } from "./projection";
import type { LineStop, Point } from "./projection";
import { useMapView } from "./use-map-view";
import { LABELS_ZOOM, viewBoxOf } from "./view";

import "../../styles/components/map.css";

export interface LineMapProps {
  /** Stations drawn as the focus of the screen (nearest, from, to, detail). */
  readonly highlighted?: readonly StationId[];
  /** The user's position, drawn only; never stored or sent anywhere. */
  readonly position?: Coordinate;
  /** A walking path, as coordinates from the position to the station. */
  readonly walk?: readonly Coordinate[];
  /** A trip between two stations; the stretch between them is drawn over the dimmed line. */
  readonly trip?: { readonly from: StationId; readonly to: StationId };
}

const NONE: readonly StationId[] = [];
const STOPS = lineStops();
const FIRST = STOPS[0];
const LAST = STOPS[STOPS.length - 1];

const points = (list: readonly Point[]): string =>
  list.map((p) => `${round1(p.x)},${round1(p.y)}`).join(" ");

/** A scale for a transform attribute: three decimals, so the markup stays short. */
const scaleText = (value: number): string => String(Math.round(value * 1000) / 1000);

/** Where a stop's group sits and how it is scaled: fixed-size parts are drawn in pixels inside it. */
const placeAt = (stop: Point, unit: number): string =>
  `translate(${round1(stop.x)} ${round1(stop.y)}) scale(${scaleText(unit)})`;

function nameOf(id: StationId): string {
  return STOPS.find((stop) => stop.id === id)?.name ?? "";
}

function tripStops(trip: LineMapProps["trip"]): readonly LineStop[] {
  if (trip === undefined) return [];
  const a = STOPS.findIndex((stop) => stop.id === trip.from);
  const b = STOPS.findIndex((stop) => stop.id === trip.to);
  if (a < 0 || b < 0) return [];
  return STOPS.slice(Math.min(a, b), Math.max(a, b) + 1);
}

/**
 * The pure SVG schematic of MRT Line 6 (METRO-111): no network, no Google, nothing stored. Layers bottom to
 * top follow the handoff: background, dot grid, line shadow, casing, line, trip highlight, walk path,
 * user pin, station pins, labels. Every value is an attribute or a class; colours come from tokens.
 *
 * The svg is `role="application"` (named by its title, described by its desc) because it is a keyboard
 * stop that pans and zooms (`use-map-view.ts`, `view.ts`); the station list beside it is the text equivalent.
 */
export function LineMap({ highlighted = NONE, position, walk, trip }: LineMapProps): ReactElement {
  if (FIRST === undefined || LAST === undefined) throw new Error("The station dataset is empty");
  const { view, unit, svg, handlers, zoomIn, zoomOut, fit } = useMapView();
  const labels = layoutLabels(STOPS, highlighted, view.zoom >= LABELS_ZOOM, unit);
  const marked = new Set<StationId>(highlighted);
  const stretch = tripStops(trip);
  const user = position === undefined ? null : project(position);
  const path = walk === undefined || walk.length < 2 ? null : walk.map((c) => project(c));
  const all = points(STOPS);
  const description = mapCopy.describe({
    stations: STOPS.length,
    first: FIRST.name,
    last: LAST.name,
    highlighted: highlighted.map(nameOf).filter((name) => name !== ""),
    position: user !== null,
    walk: path !== null,
    trip:
      stretch.length > 0 && trip !== undefined
        ? { from: nameOf(trip.from), to: nameOf(trip.to) }
        : null,
  });

  return (
    <section className="line-map" aria-label={mapCopy.region}>
      <svg
        className="map"
        ref={svg}
        viewBox={viewBoxOf(view)}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-labelledby="map-title"
        aria-describedby="map-desc"
        aria-keyshortcuts={mapCopy.shortcuts}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- custom pan and zoom widget: it takes arrow keys, plus, minus and 0
        tabIndex={0}
        {...handlers}
      >
        <title id="map-title">{mapCopy.title}</title>
        <desc id="map-desc">{description}</desc>
        <defs>
          <linearGradient
            id="map-line"
            gradientUnits="userSpaceOnUse"
            x1={round1(FIRST.x)}
            y1={round1(FIRST.y)}
            x2={round1(LAST.x)}
            y2={round1(LAST.y)}
          >
            <stop offset="0" className="map__stop-a" />
            <stop offset="1" className="map__stop-b" />
          </linearGradient>
          <pattern id="map-dots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle className="map__dot" cx="9" cy="9" r="0.9" />
          </pattern>
        </defs>
        <rect className="map__bg" x="-3000" y="-3000" width="6710" height="7055" />
        <rect x="-600" y="-600" width="1910" height="2255" fill="url(#map-dots)" />
        <polyline
          className="map__shadow"
          points={all}
          fill="none"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          className="map__casing"
          points={all}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          className={stretch.length > 0 ? "map__line map__line--dim" : "map__line"}
          points={all}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {stretch.length > 0 ? (
          <polyline
            className="map__line"
            points={points(stretch)}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {path === null ? null : (
          <polyline
            className="map__walk"
            points={points(path)}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {user === null ? null : (
          <g transform={placeAt(user, unit)}>
            <circle className="map__me-pulse" r="9" />
            <circle className="map__me" r="8" strokeWidth="3" />
          </g>
        )}
        {STOPS.map((stop) => (
          <g key={stop.id} transform={placeAt(stop, unit)}>
            {marked.has(stop.id) ? (
              <>
                <circle className="map__pin-halo" r="15" />
                <circle className="map__pin map__pin--hl" r="7.5" strokeWidth="3" />
              </>
            ) : (
              <circle className="map__pin" r="5" strokeWidth="2.5" />
            )}
          </g>
        ))}
        {STOPS.map((stop) => {
          const label = labels.get(stop.id);
          if (label === undefined) return null;
          return (
            <g key={stop.id} transform={placeAt(stop, unit)}>
              {label.kind === "pill" ? (
                <>
                  <rect
                    className={marked.has(stop.id) ? "map__pill" : "map__pill map__pill--term"}
                    x={label.x}
                    y={label.y}
                    width={label.width}
                    height={label.height}
                    rx="12"
                  />
                  <text
                    className="map__pill-text"
                    x={label.textX}
                    y={label.textY}
                    textAnchor="middle"
                    fontSize="12.5"
                  >
                    {stop.name}
                  </text>
                </>
              ) : (
                <text
                  className="map__label"
                  x={label.textX}
                  y={label.textY}
                  textAnchor={label.anchor}
                  fontSize="11.5"
                  strokeWidth="3.5"
                >
                  {stop.name}
                </text>
              )}
            </g>
          );
        })}{" "}
      </svg>
      <fieldset className="map-controls" aria-label={mapCopy.controls}>
        <button
          type="button"
          className="map-controls__btn"
          aria-label={mapCopy.zoomIn}
          onClick={zoomIn}
        >
          <Icon icon={plus} />
        </button>
        <button
          type="button"
          className="map-controls__btn"
          aria-label={mapCopy.zoomOut}
          onClick={zoomOut}
        >
          <Icon icon={minus} />
        </button>
        <button type="button" className="map-controls__btn" aria-label={mapCopy.fit} onClick={fit}>
          <Icon icon={maximize} size={18} />
        </button>
      </fieldset>
      <ol className="line-map__list visually-hidden" aria-label={mapCopy.listLabel}>
        {STOPS.map((stop) => (
          <li key={stop.id}>
            {stop.name}
            {marked.has(stop.id) ? mapCopy.highlightedSuffix : ""}
          </li>
        ))}
      </ol>
    </section>
  );
}
