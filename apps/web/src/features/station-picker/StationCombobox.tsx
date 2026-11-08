import type { Station } from "@metro/core";
import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { Icon } from "../../icons/Icon";
import { pickerCopy } from "./copy";
import { matchStations, splitName } from "./match";
import { chevronIcon, clearIcon, searchIcon } from "./picker-icons";
import { stopLabel } from "./station-facts";

import "../../styles/components/fields.css";
import "../../styles/components/common.css";

interface StationComboboxProps {
  readonly stations: readonly Station[];
  /** A station was chosen (Enter or a click on an option). */
  readonly onSelect: (station: Station) => void;
  /** The user typed, cleared or asked for the full list: the sheet opens to full so the list has room. */
  readonly onEngage: () => void;
}

/** Scrolls the active option into the list; a browser without the method just skips it. */
function revealOption(id: string): void {
  const node = document.getElementById(id);
  if (typeof node?.scrollIntoView === "function") node.scrollIntoView({ block: "nearest" });
}

/**
 * The "Or pick a station" combobox: the WAI-ARIA editable combobox with list autocomplete. DOM focus stays on the
 * input and `aria-activedescendant` names the active option. ArrowDown and ArrowUp move the active option and
 * wrap; Enter chooses it; Escape closes the list, a second Escape clears the text; Home and End keep their
 * caret meaning (the active option is released). The empty state is outside the popup, so "Browse all" stays
 * reachable after the input loses focus. Pure local data: no request of any kind.
 */
export function StationCombobox({
  stations,
  onSelect,
  onEngage,
}: StationComboboxProps): ReactElement {
  const base = useId();
  const inputId = `${base}-input`;
  const listId = `${base}-list`;
  const hintId = `${base}-hint`;
  const optionId = (station: Station): string => `${base}-option-${station.id}`;

  const input = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = matchStations(stations, text);
  const expanded = open && matches.length > 0;
  const activeMatch = expanded ? matches[active] : undefined;
  const noMatch = text.trim() !== "" && matches.length === 0;
  const activeId = activeMatch === undefined ? undefined : optionId(activeMatch.station);

  useEffect(() => {
    if (activeId !== undefined) revealOption(activeId);
  }, [activeId]);

  // When the list opens the field goes to the top of the panel, so the suggestions below it are in view whatever
  // the screen above the field holds. Instant (no smooth scroll), so reduced motion needs no special case.
  useEffect(() => {
    if (expanded && typeof field.current?.scrollIntoView === "function") {
      field.current.scrollIntoView({ block: "start" });
    }
  }, [expanded]);

  function choose(station: Station): void {
    setText(station.name);
    setOpen(false);
    setActive(-1);
    onSelect(station);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    setText(event.target.value);
    setOpen(true);
    setActive(0);
    onEngage();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    const count = matches.length;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (count === 0) return;
        event.preventDefault();
        const down = event.key === "ArrowDown";
        if (!expanded) {
          setOpen(true);
          setActive(down ? 0 : count - 1);
          onEngage();
        } else if (down) {
          setActive((active + 1) % count);
        } else {
          setActive(active <= 0 ? count - 1 : active - 1);
        }
        return;
      }
      case "Enter": {
        if (activeMatch === undefined) return;
        event.preventDefault();
        choose(activeMatch.station);
        return;
      }
      case "Escape": {
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (text !== "") {
          event.preventDefault();
          setText("");
        }
        return;
      }
      case "Home":
      case "End": {
        // The caret moves (the browser's own behaviour); the list no longer has an active option.
        setActive(-1);
        return;
      }
      default:
    }
  }

  function clear(): void {
    setText("");
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  }

  function browseAll(): void {
    setText("");
    setOpen(true);
    setActive(0);
    onEngage();
    input.current?.focus();
  }

  return (
    <>
      <div className="field" ref={field}>
        <label className="field__label" htmlFor={inputId}>
          {pickerCopy.label}
        </label>
        <div className="combo">
          <Icon icon={searchIcon} />
          <input
            ref={input}
            id={inputId}
            className="combo__input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-describedby={hintId}
            autoComplete="off"
            enterKeyHint="search"
            placeholder={pickerCopy.placeholder}
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={() => {
              setOpen(false);
              setActive(-1);
            }}
          />
          {text === "" ? null : (
            <button
              type="button"
              className="combo__clear"
              aria-label={pickerCopy.clear}
              onClick={clear}
            >
              <Icon icon={clearIcon} size={16} />
            </button>
          )}
        </div>
        <p className="field__hint" id={hintId}>
          {pickerCopy.hint(stations.length)}
        </p>
      </div>
      <div
        className="listbox"
        id={listId}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- ARIA combobox popup: a native select cannot hold the roundel and the two-line option
        role="listbox"
        tabIndex={-1}
        aria-label={pickerCopy.listLabel}
        hidden={!expanded}
        // The input keeps focus: a press on an option or on the scrollbar must not blur it.
        onMouseDown={(event) => event.preventDefault()}
      >
        {(expanded ? matches : []).map((match, index) => {
          const [before, hit, after] = splitName(match.station.name, match.range);
          const position = stations.indexOf(match.station) + 1;
          return (
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus -- ARIA combobox option: focus stays on the input, keys are handled there (aria-activedescendant)
            <div
              key={match.station.id}
              id={optionId(match.station)}
              className="option"
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a native option cannot hold the roundel and the two-line text
              role="option"
              aria-selected={index === active}
              onClick={() => choose(match.station)}
            >
              <span className="roundel roundel--md" data-stop={position} aria-hidden="true">
                {stopLabel(position)}
              </span>
              <span className="option__text">
                <span className="option__name">
                  {before}
                  {hit === "" ? null : <span className="option__match">{hit}</span>}
                  {after}
                </span>
                <span className="option__sub">{pickerCopy.stop(position, stations.length)}</span>
              </span>
              <span className="option__end" aria-hidden="true">
                <Icon icon={chevronIcon} size={16} />
              </span>
            </div>
          );
        })}
      </div>
      <output className="pick__status">
        {noMatch ? (
          <span className="empty">
            <span className="empty__title">{pickerCopy.noMatch}</span>
            <span className="empty__text">{pickerCopy.noMatchHint}</span>
            <span className="empty__actions">
              <button type="button" className="btn btn--primary btn--sm" onClick={browseAll}>
                {pickerCopy.browse(stations.length)}
              </button>
            </span>
          </span>
        ) : null}
      </output>
    </>
  );
}
