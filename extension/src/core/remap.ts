import { resolve, type Appearance, type Theme } from "../../../web/lib/theme";
import { channels, distance, toHex } from "./color";
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
    return toHex(t.map((v, i) => v + flip * (c[i] - a[i])));
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
      out = shift(nearest.role, hex, nearest.color);
    }
    cache.set(key, out);
    return out;
  };
  const tokens = Object.fromEntries(
    scan.tokens.map((t) => [t.name, shift(t.role, t.color, t.base)]),
  );
  return { appearance, color, tokens };
}
