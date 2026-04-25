"use client";

import { useState } from "react";
import { APPS, type AppId } from "../apps/registry";
import { useTheme } from "../theme/ThemeProvider";

type DockProps = {
  active: boolean;
  containerLeft: number;
  containerWidth: number;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  activeApp?: AppId | null;
  onOpen?: (id: AppId) => void;
};

const ICON_SIZE = 52;
const ICON_GAP = 8;
const PAD_X = 16;
const PAD_Y = 10;

export default function Dock({
  active,
  containerLeft,
  containerWidth,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
  activeApp = null,
  onOpen,
}: DockProps) {
  const {
    palette: { c },
  } = useTheme();

  const [hoveredId, setHoveredId] = useState<AppId | null>(null);

  return (
    <div
      aria-hidden={!active}
      style={{
        position: "absolute",
        bottom: "16px",
        left: `${containerLeft + containerWidth / 2}px`,
        transform: `translate(${offsetX}px, ${offsetY}px) translateX(-50%) translateY(${
          active ? 0 : 30
        }px)`,
        transformOrigin: "center bottom",
        opacity: active ? 1 : 0,
        transition:
          "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease",
        pointerEvents: active ? "auto" : "none",
        zIndex: 20,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center bottom",
          display: "flex",
          alignItems: "flex-end",
          gap: `${ICON_GAP}px`,
          padding: `${PAD_Y}px ${PAD_X}px`,
          background: c("dockGray", 0.55),
          border: `1px solid ${c("white", 0.18)}`,
          borderRadius: "22px",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          boxShadow: `0 12px 40px ${c("black", 0.45)}, inset 0 1px 0 ${c(
            "white",
            0.08,
          )}`,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          userSelect: "none",
        }}
      >
        {APPS.map((app) => {
          const isHovered = hoveredId === app.id;
          const isActive = activeApp === app.id;

          return (
            <button
              key={app.id}
              type="button"
              title={app.label}
              aria-label={app.label}
              aria-pressed={isActive}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onOpen?.(app.id)}
              onMouseEnter={() => setHoveredId(app.id)}
              onMouseLeave={() =>
                setHoveredId((curr) => (curr === app.id ? null : curr))
              }
              style={{
                position: "relative",
                width: `${ICON_SIZE}px`,
                height: `${ICON_SIZE}px`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: `${ICON_SIZE * 0.55}px`,
                lineHeight: 1,
                borderRadius: "13px",
                background:
                  isHovered || isActive
                    ? `linear-gradient(180deg, ${c("white", 0.28)}, ${c(
                        "white",
                        0.1,
                      )})`
                    : `linear-gradient(180deg, ${c("white", 0.18)}, ${c(
                        "white",
                        0.04,
                      )})`,
                border: `1px solid ${c(
                  "white",
                  isHovered || isActive ? 0.32 : 0.18,
                )}`,
                color: c("white"),
                cursor: "pointer",
                transition: "background 140ms ease, border-color 140ms ease",
                flexShrink: 0,
                fontFamily: "inherit",
                padding: 0,
                userSelect: "none",
              }}
            >
              <span aria-hidden>{app.emoji}</span>

              {isActive && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    bottom: "-6px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    borderRadius: "999px",
                    background: c("white", 0.85),
                    boxShadow: `0 0 6px ${c("white", 0.5)}`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}