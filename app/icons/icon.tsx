import { ImageResponse } from "next/og";

// Icon size constants
const ICON_SIZES = {
  large: 512,
  medium: 192,
  small: 128,
  tiny: 96,
} as const;

const FONT_SIZES = {
  extraLarge: 200,
  large: 120,
  medium: 80,
  small: 60,
  tiny: 40,
} as const;

const BORDER_RADIUS = {
  large: "25%",
  small: "20%",
} as const;

// Generate multiple icon sizes
export function generateImageMetadata() {
  return [
    {
      contentType: "image/png",
      size: { width: 72, height: 72 },
      id: "72x72",
    },
    {
      contentType: "image/png",
      size: { width: 96, height: 96 },
      id: "96x96",
    },
    {
      contentType: "image/png",
      size: { width: 128, height: 128 },
      id: "128x128",
    },
    {
      contentType: "image/png",
      size: { width: 144, height: 144 },
      id: "144x144",
    },
    {
      contentType: "image/png",
      size: { width: 152, height: 152 },
      id: "152x152",
    },
    {
      contentType: "image/png",
      size: { width: 192, height: 192 },
      id: "192x192",
    },
    {
      contentType: "image/png",
      size: { width: 384, height: 384 },
      id: "384x384",
    },
    {
      contentType: "image/png",
      size: { width: 512, height: 512 },
      id: "512x512",
    },
    {
      contentType: "image/png",
      size: { width: 1024, height: 1024 },
      id: "1024x1024",
    },
  ];
}

// Helper function to get font size based on icon size
function getFontSize(size: number): number {
  if (size >= ICON_SIZES.large) {
    return FONT_SIZES.extraLarge;
  }
  if (size >= ICON_SIZES.medium) {
    return FONT_SIZES.large;
  }
  if (size >= ICON_SIZES.small) {
    return FONT_SIZES.medium;
  }
  if (size >= ICON_SIZES.tiny) {
    return FONT_SIZES.small;
  }
  return FONT_SIZES.tiny;
}

// Image generation
export default async function Icon({ id }: { id: Promise<string> }) {
  const iconId = await id;
  const size = Number.parseInt(iconId.split("x")[0] || "32", 10);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
        borderRadius: size >= ICON_SIZES.medium ? BORDER_RADIUS.large : BORDER_RADIUS.small,
      }}
    >
      <div
        style={{
          fontSize: getFontSize(size),
          fontWeight: "bold",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        🚇
      </div>
    </div>,
    {
      width: size,
      height: size,
    }
  );
}
