// Central colour palette for the demo. Every component is expected to render
// colours through `useTheme().c(token, alpha?)` (or via the `palette` directly)
// so the Settings app can re-channel them with per-channel R/G/B multipliers.
//
// Tokens are kept small and semantic. If you reach for a brand-new literal
// hex/rgba in a component, add a token here instead.

export type ColorAdjust = {
  // Per-channel multiplier applied to every token's RGB. 1.0 = unchanged,
  // 0.0 = drop the channel entirely, 2.0 = double its intensity (clamped at
  // 255). Keep the range modest in the UI to avoid blown-out output.
  r: number;
  g: number;
  b: number;
};

export const DEFAULT_ADJUST: ColorAdjust = { r: 1, g: 1, b: 1 };

export type RGB = readonly [number, number, number];

// Base (un-adjusted) colour values for every named token used in the app.
// All literals previously scattered across components map onto one of these.
export const TOKENS = {
  // Neutrals
  white: [255, 255, 255] as RGB,
  black: [0, 0, 0] as RGB,
  // Surface darks (slightly tinted blacks used for the chat panel and dock).
  panelDark: [20, 20, 20] as RGB,
  dockGray: [28, 28, 30] as RGB,
  // Accents
  red: [255, 80, 80] as RGB, // calibration light, voice-rec border
  redDeep: [220, 38, 38] as RGB, // recording bg + pulse
  redHot: [255, 59, 48] as RGB, // photos REC dot
  blue: [59, 130, 246] as RGB, // chat user bubble + calibration crosshair
  // Thumbnail gradients (start/end pairs)
  videoStart: [67, 56, 202] as RGB, // #4338ca
  videoEnd: [30, 27, 75] as RGB, // #1e1b4b
  photoStart: [15, 118, 110] as RGB, // #0f766e
  photoEnd: [6, 78, 59] as RGB, // #064e3b
  // Pure reference primaries used by the Settings preview swatches so that
  // the effect of each per-channel multiplier is visually unambiguous.
  refRed: [255, 0, 0] as RGB,
  refGreen: [0, 255, 0] as RGB,
  refBlue: [0, 0, 255] as RGB,
} as const;

export type TokenName = keyof typeof TOKENS;

function clampChannel(v: number): number {
  if (v < 0) return 0;
  if (v > 255) return 255;
  return v;
}

export function applyAdjust(rgb: RGB, adjust: ColorAdjust): RGB {
  return [
    Math.round(clampChannel(rgb[0] * adjust.r)),
    Math.round(clampChannel(rgb[1] * adjust.g)),
    Math.round(clampChannel(rgb[2] * adjust.b)),
  ];
}

export function rgbToCss([r, g, b]: RGB, alpha: number = 1): string {
  if (alpha >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type Palette = {
  // Resolved CSS string for a token at the given alpha (default 1).
  c: (token: TokenName, alpha?: number) => string;
  // Raw adjusted RGB tuple, useful when you need the components separately
  // (e.g. building gradients with multiple alphas of the same base).
  raw: Record<TokenName, RGB>;
};

export function buildPalette(adjust: ColorAdjust): Palette {
  const adjusted = {} as Record<TokenName, RGB>;
  (Object.keys(TOKENS) as TokenName[]).forEach((k) => {
    adjusted[k] = applyAdjust(TOKENS[k], adjust);
  });
  return {
    raw: adjusted,
    c: (token, alpha = 1) => rgbToCss(adjusted[token], alpha),
  };
}
