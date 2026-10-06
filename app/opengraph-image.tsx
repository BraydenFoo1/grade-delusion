import { ImageResponse } from "next/og";

export const alt = "Grade Delusion — All students only have delusions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#ffe11a",
          color: "#0b0b0f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 4 }}>WELCOME TO</div>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 900, lineHeight: 1 }}>GRADE</div>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 900,
              lineHeight: 1,
              background: "#0b0b0f",
              color: "#ffe11a",
              padding: "6px 24px",
              transform: "rotate(-2deg)",
            }}
          >
            DELUSION™
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 44, fontWeight: 700, color: "#ff2d87" }}>
          “All students only have delusions.”
        </div>
      </div>
    ),
    size,
  );
}
