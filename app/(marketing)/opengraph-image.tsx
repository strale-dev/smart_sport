import { ImageResponse } from "next/og";

import { BRAND, landingCopy } from "@/lib/marketing/copy";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#0A0B0F",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#F5F7FA",
            letterSpacing: "-0.02em",
          }}
        >
          {BRAND.name}
        </span>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#00E5A0",
          }}
        />
      </div>
      <p style={{ fontSize: 36, color: "#00E5A0", marginBottom: 32 }}>
        {BRAND.tagline}
      </p>
      <p
        style={{
          fontSize: 24,
          color: "#8B94A8",
          maxWidth: 900,
          lineHeight: 1.4,
        }}
      >
        {landingCopy.hero.subheadline.slice(0, 120)}…
      </p>
    </div>,
    { ...size }
  );
}
