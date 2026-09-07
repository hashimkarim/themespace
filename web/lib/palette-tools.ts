import {
  contrast,
  hexPattern,
  mix,
  rgb,
  type Appearance,
  type Palette,
  type Theme,
} from "./theme";

export type ExtractedColor = { hex: string; share: number };
export type GeneratedPalettes = Record<Appearance, Palette>;
type Point = { channels: number[]; weight: number };
const toHex = (channels: number[]) =>
  "#" +
  channels
    .map((c) =>
      Math.max(0, Math.min(255, Math.round(c)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const distance = (a: number[], b: number[]) =>
  2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2;

/** Cluster a bounded pixel sample; transparent pixels don't become black swatches. */
export function extractColors(
  pixels: Uint8ClampedArray,
  limit = 6,
): ExtractedColor[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10 || pixels.length % 4)
    throw new Error("Invalid image sample.");
  const histogram = new Map<number, Point>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 32) continue;
    const weight = pixels[i + 3] / 255;
    const channels = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key =
      (channels[0] >> 4) * 256 + (channels[1] >> 4) * 16 + (channels[2] >> 4);
    const bin = histogram.get(key) ?? { channels: [0, 0, 0], weight: 0 };
    channels.forEach((c, j) => {
      bin.channels[j] += c * weight;
    });
    bin.weight += weight;
    histogram.set(key, bin);
  }
  const points = [...histogram.values()]
    .map((p) => ({
      channels: p.channels.map((c) => c / p.weight),
      weight: p.weight,
    }))
    .sort((a, b) => b.weight - a.weight);
  if (!points.length)
    throw new Error(
      "This image is transparent. Choose one with visible colors.",
    );
  const centers = [points[0].channels];
  while (centers.length < Math.min(limit, points.length)) {
    let best = points[0],
      score = 0;
    for (const point of points) {
      const nearest = Math.min(
        ...centers.map((c) => distance(c, point.channels)),
      );
      const candidate = nearest * Math.sqrt(point.weight);
      if (nearest > 144 && candidate > score) {
        best = point;
        score = candidate;
      }
    }
    if (!score) break;
    centers.push(best.channels);
  }
  let groups: Point[] = [];
  for (let iteration = 0; iteration < 12; iteration++) {
    groups = centers.map(() => ({ channels: [0, 0, 0], weight: 0 }));
    for (const point of points) {
      let nearest = 0;
      centers.forEach((c, i) => {
        if (
          distance(c, point.channels) <
          distance(centers[nearest], point.channels)
        )
          nearest = i;
      });
      const group = groups[nearest];
      group.weight += point.weight;
      point.channels.forEach((c, i) => {
        group.channels[i] += c * point.weight;
      });
    }
    let movement = 0;
    groups.forEach((group, i) => {
      if (!group.weight) return;
      const next = group.channels.map((c) => c / group.weight);
      movement += distance(centers[i], next);
      centers[i] = next;
    });
    if (movement < 1) break;
  }
  const total = points.reduce((n, p) => n + p.weight, 0);
  const result: ExtractedColor[] = [];
  for (const group of groups
    .filter((g) => g.weight)
    .sort((a, b) => b.weight - a.weight)) {
    const hex = toHex(group.channels.map((c) => c / group.weight));
    if (group.weight / total < 0.01 && result.length) continue;
    const similar = result.find((c) => distance(rgb(c.hex), rgb(hex)) < 225);
    if (similar) similar.share += group.weight / total;
    else result.push({ hex, share: group.weight / total });
  }
  return result;
}

export function suggestedAccent(colors: ExtractedColor[]) {
  let chosen = 0,
    best = -1;
  colors.forEach((color, i) => {
    const channels = rgb(color.hex);
    const max = Math.max(...channels),
      min = Math.min(...channels);
    const score =
      (max - min) * Math.sqrt(max / 255) * Math.pow(color.share, 0.15);
    if (score > best) {
      chosen = i;
      best = score;
    }
  });
  return chosen;
}

function readable(
  color: string,
  backgrounds: string[],
  mode: Appearance,
  minimum = 4.5,
) {
  for (let step = 0; step <= 100; step++) {
    const candidate = mix(
      color,
      mode === "dark" ? "#ffffff" : "#000000",
      step / 100,
    );
    if (backgrounds.every((bg) => contrast(candidate, bg) >= minimum))
      return candidate;
  }
  return mode === "dark" ? "#ffffff" : "#000000";
}

export function palettesFromColors(
  colors: string[],
  accentIndex = 0,
): GeneratedPalettes {
  if (
    !colors.length ||
    colors.some((c) => !hexPattern.test(c)) ||
    !colors[accentIndex]
  )
    throw new Error("Choose a valid palette color.");
  const seed = colors[accentIndex].toLowerCase();
  const ordered = [seed, ...colors.filter((_, i) => i !== accentIndex)];
  const create = (mode: Appearance): Palette => {
    const dark = mode === "dark";
    const background = mix(
      dark ? "#10121a" : "#ffffff",
      seed,
      dark ? 0.12 : 0.045,
    );
    const surface = mix(dark ? "#1c1f29" : "#ffffff", seed, dark ? 0.14 : 0.1);
    const bases = [background, surface];
    const foreground = mix(dark ? "#f4f5f9" : "#171923", seed, 0.06);
    const accent = readable(seed, bases, mode);
    const overrides: Record<string, string> = {};
    ordered.slice(0, 5).forEach((c, i) => {
      overrides[`chart${i + 1}`] = readable(c, bases, mode, 3);
    });
    if (ordered[1])
      overrides.syntaxFunction = readable(ordered[1], bases, mode);
    if (ordered[2]) overrides.syntaxType = readable(ordered[2], bases, mode);
    return {
      background,
      surface,
      foreground,
      accent,
      muted: readable(mix(foreground, background, 0.46), bases, mode),
      success: readable(dark ? "#63ce9b" : "#24704d", bases, mode),
      warning: readable(dark ? "#e6bd71" : "#886014", bases, mode),
      error: readable(dark ? "#ed8a96" : "#ad3548", bases, mode),
      overrides,
    };
  };
  return { dark: create("dark"), light: create("light") };
}

function hsl(hue: number, saturation: number, lightness: number) {
  const a = saturation * Math.min(lightness, 1 - lightness);
  return toHex(
    [0, 8, 4].map((n) => {
      const k = (n + (((hue % 360) + 360) % 360) / 30) % 12;
      return 255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    }),
  );
}

export function randomPalettes(random = Math.random): GeneratedPalettes {
  const hue = random() * 360;
  const saturation = 0.4 + random() * 0.4;
  const harmonies = [
    [0, 25, -25, 55, 180],
    [0, 150, 210, 30, 180],
    [0, 120, 240, 30, 150],
  ];
  const angles = harmonies[Math.min(2, Math.floor(random() * 3))];
  return palettesFromColors(
    angles.map((angle) => hsl(hue + angle, saturation, 0.48 + random() * 0.16)),
  );
}

export function applyPalettes(
  theme: Theme,
  palettes: GeneratedPalettes,
  both: boolean,
): Theme {
  return {
    ...theme,
    modes: both
      ? structuredClone(palettes)
      : {
          ...theme.modes,
          [theme.defaultAppearance]: structuredClone(
            palettes[theme.defaultAppearance],
          ),
        },
  };
}
