import { baselineDataset, datasetProvenance, findNearestStation } from "@metro/core";
import type { Coordinate } from "@metro/core";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { useMaps } from "../../adapters/maps/context";
import { Icon } from "../../icons/Icon";
import { pickerCopy } from "../station-picker/copy";
import { FareRangeText } from "../station-picker/FareRangeText";
import { directionsIcon, externalIcon } from "../station-picker/picker-icons";
import { directionsUrl, fareRange, stopLabel } from "../station-picker/station-facts";
import { alsoNearby } from "./also-nearby";
import { copy } from "./copy";
import { formatEstimate, formatIsoDate, formatMinutes, formatWalkingDistance } from "./format";
import { useWalkingRoute } from "./walking-route";

import "../../styles/components/common.css";
import "../../styles/components/nearby.css";

const { stations, fares } = baselineDataset;

/** Where the origin came from: the device (no walking route yet, METRO-113) or a place the user searched for. */
export type LocationSource = "device" | "place";

interface LocationResultProps {
  readonly origin: Coordinate;
  readonly source: LocationSource;
  /** Whether the result heading takes focus when this mounts (false when a late result lands while typing). */
  readonly focus: boolean;
}

/**
 * The one location result (METRO-113): the nearest station to the origin, the straight-line distance as a
 * labelled estimate, the fare range with the footnote built from `datasetProvenance.fares`, the Directions link
 * (the station's own coordinate only, no origin, ADR-0009) and the two next-nearest stations. A device position
 * asks for no walking route: that area is absent, not an error (the route slice adds it). A searched place keeps
 * the walking route it had. The parent mounts a new one per result, so the heading takes focus once per result.
 */
export function LocationResult({ origin, source, focus }: LocationResultProps): ReactElement {
  const { status, routes } = useMaps();
  const nearest = findNearestStation(stations, origin);
  const found = nearest.kind === "nearest" ? nearest : null;
  const route = useWalkingRoute(
    routes,
    status,
    source === "place" ? origin : null,
    found?.station ?? null,
  );
  /** Stable, so focus moves when the heading mounts and not on every render. */
  const focusHeading = useCallback(
    (node: HTMLElement | null): void => {
      if (node !== null && focus) node.focus();
    },
    [focus],
  );

  if (found === null) {
    return (
      <section aria-labelledby="res-name">
        <h2 className="result__name" id="res-name" tabIndex={-1} ref={focusHeading}>
          {copy.resultHeading}
        </h2>
        <p className="footnote">{copy.empty}</p>
      </section>
    );
  }

  const { station, distance } = found;
  const position = stations.indexOf(station) + 1;
  const range = fareRange(fares, stations, station);
  const others = alsoNearby(stations, origin, station.id);
  return (
    <>
      <article className="result" aria-labelledby="res-name">
        <div className="result__main">
          <div className="result__head">
            <div className="result__titles">
              <p className="eyebrow">{copy.resultHeading}</p>
              <h2 className="result__name" id="res-name" tabIndex={-1} ref={focusHeading}>
                {station.name}
              </h2>
              <p className="metric__about">{pickerCopy.stop(position, stations.length)}</p>
            </div>
            <span className="roundel roundel--lg" data-stop={position} aria-hidden="true">
              {stopLabel(position)}
            </span>
          </div>
          <div className="result__metrics">
            <div className="metric">
              <span className="metric__about">{copy.distanceAbout}</span>
              <span className="metric__value">
                <span className="metric__unit">{formatEstimate(distance)}</span>
              </span>
              <span className="metric__label">{copy.distanceLabel}</span>
            </div>
          </div>
          {source === "place" && route.phase !== "idle" ? (
            <p className="result__walk">
              <span className="metric__about">{copy.walking}: </span>
              <output>
                {route.phase === "loading" && copy.routeLoading}
                {route.phase === "success" &&
                  `${formatWalkingDistance(route.route.distance)}, ${formatMinutes(route.route.durationSeconds)}`}
              </output>
              {route.phase === "failure" && (
                <span className="ns-alert-inline" role="alert">
                  {copy.routeUnavailable}
                </span>
              )}
            </p>
          ) : null}
          {range === null ? null : (
            <>
              <div className="result__fare">
                <span>{pickerCopy.fareLabel}</span>
                <span className="result__fare-value">
                  <FareRangeText range={range} />
                </span>
              </div>
              <p className="footnote">
                {copy.faresAsOf(
                  formatIsoDate(datasetProvenance.fares.noticeDate),
                  formatIsoDate(datasetProvenance.fares.officialTableRetrieved),
                )}
              </p>
            </>
          )}
        </div>
        <div className="result__links">
          <a
            className="link-ext"
            href={directionsUrl(station)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon icon={directionsIcon} size={16} />
            {pickerCopy.directions}
            <Icon icon={externalIcon} size={14} />
            <span className="visually-hidden">{pickerCopy.newTab}</span>
          </a>
        </div>
      </article>
      {others.length === 0 ? null : (
        <section className="also" aria-labelledby="also-t">
          <div className="also__head">
            <h3 className="section-label" id="also-t">
              {copy.alsoNearby}
            </h3>
          </div>
          <ul className="also__grid also__list">
            {others.map(({ station: other, km }) => {
              const stop = stations.indexOf(other) + 1;
              return (
                <li className="also__card" key={other.id}>
                  <span className="roundel roundel--md" data-stop={stop} aria-hidden="true">
                    {stopLabel(stop)}
                  </span>
                  <span className="also__text">
                    <span className="also__name">{other.name}</span>
                    <span className="also__meta">{copy.alsoMeta(formatEstimate(km))}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
