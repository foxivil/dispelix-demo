"use client";

import { type CSSProperties } from "react";
import {
  SCREEN_IDS,
  useTheme,
  type ScreenId,
} from "../theme/ThemeProvider";
import { type Palette, type TokenName } from "../theme/colors";

const APP_WIDTH = 580;
const APP_HEIGHT = 540;

const SLIDER_MIN = 0;
const SLIDER_MAX = 1;
const SLIDER_STEP = 0.01;

type Channel = "r" | "g" | "b";

const CHANNEL_LABELS: Record<Channel, string> = {
  r: "Red",
  g: "Green",
  b: "Blue",
};

const SCREEN_LABELS: Record<ScreenId, string> = {
  left: "Left screen",
  right: "Right screen",
};

// Reference primaries shown above the sliders. Each Settings instance
// renders these against *its own* screen's palette (the scope palette), so
// the operator can see at a glance that adjusting one screen only affects
// that screen — the other screen's swatches stay still.
const REFERENCE_SWATCHES: ReadonlyArray<{
  token: TokenName;
  label: string;
}> = [
  { token: "white", label: "White" },
  { token: "refBlue", label: "Blue" },
  { token: "refGreen", label: "Green" },
  { token: "refRed", label: "Red" },
];

export default function Settings() {
  const {
    palette: { c },
    screen: scopeScreen,
    adjusts,
    selectedScreen,
    setSelectedScreen,
    setAdjust,
    resetAdjust,
  } = useTheme();

  // Sliders edit whichever screen the toggle has selected. The toggle is a
  // global piece of state, so picking "Right" on either screen's Settings
  // page sends both copies of the UI into right-screen edit mode.
  const adjust = adjusts[selectedScreen];

  const update = (channel: Channel, value: number) =>
    setAdjust(selectedScreen, { ...adjust, [channel]: value });

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
          padding: "0 4px 10px",
          fontSize: "13px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c("white", 0.7),
        }}
      >
        <span>Settings · Colors</span>
        <span style={{ color: c("white", 0.45), fontSize: "11px" }}>
          You are on the {SCREEN_LABELS[scopeScreen].toLowerCase()}
        </span>
      </div>

      <div
        style={{
          width: `${APP_WIDTH}px`,
          height: `${APP_HEIGHT}px`,
          borderRadius: "20px",
          overflow: "hidden",
          background: c("black"),
          border: `1px solid ${c("white", 0.1)}`,
          boxShadow: `inset 0 0 0 1px ${c("white", 0.04)}, 0 18px 48px ${c("black", 0.55)}`,
          padding: "20px 24px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <ScreenPicker value={selectedScreen} onChange={setSelectedScreen} />

        <ReferenceRow swatches={REFERENCE_SWATCHES} />

        <div
          style={{
            height: "1px",
            background: c("white", 0.08),
            flexShrink: 0,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: c("white", 0.55),
          }}
        >
          <span>Editing · {SCREEN_LABELS[selectedScreen]}</span>
          <button
            type="button"
            onClick={() => resetAdjust(selectedScreen)}
            style={{
              fontSize: "11px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "5px 12px",
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
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {(["r", "g", "b"] as Channel[]).map((ch) => (
            <ChannelSlider
              key={ch}
              channel={ch}
              value={adjust[ch]}
              onChange={(v) => update(ch, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenPicker({
  value,
  onChange,
}: {
  value: ScreenId;
  onChange: (next: ScreenId) => void;
}) {
  const {
    palette: { c },
    palettes,
  } = useTheme();
  return (
    <div
      role="tablist"
      aria-label="Choose screen to edit"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${SCREEN_IDS.length}, 1fr)`,
        gap: "8px",
        padding: "4px",
        borderRadius: "12px",
        background: c("white", 0.04),
        border: `1px solid ${c("white", 0.08)}`,
        flexShrink: 0,
      }}
    >
      {SCREEN_IDS.map((screen) => {
        const selected = screen === value;
        // Per-screen accent built from each screen's own palette so that the
        // tabs themselves visualise that the two palettes are independent.
        const accent = palettes[screen].c("red");
        return (
          <button
            key={screen}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(screen)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "9px",
              border: selected
                ? `1px solid ${c("white", 0.28)}`
                : "1px solid transparent",
              background: selected ? c("white", 0.1) : "transparent",
              color: c("white", selected ? 1 : 0.65),
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "13px",
              letterSpacing: "0.02em",
              fontWeight: selected ? 600 : 400,
              transition:
                "background 140ms ease, color 140ms ease, border-color 140ms ease",
            }}
          >
            <span
              aria-hidden
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background: accent,
                boxShadow: `0 0 6px ${accent}`,
                flexShrink: 0,
              }}
            />
            {SCREEN_LABELS[screen]}
          </button>
        );
      })}
    </div>
  );
}

function ReferenceRow({
  swatches,
}: {
  swatches: ReadonlyArray<{ token: TokenName; label: string }>;
}) {
  const {
    palette,
    palette: { c },
    screen,
  } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c("white", 0.5),
        }}
      >
        <span>Reference · {SCREEN_LABELS[screen]}</span>
        <span style={{ color: c("white", 0.35) }}>actual output</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${swatches.length}, 1fr)`,
          gap: "10px",
        }}
      >
        {swatches.map(({ token, label }) => (
          <ReferenceSwatch
            key={token}
            token={token}
            label={label}
            palette={palette}
          />
        ))}
      </div>
    </div>
  );
}

function ReferenceSwatch({
  token,
  label,
  palette,
}: {
  token: TokenName;
  label: string;
  palette: Palette;
}) {
  const {
    palette: { c },
  } = useTheme();
  // Always show the *scope* palette's value, not the selected screen's, so
  // that each physical screen's Settings page mirrors what that screen is
  // actually outputting. This makes the per-screen separation obvious.
  const [r, g, b] = palette.raw[token];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: "6px",
      }}
    >
      <div
        style={{
          height: "44px",
          borderRadius: "10px",
          background: palette.c(token),
          border: `1px solid ${c("white", 0.12)}`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1px",
        }}
      >
        <span style={{ fontSize: "12px", color: c("white", 0.85) }}>
          {label}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: c("white", 0.45),
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {r}, {g}, {b}
        </span>
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
  // Pure-colour pip per channel so the slider's identity is unambiguous
  // regardless of the current adjustment values.
  const swatch =
    channel === "r"
      ? "rgb(255, 80, 80)"
      : channel === "g"
        ? "rgb(80, 220, 120)"
        : "rgb(80, 140, 255)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "13px",
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
            fontSize: "12px",
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
            height: "22px",
            accentColor: swatch,
            cursor: "pointer",
          } satisfies CSSProperties
        }
      />
    </div>
  );
}
