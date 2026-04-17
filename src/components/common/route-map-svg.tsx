import { cn } from "@/lib/utils";

interface RouteMapSvgProps {
  className?: string;
}

const METRO_GREEN = "oklch(0.64 0.2 145)";
const METRO_GREEN_DIM = "oklch(0.64 0.2 145 / 0.15)";

// Each station: position along the S-curve, interchange flag, label side
const STATIONS = [
  { interchange: false, name: "Uttara North", side: "right", x: 138, y: 22 },
  { interchange: false, name: "Uttara Center", side: "right", x: 138, y: 66 },
  { interchange: false, name: "Uttara South", side: "right", x: 137, y: 110 },
  { interchange: false, name: "Pallabi", side: "right", x: 136, y: 154 },
  { interchange: false, name: "Mirpur 11", side: "right", x: 134, y: 198 },
  { interchange: true, name: "Mirpur 10", side: "right", x: 130, y: 242 },
  { interchange: false, name: "Kazipara", side: "left", x: 112, y: 294 },
  { interchange: false, name: "Shewrapara", side: "right", x: 116, y: 336 },
  { interchange: false, name: "Agargaon", side: "right", x: 126, y: 372 },
  { interchange: false, name: "Bijoy Sarani", side: "left", x: 116, y: 408 },
  { interchange: false, name: "Farmgate", side: "right", x: 136, y: 448 },
  { interchange: true, name: "Kawran Bazar", side: "right", x: 152, y: 484 },
  { interchange: false, name: "Shahbag", side: "right", x: 158, y: 518 },
  { interchange: false, name: "Bangladesh Secretariat", side: "right", x: 168, y: 550 },
  { interchange: false, name: "Dhaka University", side: "left", x: 152, y: 578 },
  { interchange: true, name: "Motijheel", side: "right", x: 172, y: 604 },
  { interchange: true, name: "Kamalapur", side: "right", x: 200, y: 604 },
] as const;

// Build the SVG path points string for the S-curve route line
const PATH_POINTS = STATIONS.map((s) => `${s.x},${s.y}`).join(" ");

const SVG_WIDTH = 260;
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
    {/* Glow layer behind the route line */}
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
          {/* Terminal glow ring */}
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

          {/* Dot — filled for regular, hollow for interchange */}
          <circle
            cx={station.x}
            cy={station.y}
            fill={station.interchange ? "var(--background, white)" : METRO_GREEN}
            r={r}
            stroke={METRO_GREEN}
            strokeWidth={station.interchange ? "2" : "1.5"}
          />
          {/* Inner dot for interchange */}
          {station.interchange && (
            <circle cx={station.x} cy={station.y} fill={METRO_GREEN} r={2.5} />
          )}

          {/* Station label */}
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
