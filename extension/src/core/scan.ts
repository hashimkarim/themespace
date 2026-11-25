import {
  contrast,
  mix,
  parseTheme,
  presets,
  readableOn,
  slugify,
  fontOptions,
  type Appearance,
  type Palette,
  type Theme,
} from "../../../web/lib/theme";
import { palettesFromColors } from "../../../web/lib/palette-tools";
import { chroma, distance } from "./color";

export type Swatch = { hex: string; weight: number };
export type Channel = "bg" | "text" | "border";
/** What the DOM collector reports. Pure data, so scanning is testable without a browser. */
export type ScanSample = {
  url: string;
  title: string;
  /** Effective page background (html/body, or the largest full-width box). */
  page: string;
  /** Known design tokens on :root, resolved to hex. */
  tokens: Record<string, string>;
  backgrounds: { surface: Swatch[]; button: Swatch[]; input: Swatch[] };
  texts: { body: Swatch[]; link: Swatch[]; button: Swatch[] };
  borders: Swatch[];
  font?: string;
  radius?: number;
};
/** A site color the scan assigned to a theme role. Apply shifts colors relative to these. */
export type Anchor = { channel: Channel; role: string; color: string };
/** A site token and the role it carries. */
export type TokenAnchor = {
  name: string;
  role: string;
  /** The token's value on the site. */
  color: string;
  /** The role's defining value; aliases keep their offset from it. */
  base: string;
};
export type ScanResult = {
  theme: Theme;
  appearance: Appearance;
  anchors: Anchor[];
  tokens: TokenAnchor[];
};

/**
 * The inverse of ThemeSpace's framework export (shadcn names) plus its own
 * --ts-* variables, so a site built from a ThemeSpace export scans exactly.
 */
const tokenRoles: Record<string, string> = {
  "--background": "background",
  "--foreground": "foreground",
  "--card": "elevated",
  "--popover": "elevated",
  "--primary": "accentFill",
  "--primary-foreground": "accentForeground",
  "--secondary": "surface",
  "--muted": "surface",
  "--muted-foreground": "muted",
  "--accent": "hover",
  "--border": "border",
  "--input": "border",
  "--ring": "focus",
  "--ts-background": "background",
  "--ts-foreground": "foreground",
  "--ts-surface": "surface",
  "--ts-elevated": "elevated",
  "--ts-input": "input",
  "--ts-border": "border",
  "--ts-muted": "muted",
  "--ts-accent": "accent",
  "--ts-accent-fill": "accentFill",
  "--ts-accent-foreground": "accentForeground",
  "--ts-focus": "focus",
  "--ts-hover": "hover",
};
export const knownTokens = Object.keys(tokenRoles);

const heaviest = (
  swatches: Swatch[],
  keep: (s: Swatch) => boolean = () => true,
) =>
  swatches
    .filter(keep)
    .reduce<Swatch | undefined>(
      (a, b) => (!a || b.weight > a.weight ? b : a),
      undefined,
    );
const merge = (...lists: Swatch[][]) => {
  const out = new Map<string, number>();
  for (const s of lists.flat())
    out.set(s.hex, (out.get(s.hex) ?? 0) + s.weight);
  return [...out].map(([hex, weight]) => ({ hex, weight }));
};
const semantic = {
  dark: { success: "#63ce9b", warning: "#e6bd71", error: "#ed8a96" },
  light: { success: "#24704d", warning: "#886014", error: "#ad3548" },
};

/**
 * Build a theme from a site's own colors. Every role the site supplies is
 * stored literally and recorded as an anchor, so applying the result back to
 * the same site changes nothing.
 */
export function themeFromScan(sample: ScanSample): ScanResult {
  const roles: Record<string, string> = {};
  const anchors: Anchor[] = [];
  const tokens: TokenAnchor[] = [];
  const assign = (role: string, color: string, channel?: Channel) => {
    roles[role] = color;
    if (channel) anchors.push({ channel, role, color });
  };

  const tokenValues = Object.entries(sample.tokens).filter(
    ([name]) => tokenRoles[name],
  );
  const fromTokens =
    tokenValues.some(([n]) => tokenRoles[n] === "background") &&
    tokenValues.some(([n]) => tokenRoles[n] === "foreground");
  if (fromTokens) {
    // First token per role defines it; later aliases shift relative to it.
    for (const [name, color] of tokenValues) {
      const role = tokenRoles[name];
      if (!roles[role]) roles[role] = color;
      tokens.push({ name, role, color, base: roles[role] });
    }
  }

  const page = roles.background ?? sample.page;
  assign("background", page, "bg");
  const appearance: Appearance =
    contrast(page, "#ffffff") > contrast(page, "#000000") ? "dark" : "light";

  const bodyText = merge(sample.texts.body);
  const fg =
    roles.foreground ??
    heaviest(bodyText, (s) => contrast(s.hex, page) >= 3)?.hex ??
    readableOn(page);
  const fgWeight = bodyText.find((s) => s.hex === fg)?.weight ?? 1;
  assign("foreground", fg, "text");

  const muted =
    roles.muted ??
    heaviest(
      merge(sample.texts.body),
      (s) =>
        s.hex !== fg &&
        chroma(s.hex) < 0.2 &&
        distance(s.hex, fg) > 24 &&
        contrast(s.hex, page) >= 2 &&
        s.weight >= fgWeight * 0.03,
    )?.hex;
  if (muted) assign("muted", muted, "text");

  const surface =
    roles.surface ??
    heaviest(sample.backgrounds.surface, (s) => distance(s.hex, page) > 6)?.hex;
  if (surface) assign("surface", surface, "bg");
  if (roles.elevated && roles.elevated !== surface)
    assign("elevated", roles.elevated, "bg");

  const input =
    roles.input ??
    heaviest(sample.backgrounds.input, (s) => distance(s.hex, page) > 6)?.hex;
  if (input) assign("input", input, "bg");

  const link = heaviest(sample.texts.link, (s) => chroma(s.hex) >= 0.1)?.hex;
  const fill =
    roles.accentFill ??
    heaviest(sample.backgrounds.button, (s) => chroma(s.hex) >= 0.12)?.hex ??
    heaviest(sample.backgrounds.button, (s) => distance(s.hex, page) > 12)?.hex;
  if (fill) assign("accentFill", fill, "bg");
  const accent = roles.accent ?? link;
  if (accent) assign("accent", accent, "text");
  const fillColor = fill ?? accent;
  const fillText =
    roles.accentForeground ??
    (fillColor
      ? heaviest(sample.texts.button, (s) => contrast(s.hex, fillColor) >= 3)
          ?.hex
      : undefined);
  if (fillText) assign("accentForeground", fillText, "text");

  const border = roles.border ?? heaviest(sample.borders)?.hex;
  if (border) assign("border", border, "border");
  for (const role of ["hover", "focus"])
    if (roles[role])
      assign(role, roles[role], role === "focus" ? "border" : "bg");

  const accentColor =
    accent ?? fill ?? (appearance === "dark" ? "#8ab4f8" : "#2563eb");
  const palette: Palette = {
    background: page,
    surface: surface ?? mix(page, fg, 0.05),
    foreground: fg,
    accent: accentColor,
    muted: muted ?? mix(fg, page, 0.42),
    ...semantic[appearance],
    overrides: {},
  };
  for (const role of [
    "elevated",
    "input",
    "border",
    "accentFill",
    "accentForeground",
    "hover",
    "focus",
  ])
    if (roles[role]) palette.overrides[role] = roles[role];
  if (!palette.overrides.accentFill && fill)
    palette.overrides.accentFill = fill;

  const other: Appearance = appearance === "dark" ? "light" : "dark";
  const generated = palettesFromColors(
    [accentColor, fill ?? accentColor, surface ?? page].filter(
      (c, i, all) => all.indexOf(c) === i,
    ),
  )[other];

  let host = sample.title || "Website";
  try {
    host = new URL(sample.url).hostname.replace(/^www\./, "") || host;
  } catch {
    /* keep title */
  }
  const base = presets[0];
  const sans =
    sample.font && fontOptions.includes(sample.font)
      ? sample.font
      : base.fonts.sans;
  const theme = parseTheme({
    ...structuredClone(base),
    id: slugify(`site-${host}`),
    name: host.slice(0, 80),
    description: `Picked from ${host} with ThemeSpace Companion.`,
    author: "ThemeSpace Companion",
    license: "Unspecified",
    defaultAppearance: appearance,
    modes: { [appearance]: palette, [other]: generated },
    fonts: { ...base.fonts, sans },
    style: {
      ...base.style,
      radius:
        sample.radius !== undefined
          ? Math.max(0, Math.min(24, Math.round(sample.radius)))
          : base.style.radius,
    },
    parent: undefined,
  });
  return { theme, appearance, anchors, tokens };
}
