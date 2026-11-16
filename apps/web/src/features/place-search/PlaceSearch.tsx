import type { Coordinate, Station } from "@metro/core";
import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { useMaps } from "../../adapters/maps/context";
import type { PlaceSearchService, PlaceSuggestion } from "../../adapters/maps/context";
import { Icon } from "../../icons/Icon";
import { chevronRight } from "../../icons/shapes/chevron-right";
import { locate } from "../../icons/shapes/locate";
import { mapPin } from "../../icons/shapes/map-pin";
import { search } from "../../icons/shapes/search";
import { x } from "../../icons/shapes/x";
import { copy as nearestCopy } from "../nearest-station/copy";
import { splitName } from "../station-picker/match";
import { stopLabel } from "../station-picker/station-facts";
import { searchCopy } from "./copy";
import { buildRows, listStations, placesView } from "./model";
import type { Row } from "./model";
import { usePlaceSuggestions } from "./use-place-suggestions";
import { usePlacesAvailable } from "./use-places-available";

import "../../styles/components/fields.css";
import "../../styles/components/search.css";
import "../../styles/components/button.css";
import "../../styles/components/notice.css";
import "../../styles/components/roundel.css";
import "../../styles/components/line-card.css";
import "../../styles/components/empty.css";
import "../../styles/components/status.css";
import "./place-search.css";

/** The id of the field, so a notice's "Search for a place" can move focus to it. */
export const SEARCH_INPUT_ID = "place-search-input";

interface PlaceSearchProps {
  readonly stations: readonly Station[];
  /** A station was chosen: by Enter (`keyboard`) or a click or tap on an option (`pointer`). */
  readonly onStation: (station: Station, source: "keyboard" | "pointer") => void;
  /** A place was chosen and its location fetched. */
  readonly onPlace: (location: Coordinate) => void;
  /** The chosen place's location could not be fetched. Carries no cause on purpose. */
  readonly onPlaceFailure: () => void;
  /** The locate button inside the field: the same action as "Use my location". */
  readonly onLocate: () => void;
  /** The rider typed, cleared or asked for the full list: the sheet opens to full so the list has room. */
  readonly onEngage: () => void;
}

/** Keys that change how a press is read but do not end it. */
const MODIFIERS: ReadonlySet<string> = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "AltGraph",
  "CapsLock",
  "Fn",
]);

/** Scrolls the active option into the list; a browser without the method just skips it. */
function revealOption(id: string): void {
  const node = document.getElementById(id);
  if (typeof node?.scrollIntoView === "function") node.scrollIntoView({ block: "nearest" });
}

/** True when a key press lands in something the rider types into, where "/" is a character. */
function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** The matched part of a name in bold: the three parts around the range. */
function MatchedName({
  name,
  range,
}: {
  readonly name: string;
  readonly range: readonly [number, number] | null;
}): ReactElement {
  const [before, hit, after] = splitName(name, range);
  return (
    <span className="option__name">
      {before}
      {hit === "" ? null : <span className="option__match">{hit}</span>}
      {after}
    </span>
  );
}

/**
 * The one search field of Nearby (METRO-163): a WAI-ARIA editable combobox with list autocomplete over stations
 * (matched here, working offline) and places (Google, through the adapter's `PlaceSearchService`). DOM focus stays
 * on the input and `aria-activedescendant` names the active option. ArrowDown and ArrowUp move across both groups
 * and wrap; Enter chooses; Escape closes the list, then clears the text; Home, End and the arrows keep their caret
 * meaning. "/" focuses the field from anywhere outside a text field.
 *
 * Places follow the volume rules of ADR-0009 amendment 5 (`placeQuery`, 180 ms) and end every list with the
 * "Google Maps" attribution row, which is not an option and not focusable. When places cannot be asked for, the
 * unavailable notice takes the Places group's place and station names keep working. The first station is active
 * while typing, so Enter picks it; a place is never active until the rider moves to it (a place choice costs a
 * request).
 */
export function PlaceSearch({
  stations,
  onStation,
  onPlace,
  onPlaceFailure,
  onLocate,
  onEngage,
}: PlaceSearchProps): ReactElement {
  const base = useId();
  const listId = `${base}-list`;
  const optionId = (row: Row): string => `${base}-${row.key}`;
  const { places: service, load } = useMaps();
  const { available, online } = usePlacesAvailable();

  const input = useRef<HTMLInputElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  /** `undefined`: the first station (while typing); `null`: none (the caret keys); a key: that row. */
  const [activeKey, setActiveKey] = useState<string | null | undefined>();
  /** True from the first keystroke until a pick, a clear or Browse all: only typed text is searched. */
  const [typed, setTyped] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  /** Counts choices and clears, so a place answering after a later choice is dropped. */
  const latest = useRef(0);

  const suggestions = usePlaceSuggestions({
    stations,
    typed: typed ? text : "",
    unavailable: !available,
    service,
    load,
  });
  const stationMatches = listStations(stations, typed || browsing ? text : "", browsing);
  const view = placesView(suggestions.wanted, !available || suggestions.failed, suggestions.places);
  const liveRows = buildRows(stationMatches, view === "list" ? suggestions.places : []);
  /**
   * The rows as they were when a pointer press began, until it ends (METRO-124, METRO-163): places that arrive
   * between the press and its release would grow the list and move the control under the pointer, so the release
   * would land elsewhere. They appear when the press is over.
   */
  const [held, setHeld] = useState<readonly Row[] | null>(null);
  const rows = held ?? liveRows;
  const liveRowsRef = useRef(liveRows);
  useEffect(() => {
    liveRowsRef.current = liveRows;
  });
  const expanded = open && rows.length > 0;
  const activeRow = !expanded
    ? undefined
    : activeKey === undefined
      ? rows.find((row) => row.kind === "station")
      : rows.find((row) => row.key === activeKey);
  const activeId = activeRow === undefined ? undefined : optionId(activeRow);
  const searching = typed && text.trim() !== "";
  const noMatch = searching && rows.length === 0 && !suggestions.pending;
  const noticeInList = expanded && view === "unavailable";
  // A failed request with no station to list: the list stays closed, so the notice shows under the field instead.
  const noticeUnder = view === "unavailable" && rows.length === 0;
  const stationRows = rows.filter((row) => row.kind === "station");
  const placeRows = rows.filter((row) => row.kind === "place");
  const status = !searching
    ? ""
    : noMatch
      ? searchCopy.noMatch
      : searchCopy.count(stationRows.length, placeRows.length);

  useEffect(() => {
    if (activeId !== undefined) revealOption(activeId);
  }, [activeId]);

  // When the list opens, the field and the list below it are brought into view: "nearest" does nothing when they
  // already are, and otherwise scrolls the least. Instant, so reduced motion needs no special case.
  useEffect(() => {
    if (expanded && typeof region.current?.scrollIntoView === "function") {
      region.current.scrollIntoView({ block: "nearest" });
    }
  }, [expanded]);

  // "/" focuses the field from anywhere outside a text field (handoff: Search).
  useEffect(() => {
    const slash = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTextTarget(event.target)) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", slash);
    return () => document.removeEventListener("keydown", slash);
  }, []);

  // METRO-124: a press on a control outside the list blurs the input at its mousedown. Closing the list then
  // collapses the content, the scrolled panel clamps its scroll position and the control slides away from under
  // the pointer, so the click lands elsewhere. The close waits for the press to end (mouseup, or a cancel or
  // a key); a blur with no press in progress (Tab, a programmatic focus) closes at once.
  const pressing = useRef(false);
  const closeAfterPress = useRef(false);
  useEffect(() => {
    const press = (): void => {
      pressing.current = true;
      setHeld(liveRowsRef.current);
    };
    const release = (event: Event): void => {
      // A modifier held during the press is not the end of it.
      if (event instanceof KeyboardEvent && MODIFIERS.has(event.key)) return;
      pressing.current = false;
      setHeld(null);
      if (!closeAfterPress.current) return;
      closeAfterPress.current = false;
      setOpen(false);
      setActiveKey(null);
    };
    document.addEventListener("pointerdown", press, true);
    document.addEventListener("mouseup", release, true);
    document.addEventListener("pointercancel", release, true);
    document.addEventListener("keydown", release, true);
    return () => {
      document.removeEventListener("pointerdown", press, true);
      document.removeEventListener("mouseup", release, true);
      document.removeEventListener("pointercancel", release, true);
      document.removeEventListener("keydown", release, true);
    };
  }, []);

  function settle(next: string): void {
    setText(next);
    setTyped(false);
    setBrowsing(false);
    setOpen(false);
    setActiveKey(null);
  }

  function chooseStation(station: Station, source: "keyboard" | "pointer"): void {
    latest.current += 1;
    settle(station.name);
    onStation(station, source);
  }

  function choosePlace(suggestion: PlaceSuggestion): void {
    latest.current += 1;
    const mine = latest.current;
    settle(suggestion.name);
    if (service === null) {
      onPlaceFailure();
      return;
    }
    void fetchLocation(service, suggestion, mine);
  }

  async function fetchLocation(
    from: PlaceSearchService,
    suggestion: PlaceSuggestion,
    mine: number,
  ): Promise<void> {
    try {
      const location = await from.choose(suggestion);
      if (mine === latest.current) onPlace(location);
    } catch {
      // The cause is dropped on purpose: its message can carry the typed text or a coordinate.
      if (mine === latest.current) onPlaceFailure();
    }
  }

  function chooseRow(row: Row, source: "keyboard" | "pointer"): void {
    if (row.kind === "station") chooseStation(row.match.station, source);
    else choosePlace(row.suggestion);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    const next = event.target.value;
    latest.current += 1;
    setText(next);
    setTyped(true);
    setBrowsing(false);
    setOpen(true);
    setActiveKey(undefined);
    onEngage();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    // An input method editor owns the keys while it composes (Enter confirms a candidate, arrows pick one):
    // none of them is ours. `key` is "Process" or the keyCode 229 in browsers that do not set isComposing.
    if (
      event.nativeEvent.isComposing ||
      event.key === "Process" ||
      event.nativeEvent.keyCode === 229
    )
      return;
    const count = rows.length;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (count === 0) return;
        event.preventDefault();
        const down = event.key === "ArrowDown";
        const index = activeRow === undefined ? -1 : rows.indexOf(activeRow);
        const next = down ? (index + 1) % count : index <= 0 ? count - 1 : index - 1;
        if (!expanded) {
          setOpen(true);
          onEngage();
          setActiveKey(rows[down ? 0 : count - 1]?.key);
        } else {
          setActiveKey(rows[next]?.key);
        }
        return;
      }
      case "Enter": {
        if (activeRow === undefined) return;
        event.preventDefault();
        chooseRow(activeRow, "keyboard");
        return;
      }
      case "Escape": {
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActiveKey(null);
        } else if (text !== "") {
          event.preventDefault();
          latest.current += 1;
          setText("");
          setTyped(false);
          setBrowsing(false);
        }
        return;
      }
      case "Home":
      case "End":
      case "ArrowLeft":
      case "ArrowRight": {
        // The caret moves (the browser's own behaviour); the list no longer has an active option (the APG
        // listbox popup returns visual focus to the textbox on these keys).
        setActiveKey(null);
        return;
      }
      default:
    }
  }

  function clear(): void {
    latest.current += 1;
    setText("");
    setTyped(false);
    setBrowsing(false);
    setOpen(false);
    setActiveKey(null);
    input.current?.focus();
  }

  function browseAll(): void {
    latest.current += 1;
    setText("");
    setTyped(false);
    setBrowsing(true);
    setOpen(true);
    setActiveKey(undefined);
    onEngage();
    input.current?.focus();
  }

  function renderRow(row: Row): ReactElement {
    const active = row.key === activeRow?.key;
    const shell = (children: ReactElement): ReactElement => (
      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus -- ARIA combobox option: focus stays on the input, keys are handled there (aria-activedescendant)
      <div
        key={row.key}
        id={optionId(row)}
        className="option"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a native option cannot hold the roundel and the two-line text
        role="option"
        aria-selected={active}
        // detail 0 is a virtual click (screen reader, switch, voice): those users keep the ring.
        onClick={(event) => chooseRow(row, event.detail === 0 ? "keyboard" : "pointer")}
      >
        {children}
      </div>
    );
    if (row.kind === "station") {
      const { station, range } = row.match;
      const position = stations.indexOf(station) + 1;
      return shell(
        <>
          <span className="roundel roundel--md" data-stop={position} aria-hidden="true">
            {stopLabel(position)}
          </span>
          <span className="option__text">
            <MatchedName name={station.name} range={range} />
            <span className="option__sub">{searchCopy.stop(position, stations.length)}</span>
          </span>
          <span className="option__end" aria-hidden="true">
            <Icon icon={chevronRight} size={16} />
          </span>
        </>,
      );
    }
    const { suggestion } = row;
    return shell(
      <>
        <span className="line-card__icon" aria-hidden="true">
          <Icon icon={mapPin} size={16} />
        </span>
        <span className="option__text">
          <MatchedName name={suggestion.name} range={suggestion.range} />
          {suggestion.detail === "" ? null : (
            <span className="option__sub">{suggestion.detail}</span>
          )}
        </span>
      </>,
    );
  }

  const stationsLabelId = `${base}-stations`;
  const placesLabelId = `${base}-places`;
  return (
    <div className="search-block" ref={region}>
      <label className="visually-hidden" htmlFor={SEARCH_INPUT_ID}>
        {searchCopy.label}
      </label>
      <div className="search" data-filled={text === "" ? undefined : ""}>
        <span className="search__lead" aria-hidden="true">
          <Icon icon={search} size={18} />
        </span>
        <input
          ref={input}
          id={SEARCH_INPUT_ID}
          className="search__input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={activeId}
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
          placeholder={searchCopy.placeholder}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => {
            closeAfterPress.current = false;
          }}
          onBlur={() => {
            if (pressing.current) {
              closeAfterPress.current = true;
              return;
            }
            setOpen(false);
            setActiveKey(null);
          }}
        />
        {text === "" ? null : (
          <button
            type="button"
            className="search__clear"
            aria-label={searchCopy.clear}
            onClick={clear}
          >
            <Icon icon={x} size={16} />
          </button>
        )}
        <span className="search__sep" aria-hidden="true" />
        <button
          type="button"
          className="search__locate"
          aria-label={searchCopy.locate}
          onClick={() => {
            suggestions.abandon();
            onLocate();
          }}
        >
          <Icon icon={locate} size={18} />
        </button>
      </div>
      <div
        className="listbox"
        id={listId}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- ARIA combobox popup: a native select cannot hold the roundel and the two-line option
        role="listbox"
        tabIndex={-1}
        aria-label={searchCopy.listLabel}
        hidden={!expanded}
        // The input keeps focus: a press on an option or on the scrollbar must not blur it.
        onMouseDown={(event) => event.preventDefault()}
      >
        {expanded && stationRows.length > 0 ? (
          <fieldset className="listbox__set" aria-labelledby={stationsLabelId}>
            <p className="listbox__group" id={stationsLabelId}>
              {searchCopy.stationsGroup}
            </p>
            {stationRows.map((row) => renderRow(row))}
          </fieldset>
        ) : null}
        {expanded && (placeRows.length > 0 || noticeInList) ? (
          <fieldset className="listbox__set" aria-labelledby={placesLabelId}>
            <p className="listbox__group" id={placesLabelId}>
              {searchCopy.placesGroup}
            </p>
            {noticeInList ? (
              <div className="notice" data-tone="warn" data-size="sm">
                <span className="notice__chip" aria-hidden="true">
                  <Icon icon={search} size={16} />
                </span>
                <div className="notice__body">
                  <p className="notice__text">{nearestCopy.searchUnavailable}</p>
                </div>
              </div>
            ) : (
              <>
                {placeRows.map((row) => renderRow(row))}
                <p className="search__attr" translate="no">
                  {searchCopy.attribution}
                </p>
              </>
            )}
          </fieldset>
        ) : null}
      </div>
      <div className={noMatch ? "empty" : "search__feedback"}>
        <output className={noMatch ? "empty__title" : "visually-hidden"}>{status}</output>
        {noMatch ? (
          <>
            <span className="empty__text">{searchCopy.noMatchHint}</span>
            <span className="empty__actions">
              <button type="button" className="btn btn--primary btn--sm" onClick={browseAll}>
                {searchCopy.browse(stations.length)}
              </button>
            </span>
          </>
        ) : null}
      </div>
      {/* A status region that is always mounted. A notice that appears later (a failed load, the connection back) fills a region that was already there, which is the reliable way to be announced; one that is there from the first render is simply part of the page. The list shows the same words in the Places group's place while it is open, and then this copy is for screen readers only. */}
      <output
        className={noticeInList || (available && !noticeUnder) ? "visually-hidden" : undefined}
      >
        {available && !noticeUnder ? null : (
          <div className="notice" data-tone="warn" data-size="sm">
            <span className="notice__chip" aria-hidden="true">
              <Icon icon={search} size={16} />
            </span>
            <div className="notice__body">
              <p className="notice__text">
                {online ? nearestCopy.searchUnavailable : nearestCopy.searchNoConnection}
              </p>
            </div>
          </div>
        )}
      </output>
    </div>
  );
}
