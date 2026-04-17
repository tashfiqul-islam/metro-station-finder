import { cn } from "@/lib/utils";

interface RouteMapSvgProps {
  className?: string;
}

const STATIONS = [
  "Uttara North",
  "Uttara Center",
  "Uttara South",
  "Pallabi",
  "Mirpur 11",
  "Mirpur 10",
  "Kazipara",
  "Shewrapara",
  "Agargaon",
  "Bijoy Sarani",
  "Farmgate",
  "Kawran Bazar",
  "Shahbag",
  "Dhaka University",
  "Bangladesh Secretariat",
  "Motijheel",
  "Kamalapur",
] as const;

const METRO_GREEN = "oklch(0.64 0.2 145)";

// Layout constants
const PADDING_TOP = 20;
const PADDING_LEFT = 30;
const ROW_HEIGHT = 36;
const LINE_X = PADDING_LEFT + 10;
const LABEL_X = LINE_X + 24;
const TERMINAL_INDICES = new Set([0, STATIONS.length - 1]);

const SVG_HEIGHT = PADDING_TOP * 2 + (STATIONS.length - 1) * ROW_HEIGHT;
const SVG_WIDTH = 260;

/**
 * Inline SVG depicting the MRT Line 6 route with 17 stations.
 * Renders a vertical line with dots for each station and labels on the right.
 * Terminal stations use a larger dot radius.
 */
export const RouteMapSvg = ({ className }: RouteMapSvgProps) => {
  const lineStartY = PADDING_TOP;
  const lineEndY = PADDING_TOP + (STATIONS.length - 1) * ROW_HEIGHT;

  return (
    <svg
      aria-label="MRT Line 6 route map"
      className={cn(className)}
      data-testid="route-map-svg"
      height={SVG_HEIGHT}
      role="img"
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      width={SVG_WIDTH}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Route line */}
      <line
        stroke={METRO_GREEN}
        strokeWidth="2"
        x1={LINE_X}
        x2={LINE_X}
        y1={lineStartY}
        y2={lineEndY}
      />

      {/* Station dots and labels */}
      {STATIONS.map((station, index) => {
        const cy = PADDING_TOP + index * ROW_HEIGHT;
        const isTerminal = TERMINAL_INDICES.has(index);
        const radius = isTerminal ? 7 : 5;

        return (
          <g key={station}>
            <circle
              cx={LINE_X}
              cy={cy}
              fill={METRO_GREEN}
              r={radius}
              stroke="white"
              strokeWidth="1.5"
            />
            <text dominantBaseline="middle" fill="currentColor" fontSize="12" x={LABEL_X} y={cy}>
              {station}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
