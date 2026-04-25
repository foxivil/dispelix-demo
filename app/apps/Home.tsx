"use client";

import { type CSSProperties } from "react";
import { useTheme } from "../theme/ThemeProvider";

const APP_WIDTH = 600;
const APP_HEIGHT = 540;

type HomeCard = {
  label: string;
  title: string;
  body: string;
  hint?: string;
};

export const HOME_CARDS: ReadonlyArray<HomeCard> = [
  {
    label: "Intro",
    title: "Welcome to the demo",
    body: "This is a 2560 × 720 dual-screen AR glasses demo. The same app state is shared across the left and right screens, so actions on one side stay synchronized with the other.",
    hint: "Use the arrows below or your keyboard's ← → to take the tour.",
  },
  {
    label: "Dock",
    title: "Switch apps from the dock",
    body: "Move your mouse near the bottom of either screen and the dock fades in. Select any icon to open that app on both screens at once.",
  },
  {
    label: "Alignment",
    title: "Calibrate screen alignment",
    body: "Select Calibrate at the bottom-left. Drag the marker, click anywhere, or use the arrow keys to tune the left screen position. The system then splits the correction across both screens for better average alignment.",
    hint: "Press Esc to exit calibration.",
  },
  {
    label: "Stereo",
    title: "Dual-screen offset correction",
    body: "After calibration, the left and right screens receive opposite offsets so the two views line up more naturally in the glasses. The dock follows the same offsets so it stays aligned with the app content.",
  },
  {
    label: "Messages",
    title: "Chat with voice input",
    body: "Open Messages to chat with the bot. Select the mic to dictate by voice. Selecting Send commits the current transcript, clears the input, and stops the recording session.",
  },
  {
    label: "Camera",
    title: "Glasses camera capture",
    body: "The Photos app keeps the AR-style black viewfinder. It does not show a live preview, because the camera is treated as part of the glasses rather than as a normal laptop webcam.",
  },
  {
    label: "Capture",
    title: "Take photos and record video",
    body: "Single-click the black viewfinder to capture a photo from the glasses camera feed. Double-click to start recording video, then click once while recording to stop.",
    hint: "For this demo, C922 Pro Stream Web Cam is used as the glasses camera input.",
  },
  {
    label: "Input",
    title: "Camera input override",
    body: "The demo automatically uses the C922 Pro Stream Web Cam as the glasses camera when it is connected. A hidden camera selector is available in the top-left hot zone only for setup or troubleshooting.",
  },
  {
    label: "Files",
    title: "Browse your captures",
    body: "Files lists captured photos and videos. Select a thumbnail to open the viewer; arrows or the on-screen buttons jump between files; Esc closes the overlay.",
  },
  {
    label: "Search",
    title: "ARsearcher",
    body: "Type a query and the demo's result list filters live as you type. Both screens always show the same query.",
  },
  {
    label: "Music",
    title: "Music controls",
    body: "Play, pause, scrub, and adjust the volume. Drag the scrubber on either side and watch the other screen's slider follow in real time.",
  },
  {
    label: "Colour",
    title: "Per-screen colour palettes",
    body: "Open Settings, pick the screen you want to retune, then drag the R / G / B sliders. This helps compensate for colour shifts in the glasses, such as an overly green display.",
  },
  {
    label: "Done",
    title: "You're all set",
    body: "That's the whole tour. Explore the dock at the bottom, and return here any time by selecting the Home icon.",
  },
];

export const HOME_CARD_COUNT = HOME_CARDS.length;

export type HomeProps = {
  cardIndex?: number;
  onCardIndexChange?: (next: number) => void;
};

type IconProps = {
  size?: number;
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
          boxShadow: `inset 0 0 0 1px ${c(
            "white",
            0.04,
          )}, 0 18px 48px ${c("black", 0.55)}`,
          borderRadius: "20px",
          padding: "24px 28px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <Header index={safeIndex} total={HOME_CARD_COUNT} />

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
          <IconBadge label={card.label} />

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

function IconBadge({ label }: { label: string }) {
  const {
    palette: { c },
  } = useTheme();

  const Icon = iconForLabel(label);

  return (
    <div
      aria-hidden
      title={label}
      style={{
        width: "112px",
        height: "96px",
        borderRadius: "999px",
        background: `radial-gradient(circle at 50% 35%, ${c(
          "white",
          0.13,
        )}, ${c("white", 0.045)} 62%, ${c("white", 0.025)} 100%)`,
        border: `1px solid ${c("white", 0.14)}`,
        boxShadow: `inset 0 0 0 6px ${c("white", 0.03)}, 0 16px 36px ${c(
          "black",
          0.28,
        )}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: c("white", 0.92),
        flexShrink: 0,
      }}
    >
      <Icon size={42} />
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

function iconForLabel(label: string) {
  switch (label) {
    case "Intro":
      return IntroIcon;
    case "Dock":
      return DockIcon;
    case "Alignment":
      return AlignmentIcon;
    case "Stereo":
      return StereoIcon;
    case "Messages":
      return MessagesIcon;
    case "Camera":
      return CameraIcon;
    case "Capture":
      return CaptureIcon;
    case "Input":
      return InputIcon;
    case "Files":
      return FilesIcon;
    case "Search":
      return SearchIcon;
    case "Music":
      return MusicIcon;
    case "Colour":
      return ColourIcon;
    case "Done":
      return DoneIcon;
    default:
      return IntroIcon;
  }
}

function IntroIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.8"
        y="5"
        width="16.4"
        height="12.5"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 20h8M12 17.5V20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8.5 10.5h7M8.5 13.2h4.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DockIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="14.2"
        width="16"
        height="5"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect x="6.5" y="7" width="3.2" height="3.2" rx="0.8" fill="currentColor" />
      <rect x="10.4" y="5.5" width="3.2" height="3.2" rx="0.8" fill="currentColor" />
      <rect x="14.3" y="7" width="3.2" height="3.2" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function AlignmentIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v16M4 12h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="7.5"
        y="7.5"
        width="9"
        height="9"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 5.5 4 4m14.5 1.5L20 4M5.5 18.5 4 20m14.5-1.5L20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StereoIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="7"
        width="7"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="13.5"
        y="7"
        width="7"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10.5 12h3M7 12h.01M17 12h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MessagesIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 6.5h13a2 2 0 0 1 2 2v6.7a2 2 0 0 1-2 2H10l-4.5 3v-3a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 10.5h8M8 13.8h5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 8.2A2.2 2.2 0 0 1 6.7 6h2l1.2-1.6h4.2L15.3 6h2a2.2 2.2 0 0 1 2.2 2.2v8.1a2.2 2.2 0 0 1-2.2 2.2H6.7a2.2 2.2 0 0 1-2.2-2.2V8.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.3" r="3.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CaptureIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" />
      <path
        d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InputIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="5.5"
        width="16"
        height="13"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 9.2h8M8 12h5.5M8 14.8h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17.2" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}

function FilesIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 7.5A2.5 2.5 0 0 1 7 5h3.2l1.9 2H17a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 19H7a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4.8 9.2h14.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.8" cy="10.8" r="5.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MusicIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 17.4V6.8l9-1.8v10.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.8" cy="17.4" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15.8" cy="15.6" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ColourIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 4.5v15M4.5 12h15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.75"
      />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

function DoneIcon({ size = 42 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8.2 12.2 2.5 2.6 5.2-5.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}