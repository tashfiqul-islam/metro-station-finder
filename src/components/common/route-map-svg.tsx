import { cn } from "@/lib/utils";

interface RouteMapSvgProps {
  className?: string;
}

const METRO_GREEN = "oklch(0.64 0.2 145)";
const METRO_GREEN_DIM = "oklch(0.64 0.2 145 / 0.15)";

// Stations with exact positions matching real MRT Line 6 geometry:
// - Seg 1 (straight, slight left drift): Uttara North → Kazipara
// - Curve right → Shewrapara
// - Seg 3 (straight, right drift): Shewrapara → Bijoy Sarani
// - Curve right → Farmgate
// - Seg 5 (straight): Farmgate → Shahbag
// - Curve right → Dhaka University → straight right → Bangladesh Secretariat
// - Curve right → Motijheel → curve up → Kamalapur
const STATIONS = [
  { interchange: false, label: "Uttara North", name: "Uttara North", side: "right", x: 150, y: 28 },
  {
    interchange: false,
    label: "Uttara Center",
    name: "Uttara Center",
    side: "right",
    x: 148,
    y: 75,
  },
  {
    interchange: false,
    label: "Uttara South",
    name: "Uttara South",
    side: "right",
    x: 145,
    y: 122,
  },
  { interchange: false, label: "Pallabi", name: "Pallabi", side: "right", x: 143, y: 169 },
  { interchange: false, label: "Mirpur 11", name: "Mirpur 11", side: "right", x: 140, y: 216 },
  { interchange: true, label: "Mirpur 10", name: "Mirpur 10", side: "right", x: 138, y: 263 },
  { interchange: false, label: "Kazipara", name: "Kazipara", side: "left", x: 136, y: 310 },
  { interchange: false, label: "Shewrapara", name: "Shewrapara", side: "right", x: 164, y: 368 },
  { interchange: false, label: "Agargaon", name: "Agargaon", side: "right", x: 170, y: 403 },
  { interchange: false, label: "Bijoy Sarani", name: "Bijoy Sarani", side: "left", x: 176, y: 438 },
  { interchange: false, label: "Farmgate", name: "Farmgate", side: "right", x: 200, y: 482 },
  { interchange: true, label: "Kawran Bazar", name: "Kawran Bazar", side: "right", x: 206, y: 512 },
  { interchange: false, label: "Shahbag", name: "Shahbag", side: "right", x: 212, y: 542 },
  {
    interchange: false,
    label: "Dhaka University",
    name: "Dhaka University",
    side: "left",
    x: 230,
    y: 572,
  },
  {
    interchange: false,
    label: "Secretariat",
    name: "Bangladesh Secretariat",
    side: "right",
    x: 256,
    y: 572,
  },
  { interchange: true, label: "Motijheel", name: "Motijheel", side: "right", x: 260, y: 606 },
  { interchange: true, label: "Kamalapur", name: "Kamalapur", side: "right", x: 284, y: 584 },
] as const;

// SVG path built from the 7 segments described above.
// L = straight segment, C = cubic bezier curve (rightward sweeps).
const ROUTE_PATH = [
  "M 150,28",
  // Segment 1: straight slight-left to Kazipara
  "L 136,310",
  // Curve right → Shewrapara
  "C 134,332 154,358 164,368",
  // Segment 3: straight right drift to Bijoy Sarani
  "L 176,438",
  // Curve right → Farmgate
  "C 180,458 194,472 200,482",
  // Segment 5: straight to Shahbag
  "L 212,542",
  // Curve right → Dhaka University, then straight right → Bangladesh Secretariat
  "C 215,558 238,568 230,572",
  "L 256,572",
  // Curve right → Motijheel
  "C 260,572 264,590 260,606",
  // Curve up → Kamalapur
  "C 259,620 282,608 284,584",
].join(" ");

const SVG_WIDTH = 360;
const SVG_HEIGHT = 632;

export const RouteMapSvg = ({ className }: RouteMapSvgProps) => (
  <svg
    aria-label="MRT Line 6 route map"
    className={cn("text-foreground", className)}
    data-testid="route-map-svg"
    height={SVG_HEIGHT}
    role="img"
    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
    width={SVG_WIDTH}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Glow layer */}
    <path
      d={ROUTE_PATH}
      fill="none"
      stroke={METRO_GREEN_DIM}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="8"
    />

    {/* Main route line */}
    <path
      d={ROUTE_PATH}
      fill="none"
      stroke={METRO_GREEN}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />

    {/* Station dots and labels */}
    {STATIONS.map((station, index) => {
      const isTerminal = index === 0 || index === STATIONS.length - 1;
      let r = 4.5;
      if (isTerminal) {
        r = 7;
      } else if (station.interchange) {
        r = 6;
      }
      const labelX = station.side === "right" ? station.x + 14 : station.x - 14;
      const anchor = station.side === "right" ? "start" : "end";

      return (
        <g key={station.name}>
          {isTerminal && (
            <circle
              cx={station.x}
              cy={station.y}
              fill="none"
              r={11}
              stroke={METRO_GREEN}
              strokeOpacity="0.25"
              strokeWidth="2"
            />
          )}

          <circle
            cx={station.x}
            cy={station.y}
            fill={station.interchange ? "var(--background, white)" : METRO_GREEN}
            r={r}
            stroke={METRO_GREEN}
            strokeWidth={station.interchange ? "2" : "1.5"}
          />
          {station.interchange && (
            <circle cx={station.x} cy={station.y} fill={METRO_GREEN} r={2.5} />
          )}

          <text
            dominantBaseline="middle"
            fill="currentColor"
            fontSize={isTerminal ? "11" : "9.5"}
            fontWeight={isTerminal ? "700" : "400"}
            textAnchor={anchor}
            x={labelX}
            y={station.y}
          >
            {station.label}
          </text>
        </g>
      );
    })}
  </svg>
);
