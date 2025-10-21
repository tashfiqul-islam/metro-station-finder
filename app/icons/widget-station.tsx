import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 64,
  height: 64,
};
export const contentType = "image/png";

// Image generation
export default function WidgetStation() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
        borderRadius: "25%",
        color: "white",
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: "bold",
          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        🚇
      </div>
    </div>,
    {
      ...size,
    }
  );
}
