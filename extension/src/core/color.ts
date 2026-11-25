/** Parsed sRGB color with alpha, normalized to lowercase six-digit hex. */
export type Rgba = { hex: string; alpha: number };

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export const toHex = (channels: number[]) =>
  "#" + channels.map((c) => clamp(c).toString(16).padStart(2, "0")).join("");
export const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/**
 * Parse the sRGB forms that getComputedStyle and canvas produce. Other color
 * spaces (oklch, color()) are normalized by the DOM collector before this.
 */
export function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase();
  if (text === "transparent") return { hex: "#000000", alpha: 0 };
  const hex = /^#([0-9a-f]{3,8})$/.exec(text)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
    if (full.length !== 6 && full.length !== 8) return null;
    return {
      hex: "#" + full.slice(0, 6),
      alpha: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1,
    };
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(text)?.[1];
  if (!fn) return null;
  const parts = fn.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const rgb = parts
    .slice(0, 3)
    .map((p) =>
      p.endsWith("%") ? (parseFloat(p) * 255) / 100 : parseFloat(p),
    );
  if (rgb.some((n) => !Number.isFinite(n))) return null;
  const a = parts[3];
  const alpha =
    a === undefined ? 1 : a.endsWith("%") ? parseFloat(a) / 100 : parseFloat(a);
  return { hex: toHex(rgb), alpha: Number.isFinite(alpha) ? alpha : 1 };
}

export const formatColor = ({ hex, alpha }: Rgba) =>
  alpha >= 1
    ? hex
    : `rgba(${channels(hex).join(", ")}, ${Math.round(alpha * 1000) / 1000})`;

/** Perceptually weighted RGB distance, matching ThemeSpace's palette tools. */
export const distance = (a: string, b: string) => {
  const x = channels(a),
    y = channels(b);
  return Math.sqrt(
    2 * (x[0] - y[0]) ** 2 + 4 * (x[1] - y[1]) ** 2 + 3 * (x[2] - y[2]) ** 2,
  );
};

export function chroma(hex: string) {
  const c = channels(hex);
  return (Math.max(...c) - Math.min(...c)) / 255;
}

export const mixHex = (a: string, b: string, weight: number) => {
  const x = channels(a),
    y = channels(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * weight));
};

/** Same hue and saturation, mirrored lightness: a dark band becomes a light one. */
export function invertLightness(hex: string) {
  const [r, g, b] = channels(hex).map((c) => c / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2,
    d = max - min;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !d
    ? 0
    : max === r
      ? ((g - b) / d + 6) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  const L = 1 - l;
  const C = (1 - Math.abs(2 * L - 1)) * s;
  const X = C * (1 - Math.abs((h % 2) - 1));
  const m = L - C / 2;
  const [rr, gg, bb] =
    h < 1
      ? [C, X, 0]
      : h < 2
        ? [X, C, 0]
        : h < 3
          ? [0, C, X]
          : h < 4
            ? [0, X, C]
            : h < 5
              ? [X, 0, C]
              : [C, 0, X];
  return toHex([rr + m, gg + m, bb + m].map((c) => c * 255));
}

/** WCAG contrast between two hex colors. */
export function contrastRatio(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = channels(hex).map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** hex → bare HSL components ("210 40% 98%"), the shadcn v3 token format. */
export function bareHsl(hex: string) {
  const [r, g, b] = channels(hex).map((c) => c / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2,
    d = max - min;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !d
    ? 0
    : (max === r
        ? ((g - b) / d + 6) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4) * 60;
  const round = (n: number) => Math.round(n * 10) / 10;
  return `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`;
}

/** HSL lightness, 0–1. */
export function lightness(hex: string) {
  const c = channels(hex);
  return (Math.max(...c) + Math.min(...c)) / 510;
}
