import { resolve, type Appearance, type Theme } from "../../../web/lib/theme";
import {
  channels,
  distance,
  invertLightness,
  lightness,
  mixHex,
  toHex,
} from "./color";
import type { Anchor, Channel, ScanResult } from "./scan";

export type Remap = {
  appearance: Appearance;
  /** New color for a site color used as a background, text, or border. */
  color: (hex: string, channel: Channel) => string;
  /** New values for the site's own design tokens. */
  tokens: Record<string, string>;
};

/** Pick the appearance to show: the requested one if the theme has it. */
export function appearanceFor(theme: Theme, requested?: Appearance | "auto") {
  if (requested && requested !== "auto" && theme.modes[requested])
    return requested;
  return theme.defaultAppearance;
}

/**
 * Move every site color relative to its nearest scanned anchor: the anchor
 * lands exactly on the theme's role color and nearby shades keep their
 * offset. When the appearance flips, offsets flip too, so a card slightly
 * darker than a light page becomes slightly lighter than a dark one.
 *
 * Applying a site's own scan to it is the identity.
 */
export function planRemap(
  scan: ScanResult,
  theme: Theme,
  requested?: Appearance | "auto",
): Remap {
  const appearance = appearanceFor(theme, requested);
  const target = resolve(theme, appearance);
  const flip = appearance !== scan.appearance ? -1 : 1;
  const shift = (role: string, from: string, base: string) => {
    const to = target[role];
    if (!to) return from;
    const t = channels(to),
      a = channels(base),
      c = channels(from);
    // Flip only the lightness of the offset; the tint keeps its direction,
    // so a bluish chip stays bluish instead of turning brown.
    const d = c.map((v, i) => v - a[i]);
    const grey = (d[0] + d[1] + d[2]) / 3;
    return toHex(t.map((v, i) => v + d[i] - grey + flip * grey));
  };
  const byChannel: Record<Channel, Anchor[]> = { bg: [], text: [], border: [] };
  for (const anchor of scan.anchors) byChannel[anchor.channel].push(anchor);
  // Borders without their own anchor follow the nearest surface.
  if (!byChannel.border.length) byChannel.border = byChannel.bg;
  const cache = new Map<string, string>();
  const color = (hex: string, channel: Channel) => {
    const key = channel + hex;
    const hit = cache.get(key);
    if (hit) return hit;
    const pool = byChannel[channel].length ? byChannel[channel] : scan.anchors;
    let out = hex;
    if (pool.length) {
      const nearest = pool.reduce((a, b) =>
        distance(b.color, hex) < distance(a.color, hex) ? b : a,
      );
      const shifted = shift(nearest.role, hex, nearest.color);
      // Colors no anchor explains (alerts, brand bands) keep their own hue;
      // only their lightness follows the appearance.
      const far = Math.max(
        0,
        Math.min(1, (distance(nearest.color, hex) - 60) / 90),
      );
      out = far
        ? mixHex(
            shifted,
            flip < 0 ? toSide(hex, channel, appearance) : hex,
            far,
          )
        : shifted;
    }
    cache.set(key, out);
    return out;
  };
  const tokens = Object.fromEntries(
    scan.tokens.map((t) => [t.name, shift(t.role, t.color, t.base)]),
  );
  return { appearance, color, tokens };
}

/**
 * Put a far color on the right side for the appearance without inventing a
 * new hue: dark themes want dark backgrounds and light text, light themes the
 * reverse. A color already on the right side (a dark header in a dark theme)
 * stays as it is.
 */
function toSide(hex: string, channel: Channel, appearance: Appearance) {
  const wantLight = (channel === "text") === (appearance === "dark");
  const l = lightness(hex);
  return wantLight === l >= 0.5 ? hex : invertLightness(hex);
}
