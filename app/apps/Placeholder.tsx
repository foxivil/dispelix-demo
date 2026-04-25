"use client";

import { useTheme } from "../theme/ThemeProvider";

type PlaceholderProps = {
  emoji: string;
  title: string;
  hint?: string;
};

// Generic "coming soon" panel for apps that don't have real content yet.
// Sized to roughly match the messenger app so the dock-driven view stays
// visually consistent when switching between apps.
export default function Placeholder({
  emoji,
  title,
  hint = "Coming soon",
}: PlaceholderProps) {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      style={{
        width: "520px",
        minWidth: "520px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        textAlign: "center",
        color: c("white"),
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={{ fontSize: "72px", lineHeight: 1 }} aria-hidden>
        {emoji}
      </div>
      <div
        style={{
          fontSize: "26px",
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "14px",
          color: c("white", 0.6),
        }}
      >
        {hint}
      </div>
    </div>
  );
}
