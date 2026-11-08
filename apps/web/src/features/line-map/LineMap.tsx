import type { Coordinate, StationId } from "@metro/core";
import type { ReactElement } from "react";

import { mapCopy } from "./copy";
import { FIT_VIEW, lineStops, project, round1 } from "./projection";
import type { LineStop, Point } from "./projection";

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
/** The map is the one tab stop: it takes the keys that pan and zoom. */
const KEYBOARD_STOP = 0;
const STOPS = lineStops();
const FIRST = STOPS[0];
const LAST = STOPS[STOPS.length - 1];

const points = (list: readonly Point[]): string =>
  list.map((p) => `${round1(p.x)},${round1(p.y)}`).join(" ");

/** The pill label's box: width follows the text (7.6u per character plus 9u padding each side), height 24u. */
function pill(stop: LineStop): {
  x: number;
  y: number;
  width: number;
  textX: number;
  textY: number;
} {
  const width = round1(stop.name.length * 7.6 + 18);
  const left = stop.placement === "left";
  const below = stop.placement === "below";
  const x = round1(below ? stop.x - width / 2 : left ? stop.x - 14 - width : stop.x + 14);
  const y = round1(below ? stop.y + 20 : stop.y - 12);
  return { x, y, width, textX: round1(x + width / 2), textY: round1(y + 16) };
}

/** The halo label's anchor and position. */
function halo(stop: LineStop): { x: number; y: number; anchor: "start" | "end" | "middle" } {
  if (stop.placement === "below")
    return { x: round1(stop.x), y: round1(stop.y + 22), anchor: "middle" };
  if (stop.placement === "left")
    return { x: round1(stop.x - 11), y: round1(stop.y + 4), anchor: "end" };
  return { x: round1(stop.x + 11), y: round1(stop.y + 4), anchor: "start" };
}

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
 * top follow the handoff: background, planes, dot grid, line shadow, casing, line, trip highlight, walk path,
 * user pin, station pins, labels. Every value is an attribute or a class; colours come from tokens.
 *
 * The svg is `role="application"` (named by its title, described by its desc) because it is a keyboard
 * stop that pans and zooms; the station list beside it is the text equivalent.
 */
export function LineMap({ highlighted = NONE, position, walk, trip }: LineMapProps): ReactElement {
  if (FIRST === undefined || LAST === undefined) throw new Error("The station dataset is empty");
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
        viewBox={`${FIT_VIEW.x} ${FIT_VIEW.y} ${FIT_VIEW.width} ${FIT_VIEW.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-labelledby="map-title"
        aria-describedby="map-desc"
        tabIndex={KEYBOARD_STOP}
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
        <rect className="map__plane--1" x="-260" y="-240" width="520" height="560" rx="96" />
        <rect className="map__plane--2" x="330" y="-200" width="640" height="520" rx="96" />
        <rect className="map__plane--2" x="-220" y="520" width="560" height="760" rx="96" />
        <rect className="map__plane--1" x="300" y="380" width="640" height="560" rx="96" />
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
          <>
            <circle className="map__me-pulse" cx={round1(user.x)} cy={round1(user.y)} r="9" />
            <circle
              className="map__me"
              cx={round1(user.x)}
              cy={round1(user.y)}
              r="8"
              strokeWidth="3"
            />
          </>
        )}
        {STOPS.map((stop) =>
          marked.has(stop.id) ? (
            <g key={stop.id}>
              <circle className="map__pin-halo" cx={round1(stop.x)} cy={round1(stop.y)} r="15" />
              <circle
                className="map__pin map__pin--hl"
                cx={round1(stop.x)}
                cy={round1(stop.y)}
                r="7.5"
                strokeWidth="3"
              />
            </g>
          ) : (
            <circle
              key={stop.id}
              className="map__pin"
              cx={round1(stop.x)}
              cy={round1(stop.y)}
              r="5"
              strokeWidth="2.5"
            />
          ),
        )}
        {STOPS.map((stop) => {
          const isMarked = marked.has(stop.id);
          if (isMarked || stop.terminus) {
            const box = pill(stop);
            return (
              <g key={stop.id}>
                <rect
                  className={isMarked ? "map__pill" : "map__pill map__pill--term"}
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height="24"
                  rx="12"
                />
                <text
                  className="map__pill-text"
                  x={box.textX}
                  y={box.textY}
                  textAnchor="middle"
                  fontSize="12.5"
                >
                  {stop.name}
                </text>
              </g>
            );
          }
          const spot = halo(stop);
          return (
            <text
              key={stop.id}
              className="map__label"
              x={spot.x}
              y={spot.y}
              textAnchor={spot.anchor}
              fontSize="11.5"
              strokeWidth="3.5"
            >
              {stop.name}
            </text>
          );
        })}
      </svg>
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
