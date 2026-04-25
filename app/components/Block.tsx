"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useTheme } from "../theme/ThemeProvider";

export const SCREEN_SIZE = 100;
const KEY_STEP = 4;
const KEY_STEP_FAST = 32;

export type Position = { x: number; y: number };

// Calibration starts in the bottom-right corner of the block by default.
export const defaultCalibrationPos = (
  width: number,
  height: number,
): Position => ({
  x: width - SCREEN_SIZE / 2,
  y: height - SCREEN_SIZE / 2,
});

export type BlockHandle = {
  focus: () => void;
};

type Props = {
  width: number;
  height: number;
  enabled?: boolean;
  onPositionChange?: (pos: Position) => void;
  // The "app content" rendered at the calibrated position. Block is now
  // content-agnostic: parent decides what to put here (calibration marker,
  // messenger, placeholder, etc.).
  children?: ReactNode;
};

const Block = forwardRef<BlockHandle, Props>(function Block(
  { width, height, enabled = true, onPositionChange, children },
  ref,
) {
  const {
    palette: { c },
  } = useTheme();
  const blockRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState<Position>(() =>
    defaultCalibrationPos(width, height),
  );
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    onPositionChange?.(pos);
  }, [pos, onPositionChange]);

  const clamp = (x: number, y: number) => ({
    x: Math.max(SCREEN_SIZE / 2, Math.min(width - SCREEN_SIZE / 2, x)),
    y: Math.max(SCREEN_SIZE / 2, Math.min(height - SCREEN_SIZE / 2, y)),
  });

  useImperativeHandle(ref, () => ({
    focus: () => blockRef.current?.focus(),
  }));

  const localCoords = (clientX: number, clientY: number) => {
    const rect = blockRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !blockRef.current) return;
    const { x: cx, y: cy } = localCoords(e.clientX, e.clientY);
    const onScreen =
      Math.abs(cx - pos.x) <= SCREEN_SIZE / 2 &&
      Math.abs(cy - pos.y) <= SCREEN_SIZE / 2;
    // grabbing the square preserves the grip point; clicking empty space centers on cursor
    dragOffset.current = onScreen
      ? { x: cx - pos.x, y: cy - pos.y }
      : { x: 0, y: 0 };
    setPos(clamp(cx - dragOffset.current.x, cy - dragOffset.current.y));
    setDragging(true);
    blockRef.current.setPointerCapture(e.pointerId);
    blockRef.current.focus();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !dragging) return;
    const { x: cx, y: cy } = localCoords(e.clientX, e.clientY);
    setPos(clamp(cx - dragOffset.current.x, cy - dragOffset.current.y));
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    dragOffset.current = { x: 0, y: 0 };
    blockRef.current?.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const step = e.shiftKey ? KEY_STEP_FAST : KEY_STEP;
    let dx = 0;
    let dy = 0;
    switch (e.key) {
      case "ArrowLeft":
        dx = -step;
        break;
      case "ArrowRight":
        dx = step;
        break;
      case "ArrowUp":
        dy = -step;
        break;
      case "ArrowDown":
        dy = step;
        break;
      case "Home":
        setPos(clamp(width / 2, height / 2));
        e.preventDefault();
        return;
      default:
        return;
    }
    e.preventDefault();
    setPos((p) => clamp(p.x + dx, p.y + dy));
  };

  const cursor = !enabled ? "default" : dragging ? "grabbing" : "grab";
  const outline =
    enabled && focused ? `1px solid ${c("white", 0.18)}` : "none";

  return (
    <div
      ref={blockRef}
      tabIndex={enabled ? 0 : -1}
      role="application"
      aria-label="Screen position controller"
      aria-disabled={!enabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
        overflow: "hidden",
        cursor,
        userSelect: enabled ? "none" : "auto",
        touchAction: enabled ? "none" : "auto",
        outline,
        outlineOffset: "-1px",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          // translate(-50%, -50%) keeps any-sized child centered on (pos.x, pos.y)
          transform: "translate(-50%, -50%)",
          transition: dragging
            ? "none"
            : "left 180ms cubic-bezier(0.22, 1, 0.36, 1), top 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "left, top",
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default Block;
