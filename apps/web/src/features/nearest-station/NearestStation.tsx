import { assessNearestReliability, baselineDataset, findNearestStation } from "@metro/core";
import type { Coordinate, StationId } from "@metro/core";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { PLACE_INPUT_ID, useMaps } from "../../adapters/maps/context";
import type { MapsAdapter } from "../../adapters/maps/context";
import { focusSearchControl } from "../../adapters/maps/focus";
import { Icon } from "../../icons/Icon";
import { chevronIcon, searchIcon } from "../station-picker/picker-icons";
import { copy } from "./copy";
import { formatAccuracy } from "./format";
import { locate } from "./geolocate";
import { alertIcon, locateIcon, locateOffIcon, refreshIcon } from "./location-icons";
import { LocationNotice } from "./LocationNotice";
import { LocationResult } from "./LocationResult";
import { SearchingMark } from "./SearchingMark";
import { useOnline } from "./use-online";

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

/** Where a location result came from: a good device fix or a place the user searched for. Both ask for one walking route. */
type LocationSource = "device" | "place";

interface ShownResult {
  readonly origin: Coordinate;
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
  /**
   * The user is typing in the place search: the screen opens its sheet to full, so the suggestion popup has room
   * above the fold (the station picker does the same, METRO-112). Focus alone does not call it, so Tab through the
   * page never changes the sheet.
   */
  readonly onSearchEngage?: () => void;
  /**
   * Counts station picks (the picker, METRO-112). A new pick cancels a Use my location in flight and clears a
   * notice: the pick is the user's latest choice, and a late fix must not replace it, take focus or move the
   * sheet.
   */
  readonly pickSeq?: number;
}

function noticeText(notice: Notice): string {
  if (notice.kind === "denied") return copy.denied;
  if (notice.kind === "unavailable") return copy.unavailable;
  return notice.meters === null
    ? copy.roughUnknown
    : copy.roughKnown(formatAccuracy(notice.meters));
}

function Slice({
  maps,
  after,
  suppressed = false,
  onLocation,
  onSettle,
  onSearchEngage,
  pickSeq = 0,
}: SliceProps) {
  const { status } = useMaps();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [shown, setShown] = useState<ShownResult | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  /** Counts user actions; a slower earlier action (a position fix, say) must not overwrite a later one. */
  const latestAction = useRef(0);
  const results = useRef(0);
  const searchBox = useRef<HTMLDivElement>(null);
  const searchNotice = useRef<HTMLDivElement>(null);
  /** True while focus sits in the search control, so losing the control to a failure can put focus somewhere. */
  const searchHadFocus = useRef(false);
  const online = useOnline();
  // Offline, no key or a library that failed to load: the label, hint and field go, the notice stays (METRO-114).
  const searchAvailable = online && status !== "unavailable";
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

  // A pick (`pickSeq`) and unmounting cancel an answer still on its way: it is ignored when it arrives (no
  // callback to the screen, no focus, no sheet move after unmount).
  const [seenPick, setSeenPick] = useState(pickSeq);
  const pickNow = useRef(pickSeq);
  useEffect(() => {
    pickNow.current = pickSeq;
  }, [pickSeq]);
  if (seenPick !== pickSeq) {
    // Derived from the prop during render (no effect needed): the status and any stale notice go at once.
    setSeenPick(pickSeq);
    setLocating(false);
    setNotice(null);
  }
  useEffect(
    () => () => {
      latestAction.current += 1;
    },
    [],
  );

  /** "Search for a place" in a notice: moves focus into the search field (the plain input or the widget). */
  function focusSearch(): void {
    focusSearchControl(searchBox.current);
  }

  // The field vanished under the user's focus (the library failed, or the connection dropped): the notice that
  // replaced it takes focus, so focus does not fall to the page. Only when focus was in the field and is now lost.
  useEffect(() => {
    if (searchAvailable || !searchHadFocus.current) return;
    searchHadFocus.current = false;
    if (document.activeElement === null || document.activeElement === document.body) {
      searchNotice.current?.focus();
    }
  }, [searchAvailable]);

  function show(origin: Coordinate, source: LocationSource): void {
    // A late device fix never pulls focus (or the sheet) out of the search box the user is typing in.
    const focus = !(source === "device" && engagedWithSearch.current);
    const next = findNearestStation(stations, origin);
    results.current += 1;
    setSearchFailed(false);
    setLocating(false);
    setNotice(null);
    setShown({ origin, focus, seq: results.current });
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
    latestAction.current += 1;
    const mine = latestAction.current;
    const pickAtStart = pickNow.current;
    engagedWithSearch.current = false;
    // Try again unmounts the notice that held focus: keep focus on the stable button.
    if (document.activeElement?.closest(".notice")) locateButton.current?.focus();
    setNotice(null);
    setLocating(true);
    onSettle?.();
    const outcome = await locate();
    // Superseded by a later action, a station pick, or unmounting (the cleanup above bumps the counter).
    if (mine !== latestAction.current || pickAtStart !== pickNow.current) return;
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

  // With place search unavailable (the library failed or has no key) there is nothing to move to, so the action
  // is left out and the notice keeps Try again (or, for denied, nothing: the notice itself takes focus).
  const searchLink = !searchAvailable ? null : (
    <button type="button" className="btn btn--quiet btn--sm" onClick={focusSearch}>
      <Icon icon={searchIcon} size={16} />
      {copy.searchLabel}
    </button>
  );
  const retry = (
    <button type="button" className="btn btn--primary btn--sm" onClick={() => void findMe()}>
      <Icon icon={refreshIcon} size={16} />
      {copy.tryAgain}
    </button>
  );
  // A failed selection keeps the field (the user can search again); an unavailable library or no connection
  // replaces the field with its notice below.
  const searchAlert = searchAvailable && searchFailed ? copy.searchUnavailable : null;

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
        {/* Mounted from the start and empty, so the status is announced when it fills (a region inserted with its text is announced less reliably). Empty it takes no room. */}
        <output className={locating ? "status" : "visually-hidden"}>
          {locating && (
            <>
              <SearchingMark />
              <span className="status__text">{copy.locating}</span>
              <span className="status__sub">{copy.locatingSub}</span>
            </>
          )}
        </output>
        <p className="consent" id="consent">
          {copy.consent}
        </p>
        {/* Mounted from the start and empty, so the notice is announced when it fills (and from the start when already unavailable). */}
        <output className={searchAvailable ? "visually-hidden" : undefined}>
          {!searchAvailable && (
            <div
              ref={searchNotice}
              className="notice"
              data-tone="warn"
              data-size="sm"
              tabIndex={-1}
            >
              <span className="notice__chip" aria-hidden="true">
                <Icon icon={searchIcon} size={16} />
              </span>
              <div className="notice__body">
                <p className="notice__text">
                  {online ? copy.searchUnavailable : copy.searchNoConnection}
                </p>
              </div>
            </div>
          )}
        </output>
        {searchAvailable && (
          <>
            <label className="ns-label" id="place-label" htmlFor={PLACE_INPUT_ID}>
              {copy.searchLabel}
            </label>
            <p className="footnote" id="place-hint">
              {copy.searchHint}
            </p>
            <div
              ref={searchBox}
              role="presentation"
              onFocus={() => {
                engage();
                searchHadFocus.current = true;
              }}
              onBlur={(event) => {
                if (event.relatedTarget !== null) searchHadFocus.current = false;
              }}
              onKeyDown={engage}
              onInput={() => {
                engage();
                onSearchEngage?.();
              }}
            >
              <maps.PlaceSearch
                labelId="place-label"
                hintId="place-hint"
                description={copy.searchHint}
                bias={SEARCH_BIAS}
                onPlace={choosePlace}
                onFailure={() => setSearchFailed(true)}
              />
            </div>
          </>
        )}
        {searchAlert !== null && (
          <p className="ns-alert" role="alert">
            {searchAlert}
          </p>
        )}
      </section>

      {after}

      {shown !== null && !suppressed && (
        <div className="ns-section" key={shown.seq}>
          <LocationResult origin={shown.origin} focus={shown.focus} />
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
