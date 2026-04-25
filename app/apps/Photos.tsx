"use client";

import { type CSSProperties } from "react";
import { useTheme } from "../theme/ThemeProvider";

const FRAME_WIDTH = 1120;
const FRAME_HEIGHT = 640;

export type PhotosToast = {
  id: number;
  text: string;
};

export type PhotosProps = {
  recording: boolean;
  recordingMs: number;
  toast: PhotosToast | null;
  // Animation duration for the toast (must match the timer that dismisses it
  // in Stage so the CSS fade-in/out is in sync with state cleanup).
  toastDurationMs?: number;
  onClick: () => void;
};

export const formatDuration = (totalMs: number): string => {
  const totalSeconds = Math.floor(totalMs / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function GridOverlay() {
  const {
    palette: { c },
  } = useTheme();
  const lineStyle: CSSProperties = {
    position: "absolute",
    background: c("white", 0.3),
  };
  // Edge-to-edge so the grid lines connect to the outer border.
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <span
        style={{
          ...lineStyle,
          top: 0,
          bottom: 0,
          left: "33.333%",
          width: "1px",
        }}
      />
      <span
        style={{
          ...lineStyle,
          top: 0,
          bottom: 0,
          left: "66.666%",
          width: "1px",
        }}
      />
      <span
        style={{
          ...lineStyle,
          left: 0,
          right: 0,
          top: "33.333%",
          height: "1px",
        }}
      />
      <span
        style={{
          ...lineStyle,
          left: 0,
          right: 0,
          top: "66.666%",
          height: "1px",
        }}
      />
    </div>
  );
}

export default function Photos({
  recording,
  recordingMs,
  toast,
  toastDurationMs = 2000,
  onClick,
}: PhotosProps) {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      style={{
        width: `${FRAME_WIDTH}px`,
        minWidth: `${FRAME_WIDTH}px`,
        flexShrink: 0,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: c("white"),
      }}
    >
      <div
        onClick={onClick}
        style={{
          position: "relative",
          width: `${FRAME_WIDTH}px`,
          height: `${FRAME_HEIGHT}px`,
          borderRadius: "28px",
          overflow: "hidden",
          background: c("black"),
          border: `1px solid ${c("white", 0.1)}`,
          boxShadow: `inset 0 0 0 1px ${c("white", 0.04)}, 0 18px 48px ${c("black", 0.55)}`,
          cursor: "crosshair",
          userSelect: "none",
        }}
      >
        <GridOverlay />

        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "28px",
            right: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "18px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: c("white", 0.78),
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "999px",
                background: recording ? c("redHot") : c("white", 0.4),
                boxShadow: recording ? `0 0 16px ${c("redHot", 0.9)}` : "none",
                animation: recording
                  ? "photos-rec-pulse 1.1s infinite ease-in-out"
                  : "none",
              }}
            />
            {recording ? "REC" : "Photo"}
          </div>
          <div
            style={{
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.04em",
              minWidth: "70px",
              textAlign: "right",
            }}
          >
            {recording ? formatDuration(recordingMs) : "Ready"}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "22px",
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: "15px",
            color: c("white", 0.55),
            letterSpacing: "0.06em",
            pointerEvents: "none",
          }}
        >
          {recording
            ? "Tap to stop"
            : "Tap to capture · Double-tap to record"}
        </div>

        {toast && (
          // Outer wrapper handles horizontal centring via flex so the toast
          // pill stays centred regardless of the animation transform inside.
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "70px",
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              key={`toast-${toast.id}`}
              style={{
                padding: "12px 22px",
                borderRadius: "999px",
                background: c("black", 0.7),
                border: `1px solid ${c("white", 0.14)}`,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                fontSize: "18px",
                letterSpacing: "0.01em",
                color: c("white"),
                animation: `photos-toast-fade ${toastDurationMs}ms ease forwards`,
                whiteSpace: "nowrap",
              }}
            >
              {toast.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
