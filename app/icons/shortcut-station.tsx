import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 96,
  height: 96,
};
export const contentType = "image/png";

// Image generation
export default function ShortcutStation() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
        borderRadius: "20%",
        color: "white",
      }}
    >
      <div
        style={{
          fontSize: 40,
          marginBottom: 8,
          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        🚇
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: "bold",
          textAlign: "center",
          lineHeight: 1.1,
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        FIND
      </div>
      <div
        style={{
          fontSize: 10,
          textAlign: "center",
          opacity: 0.9,
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        STATION
      </div>
    </div>,
    {
      ...size,
    }
  );
}
