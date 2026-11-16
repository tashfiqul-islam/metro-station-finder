import { assessNearestReliability, baselineDataset, findNearestStation } from "@metro/core";
import type { Coordinate, Station, StationId } from "@metro/core";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { MapsAdapter } from "../../adapters/maps/context";
import { Icon } from "../../icons/Icon";
import { alert } from "../../icons/shapes/alert";
import { chevronRight } from "../../icons/shapes/chevron-right";
import { locate as locateIcon } from "../../icons/shapes/locate";
import { locateOff } from "../../icons/shapes/locate-off";
import { refresh } from "../../icons/shapes/refresh";
import { search } from "../../icons/shapes/search";
import { PlaceSearch, SEARCH_INPUT_ID } from "../place-search/PlaceSearch";
import { usePlacesAvailable } from "../place-search/use-places-available";
import { copy } from "./copy";
import { formatAccuracy } from "./format";
import { locate } from "./geolocate";
import { LocationNotice } from "./LocationNotice";
import { LocationResult } from "./LocationResult";
import { SearchingMark } from "./SearchingMark";

import "../../styles/components/typography.css";
import "../../styles/components/button.css";
import "../../styles/components/notice.css";
import "../../styles/components/empty.css";
import "../../styles/components/status.css";
import "../../styles/components/locate.css";
import "./nearest-station.css";

const stations = baselineDataset.stations;

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
  /** Content between the location controls and the result (a picked station's result, METRO-112). */
  readonly after?: ReactNode;
  /** A station was picked in the search field: the screen makes it the current result and settles its sheet. */
  readonly onPickStation?: (station: Station, source: "keyboard" | "pointer") => void;
  /** True while a picked station is the current result: the location result is hidden (one current result). */
  readonly suppressed?: boolean;
  /** A location result appeared (the outcome) or was cleared by a rough fix (null). */
  readonly onLocation?: (outcome: LocationOutcome | null) => void;
  /** Locating began, a result appeared or a notice showed: the screen snaps its sheet to half. */
  readonly onSettle?: () => void;
  /**
   * The user is typing in the search field: the screen opens its sheet to full, so the suggestion popup has room
   * above the fold (METRO-112, METRO-163). Focus alone does not call it, so Tab through the page never changes
   * the sheet.
   */
  readonly onSearchEngage?: () => void;
  /**
   * Counts station picks (the picker, METRO-112). A new pick cancels a Use my location in flight and clears a
   * notice: the pick is the user's latest choice, and a late fix must not replace it, take focus or move the
   * sheet.
   */
  readonly pickSeq?: number;
}

/**
 * The notice text. Its suggested next step names only what is available right now (METRO-120): searching for a
 * place while place search is available, picking a station while it is not. Recomputed on every render, so the
 * text follows the connection coming back or going away while the notice is showing.
 */
function noticeText(notice: Notice, searchAvailable: boolean): string {
  const variants =
    notice.kind === "denied"
      ? copy.denied
      : notice.kind === "unavailable"
        ? copy.unavailable
        : notice.meters === null
          ? copy.roughUnknown
          : copy.roughKnown(formatAccuracy(notice.meters));
  return searchAvailable ? variants.search : variants.pick;
}

/** "Search for a place" in a notice: moves focus into the search field. */
function focusSearch(): void {
  document.getElementById(SEARCH_INPUT_ID)?.focus();
}

function Slice({
  after,
  suppressed = false,
  onLocation,
  onSettle,
  onSearchEngage,
  onPickStation,
  pickSeq = 0,
}: SliceProps) {
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [shown, setShown] = useState<ShownResult | null>(null);
  /** A chosen place's location could not be fetched: the field stays, the alert says so. */
  const [searchFailed, setSearchFailed] = useState(false);
  /** Counts user actions; a slower earlier action (a position fix, say) must not overwrite a later one. */
  const latestAction = useRef(0);
  const results = useRef(0);
  // Offline, no key or a library that failed to load: place suggestions are not offered and the notices name the
  // station step; the field itself keeps working for station names (METRO-163).
  const { available: searchAvailable } = usePlacesAvailable();
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

  // Place search went away while a location notice showed (METRO-120): its "Search for a place" action leaves with
  // it. If focus was on that action it fell to the page; the notice takes it, so the keyboard user is not lost.
  // Only when that action really had focus as it was removed (its ref cleanup records that): a user who clicked
  // the blank page keeps focus there. A flag set while search is available is dropped after each commit.
  const actionHadFocus = useRef(false);
  useEffect(() => {
    if (searchAvailable) {
      actionHadFocus.current = false;
      return;
    }
    if (!actionHadFocus.current) return;
    actionHadFocus.current = false;
    if (document.activeElement === null || document.activeElement === document.body) {
      document.getElementById("location-notice-text")?.closest<HTMLElement>(".notice")?.focus();
    }
  });

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
    actionHadFocus.current = false;
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
    <button
      type="button"
      className="btn btn--quiet btn--sm"
      onClick={focusSearch}
      ref={(node) => {
        // The cleanup runs as React detaches the button, before the node leaves the page, so activeElement is
        // still the button if it had focus.
        return () => {
          if (document.activeElement === node) actionHadFocus.current = true;
        };
      }}
    >
      <Icon icon={search} size={16} />
      {copy.searchLabel}
    </button>
  );
  const retry = (
    <button type="button" className="btn btn--primary btn--sm" onClick={() => void findMe()}>
      <Icon icon={refresh} size={16} />
      {copy.tryAgain}
    </button>
  );
  // A failed selection keeps the field (the user can search again); an unavailable library or no connection shows
  // the field's own notice.
  const searchAlert = searchAvailable && searchFailed ? copy.searchUnavailable : null;

  return (
    <>
      <h1 className="screen-title">{copy.heading}</h1>
      <p className="ns-lede">{copy.intro}</p>
      <section className="ns-section" aria-labelledby="where-heading">
        <h2 className="section-label" id="where-heading">
          {copy.whereHeading}
        </h2>
        <div role="presentation" onFocus={engage} onKeyDown={engage}>
          <PlaceSearch
            stations={stations}
            onStation={(station, source) => onPickStation?.(station, source)}
            onPlace={choosePlace}
            onPlaceFailure={() => setSearchFailed(true)}
            onLocate={() => void findMe()}
            onEngage={() => {
              engage();
              onSearchEngage?.();
            }}
          />
        </div>
        {searchAlert !== null && (
          <p className="ns-alert" role="alert">
            {searchAlert}
          </p>
        )}
        {notice !== null && (
          <LocationNotice
            tone={notice.kind === "denied" ? "bad" : "warn"}
            icon={notice.kind === "denied" ? locateOff : alert}
            text={noticeText(notice, searchAvailable)}
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
          <Icon icon={chevronRight} size={20} />
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
