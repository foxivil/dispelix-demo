"use client";

import { useTheme } from "../theme/ThemeProvider";

// Red square + blue crosshair shown while the user is in calibration mode.
// Colours pulled from the theme so the calibration marker reflects the
// current R/G/B settings.
export default function CalibrationMarker() {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      style={{
        position: "relative",
        width: "100px",
        height: "100px",
        backgroundColor: c("red"),
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "-24px",
          right: "-24px",
          height: "2px",
          marginTop: "-1px",
          background: c("blue"),
          boxShadow: `0 0 4px ${c("blue", 0.9)}`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "-24px",
          bottom: "-24px",
          width: "2px",
          marginLeft: "-1px",
          background: c("blue"),
          boxShadow: `0 0 4px ${c("blue", 0.9)}`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
