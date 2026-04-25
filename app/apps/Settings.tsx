"use client";

import { type CSSProperties } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { TOKENS, type ColorAdjust, type TokenName } from "../theme/colors";

const APP_WIDTH = 1120;
const APP_HEIGHT = 640;

const SLIDER_MIN = 0;
const SLIDER_MAX = 2;
const SLIDER_STEP = 0.01;

type Channel = "r" | "g" | "b";

const CHANNEL_LABELS: Record<Channel, string> = {
  r: "Red",
  g: "Green",
  b: "Blue",
};

// Tokens to highlight on the Settings page so the user can see how each
// slider affects the rest of the app at a glance.
const PREVIEW_TOKENS: ReadonlyArray<{ token: TokenName; label: string }> = [
  { token: "white", label: "white" },
  { token: "black", label: "black" },
  { token: "red", label: "red" },
  { token: "redDeep", label: "redDeep" },
  { token: "redHot", label: "redHot" },
  { token: "blue", label: "blue" },
  { token: "videoStart", label: "videoStart" },
  { token: "videoEnd", label: "videoEnd" },
  { token: "photoStart", label: "photoStart" },
  { token: "photoEnd", label: "photoEnd" },
  { token: "panelDark", label: "panelDark" },
  { token: "dockGray", label: "dockGray" },
];

export default function Settings() {
  const {
    palette: { c },
    adjust,
    setAdjust,
    resetAdjust,
  } = useTheme();

  const update = (channel: Channel, value: number) =>
    setAdjust({ ...adjust, [channel]: value });

  return (
    <div
      style={{
        width: `${APP_WIDTH}px`,
        minWidth: `${APP_WIDTH}px`,
        flexShrink: 0,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: c("white"),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "0 6px 14px",
          fontSize: "18px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c("white", 0.78),
        }}
      >
        <span>Settings · Colors</span>
        <button
          type="button"
          onClick={resetAdjust}
          style={{
            fontSize: "12px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "6px 14px",
            borderRadius: "999px",
            border: `1px solid ${c("white", 0.18)}`,
            background: c("white", 0.06),
            color: c("white"),
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Reset
        </button>
      </div>

      <div
        style={{
          width: `${APP_WIDTH}px`,
          height: `${APP_HEIGHT}px`,
          borderRadius: "28px",
          overflow: "hidden",
          background: c("black"),
          border: `1px solid ${c("white", 0.1)}`,
          boxShadow: `inset 0 0 0 1px ${c("white", 0.04)}, 0 18px 48px ${c("black", 0.55)}`,
          padding: "32px 36px",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: "32px",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: c("white", 0.55),
              letterSpacing: "0.04em",
            }}
          >
            Adjust the per-channel multiplier applied to every colour token in
            the app. 1.00 = unchanged.
          </div>

          {(["r", "g", "b"] as Channel[]).map((ch) => (
            <ChannelSlider
              key={ch}
              channel={ch}
              value={adjust[ch]}
              onChange={(v) => update(ch, v)}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: c("white", 0.55),
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Live palette
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              borderRadius: "16px",
              background: c("white", 0.03),
              border: `1px solid ${c("white", 0.08)}`,
              padding: "12px",
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px",
              alignContent: "start",
            }}
          >
            {PREVIEW_TOKENS.map(({ token, label }) => (
              <Swatch key={token} token={token} label={label} adjust={adjust} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelSlider({
  channel,
  value,
  onChange,
}: {
  channel: Channel;
  value: number;
  onChange: (value: number) => void;
}) {
  const {
    palette: { c },
  } = useTheme();
  // Per-channel pure-colour swatch so the slider's identity is unambiguous.
  // Always shows the saturated channel regardless of current adjustment.
  const swatch =
    channel === "r"
      ? "rgb(255, 80, 80)"
      : channel === "g"
        ? "rgb(80, 220, 120)"
        : "rgb(80, 140, 255)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "14px",
          color: c("white", 0.85),
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            aria-hidden
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              background: swatch,
              boxShadow: `0 0 8px ${swatch}`,
            }}
          />
          {CHANNEL_LABELS[channel]}
        </span>
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            color: c("white", 0.6),
            fontSize: "13px",
          }}
        >
          ×{value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={SLIDER_STEP}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={
          {
            width: "100%",
            // Enough room for the larger thumb defined below.
            height: "26px",
            // Keep the thumb visually aligned with the per-channel accent.
            accentColor: swatch,
            cursor: "pointer",
          } satisfies CSSProperties
        }
      />
    </div>
  );
}

function Swatch({
  token,
  label,
  adjust,
}: {
  token: TokenName;
  label: string;
  adjust: ColorAdjust;
}) {
  const {
    palette: { c, raw },
  } = useTheme();
  const base = TOKENS[token];
  const adjusted = raw[token];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 8px",
        borderRadius: "10px",
        background: c("white", 0.03),
        border: `1px solid ${c("white", 0.06)}`,
      }}
      title={`${label}\nbase  rgb(${base[0]}, ${base[1]}, ${base[2]})\nadj.  rgb(${adjusted[0]}, ${adjusted[1]}, ${adjusted[2]})\n×R${adjust.r.toFixed(2)} ×G${adjust.g.toFixed(2)} ×B${adjust.b.toFixed(2)}`}
    >
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "8px",
          background: c(token),
          border: `1px solid ${c("white", 0.12)}`,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: c("white", 0.85),
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: c("white", 0.45),
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {adjusted[0]}, {adjusted[1]}, {adjusted[2]}
        </span>
      </div>
    </div>
  );
}
