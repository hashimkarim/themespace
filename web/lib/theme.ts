export type Appearance = "dark" | "light";
export const baseRoles = [
  "background",
  "surface",
  "accent",
  "foreground",
  "muted",
  "success",
  "warning",
  "error",
] as const;
export type BaseRole = (typeof baseRoles)[number];
export type Palette = Record<BaseRole, string> & {
  overrides: Record<string, string>;
};
export interface Theme {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  author: string;
  license: "CC0-1.0" | "MIT" | "All rights reserved" | "Unspecified";
  defaultAppearance: Appearance;
  modes: Partial<Record<Appearance, Palette>>;
  fonts: { sans: string; mono: string; size: number };
  style: { radius: number; spacing: number; shadow: number; motion: number };
  targets: string[];
  parent?: { id: string; name: string; author: string; version?: number };
}
export type Resolved = Record<string, string>;
export const fontOptions = [
  "Geist",
  "Inter",
  "IBM Plex Sans",
  "Space Grotesk",
  "system-ui",
];
export const monoOptions = [
  "Geist Mono",
  "JetBrains Mono",
  "IBM Plex Mono",
  "ui-monospace",
];
export const extraRoles = [
  "elevated",
  "input",
  "border",
  "focus",
  "accentForeground",
  "selection",
  "selectionForeground",
  "hover",
  "info",
  "syntaxKeyword",
  "syntaxString",
  "syntaxNumber",
  "syntaxFunction",
  "syntaxType",
  "syntaxComment",
  "chart1",
  "chart2",
  "chart3",
  "chart4",
  "chart5",
  ...Array.from({ length: 16 }, (_, i) => `ansi${i}`),
];
export const hexPattern = /^#[0-9a-f]{6}$/i;
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "") || "my-theme";
export const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const mix = (a: string, b: string, weight: number) =>
  "#" +
  rgb(a)
    .map((v, i) =>
      Math.round(v * (1 - weight) + rgb(b)[i] * weight)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
export function luminance(hex: string) {
  const channels = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (x + 0.05) / (y + 0.05);
}
export const readableOn = (color: string) =>
  contrast(color, "#101320") > contrast(color, "#ffffff")
    ? "#101320"
    : "#ffffff";
export function resolve(theme: Theme, appearance: Appearance): Resolved {
  const p = theme.modes[appearance];
  if (!p) throw new Error(`This theme has no ${appearance} appearance.`);
  const { overrides, ...base } = p;
  const c: Resolved = {
    ...base,
    elevated: mix(p.background, p.foreground, 0.07),
    input: mix(p.surface, p.foreground, 0.04),
    border: mix(p.background, p.foreground, 0.15),
    focus: p.accent,
    accentForeground: readableOn(p.accent),
    selection: mix(p.background, p.accent, 0.26),
    selectionForeground: p.foreground,
    hover: mix(p.background, p.foreground, 0.11),
    info: mix(p.accent, p.success, 0.3),
    syntaxKeyword: p.accent,
    syntaxString: p.warning,
    syntaxNumber: mix(p.warning, p.error, 0.3),
    syntaxFunction: mix(p.accent, p.foreground, 0.18),
    syntaxType: mix(p.success, p.accent, 0.45),
    syntaxComment: p.muted,
    chart1: p.accent,
    chart2: p.success,
    chart3: p.warning,
    chart4: p.error,
    chart5: mix(p.accent, "#d38ed7", 0.65),
  };
  const ansi = [
    p.background,
    p.error,
    p.success,
    p.warning,
    p.accent,
    mix(p.accent, "#d38ed7", 0.65),
    c.info,
    p.foreground,
    p.muted,
    mix(p.error, p.foreground, 0.18),
    mix(p.success, p.foreground, 0.18),
    mix(p.warning, p.foreground, 0.18),
    mix(p.accent, p.foreground, 0.25),
    mix(c.chart5, p.foreground, 0.2),
    mix(c.info, p.foreground, 0.2),
    appearance === "dark" ? "#ffffff" : "#101320",
  ];
  ansi.forEach((color, index) => {
    c[`ansi${index}`] = color;
  });
  return { ...c, ...overrides };
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object.");
  return value as Record<string, unknown>;
};
const string = (value: unknown, max: number, name: string) => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u001f]/.test(value)
  )
    throw new Error(`Invalid ${name}.`);
  return value.trim();
};
const number = (value: unknown, min: number, max: number, name: string) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Invalid ${name}.`);
  return value;
};
export function parseTheme(value: unknown): Theme {
  const t = object(value);
  if (t.schemaVersion !== 1)
    throw new Error(
      "Unsupported theme version. Choose a ThemeSpace version 1 JSON file.",
    );
  const mode = t.defaultAppearance;
  if (mode !== "light" && mode !== "dark")
    throw new Error("Choose a valid default appearance.");
  const modes = object(t.modes),
    parsed: Theme["modes"] = {};
  for (const key of ["dark", "light"] as const) {
    if (!modes[key]) continue;
    const p = object(modes[key]),
      colors: Record<string, string> = {};
    for (const role of baseRoles) {
      if (typeof p[role] !== "string" || !hexPattern.test(p[role]))
        throw new Error(
          `Invalid ${key} ${role} color. Use six-digit hex colors.`,
        );
      colors[role] = p[role].toLowerCase();
    }
    const overrides: Record<string, string> = {};
    for (const [role, color] of Object.entries(object(p.overrides ?? {}))) {
      if (
        !extraRoles.includes(role) ||
        typeof color !== "string" ||
        !hexPattern.test(color)
      )
        throw new Error(`Invalid override: ${role}.`);
      overrides[role] = color.toLowerCase();
    }
    parsed[key] = { ...colors, overrides } as Palette;
  }
  if (!parsed[mode]) throw new Error("The default appearance is missing.");
  const fonts = object(t.fonts),
    style = object(t.style);
  if (
    !fontOptions.includes(String(fonts.sans)) ||
    !monoOptions.includes(String(fonts.mono))
  )
    throw new Error("Choose a supported font family.");
  if (
    !Array.isArray(t.targets) ||
    t.targets.length > 60 ||
    !t.targets.every(
      (id) => typeof id === "string" && /^[a-z0-9-]{1,50}$/.test(id),
    )
  )
    throw new Error("Invalid export targets.");
  const license = t.license;
  if (
    license !== "CC0-1.0" &&
    license !== "MIT" &&
    license !== "All rights reserved" &&
    license !== "Unspecified"
  )
    throw new Error("Choose a valid license.");
  const theme: Theme = {
    schemaVersion: 1,
    id: slugify(string(t.id, 80, "theme ID")),
    name: string(t.name, 80, "theme name"),
    description:
      typeof t.description === "string"
        ? t.description
            .trim()
            .slice(0, 500)
            .replace(/[\u0000-\u001f]/g, " ")
        : "",
    author: string(t.author, 80, "author"),
    license,
    defaultAppearance: mode,
    modes: parsed,
    fonts: {
      sans: String(fonts.sans),
      mono: String(fonts.mono),
      size: number(fonts.size, 11, 22, "font size"),
    },
    style: {
      radius: number(style.radius, 0, 24, "radius"),
      spacing: number(style.spacing, 2, 8, "spacing"),
      shadow: number(style.shadow, 0, 1, "shadow"),
      motion: number(style.motion, 0, 600, "motion"),
    },
    targets: [...new Set(t.targets as string[])],
  };
  if (t.parent) {
    const p = object(t.parent);
    theme.parent = {
      id: string(p.id, 100, "parent ID"),
      name: string(p.name, 80, "parent name"),
      author: string(p.author, 80, "parent author"),
      ...(p.version === undefined
        ? {}
        : { version: number(p.version, 1, 1e9, "parent version") }),
    };
  }
  return theme;
}
export const palette = (
  background: string,
  surface: string,
  accent: string,
  foreground: string,
  muted: string,
  success: string,
  warning: string,
  error: string,
): Palette => ({
  background,
  surface,
  accent,
  foreground,
  muted,
  success,
  warning,
  error,
  overrides: {},
});
function preset(
  id: string,
  name: string,
  description: string,
  dark: Palette,
  light: Palette,
): Theme {
  return {
    schemaVersion: 1,
    id,
    name,
    description,
    author: "ThemeSpace",
    license: "CC0-1.0",
    defaultAppearance: "dark",
    modes: { dark, light },
    fonts: { sans: "Geist", mono: "Geist Mono", size: 14 },
    style: { radius: 8, spacing: 4, shadow: 0.2, motion: 150 },
    targets: ["css", "scss", "tailwind", "shadcn", "ghostty", "vscode"],
  };
}
export const presets: Theme[] = [
  preset(
    "comfy",
    "Comfy",
    "Deep navy, soft periwinkle. A familiar place to settle in.",
    palette(
      "#23283d",
      "#1e2233",
      "#7289da",
      "#dadada",
      "#8e9297",
      "#43b581",
      "#eaca8b",
      "#d25050",
    ),
    palette(
      "#f4f4fa",
      "#e9eaf3",
      "#6157af",
      "#28283b",
      "#6a6b7d",
      "#2e805f",
      "#946d24",
      "#b84251",
    ),
  ),
  preset(
    "afterglow",
    "Afterglow",
    "Warm terracotta and dusky rose, just after the sun goes down.",
    palette(
      "#292329",
      "#211c22",
      "#e2a58b",
      "#f0e4dc",
      "#b1a0a2",
      "#aebd92",
      "#ecc489",
      "#d88588",
    ),
    palette(
      "#fbf4ed",
      "#f0e4dc",
      "#a25744",
      "#372a2b",
      "#826d6a",
      "#60734c",
      "#906827",
      "#af4e58",
    ),
  ),
  preset(
    "matcha",
    "Matcha",
    "Mossy greens, soft neutrals, and a slower kind of morning.",
    palette(
      "#242b27",
      "#1d2320",
      "#a6bf93",
      "#e0e6d8",
      "#98a697",
      "#95bf9b",
      "#d5bf89",
      "#cd8c82",
    ),
    palette(
      "#f2f5e9",
      "#e5ebda",
      "#58704d",
      "#2f382e",
      "#707b67",
      "#4e7754",
      "#8e6e34",
      "#a3534b",
    ),
  ),
  preset(
    "tideline",
    "Tideline",
    "Cool sea glass and deep ocean blue. Room to breathe.",
    palette(
      "#192c36",
      "#14252e",
      "#79b9c5",
      "#d7e9eb",
      "#88a4ad",
      "#89c5b1",
      "#dcc59a",
      "#df9692",
    ),
    palette(
      "#eff7f8",
      "#e0edf0",
      "#347787",
      "#243d45",
      "#637f86",
      "#39745f",
      "#886d33",
      "#b05254",
    ),
  ),
  preset(
    "papertrail",
    "Papertrail",
    "Soft paper, warm graphite, and a considered blue accent.",
    palette(
      "#2b2925",
      "#23211e",
      "#b5c0d8",
      "#e8e1d5",
      "#aaa18f",
      "#a7b896",
      "#d2b886",
      "#ce9990",
    ),
    palette(
      "#f9f6ef",
      "#efebe1",
      "#5c7096",
      "#373831",
      "#827e70",
      "#60754e",
      "#8c6a2b",
      "#a8574c",
    ),
  ),
  preset(
    "orchid",
    "Orchid",
    "Velvety plum and lavender with a little after-hours energy.",
    palette(
      "#282331",
      "#201b28",
      "#c3a0de",
      "#e9e0f0",
      "#a59aac",
      "#95bdac",
      "#dbc397",
      "#df96ad",
    ),
    palette(
      "#f8f2fa",
      "#eee3f1",
      "#9163aa",
      "#3d2947",
      "#8b7494",
      "#477665",
      "#8b6c32",
      "#af5275",
    ),
  ),
];
presets[0].author = "Comfy community";
presets[0].license = "Unspecified";
presets[0].modes.dark!.overrides = { input: "#191f2e", elevated: "#101320" };
presets[0].description +=
  " Dark palette from comfy-themes; light companion by ThemeSpace.";
presets[4].defaultAppearance = "light";
export function remixTheme(source: Theme, version?: number): Theme {
  const result = structuredClone(source);
  result.id = slugify(`${source.id}-remix`);
  result.name = `${source.name} remix`.slice(0, 80);
  result.author = "You";
  result.parent = {
    id: source.id,
    name: source.name,
    author: source.author,
    ...(version ? { version } : {}),
  };
  return result;
}
