import { useCallback, useEffect, useRef, useState } from "react";

const VIEWBOX = { height: 100, width: 750 } as const;
const SPOTLIGHT_RADIUS = 150;

export const FooterWatermark = (): React.ReactElement => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDark, setIsDark] = useState(true);
  const [cursorPos, setCursorPos] = useState({
    x: VIEWBOX.width / 2,
    y: VIEWBOX.height / 2,
  });
  const [glowOpacity, setGlowOpacity] = useState(0);

  useEffect(() => {
    const check = () =>
      setIsDark(
        document.documentElement.classList.contains("dark") ||
          document.documentElement.dataset["theme"] === "dark",
      );
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    setCursorPos({
      x: ((e.clientX - rect.left) / rect.width) * VIEWBOX.width,
      y: ((e.clientY - rect.top) / rect.height) * VIEWBOX.height,
    });
    setGlowOpacity(1);
  }, []);

  const handleMouseLeave = useCallback(() => setGlowOpacity(0), []);

  const baseStroke = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.16)";

  return (
    <div className="relative block overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="overflow-hidden" style={{ height: "clamp(40px, 7vw, 96px)" }}>
          <svg
            aria-hidden="true"
            className="w-full cursor-default select-none"
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            preserveAspectRatio="xMidYMin meet"
            ref={svgRef}
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          >
            <defs>
              {/* Neutral white spotlight — Resend-style, no brand tint */}
              <radialGradient
                cx={cursorPos.x}
                cy={cursorPos.y}
                gradientUnits="userSpaceOnUse"
                id="wm-spotlight"
                r={SPOTLIGHT_RADIUS}
              >
                <stop
                  offset="0%"
                  stopColor={isDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.30)"}
                />
                <stop
                  offset="35%"
                  stopColor={isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.13)"}
                />
                <stop
                  offset="65%"
                  stopColor={isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.04)"}
                />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>

              {/* Soft bloom amplifier for the spotlight layer */}
              <filter height="160%" id="wm-bloom" width="160%" x="-30%" y="-30%">
                <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="1.2" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Etched-glass base — visible stroke, transparent fill */}
            <text
              dominantBaseline="alphabetic"
              style={{
                fill: "transparent",
                fontFamily: "var(--font-heading), system-ui, sans-serif",
                fontSize: "80px",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                stroke: baseStroke,
                strokeWidth: "0.5px",
              }}
              textAnchor="middle"
              x={VIEWBOX.width / 2}
              y="78"
            >
              METRO RAIL
            </text>

            {/* White beam spotlight — sweeps over etched text on hover */}
            <text
              className="transition-opacity duration-300 ease-out"
              dominantBaseline="alphabetic"
              style={{
                fill: "url(#wm-spotlight)",
                filter: "url(#wm-bloom)",
                fontFamily: "var(--font-heading), system-ui, sans-serif",
                fontSize: "80px",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                opacity: glowOpacity,
              }}
              textAnchor="middle"
              x={VIEWBOX.width / 2}
              y="78"
            >
              METRO RAIL
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};

FooterWatermark.displayName = "FooterWatermark";
