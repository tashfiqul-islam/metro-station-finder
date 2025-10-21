import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Font size constants
const FONT_SIZE_LARGE = 20;
const FONT_SIZE_SMALL = 16;
const ICON_SIZE_THRESHOLD = 32;

// Metro Station Finder Icon configurations
const ICON_CONFIGS = {
  "metro-station": {
    emoji: "🚇",
    gradient: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
  },
  "fare-calculator": {
    emoji: "💰",
    gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
  },
  "route-finder": {
    emoji: "🗺️",
    gradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
  },
  "location-pin": {
    emoji: "📍",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
  },
  "metro-train": {
    emoji: "🚊",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  },
};

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const iconName = searchParams.get("icon");
  const size = Number.parseInt(searchParams.get("size") || "32", 10);

  if (!(iconName && ICON_CONFIGS[iconName as keyof typeof ICON_CONFIGS])) {
    return new Response("Invalid icon name", { status: 400 });
  }

  const config = ICON_CONFIGS[iconName as keyof typeof ICON_CONFIGS];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: config.gradient,
        borderRadius: "20%",
      }}
    >
      <div
        style={{
          fontSize: size >= ICON_SIZE_THRESHOLD ? FONT_SIZE_LARGE : FONT_SIZE_SMALL,
          fontWeight: "bold",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        {config.emoji}
      </div>
    </div>,
    {
      width: size,
      height: size,
    }
  );
}
