import { baselineDataset, datasetProvenance } from "@metro/core";
import type { Station } from "@metro/core";
import type { ReactElement, Ref } from "react";

import { Icon } from "../../icons/Icon";
import { externalLink } from "../../icons/shapes/external-link";
import { mapPin } from "../../icons/shapes/map-pin";
import { navigation } from "../../icons/shapes/navigation";
import { copy as nearestCopy } from "../nearest-station/copy";
import { formatIsoDate } from "../nearest-station/format";
import { pickerCopy } from "./copy";
import { FareRangeText } from "./FareRangeText";
import { directionsUrl, fareRange, stopLabel } from "./station-facts";

import "../../styles/components/typography.css";
import "../../styles/components/button.css";
import "../../styles/components/roundel.css";
import "../../styles/components/result.css";
import "../../styles/components/ticket.css";

interface StationResultProps {
  readonly station: Station;
  /** The result heading takes focus when a station is picked (`tabIndex` -1). */
  readonly headingRef: Ref<HTMLHeadingElement>;
  /** "Show on map": the sheet drops to peek so the highlighted station is in view. */
  readonly onShowOnMap: () => void;
}

const { stations, fares } = baselineDataset;

/**
 * The result of picking a station by name (METRO-112). A pick gives no user position, so it shows the station,
 * its fare range and a Directions link, and nothing that implies a distance, a walk or a nearest station.
 * The fare footnote on the ticket stub is built from `datasetProvenance.fares`, never from a literal here.
 * No pass or concession price.
 */
export function StationResult({
  station,
  headingRef,
  onShowOnMap,
}: StationResultProps): ReactElement {
  const position = stations.indexOf(station) + 1;
  const range = fareRange(fares, stations, station);
  const headingId = `pick-name-${station.id}`;
  return (
    <>
      <article className="ticket" aria-labelledby={headingId}>
        <div className="ticket__top">
          <div className="result__head">
            <div className="result__titles">
              <p className="eyebrow">{pickerCopy.resultEyebrow}</p>
              <h2 className="result__name" id={headingId} tabIndex={-1} ref={headingRef}>
                {station.name}
              </h2>
              <p className="metric__about">{pickerCopy.stop(position, stations.length)}</p>
            </div>
            <span className="roundel roundel--lg" data-stop={position} aria-hidden="true">
              {stopLabel(position)}
            </span>
          </div>
          {range === null ? null : (
            <>
              <div className="ticket__row">
                <span className="ticket__chip">{pickerCopy.fareLabel}</span>
              </div>
              <p className="ticket__fare">
                <span className="ticket__amount ticket__amount--range">
                  <FareRangeText range={range} />
                </span>
              </p>
            </>
          )}
        </div>
        {range === null ? null : (
          <div className="ticket__stub">
            <span className="ticket__perf" aria-hidden="true" />
            <p className="ticket__note">
              {nearestCopy.faresAsOf(
                formatIsoDate(datasetProvenance.fares.noticeDate),
                formatIsoDate(datasetProvenance.fares.officialTableRetrieved),
              )}
            </p>
          </div>
        )}
      </article>
      <div className="pick__actions">
        <a
          className="link-ext"
          href={directionsUrl(station)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon icon={navigation} size={16} />
          {pickerCopy.directions}
          <Icon icon={externalLink} size={14} />
          <span className="visually-hidden">{pickerCopy.newTab}</span>
        </a>
        <button type="button" className="btn btn--quiet btn--sm" onClick={onShowOnMap}>
          <Icon icon={mapPin} size={16} />
          {pickerCopy.showOnMap}
        </button>
      </div>
    </>
  );
}
