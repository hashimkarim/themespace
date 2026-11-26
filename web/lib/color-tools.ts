import {
  contrast,
  hexPattern,
  luminance,
  parseTheme,
  readableOn,
  resolve,
  rgb,
  type Appearance,
  type BaseRole,
  type Palette,
  type Theme,
} from "./theme";

export type ContrastCheck = {
  id: string;
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  target: number;
  pass: boolean;
  grade: "AAA" | "AA" | "AA Large" | "Fail";
};

export type PaletteTransform =
  | "warmer"
  | "cooler"
  | "vivid"
  | "muted"
  | "hue-plus"
  | "hue-minus";

export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lig = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round((v + m) * 255)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function gradeFor(ratio: number): ContrastCheck["grade"] {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

export function contrastAudit(
  theme: Theme,
  appearance: Appearance,
): ContrastCheck[] {
  const c = resolve(theme, appearance);
  const pairs: Array<[string, string, string, string, number]> = [
    ["fg-bg", "Text / Background", c.foreground, c.background, 4.5],
    ["fg-surface", "Text / Surface", c.foreground, c.surface, 4.5],
    ["muted-bg", "Muted / Background", c.muted, c.background, 3.0],
    ["accent-bg", "Accent / Background", c.accent, c.background, 4.5],
    ["btn", "Button text / Fill", c.accentForeground, c.accentFill, 4.5],
    ["success-bg", "Success / Background", c.success, c.background, 3.0],
    ["warning-bg", "Warning / Background", c.warning, c.background, 3.0],
    ["error-bg", "Error / Background", c.error, c.background, 3.0],
  ];
  return pairs.map(([id, label, fg, bg, target]) => {
    const ratio = contrast(fg, bg);
    return {
      id,
      label,
      fg,
      bg,
      ratio,
      target,
      pass: ratio >= target,
      grade: gradeFor(ratio),
    };
  });
}

function ensureContrastAgainst(
  fg: string,
  bgs: string[],
  target: number,
  preferLight: boolean,
): string {
  const worst = (hex: string) => Math.min(...bgs.map((bg) => contrast(hex, bg)));
  if (worst(fg) >= target) return fg;
  const [h, s, l] = hexToHsl(fg);
  let lo = preferLight ? l : 2;
  let hi = preferLight ? 98 : l;
  let best = hslToHex(h, s, preferLight ? 98 : 2);
  let bestRatio = worst(best);
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const candidate = hslToHex(h, s, mid);
    const r = worst(candidate);
    if (r >= target) {
      best = candidate;
      bestRatio = r;
      if (preferLight) hi = mid;
      else lo = mid;
    } else {
      if (preferLight) lo = mid;
      else hi = mid;
    }
  }
  if (bestRatio >= target) return best;
  const fallback = preferLight ? "#f8fafc" : "#0b0e14";
  return worst(fallback) > bestRatio ? fallback : best;
}

export function autoFixContrast(theme: Theme, appearance: Appearance): Theme {
  const p = theme.modes[appearance];
  if (!p) return theme;
  const dark = luminance(p.background) < 0.25;
  const bgs = [p.background, p.surface];
  const next: Palette = {
    ...p,
    foreground: ensureContrastAgainst(p.foreground, bgs, 7.0, dark),
    muted: ensureContrastAgainst(p.muted, bgs, 4.5, dark),
    accent: ensureContrastAgainst(p.accent, [p.background], 4.5, dark),
    success: ensureContrastAgainst(p.success, [p.background], 3.5, dark),
    warning: ensureContrastAgainst(p.warning, [p.background], 3.5, dark),
    error: ensureContrastAgainst(p.error, [p.background], 3.5, dark),
    overrides: { ...p.overrides },
  };
  if (next.overrides.accentForeground) {
    const fill = next.overrides.accentFill ?? next.accent;
    if (contrast(next.overrides.accentForeground, fill) < 4.5)
      next.overrides.accentForeground = readableOn(fill);
  }
  return {
    ...theme,
    modes: { ...theme.modes, [appearance]: next },
  };
}

export function deriveCounterpartMode(
  theme: Theme,
  from: Appearance,
): Theme {
  const src = theme.modes[from];
  if (!src) return theme;
  const target: Appearance = from === "dark" ? "light" : "dark";
  const [bgH, bgS] = hexToHsl(src.background);
  const [acH, acS, acL] = hexToHsl(src.accent);
  const [fgH, fgS] = hexToHsl(src.foreground);

  const tintS = Math.min(24, bgS * 0.65);
  const background =
    target === "light"
      ? hslToHex(bgH, tintS, 97)
      : hslToHex(bgH, Math.min(28, bgS * 0.9 + 6), 11);
  const surface =
    target === "light"
      ? hslToHex(bgH, Math.min(28, tintS + 4), 93)
      : hslToHex(bgH, Math.min(30, bgS * 0.9 + 6), 15);
  const foreground =
    target === "light"
      ? hslToHex(fgH || bgH, Math.min(22, fgS * 0.7), 16)
      : hslToHex(fgH || bgH, Math.min(22, fgS * 0.7), 92);
  const muted =
    target === "light"
      ? hslToHex(bgH, Math.min(18, tintS), 42)
      : hslToHex(bgH, Math.min(18, tintS + 4), 66);

  const adaptSemantic = (hex: string, minRatio: number) => {
    const [h, s, l] = hexToHsl(hex);
    const seed = hslToHex(
      h,
      Math.max(25, Math.min(82, s)),
      target === "light" ? Math.min(44, l) : Math.max(60, l),
    );
    return ensureContrastAgainst(seed, [background], minRatio, target === "dark");
  };

  const accent = ensureContrastAgainst(
    hslToHex(
      acH,
      Math.max(30, Math.min(85, acS)),
      target === "light" ? Math.min(46, Math.max(32, acL - 12)) : Math.max(62, acL + 10),
    ),
    [background],
    4.5,
    target === "dark",
  );

  const derived: Palette = {
    background,
    surface,
    accent,
    foreground: ensureContrastAgainst(
      foreground,
      [background, surface],
      7.0,
      target === "dark",
    ),
    muted: ensureContrastAgainst(
      muted,
      [background, surface],
      4.5,
      target === "dark",
    ),
    success: adaptSemantic(src.success, 3.5),
    warning: adaptSemantic(src.warning, 3.5),
    error: adaptSemantic(src.error, 3.5),
    overrides: {},
  };
  return {
    ...theme,
    modes: { ...theme.modes, [target]: derived },
  };
}

function shiftHueTowards(h: number, target: number, amount: number) {
  const diff = ((((target - h) % 360) + 540) % 360) - 180;
  return (h + diff * amount + 360) % 360;
}

export function transformPalette(
  theme: Theme,
  appearance: Appearance,
  kind: PaletteTransform,
): Theme {
  const p = theme.modes[appearance];
  if (!p) return theme;
  const adjust = (hex: string, role: BaseRole): string => {
    const [h, s, l] = hexToHsl(hex);
    const isNeutral =
      role === "background" ||
      role === "surface" ||
      role === "foreground" ||
      role === "muted";
    switch (kind) {
      case "warmer":
        return hslToHex(
          shiftHueTowards(h, 32, isNeutral ? 0.35 : 0.22),
          isNeutral ? Math.min(26, s + 3) : Math.min(92, s + 3),
          l,
        );
      case "cooler":
        return hslToHex(
          shiftHueTowards(h, 215, isNeutral ? 0.35 : 0.22),
          isNeutral ? Math.min(26, s + 3) : Math.min(92, s + 2),
          l,
        );
      case "vivid":
        return hslToHex(h, isNeutral ? Math.min(30, s + 4) : Math.min(96, s + 14), l);
      case "muted":
        return hslToHex(h, Math.max(0, s * (isNeutral ? 0.7 : 0.76)), l);
      case "hue-plus":
        return hslToHex(h + (isNeutral ? 12 : 24), s, l);
      case "hue-minus":
        return hslToHex(h - (isNeutral ? 12 : 24), s, l);
    }
  };
  const next: Palette = {
    background: adjust(p.background, "background"),
    surface: adjust(p.surface, "surface"),
    accent: adjust(p.accent, "accent"),
    foreground: adjust(p.foreground, "foreground"),
    muted: adjust(p.muted, "muted"),
    success: adjust(p.success, "success"),
    warning: adjust(p.warning, "warning"),
    error: adjust(p.error, "error"),
    overrides: Object.fromEntries(
      Object.entries(p.overrides).map(([k, v]) => {
        if (!hexPattern.test(v)) return [k, v];
        const [h, s, l] = hexToHsl(v);
        if (kind === "hue-plus") return [k, hslToHex(h + 24, s, l)];
        if (kind === "hue-minus") return [k, hslToHex(h - 24, s, l)];
        if (kind === "vivid") return [k, hslToHex(h, Math.min(96, s + 12), l)];
        if (kind === "muted") return [k, hslToHex(h, s * 0.78, l)];
        return [k, v];
      }),
    ),
  };
  const dark = luminance(next.background) < 0.25;
  next.foreground = ensureContrastAgainst(
    next.foreground,
    [next.background, next.surface],
    4.5,
    dark,
  );
  next.accent = ensureContrastAgainst(next.accent, [next.background], 3.5, dark);
  return {
    ...theme,
    modes: { ...theme.modes, [appearance]: next },
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded =
    str.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function encodeThemeShare(theme: Theme): string {
  const compact = structuredClone(theme);
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  return toBase64Url(bytes);
}

export function decodeThemeShare(encoded: string): Theme {
  if (!encoded || encoded.length > 32_768)
    throw new Error("Shared theme link is invalid or too large.");
  const json = new TextDecoder().decode(fromBase64Url(encoded));
  return parseTheme(JSON.parse(json));
}
