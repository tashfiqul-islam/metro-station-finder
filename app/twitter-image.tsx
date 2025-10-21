import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 1200,
  height: 600,
};
export const contentType = "image/png";

// Image generation
export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
        color: "white",
        padding: "50px",
      }}
    >
      {/* Main Icon */}
      <div
        style={{
          fontSize: 100,
          marginBottom: 30,
        }}
      >
        🚇
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 16,
          lineHeight: 1.1,
        }}
      >
        Metro Station Finder
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 32,
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
          fontSize: 20,
          fontWeight: "bold",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          padding: "10px 20px",
          borderRadius: "10px",
          marginTop: 30,
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
