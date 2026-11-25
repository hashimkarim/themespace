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
