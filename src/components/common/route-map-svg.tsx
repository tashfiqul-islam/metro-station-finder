import { cn } from "@/lib/utils";

interface RouteMapSvgProps {
  className?: string;
}

const METRO_GREEN = "var(--primary)";
const ROUTE_CORE = "color-mix(in oklch, var(--primary) 85%, var(--foreground) 15%)";
const FLOW_STROKE = "color-mix(in oklch, white 55%, var(--primary) 45%)";

interface StationDef {
  code: string;
  interchange: boolean;
  labelSide: "left" | "right";
  nameBn: string;
  nameEn: string;
  x: number;
  y: number;
}

const STATIONS: StationDef[] = [
  {
    code: "01",
    interchange: false,
    labelSide: "left",
    nameBn: "উত্তরা উত্তর",
    nameEn: "Uttara North",
    x: 200,
    y: 56,
  },
  {
    code: "02",
    interchange: false,
    labelSide: "left",
    nameBn: "উত্তরা সেন্টার",
    nameEn: "Uttara Center",
    x: 200,
    y: 112,
  },
  {
    code: "03",
    interchange: false,
    labelSide: "left",
    nameBn: "উত্তরা দক্ষিণ",
    nameEn: "Uttara South",
    x: 200,
    y: 168,
  },
  {
    code: "04",
    interchange: false,
    labelSide: "left",
    nameBn: "পল্লবী",
    nameEn: "Pallabi",
    x: 200,
    y: 224,
  },
  {
    code: "05",
    interchange: false,
    labelSide: "left",
    nameBn: "মিরপুর ১১",
    nameEn: "Mirpur 11",
    x: 200,
    y: 280,
  },
  {
    code: "06",
    interchange: true,
    labelSide: "left",
    nameBn: "মিরপুর ১০",
    nameEn: "Mirpur 10",
    x: 200,
    y: 336,
  },
  {
    code: "07",
    interchange: false,
    labelSide: "left",
    nameBn: "কাজীপাড়া",
    nameEn: "Kazipara",
    x: 200,
    y: 392,
  },
  {
    code: "08",
    interchange: false,
    labelSide: "right",
    nameBn: "শেওড়াপাড়া",
    nameEn: "Shewrapara",
    x: 320,
    y: 448,
  },
  {
    code: "09",
    interchange: false,
    labelSide: "right",
    nameBn: "আগারগাঁও",
    nameEn: "Agargaon",
    x: 320,
    y: 504,
  },
  {
    code: "10",
    interchange: false,
    labelSide: "left",
    nameBn: "বিজয় সরণি",
    nameEn: "Bijoy Sarani",
    x: 320,
    y: 560,
  },
  {
    code: "11",
    interchange: false,
    labelSide: "left",
    nameBn: "ফার্মগেট",
    nameEn: "Farmgate",
    x: 440,
    y: 616,
  },
  {
    code: "12",
    interchange: true,
    labelSide: "right",
    nameBn: "কারওয়ান বাজার",
    nameEn: "Karwan Bazar",
    x: 440,
    y: 672,
  },
  {
    code: "13",
    interchange: false,
    labelSide: "right",
    nameBn: "শাহবাগ",
    nameEn: "Shahbag",
    x: 440,
    y: 728,
  },
  {
    code: "14",
    interchange: false,
    labelSide: "left",
    nameBn: "ঢাকা বিশ্ববিদ্যালয়",
    nameEn: "Dhaka University",
    x: 560,
    y: 784,
  },
  {
    code: "15",
    interchange: false,
    labelSide: "right",
    nameBn: "বাংলাদেশ সচিবালয়",
    nameEn: "Bangladesh Secretariat",
    x: 560,
    y: 840,
  },
  {
    code: "16",
    interchange: true,
    labelSide: "left",
    nameBn: "মতিঝিল",
    nameEn: "Motijheel",
    x: 440,
    y: 840,
  },
  {
    code: "17",
    interchange: true,
    labelSide: "right",
    nameBn: "কমলাপুর",
    nameEn: "Kamalapur",
    x: 320,
    y: 840,
  },
];

const ROUTE_PATH = [
  "M 200,56",
  "L 200,392",
  "C 200,420 240,432 320,448",
  "L 320,560",
  "C 320,580 380,596 440,616",
  "L 440,728",
  "C 440,752 500,768 560,784",
  "L 560,840",
  "L 440,840",
  "L 320,840",
].join(" ");

const SVG_WIDTH = 640;
const SVG_HEIGHT = 896;

export const RouteMapSvg = ({ className }: RouteMapSvgProps) => (
  <svg
    aria-label="MRT Line 6 route map"
    className={cn("text-foreground", className)}
    data-testid="route-map-svg"
    height={SVG_HEIGHT}
    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
    width={SVG_WIDTH}
    xmlns="http://www.w3.org/2000/svg"
  >
    <desc>MRT Line 6 route map with Bengali and English station names.</desc>

    {/* Subtle dot grid */}
    <g aria-hidden="true" opacity="0.25">
      {Array.from({ length: 15 }, (_c, i) =>
        Array.from({ length: 20 }, (_r, j) => (
          <circle cx={40 + i * 40} cy={40 + j * 40} fill="currentColor" key={`${i}-${j}`} r="0.5" />
        )),
      )}
    </g>

    {/* Route glow */}
    <path
      d={ROUTE_PATH}
      fill="none"
      stroke={METRO_GREEN}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.18"
      strokeWidth="16"
    />
    {/* Route core */}
    <path
      d={ROUTE_PATH}
      fill="none"
      stroke={ROUTE_CORE}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="5"
    />
    {/* Flow animation */}
    <path
      className="route-map-flow"
      d={ROUTE_PATH}
      fill="none"
      stroke={FLOW_STROKE}
      strokeDasharray="4 32"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />

    {STATIONS.map((station, index) => {
      const isTerminal = index === 0 || index === STATIONS.length - 1;
      const isInterchange = station.interchange;
      let radius = 7;
      if (isTerminal) {
        radius = 10;
      } else if (isInterchange) {
        radius = 8;
      }

      const labelX = station.labelSide === "left" ? station.x - 22 : station.x + 22;
      const pillX = station.labelSide === "left" ? station.x + 18 : station.x - 62;
      const labelAnchor = station.labelSide === "left" ? "end" : "start";

      return (
        <g data-testid="route-map-station-label" key={station.nameEn}>
          {/* Terminal halo */}
          {isTerminal && (
            <circle
              cx={station.x}
              cy={station.y}
              fill="none"
              opacity="0.25"
              r="15"
              stroke={METRO_GREEN}
              strokeWidth="2"
            />
          )}

          {/* Station dot */}
          <circle
            cx={station.x}
            cy={station.y}
            fill="var(--background)"
            r={radius}
            stroke={ROUTE_CORE}
            strokeWidth={isInterchange || isTerminal ? "3" : "2.5"}
          />
          {(isInterchange || isTerminal) && (
            <circle cx={station.x} cy={station.y} fill={METRO_GREEN} r="3" />
          )}

          {/* Code pill */}
          <rect fill={METRO_GREEN} height="22" rx="11" width="44" x={pillX} y={station.y - 11} />
          <text
            dominantBaseline="middle"
            fill="var(--primary-foreground)"
            fontFamily="var(--font-sans)"
            fontSize="9"
            fontWeight="800"
            textAnchor="middle"
            x={pillX + 22}
            y={station.y + 0.5}
          >
            {station.code}
          </text>

          {/* Bengali label (top) */}
          <text
            fill="var(--foreground)"
            fontFamily="var(--font-sans)"
            fontSize={isTerminal ? "12.5" : "11.5"}
            fontWeight={isTerminal ? "800" : "700"}
            paintOrder="stroke"
            stroke="var(--background)"
            strokeLinejoin="round"
            strokeWidth="3"
            textAnchor={labelAnchor}
            x={labelX}
            y={station.y - 5}
          >
            {station.nameBn}
          </text>

          {/* English label (bottom) */}
          <text
            fill="var(--muted-foreground)"
            fontFamily="var(--font-sans)"
            fontSize="10"
            fontWeight="500"
            paintOrder="stroke"
            stroke="var(--background)"
            strokeLinejoin="round"
            strokeWidth="3"
            textAnchor={labelAnchor}
            x={labelX}
            y={station.y + 10}
          >
            {station.nameEn}
          </text>
        </g>
      );
    })}
  </svg>
);

RouteMapSvg.displayName = "RouteMapSvg";
