import { ImageResponse } from "next/og";

// Default share image for links to itaager.com (WhatsApp, Facebook, X, Google).
export const alt = "Itaager — Support Somali creators with EVC Plus";
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
          padding: "80px",
          background: "linear-gradient(160deg, #eef5fd 0%, #ffffff 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#191919", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
            ☕
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#37352f" }}>Itaager</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 76, fontWeight: 800, color: "#37352f", lineHeight: 1.05, display: "flex", flexWrap: "wrap" }}>
          Support the creators&nbsp;<span style={{ color: "#4189dd" }}>you love</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 32, color: "#6b6a66" }}>
          Somali creators get supported by their audience with EVC Plus.
        </div>
        <div style={{ marginTop: 40, fontSize: 28, color: "#4189dd", fontWeight: 600 }}>itaager.com</div>
      </div>
    ),
    size,
  );
}
