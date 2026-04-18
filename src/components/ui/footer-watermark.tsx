import { useCallback, useEffect, useRef, useState } from "react";

const VIEWBOX = { height: 100, width: 750 } as const;
const SPOTLIGHT_RADIUS = 220;

export const FooterWatermark = (): React.ReactElement => {
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
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
    const textEl = textRef.current;
    if (!(svg && textEl)) {
      return;
    }

    const svgRect = svg.getBoundingClientRect();
    const textBBox = textEl.getBBox();
    const svgX = ((e.clientX - svgRect.left) / svgRect.width) * VIEWBOX.width;
    const svgY = ((e.clientY - svgRect.top) / svgRect.height) * VIEWBOX.height;

    const isOverText =
      svgX >= textBBox.x &&
      svgX <= textBBox.x + textBBox.width &&
      svgY >= textBBox.y &&
      svgY <= textBBox.y + textBBox.height;

    setGlowOpacity(isOverText ? 1 : 0);
    setCursorPos({ x: svgX, y: svgY });
  }, []);

  const handleMouseLeave = useCallback(() => setGlowOpacity(0), []);

  const glassBase = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.04)";
  const strokeColor = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.035)";

  return (
    <div className="relative block overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="overflow-hidden" style={{ height: "clamp(36px, 6.5vw, 88px)" }}>
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
              <linearGradient id="wm-glass" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={glassBase} />
                <stop offset="100%" stopColor={glassBase} />
              </linearGradient>

              {/* Metro green spotlight radial gradient */}
              <radialGradient
                cx={cursorPos.x}
                cy={cursorPos.y}
                gradientUnits="userSpaceOnUse"
                id="wm-spotlight"
                r={SPOTLIGHT_RADIUS}
              >
                <stop
                  offset="0%"
                  stopColor={isDark ? "rgba(61,214,140,0.22)" : "rgba(40,130,80,0.14)"}
                />
                <stop
                  offset="55%"
                  stopColor={isDark ? "rgba(61,214,140,0.08)" : "rgba(40,130,80,0.05)"}
                />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>

              <filter height="140%" id="wm-glass-filter" width="140%" x="-20%" y="-20%">
                <feGaussianBlur in="SourceAlpha" result="blur" stdDeviation="0.5" />
                <feOffset dx="0.5" dy="0.5" in="blur" result="offset" />
                <feComposite in="SourceAlpha" in2="offset" operator="out" result="inner" />
                <feFlood
                  floodColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
                  result="color"
                />
                <feComposite in="color" in2="inner" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glass base layer */}
            <text
              dominantBaseline="alphabetic"
              style={{
                fill: "url(#wm-glass)",
                filter: "url(#wm-glass-filter)",
                fontFamily: "var(--font-heading), system-ui, sans-serif",
                fontSize: "62px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                stroke: strokeColor,
                strokeWidth: "0.2px",
              }}
              textAnchor="middle"
              x={VIEWBOX.width / 2}
              y="72"
            >
              METRO STATION FINDER
            </text>

            {/* Cursor spotlight layer */}
            <text
              className="transition-opacity duration-500 ease-out"
              dominantBaseline="alphabetic"
              ref={textRef}
              style={{
                fill: "url(#wm-spotlight)",
                filter: "blur(0.6px)",
                fontFamily: "var(--font-heading), system-ui, sans-serif",
                fontSize: "62px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                opacity: glowOpacity * 0.7,
              }}
              textAnchor="middle"
              x={VIEWBOX.width / 2}
              y="72"
            >
              METRO STATION FINDER
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};

FooterWatermark.displayName = "FooterWatermark";
