"use client";

import { type CSSProperties } from "react";
import { useTheme } from "../theme/ThemeProvider";

const APP_WIDTH = 600;
const APP_HEIGHT = 540;

type HomeCard = {
  emoji: string;
  title: string;
  body: string;
  hint?: string;
};

// Source of truth for the tour cards. Add or reorder entries here and the
// dot indicator + Stage's keyboard navigation pick up the new count
// automatically (via HOME_CARD_COUNT below).
export const HOME_CARDS: ReadonlyArray<HomeCard> = [
  {
    emoji: "👋",
    title: "Welcome to the demo",
    body: "This is a 2560 × 720 dual-screen experience. Everything you do mirrors across both sides — try anything on either screen and watch the other follow.",
    hint: "Use the arrows below or your keyboard's ← → to take the tour.",
  },
  {
    emoji: "🧭",
    title: "Switch apps from the dock",
    body: "Move your mouse near the bottom of either screen and the dock fades in. Tap any icon to open that app on both screens at once.",
  },
  {
    emoji: "🎯",
    title: "Calibrate the left screen",
    body: "Tap Calibrate at the bottom-left. Drag the marker, click anywhere, or use the arrow keys to nudge the left screen's content. Press Esc when you're done.",
  },
  {
    emoji: "💬",
    title: "Chat with voice input",
    body: "Open Messages to chat with the bot. Tap the mic to dictate by voice — clicking Send commits whatever was transcribed and stops the recording.",
  },
  {
    emoji: "📷",
    title: "Snap photos & video",
    body: "Single-click anywhere on the viewfinder to take a photo. Double-click to start or stop a video recording — the timer is shared across both screens.",
  },
  {
    emoji: "📁",
    title: "Browse your captures",
    body: "Files lists every photo and video. Click a thumbnail to open the viewer; arrows or the on-screen buttons jump between files; Esc closes the overlay.",
  },
  {
    emoji: "🔍",
    title: "ARsearcher",
    body: "Type a query and the demo's result list filters live as you type. Both screens always show the same query.",
  },
  {
    emoji: "🎵",
    title: "Music in stereo… of screens",
    body: "Play, pause, scrub, and adjust the volume. Drag the scrubber on either side and watch the other screen's slider follow in real time.",
  },
  {
    emoji: "⚙️",
    title: "Per-screen colour palettes",
    body: "Open Settings, pick the screen you want to retune, then drag the R / G / B sliders. The reference swatches show the actual output of that screen.",
  },
  {
    emoji: "🚀",
    title: "You're all set!",
    body: "That's the whole tour. Explore the dock at the bottom — and pop back here any time by tapping the 🏠 icon.",
  },
];

export const HOME_CARD_COUNT = HOME_CARDS.length;

export type HomeProps = {
  cardIndex?: number;
  onCardIndexChange?: (next: number) => void;
};

export default function Home({
  cardIndex = 0,
  onCardIndexChange,
}: HomeProps) {
  const {
    palette: { c },
  } = useTheme();
  const safeIndex = clamp(cardIndex, 0, HOME_CARD_COUNT - 1);
  const card = HOME_CARDS[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === HOME_CARD_COUNT - 1;

  const goTo = (next: number) =>
    onCardIndexChange?.(clamp(next, 0, HOME_CARD_COUNT - 1));

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
          width: `${APP_WIDTH}px`,
          height: `${APP_HEIGHT}px`,
          background: c("black"),
          border: `1px solid ${c("white", 0.1)}`,
          boxShadow: `inset 0 0 0 1px ${c("white", 0.04)}, 0 18px 48px ${c("black", 0.55)}`,
          borderRadius: "20px",
          padding: "24px 28px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <Header index={safeIndex} total={HOME_CARD_COUNT} />

        {/* Card content. The `key` swap retriggers the fade-in animation
            whenever the user navigates so the transition feels alive. */}
        <div
          key={safeIndex}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            textAlign: "center",
            padding: "0 12px",
            animation: "home-card-enter 240ms ease both",
          }}
        >
          <EmojiBadge emoji={card.emoji} />
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            {card.title}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: 1.55,
              color: c("white", 0.78),
              maxWidth: "440px",
            }}
          >
            {card.body}
          </p>
          {card.hint && (
            <div
              style={{
                marginTop: "4px",
                padding: "8px 14px",
                borderRadius: "999px",
                fontSize: "12px",
                color: c("white", 0.7),
                background: c("white", 0.05),
                border: `1px solid ${c("white", 0.12)}`,
              }}
            >
              {card.hint}
            </div>
          )}
        </div>

        <Dots
          total={HOME_CARD_COUNT}
          index={safeIndex}
          onSelect={(i) => goTo(i)}
        />

        <NavRow
          isFirst={isFirst}
          isLast={isLast}
          onPrev={() => goTo(safeIndex - 1)}
          onNext={() => goTo(safeIndex + 1)}
        />
      </div>
    </div>
  );
}

function Header({ index, total }: { index: number; total: number }) {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        fontSize: "11px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: c("white", 0.55),
      }}
    >
      <span>Home · Quick tour</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {index + 1} / {total}
      </span>
    </div>
  );
}

function EmojiBadge({ emoji }: { emoji: string }) {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      aria-hidden
      style={{
        width: "96px",
        height: "96px",
        borderRadius: "999px",
        background: c("white", 0.06),
        border: `1px solid ${c("white", 0.12)}`,
        boxShadow: `inset 0 0 0 6px ${c("white", 0.03)}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "52px",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {emoji}
    </div>
  );
}

function Dots({
  total,
  index,
  onSelect,
}: {
  total: number;
  index: number;
  onSelect: (i: number) => void;
}) {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      role="tablist"
      aria-label="Tour progress"
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`Go to card ${i + 1}`}
            onClick={() => onSelect(i)}
            style={{
              width: active ? "20px" : "8px",
              height: "8px",
              padding: 0,
              borderRadius: "999px",
              border: "none",
              background: active ? c("white", 0.85) : c("white", 0.18),
              cursor: "pointer",
              transition:
                "width 200ms ease, background 200ms ease, opacity 200ms ease",
            }}
          />
        );
      })}
    </div>
  );
}

function NavRow({
  isFirst,
  isLast,
  onPrev,
  onNext,
}: {
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        flexShrink: 0,
      }}
    >
      <NavButton
        direction="prev"
        disabled={isFirst}
        onClick={onPrev}
        label="Previous"
      />
      <NavButton
        direction="next"
        disabled={isLast}
        onClick={onNext}
        label="Next"
      />
    </div>
  );
}

function NavButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  const {
    palette: { c },
  } = useTheme();
  const arrow = direction === "prev" ? "←" : "→";
  const style: CSSProperties = {
    flex: 1,
    height: "44px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    borderRadius: "12px",
    border: `1px solid ${c("white", disabled ? 0.08 : 0.18)}`,
    background: disabled ? c("white", 0.02) : c("white", 0.06),
    color: c("white", disabled ? 0.3 : 1),
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.01em",
    cursor: disabled ? "default" : "pointer",
    transition: "background 140ms ease, border-color 140ms ease",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={style}
    >
      {direction === "prev" ? (
        <>
          <span aria-hidden>{arrow}</span>
          {label}
        </>
      ) : (
        <>
          {label}
          <span aria-hidden>{arrow}</span>
        </>
      )}
    </button>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
