import {
  assessNearestReliability,
  baselineDataset,
  datasetProvenance,
  findFare,
  findNearestStation,
} from "@metro/core";
import type { Coordinate, Station } from "@metro/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useMaps } from "../../adapters/maps/context";
import type {
  MapsAdapter,
  MapsStatus,
  RouteService,
  WalkingRoute,
} from "../../adapters/maps/context";
import { copy } from "./copy";
import {
  formatAccuracy,
  formatIsoDate,
  formatKm,
  formatMinutes,
  formatWalkingDistance,
} from "./format";
import { locate } from "./geolocate";

import "../../styles/components/common.css";
import "./nearest-station.css";

const stations = baselineDataset.stations;

/** Suggestions lean toward the network: the mean of the station coordinates, not a hard-coded point. */
const SEARCH_BIAS = {
  center: {
    lat: stations.reduce((sum, s) => sum + s.coordinate.lat, 0) / stations.length,
    lng: stations.reduce((sum, s) => sum + s.coordinate.lng, 0) / stations.length,
  },
  radiusMeters: 25_000,
};

type Locating = "idle" | "locating" | "denied" | "unavailable";

type RouteView =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | { readonly phase: "success"; readonly route: WalkingRoute }
  | { readonly phase: "failure" };

type RouteResult =
  | { readonly key: string; readonly route: WalkingRoute }
  | { readonly key: string; readonly route: null };

/** One request per (origin, station) key; the view is derived so a stale answer is never shown. */
function useWalkingRoute(
  service: RouteService | null,
  status: MapsStatus,
  origin: Coordinate | null,
  station: Station | null,
): RouteView {
  const [result, setResult] = useState<RouteResult | null>(null);
  const key =
    origin === null || station === null ? null : `${origin.lat},${origin.lng}>${station.id}`;

  useEffect(() => {
    if (service === null || key === null || origin === null || station === null) return noop;
    let current = true;
    void (async () => {
      try {
        const route = await service.walk(origin, station.coordinate);
        if (current) setResult({ key, route });
      } catch {
        // The cause is dropped on purpose: its message can carry coordinates or a URL.
        if (current) setResult({ key, route: null });
      }
    })();
    return () => {
      current = false;
    };
  }, [service, key, origin, station]);

  if (key === null) return { phase: "idle" };
  if (result?.key === key) {
    return result.route === null ? { phase: "failure" } : { phase: "success", route: result.route };
  }
  // No service yet: wait while the library loads, fail visibly when it never will.
  if (service === null && status === "unavailable") return { phase: "failure" };
  return { phase: "loading" };
}

function noop(): void {}

interface SliceProps {
  readonly maps: MapsAdapter;
  /** Content for the screen that sits between the location controls and the result (the station picker, METRO-112). */
  readonly after?: ReactNode;
}

function Slice({ maps, after }: SliceProps) {
  const { status, routes: service } = useMaps();
  const [origin, setOrigin] = useState<Coordinate | null>(null);
  const [locating, setLocating] = useState<Locating>("idle");
  /** A device fix too rough to name a station (METRO-103): its radius in metres, or null when unknown. */
  const [rough, setRough] = useState<{ readonly meters: number | null } | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [destinationId, setDestinationId] = useState("");
  /** Counts user actions; a slower earlier action (a position fix, say) must not overwrite a later one. */
  const latestAction = useRef(0);
  /** Whether the next result may take focus; false when a late position fix lands while the user is typing. */
  const focusNext = useRef(true);
  /**
   * True once the user touches the search box (focus, key or input) after pressing "Use my location".
   * Not derived from document.activeElement: Safari and macOS Firefox leave focus where it was on a
   * button click, which would read as typing.
   */
  const engagedWithSearch = useRef(false);
  const engage = (): void => {
    engagedWithSearch.current = true;
  };
  /** Whether the geolocation alert may take focus when it mounts; false when a late result lands while the user types. */
  const focusAlertNext = useRef(true);
  /** Stable, so the alert takes focus only when it mounts; the outline comes from `focus.css` (`[tabindex="-1"]`). */
  const focusAlert = useCallback((node: HTMLElement | null): void => {
    if (node !== null && focusAlertNext.current) node.focus();
  }, []);
  /** Stable, so focus moves when the heading mounts (a new origin re-keys it) and not on every render. */
  const focusResult = useCallback((node: HTMLElement | null): void => {
    if (node !== null && focusNext.current) node.focus();
  }, []);

  const nearest = origin === null ? null : findNearestStation(stations, origin);
  const found = nearest?.kind === "nearest" ? nearest : null;
  const station = found?.station ?? null;
  const route = useWalkingRoute(service, status, origin, station);

  const destinations = stations.filter((s) => s.id !== station?.id);
  const destination = destinations.find((s) => s.id === destinationId);
  const fare =
    station !== null && destination !== undefined
      ? findFare(baselineDataset.fares, station.id, destination.id)
      : null;

  function applyLocation(location: Coordinate, fromFix: boolean): void {
    // A position fix can arrive while the user types in the search box; never pull focus out of it.
    focusNext.current = !(fromFix && engagedWithSearch.current);
    const next = findNearestStation(stations, location);
    // A different origin station makes the earlier destination meaningless: forget it.
    if ((next.kind === "nearest" ? next.station.id : null) !== (station?.id ?? null)) {
      setDestinationId("");
    }
    setSearchFailed(false);
    setLocating("idle");
    setRough(null);
    setOrigin(location);
  }

  /** The nearest station could be wrong: show no result, and request no route. The position is dropped. */
  function applyRoughFix(accuracyMeters: number | undefined): void {
    // Same rule as a reliable fix: a late fix never pulls focus out of the search box. The alert is still
    // announced (role="alert"), it just does not take focus.
    focusAlertNext.current = !engagedWithSearch.current;
    setDestinationId("");
    setSearchFailed(false);
    setLocating("idle");
    setOrigin(null);
    setRough({ meters: accuracyMeters ?? null });
  }

  function choosePlace(location: Coordinate): void {
    latestAction.current += 1;
    applyLocation(location, false);
  }

  async function findMe(): Promise<void> {
    latestAction.current += 1;
    const mine = latestAction.current;
    engagedWithSearch.current = false;
    setRough(null);
    setLocating("locating");
    const outcome = await locate();
    if (mine !== latestAction.current) return;
    if (outcome.kind !== "position") {
      // Same rule as a rough fix: a late denial never pulls focus out of the search box (still announced).
      focusAlertNext.current = !engagedWithSearch.current;
      setRough(null);
      setLocating(outcome.kind);
    } else if (
      // An invalid position is never "rough": it takes the usual empty state.
      findNearestStation(stations, outcome.coordinate).kind !== "nearest" ||
      assessNearestReliability(stations, outcome.coordinate, outcome.accuracyMeters).kind ===
        "reliable"
    ) {
      applyLocation(outcome.coordinate, true);
    } else {
      applyRoughFix(outcome.accuracyMeters);
    }
  }

  const searchAlert = status === "unavailable" || searchFailed ? copy.searchUnavailable : null;
  const geoAlert =
    locating === "denied"
      ? copy.denied
      : locating === "unavailable"
        ? copy.unavailable
        : rough !== null
          ? rough.meters === null
            ? copy.roughUnknown
            : copy.roughKnown(formatAccuracy(rough.meters))
          : null;

  return (
    <>
      <h1 className="screen-title">{copy.heading}</h1>
      <p className="ns-lede">{copy.intro}</p>
      <section className="ns-section" aria-labelledby="where-heading">
        <h2 className="section-label" id="where-heading">
          {copy.whereHeading}
        </h2>
        <p className="ns-label" id="place-label">
          {copy.searchLabel}
        </p>
        <p className="footnote" id="place-hint">
          {copy.searchHint}
        </p>
        {status === "loading" && <output className="ns-status">{copy.loadingSearch}</output>}
        <div role="presentation" onFocus={engage} onKeyDown={engage} onInput={engage}>
          {status !== "unavailable" && (
            <maps.PlaceSearch
              labelId="place-label"
              description={copy.searchHint}
              bias={SEARCH_BIAS}
              onPlace={choosePlace}
              onFailure={() => setSearchFailed(true)}
            />
          )}
        </div>
        {searchAlert !== null && (
          <p className="ns-alert" role="alert">
            {searchAlert}
          </p>
        )}
        <p>
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => void findMe()}
            disabled={locating === "locating"}
            aria-describedby="consent"
          >
            {copy.locateButton}
          </button>
        </p>
        <p className="footnote" id="consent">
          {copy.consent}
        </p>
        {locating === "locating" && <output className="ns-status">{copy.locating}</output>}
        {geoAlert !== null && (
          <p className="ns-alert" role="alert" tabIndex={-1} ref={focusAlert}>
            {geoAlert}
          </p>
        )}
      </section>

      {after}

      {nearest !== null && (
        <section className="ns-section" aria-labelledby="result-heading">
          {/* A new result takes focus (keyed by the origin), so a screen reader announces the station. */}
          <h2
            className="ns-title"
            id="result-heading"
            key={`${origin?.lat},${origin?.lng}`}
            tabIndex={-1}
            ref={focusResult}
          >
            {copy.resultHeading}
            {station !== null && (
              <>
                : <span>{station.name}</span>
              </>
            )}
          </h2>
          {found === null || station === null ? (
            <output className="ns-status">{copy.empty}</output>
          ) : (
            <>
              <dl className="ns-facts">
                <dt>{copy.straightLine}</dt>
                <dd>{formatKm(found.distance)}</dd>
                <dt>{copy.walking}</dt>
                <dd>
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
                </dd>
              </dl>
              <h2 className="section-label">{copy.fareHeading}</h2>
              <p className="ns-section">
                <label className="ns-label" htmlFor="destination">
                  {copy.destinationLabel}
                </label>
                <select
                  className="ns-select"
                  id="destination"
                  value={destination?.id ?? ""}
                  onChange={(event) => setDestinationId(event.target.value)}
                >
                  <option value="">{copy.destinationPlaceholder}</option>
                  {destinations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </p>
              <output className="ns-fare">
                {fare === null && copy.fareChoose}
                {destination !== undefined &&
                  fare?.kind === "fare" &&
                  copy.fareLine(
                    station.name,
                    destination.name,
                    fare.fare.currency,
                    fare.fare.amount,
                  )}
                {fare?.kind === "unknown-fare" && copy.fareUnknown}
              </output>
              <p className="footnote">
                {copy.faresAsOf(
                  formatIsoDate(datasetProvenance.fares.noticeDate),
                  formatIsoDate(datasetProvenance.fares.officialTableRetrieved),
                )}
              </p>
            </>
          )}
        </section>
      )}
    </>
  );
}

/** The nearest-station slice. The adapter is injected, so tests never load Google. */
export function NearestStation({ maps, after }: SliceProps) {
  return (
    <maps.Provider>
      <Slice maps={maps} after={after} />
    </maps.Provider>
  );
}
