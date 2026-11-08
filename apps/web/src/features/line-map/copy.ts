/** All copy of the line map (fixed, English only). */
export const mapCopy = {
  /** The landmark that holds the map, so no page content sits outside a landmark. */
  region: "Line map",
  controls: "Map controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fit: "Show whole line",
  /** The keys the focused map takes (ARIA key shortcuts syntax). */
  shortcuts: "ArrowUp ArrowDown ArrowLeft ArrowRight Plus Minus 0",
  title: "Schematic map of MRT Line 6",
  listLabel: "Stations on MRT Line 6, north to south",
  highlightedSuffix: ", highlighted",
  /** The `desc` of the svg: the current state in one sentence per fact, ending with where the full list is. */
  describe: (parts: {
    readonly stations: number;
    readonly first: string;
    readonly last: string;
    readonly highlighted: readonly string[];
    readonly position: boolean;
    readonly walk: boolean;
    readonly trip: { readonly from: string; readonly to: string } | null;
  }): string => {
    const sentences = [`All ${parts.stations} stations from ${parts.first} to ${parts.last}.`];
    if (parts.highlighted.length > 0) {
      sentences.push(`Highlighted: ${parts.highlighted.join(", ")}.`);
    }
    if (parts.position) sentences.push("Your position is shown.");
    if (parts.walk) sentences.push("A dashed walking path is drawn.");
    if (parts.trip !== null) sentences.push(`Trip from ${parts.trip.from} to ${parts.trip.to}.`);
    sentences.push("The station list after the map names every station as text.");
    return sentences.join(" ");
  },
} as const;
