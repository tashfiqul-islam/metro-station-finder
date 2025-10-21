import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Image generation
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
        color: "white",
        padding: "60px",
      }}
    >
      {/* Main Icon */}
      <div
        style={{
          fontSize: 120,
          marginBottom: 40,
        }}
      >
        🚇
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 20,
          lineHeight: 1.1,
        }}
      >
        Metro Station Finder
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 36,
          textAlign: "center",
          opacity: 0.9,
          lineHeight: 1.2,
        }}
      >
        Find Dhaka Metro Stations & Calculate Fares
      </div>

      {/* MRT-6 Badge */}
      <div
        style={{
          fontSize: 24,
          fontWeight: "bold",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          padding: "12px 24px",
          borderRadius: "12px",
          marginTop: 40,
          border: "2px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        MRT-6 Dhaka
      </div>
    </div>,
    {
      ...size,
    }
  );
}
