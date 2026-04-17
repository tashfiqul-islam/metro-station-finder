import { cn } from "@/lib/utils";

interface RouteMapSvgProps {
  className?: string;
}

const METRO_GREEN = "oklch(0.64 0.2 145)";
const METRO_GREEN_DIM = "oklch(0.64 0.2 145 / 0.15)";

// x coords mirror the real route: big leftward kinks at Kazipara & Bijoy Sarani,
// then a continuous rightward sweep down to Kamalapur.
const STATIONS = [
  { interchange: false, name: "Uttara North", side: "right", x: 155, y: 22 },
  { interchange: false, name: "Uttara Center", side: "right", x: 154, y: 66 },
  { interchange: false, name: "Uttara South", side: "right", x: 152, y: 110 },
  { interchange: false, name: "Pallabi", side: "right", x: 150, y: 154 },
  { interchange: false, name: "Mirpur 11", side: "right", x: 147, y: 198 },
  { interchange: true, name: "Mirpur 10", side: "right", x: 142, y: 242 },
  { interchange: false, name: "Kazipara", side: "left", x: 88, y: 304 },
  { interchange: false, name: "Shewrapara", side: "right", x: 108, y: 350 },
  { interchange: false, name: "Agargaon", side: "right", x: 128, y: 386 },
  { interchange: false, name: "Bijoy Sarani", side: "left", x: 90, y: 420 },
  { interchange: false, name: "Farmgate", side: "right", x: 145, y: 458 },
  { interchange: true, name: "Kawran Bazar", side: "right", x: 162, y: 492 },
  { interchange: false, name: "Shahbag", side: "right", x: 168, y: 524 },
  { interchange: false, name: "Bangladesh Secretariat", side: "right", x: 178, y: 552 },
  { interchange: false, name: "Dhaka University", side: "left", x: 112, y: 578 },
  { interchange: true, name: "Motijheel", side: "right", x: 185, y: 604 },
  { interchange: true, name: "Kamalapur", side: "right", x: 222, y: 604 },
] as const;

const PATH_POINTS = STATIONS.map((s) => `${s.x},${s.y}`).join(" ");

const SVG_WIDTH = 330;
const SVG_HEIGHT = 630;

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
    <polyline
      fill="none"
      points={PATH_POINTS}
      stroke={METRO_GREEN_DIM}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="8"
    />

    {/* Main route line */}
    <polyline
      fill="none"
      points={PATH_POINTS}
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
            fontSize={isTerminal ? "11.5" : "10.5"}
            fontWeight={isTerminal ? "700" : "400"}
            textAnchor={anchor}
            x={labelX}
            y={station.y}
          >
            {station.name}
          </text>
        </g>
      );
    })}
  </svg>
);
