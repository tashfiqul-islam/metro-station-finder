import { assessNearestReliability, baselineDataset, findNearestStation } from "@metro/core";
import type { Coordinate, StationId } from "@metro/core";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { useMaps } from "../../adapters/maps/context";
import type { MapsAdapter } from "../../adapters/maps/context";
import { Icon } from "../../icons/Icon";
import { chevronIcon, searchIcon } from "../station-picker/picker-icons";
import { copy } from "./copy";
import { formatAccuracy } from "./format";
import { locate } from "./geolocate";
import { alertIcon, locateIcon, locateOffIcon, refreshIcon } from "./location-icons";
import { LocationNotice } from "./LocationNotice";
import { LocationResult } from "./LocationResult";
import type { LocationSource } from "./LocationResult";
import { SearchingMark } from "./SearchingMark";

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

/** What the screen needs from a location result: the station to highlight and, for a device fix, the user pin. */
export interface LocationOutcome {
  readonly stationId: StationId | null;
  /** The device position, for the map pin; null for a searched place (it is not where the user is). */
  readonly position: Coordinate | null;
}

/** A refusal or a position that could not be used. `meters` is the rough fix's radius, null when unknown. */
type Notice =
  | { readonly kind: "denied"; readonly focus: boolean }
  | { readonly kind: "unavailable"; readonly focus: boolean }
  | { readonly kind: "rough"; readonly meters: number | null; readonly focus: boolean };

interface ShownResult {
  readonly origin: Coordinate;
  readonly source: LocationSource;
  readonly focus: boolean;
  /** Counts results, so a second result at the same point still mounts a new one and moves focus. */
  readonly seq: number;
}

interface SliceProps {
  readonly maps: MapsAdapter;
  /** Content between the location controls and the result (the station picker, METRO-112). */
  readonly after?: ReactNode;
  /** True while a picked station is the current result: the location result is hidden (one current result). */
  readonly suppressed?: boolean;
  /** A location result appeared (the outcome) or was cleared by a rough fix (null). */
  readonly onLocation?: (outcome: LocationOutcome | null) => void;
  /** Locating began, a result appeared or a notice showed: the screen snaps its sheet to half. */
  readonly onSettle?: () => void;
}

function noticeText(notice: Notice): string {
  if (notice.kind === "denied") return copy.denied;
  if (notice.kind === "unavailable") return copy.unavailable;
  return notice.meters === null
    ? copy.roughUnknown
    : copy.roughKnown(formatAccuracy(notice.meters));
}

function Slice({ maps, after, suppressed = false, onLocation, onSettle }: SliceProps) {
  const { status } = useMaps();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [shown, setShown] = useState<ShownResult | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  /** Counts user actions; a slower earlier action (a position fix, say) must not overwrite a later one. */
  const latestAction = useRef(0);
  const results = useRef(0);
  const locateButton = useRef<HTMLButtonElement>(null);
  /**
   * True once the user touches the search box (focus, key or input) after pressing "Use my location".
   * Not derived from document.activeElement: Safari and macOS Firefox leave focus where it was on a
   * button click, which would read as typing.
   */
  const engagedWithSearch = useRef(false);
  const engage = (): void => {
    engagedWithSearch.current = true;
  };

  function show(origin: Coordinate, source: LocationSource): void {
    // A late device fix never pulls focus (or the sheet) out of the search box the user is typing in.
    const focus = !(source === "device" && engagedWithSearch.current);
    const next = findNearestStation(stations, origin);
    results.current += 1;
    setSearchFailed(false);
    setLocating(false);
    setNotice(null);
    setShown({ origin, source, focus, seq: results.current });
    onLocation?.({
      stationId: next.kind === "nearest" ? next.station.id : null,
      position: source === "device" && next.kind === "nearest" ? origin : null,
    });
    if (focus) onSettle?.();
  }

  /** The nearest station could be wrong: show no result and no pin. The position is dropped. */
  function showNotice(next: Notice): void {
    setLocating(false);
    setNotice(next);
    if (next.focus) onSettle?.();
  }

  function choosePlace(location: Coordinate): void {
    latestAction.current += 1;
    show(location, "place");
  }

  async function findMe(): Promise<void> {
    if (locating) return;
    latestAction.current += 1;
    const mine = latestAction.current;
    engagedWithSearch.current = false;
    // Try again unmounts the notice that held focus: keep focus on the stable button.
    if (document.activeElement?.closest(".notice")) locateButton.current?.focus();
    setNotice(null);
    setLocating(true);
    onSettle?.();
    const outcome = await locate();
    if (mine !== latestAction.current) return;
    const focus = !engagedWithSearch.current;
    if (outcome.kind !== "position") {
      showNotice({ kind: outcome.kind, focus });
    } else if (
      // An invalid position is never "rough": it takes the usual empty state.
      findNearestStation(stations, outcome.coordinate).kind !== "nearest" ||
      assessNearestReliability(stations, outcome.coordinate, outcome.accuracyMeters).kind ===
        "reliable"
    ) {
      show(outcome.coordinate, "device");
    } else {
      // A rough fix clears the earlier location result, requests no route and keeps no pin.
      setShown(null);
      onLocation?.(null);
      showNotice({ kind: "rough", meters: outcome.accuracyMeters ?? null, focus });
    }
  }

  const searchLink =
    status === "unavailable" ? null : (
      <a className="btn btn--quiet btn--sm" href="#place-label">
        <Icon icon={searchIcon} size={16} />
        {copy.searchLabel}
      </a>
    );
  const retry = (
    <button type="button" className="btn btn--primary btn--sm" onClick={() => void findMe()}>
      <Icon icon={refreshIcon} size={16} />
      {copy.tryAgain}
    </button>
  );
  const searchAlert = status === "unavailable" || searchFailed ? copy.searchUnavailable : null;

  return (
    <>
      <h1 className="screen-title">{copy.heading}</h1>
      <p className="ns-lede">{copy.intro}</p>
      <section className="ns-section" aria-labelledby="where-heading">
        <h2 className="section-label" id="where-heading">
          {copy.whereHeading}
        </h2>
        {notice !== null && (
          <LocationNotice
            tone={notice.kind === "denied" ? "bad" : "warn"}
            icon={notice.kind === "denied" ? locateOffIcon : alertIcon}
            text={noticeText(notice)}
            takeFocus={notice.focus}
            actions={
              notice.kind === "denied" ? (
                searchLink
              ) : (
                <>
                  {retry}
                  {searchLink}
                </>
              )
            }
          />
        )}
        <button
          ref={locateButton}
          type="button"
          className="locate"
          onClick={() => void findMe()}
          aria-disabled={locating}
          aria-describedby="consent"
        >
          <span className="locate__icon">
            <Icon icon={locateIcon} size={24} />
          </span>
          <span className="locate__text">
            <span className="locate__title">{copy.locateButton}</span>
          </span>
          <Icon icon={chevronIcon} size={20} />
        </button>
        {/* The status sits right under the button, so it is in view when the sheet settles at half. */}
        {locating && (
          <output className="status">
            <SearchingMark />
            <span className="status__text">{copy.locating}</span>
            <span className="status__sub">{copy.locatingSub}</span>
          </output>
        )}
        <p className="consent" id="consent">
          {copy.consent}
        </p>
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
      </section>

      {after}

      {shown !== null && !suppressed && (
        <div className="ns-section" key={shown.seq}>
          <LocationResult origin={shown.origin} source={shown.source} focus={shown.focus} />
        </div>
      )}
    </>
  );
}

/** The nearest-station slice. The adapter is injected, so tests never load Google. */
export function NearestStation(props: SliceProps) {
  return (
    <props.maps.Provider>
      <Slice {...props} />
    </props.maps.Provider>
  );
}
