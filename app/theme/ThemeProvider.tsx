"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildPalette,
  DEFAULT_ADJUST,
  type ColorAdjust,
  type Palette,
  type TokenName,
} from "./colors";

type ThemeContextValue = {
  palette: Palette;
  adjust: ColorAdjust;
  setAdjust: (next: ColorAdjust) => void;
  resetAdjust: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Tokens that need to be reachable from plain CSS (globals.css) — published
// as CSS custom properties whenever the theme is rebuilt. Inline styles in
// React components keep using palette.c() directly.
const CSS_VAR_TOKENS: ReadonlyArray<{
  token: TokenName;
  alpha: number;
  varName: string;
}> = [
  { token: "white", alpha: 0.75, varName: "--color-typing-dot" },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [adjust, setAdjust] = useState<ColorAdjust>(DEFAULT_ADJUST);
  // Recomputing the palette on every render is cheap (a dozen channel mults)
  // but doing it via useMemo means consumers see referentially stable values
  // when adjust hasn't changed.
  const palette = useMemo(() => buildPalette(adjust), [adjust]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    CSS_VAR_TOKENS.forEach(({ token, alpha, varName }) => {
      root.style.setProperty(varName, palette.c(token, alpha));
    });
  }, [palette]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      palette,
      adjust,
      setAdjust,
      resetAdjust: () => setAdjust(DEFAULT_ADJUST),
    }),
    [palette, adjust],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const v = useContext(ThemeContext);
  if (!v) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return v;
}
