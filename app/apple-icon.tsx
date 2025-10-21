import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
        borderRadius: "22%",
        boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          fontSize: 80,
          fontWeight: "bold",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          textShadow: "0 4px 8px rgba(0,0,0,0.3)",
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
