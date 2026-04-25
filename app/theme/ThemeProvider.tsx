"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildPalette,
  DEFAULT_ADJUST,
  type ColorAdjust,
  type Palette,
} from "./colors";

// The two physical screens that make up the dual-column stage. Each one has
// its own colour adjustment so the operator can compensate for a different
// projector / panel.
export type ScreenId = "left" | "right";
export const SCREEN_IDS: readonly ScreenId[] = ["left", "right"];

type Adjusts = Record<ScreenId, ColorAdjust>;
type Palettes = Record<ScreenId, Palette>;

type ThemeContextValue = {
  adjusts: Adjusts;
  palettes: Palettes;
  // Which screen the Settings UI is currently editing. Lifted here so that
  // both mirrored Settings instances stay in sync.
  selectedScreen: ScreenId;
  setSelectedScreen: (s: ScreenId) => void;
  setAdjust: (screen: ScreenId, next: ColorAdjust) => void;
  resetAdjust: (screen: ScreenId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
// Default scope is "left" so any component rendered outside an explicit
// <ScreenScope> still gets a valid palette (e.g. during tests / Storybook).
const ScreenScopeContext = createContext<ScreenId>("left");

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [adjusts, setAdjusts] = useState<Adjusts>({
    left: DEFAULT_ADJUST,
    right: DEFAULT_ADJUST,
  });
  const [selectedScreen, setSelectedScreen] = useState<ScreenId>("left");

  const palettes = useMemo<Palettes>(
    () => ({
      left: buildPalette(adjusts.left),
      right: buildPalette(adjusts.right),
    }),
    [adjusts],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      adjusts,
      palettes,
      selectedScreen,
      setSelectedScreen,
      setAdjust: (screen, next) =>
        setAdjusts((prev) => ({ ...prev, [screen]: next })),
      resetAdjust: (screen) =>
        setAdjusts((prev) => ({ ...prev, [screen]: DEFAULT_ADJUST })),
    }),
    [adjusts, palettes, selectedScreen],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Wrap a subtree to bind every `useTheme()` call inside it to a specific
// screen's palette. ScreenScope produces no DOM of its own.
export function ScreenScope({
  screen,
  children,
}: {
  screen: ScreenId;
  children: ReactNode;
}) {
  return (
    <ScreenScopeContext.Provider value={screen}>
      {children}
    </ScreenScopeContext.Provider>
  );
}

export type ThemeApi = {
  // Current scope's palette + screen id — what regular components consume.
  screen: ScreenId;
  palette: Palette;
  // Global theme controls — everything below is the same value regardless of
  // which scope you're inside, so the Settings UI can edit either screen.
  adjusts: Adjusts;
  palettes: Palettes;
  selectedScreen: ScreenId;
  setSelectedScreen: (s: ScreenId) => void;
  setAdjust: (screen: ScreenId, next: ColorAdjust) => void;
  resetAdjust: (screen: ScreenId) => void;
};

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  const screen = useContext(ScreenScopeContext);
  return {
    screen,
    palette: ctx.palettes[screen],
    adjusts: ctx.adjusts,
    palettes: ctx.palettes,
    selectedScreen: ctx.selectedScreen,
    setSelectedScreen: ctx.setSelectedScreen,
    setAdjust: ctx.setAdjust,
    resetAdjust: ctx.resetAdjust,
  };
}
