import {
  hexPattern,
  luminance,
  mix,
  parseTheme,
  presets,
  slugify,
  type Appearance,
  type Palette,
  type Theme,
} from "./theme";
import { deriveCounterpartMode } from "./color-tools";

export type ImportResult = {
  theme: Theme;
  format: string;
};

const cleanHex = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (hexPattern.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-f]{8}$/i.test(trimmed)) return trimmed.slice(0, 7).toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed))
    return (
      "#" +
      trimmed
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
        .toLowerCase()
    );
  const rgbMatch = trimmed.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (rgbMatch) {
    const nums = rgbMatch.slice(1).map(Number);
    if (nums.every((n) => n >= 0 && n <= 255))
      return (
        "#" + nums.map((n) => n.toString(16).padStart(2, "0")).join("")
      );
  }
  return undefined;
};

function nameFromFile(fileName?: string): string {
  if (!fileName) return "Imported theme";
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/\.(theme|user|colorscheme|sublime-color-scheme)$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!base) return "Imported theme";
  return base
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 80);
}

function buildThemeFromColors(opts: {
  name: string;
  format: string;
  background: string;
  foreground: string;
  surface?: string;
  accent?: string;
  muted?: string;
  success?: string;
  warning?: string;
  error?: string;
  overrides?: Record<string, string>;
  secondMode?: { appearance: Appearance; palette: Palette };
}): ImportResult {
  const dark = luminance(opts.background) < 0.25;
  const mode: Appearance = dark ? "dark" : "light";
  const base = presets[0];
  const palette: Palette = {
    background: opts.background,
    surface:
      opts.surface ??
      mix(opts.background, opts.foreground, dark ? 0.06 : 0.05),
    foreground: opts.foreground,
    muted: opts.muted ?? mix(opts.foreground, opts.background, 0.36),
    accent: opts.accent ?? (dark ? "#7aa2f7" : "#2563eb"),
    success: opts.success ?? (dark ? "#9ece6a" : "#15803d"),
    warning: opts.warning ?? (dark ? "#e0af68" : "#b45309"),
    error: opts.error ?? (dark ? "#f7768e" : "#dc2626"),
    overrides: opts.overrides ?? {},
  };
  let theme: Theme = {
    schemaVersion: 1,
    id: `${slugify(opts.name).slice(0, 48)}-${Math.random().toString(36).slice(2, 8)}`,
    name: opts.name.slice(0, 80),
    description: `Imported from ${opts.format}.`,
    author: "Imported",
    license: "Unspecified",
    defaultAppearance: mode,
    modes: {
      [mode]: palette,
      ...(opts.secondMode
        ? { [opts.secondMode.appearance]: opts.secondMode.palette }
        : {}),
    },
    fonts: { ...base.fonts },
    style: { ...base.style },
    targets: [...base.targets],
  };
  if (!opts.secondMode) theme = deriveCounterpartMode(theme, mode);
  return { theme: parseTheme(theme), format: opts.format };
}

function paletteFromT3(p: Record<string, unknown>): Palette | null {
  const bg = cleanHex(String(p.canvas ?? ""));
  const fg = cleanHex(String(p.text ?? ""));
  if (!bg || !fg) return null;
  const overrides: Record<string, string> = {};
  const map: Record<string, string> = {
    elevated: String(p.surfaceRaised ?? ""),
    border: String(p.border ?? ""),
    input: String(p.input ?? ""),
    focus: String(p.focus ?? ""),
    selection: String(p.accentSurface ?? ""),
    hover: String(p.sidebarRowHover ?? ""),
  };
  for (const [k, raw] of Object.entries(map)) {
    const h = cleanHex(raw);
    if (h) overrides[k] = h;
  }
  return {
    background: bg,
    surface: cleanHex(String(p.surface ?? "")) ?? mix(bg, fg, 0.06),
    foreground: fg,
    muted: cleanHex(String(p.textMuted ?? "")) ?? mix(fg, bg, 0.35),
    accent: cleanHex(String(p.accent ?? "")) ?? "#7aa2f7",
    success: cleanHex(String(p.update ?? "")) ?? "#9ece6a",
    warning: cleanHex(String(p.warning ?? "")) ?? "#e0af68",
    error: cleanHex(String(p.error ?? "")) ?? "#f7768e",
    overrides,
  };
}

function tryJsonImport(raw: string, fileName?: string): ImportResult | null {
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    data = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  // 1. Native ThemeSpace theme.json
  if (data.schemaVersion === 1 && data.modes) {
    return { theme: parseTheme(data), format: "ThemeSpace JSON" };
  }

  // 2. T3 Code theme JSON
  if (
    data.version === 1 &&
    data.colors &&
    typeof data.colors === "object" &&
    "canvas" in (data.colors as Record<string, unknown>)
  ) {
    const primary = paletteFromT3(data.colors as Record<string, unknown>);
    if (primary) {
      const app: Appearance =
        data.appearance === "light" ? "light" : "dark";
      const other: Appearance = app === "dark" ? "light" : "dark";
      const variants = data.variants as
        | Record<string, Record<string, unknown>>
        | undefined;
      const otherPalette = variants?.[other]
        ? paletteFromT3(variants[other])
        : null;
      return buildThemeFromColors({
        name:
          typeof data.name === "string" && data.name.trim()
            ? data.name.trim()
            : nameFromFile(fileName),
        format: "T3 Code JSON",
        ...primary,
        secondMode: otherPalette
          ? { appearance: other, palette: otherPalette }
          : undefined,
      });
    }
  }

  // 2b. GitComet schema_version 2 theme bundle JSON
  if (
    data.schema_version === 2 &&
    Array.isArray(data.themes) &&
    data.themes.length > 0
  ) {
    type GcEntry = {
      name?: string;
      appearance?: string;
      colors?: {
        surface?: Record<string, string>;
        foreground?: Record<string, string | { hex: string }>;
        accent?: Record<string, string>;
        status?: Record<string, Record<string, string>>;
      };
    };
    const entries = data.themes as GcEntry[];
    const h = (v?: string | { hex: string }) =>
      cleanHex(typeof v === "string" ? v : v?.hex);
    const toPal = (e?: GcEntry): Palette | null => {
      const bg = h(e?.colors?.surface?.canvas);
      const fg = h(e?.colors?.foreground?.primary);
      if (!bg || !fg) return null;
      return {
        background: bg,
        surface: h(e?.colors?.surface?.chrome) ?? mix(bg, fg, 0.06),
        foreground: fg,
        muted: h(e?.colors?.foreground?.secondary) ?? mix(fg, bg, 0.36),
        accent: h(e?.colors?.accent?.foreground) ?? "#7aa2f7",
        success: h(e?.colors?.status?.success?.foreground) ?? "#9ece6a",
        warning: h(e?.colors?.status?.warning?.foreground) ?? "#e0af68",
        error: h(e?.colors?.status?.danger?.foreground) ?? "#f7768e",
        overrides: {},
      };
    };
    const primary = entries.find((e) => e.appearance === "dark") ?? entries[0];
    const primaryPal = toPal(primary);
    if (primaryPal) {
      const primaryApp: Appearance =
        primary.appearance === "light" ? "light" : "dark";
      const otherApp: Appearance = primaryApp === "dark" ? "light" : "dark";
      const otherPal = toPal(entries.find((e) => e.appearance === otherApp));
      return buildThemeFromColors({
        name:
          typeof data.name === "string" && data.name.trim()
            ? data.name.trim()
            : nameFromFile(fileName),
        format: "GitComet v2 JSON",
        ...primaryPal,
        secondMode: otherPal
          ? { appearance: otherApp, palette: otherPal }
          : undefined,
      });
    }
  }

  // 2c. Vivaldi settings.json
  if (
    typeof data.colorBg === "string" &&
    typeof data.colorFg === "string" &&
    typeof data.colorHighlightBg === "string"
  ) {
    const bg = cleanHex(data.colorBg);
    const fg = cleanHex(data.colorFg);
    if (bg && fg) {
      return buildThemeFromColors({
        name:
          typeof data.name === "string" && data.name.trim()
            ? data.name.trim()
            : nameFromFile(fileName),
        format: "Vivaldi JSON",
        background: bg,
        foreground: fg,
        surface: cleanHex(String(data.colorWindowBg ?? data.colorAccentBg ?? "")),
        accent: cleanHex(data.colorHighlightBg),
      });
    }
  }

  // 3. VS Code theme JSON
  if (data.colors && typeof data.colors === "object") {
    const colors = data.colors as Record<string, string>;
    const bg = cleanHex(colors["editor.background"]);
    const fg = cleanHex(colors["editor.foreground"]);
    if (bg && fg) {
      const overrides: Record<string, string> = {};
      const sem = (data.semanticTokenColors ?? {}) as Record<string, unknown>;
      const readSem = (k: string) => {
        const v = sem[k];
        return cleanHex(
          typeof v === "string"
            ? v
            : v && typeof v === "object"
              ? String((v as { foreground?: string }).foreground ?? "")
              : "",
        );
      };
      const syntaxMap: Record<string, string> = {
        syntaxKeyword: "keyword",
        syntaxString: "string",
        syntaxNumber: "number",
        syntaxFunction: "function",
        syntaxType: "type",
        syntaxComment: "comment",
      };
      for (const [role, key] of Object.entries(syntaxMap)) {
        const h = readSem(key);
        if (h) overrides[role] = h;
      }
      const ansiOrder = [
        "Black",
        "Red",
        "Green",
        "Yellow",
        "Blue",
        "Magenta",
        "Cyan",
        "White",
        "BrightBlack",
        "BrightRed",
        "BrightGreen",
        "BrightYellow",
        "BrightBlue",
        "BrightMagenta",
        "BrightCyan",
        "BrightWhite",
      ];
      ansiOrder.forEach((name, idx) => {
        const h = cleanHex(colors[`terminal.ansi${name}`]);
        if (h) overrides[`ansi${idx}`] = h;
      });
      const sel = cleanHex(colors["editor.selectionBackground"]);
      if (sel) overrides.selection = sel;
      const border = cleanHex(colors["editorGroup.border"] ?? colors["panel.border"]);
      if (border) overrides.border = border;
      return buildThemeFromColors({
        name:
          typeof data.name === "string" && data.name.trim()
            ? data.name.trim()
            : nameFromFile(fileName),
        format: "VS Code JSON",
        background: bg,
        foreground: fg,
        surface:
          cleanHex(colors["sideBar.background"]) ??
          cleanHex(colors["titleBar.activeBackground"]),
        accent:
          cleanHex(colors["button.background"]) ??
          cleanHex(colors["textLink.foreground"]) ??
          cleanHex(colors["focusBorder"]),
        muted:
          cleanHex(colors["descriptionForeground"]) ??
          cleanHex(colors["editorLineNumber.foreground"]),
        success: cleanHex(colors["terminal.ansiGreen"]),
        warning:
          cleanHex(colors["editorWarning.foreground"]) ??
          cleanHex(colors["terminal.ansiYellow"]),
        error:
          cleanHex(colors["editorError.foreground"]) ??
          cleanHex(colors["terminal.ansiRed"]),
        overrides,
      });
    }
  }

  // 4. Windows Terminal scheme JSON
  const wtBg = cleanHex(String(data.background ?? ""));
  const wtFg = cleanHex(String(data.foreground ?? ""));
  if (wtBg && wtFg && (data.blue || data.brightWhite)) {
    const keys = [
      "black",
      "red",
      "green",
      "yellow",
      "blue",
      "purple",
      "cyan",
      "white",
      "brightBlack",
      "brightRed",
      "brightGreen",
      "brightYellow",
      "brightBlue",
      "brightPurple",
      "brightCyan",
      "brightWhite",
    ];
    const overrides: Record<string, string> = {};
    keys.forEach((k, i) => {
      const h = cleanHex(String(data[k] ?? ""));
      if (h) overrides[`ansi${i}`] = h;
    });
    const sel = cleanHex(String(data.selectionBackground ?? ""));
    if (sel) overrides.selection = sel;
    return buildThemeFromColors({
      name:
        typeof data.name === "string" && data.name.trim()
          ? data.name.trim()
          : nameFromFile(fileName),
      format: "Windows Terminal JSON",
      background: wtBg,
      foreground: wtFg,
      accent:
        cleanHex(String(data.cursorColor ?? "")) ??
        cleanHex(String(data.blue ?? "")),
      muted: cleanHex(String(data.brightBlack ?? "")),
      success: cleanHex(String(data.green ?? "")),
      warning: cleanHex(String(data.yellow ?? "")),
      error: cleanHex(String(data.red ?? "")),
      overrides,
    });
  }

  return null;
}

export function importNativeTheme(
  rawText: string,
  fileName?: string,
): ImportResult {
  const raw = rawText.trim();
  if (!raw) throw new Error("Theme file is empty.");

  // Try JSON formats first (ThemeSpace, T3 Code, VS Code, Windows Terminal)
  const jsonResult = tryJsonImport(raw, fileName);
  if (jsonResult) return jsonResult;

  const name = nameFromFile(fileName);

  // 5. Konsole .colorscheme (INI with [Background] Color=r,g,b)
  if (/\[Background\]/.test(raw) && /Color=\d+,\d+,\d+/.test(raw)) {
    const secColor = (sec: string) => {
      const m = raw.match(
        new RegExp(`\\[${sec}\\][\\s\\S]*?^Color=([^\\n]+)`, "m"),
      );
      return cleanHex(m?.[1]);
    };
    const bg = secColor("Background");
    const fg = secColor("Foreground");
    if (bg && fg) {
      const overrides: Record<string, string> = {};
      for (let i = 0; i < 8; i++) {
        const n = secColor(`Color${i}`);
        const b = secColor(`Color${i}Intense`);
        if (n) overrides[`ansi${i}`] = n;
        if (b) overrides[`ansi${i + 8}`] = b;
      }
      const desc = raw.match(/^Description=(.+)$/m)?.[1]?.trim();
      return buildThemeFromColors({
        name: desc || name,
        format: "Konsole colorscheme",
        background: bg,
        foreground: fg,
        surface: secColor("BackgroundFaint"),
        muted: secColor("ForegroundFaint"),
        accent: overrides.ansi4,
        success: overrides.ansi2,
        warning: overrides.ansi3,
        error: overrides.ansi1,
        overrides,
      });
    }
  }

  // 6. Ghostty config (palette = 0=#hex, background = #hex)
  if (/^palette\s*=\s*\d+=#[0-9a-f]{6}/im.test(raw)) {
    const readKey = (k: string) =>
      cleanHex(raw.match(new RegExp(`^${k}\\s*=\\s*(#[0-9a-f]{6})`, "im"))?.[1]);
    const bg = readKey("background");
    const fg = readKey("foreground");
    if (bg && fg) {
      const overrides: Record<string, string> = {};
      for (const m of raw.matchAll(/^palette\s*=\s*(\d+)=(#[0-9a-f]{6})/gim)) {
        const idx = Number(m[1]);
        if (idx >= 0 && idx < 16) overrides[`ansi${idx}`] = m[2].toLowerCase();
      }
      const sel = readKey("selection-background");
      if (sel) overrides.selection = sel;
      return buildThemeFromColors({
        name,
        format: "Ghostty theme",
        background: bg,
        foreground: fg,
        accent: readKey("cursor-color") ?? overrides.ansi4,
        muted: overrides.ansi8,
        success: overrides.ansi2,
        warning: overrides.ansi3,
        error: overrides.ansi1,
        overrides,
      });
    }
  }

  // 7. Xresources (*.background: #hex, *.color0: #hex)
  if (/^\*\.?background:\s*#[0-9a-f]{3,6}/im.test(raw)) {
    const readX = (k: string) =>
      cleanHex(
        raw.match(new RegExp(`^\\*\\.?${k}:\\s*(#[0-9a-f]{3,6})`, "im"))?.[1],
      );
    const bg = readX("background");
    const fg = readX("foreground");
    if (bg && fg) {
      const overrides: Record<string, string> = {};
      for (let i = 0; i < 16; i++) {
        const h = readX(`color${i}`);
        if (h) overrides[`ansi${i}`] = h;
      }
      return buildThemeFromColors({
        name,
        format: "Xresources",
        background: bg,
        foreground: fg,
        accent: readX("cursorColor") ?? overrides.ansi4,
        muted: overrides.ansi8,
        success: overrides.ansi2,
        warning: overrides.ansi3,
        error: overrides.ansi1,
        overrides,
      });
    }
  }

  // 8. kitty (.conf: `background #hex`, `color0 #hex`)
  if (/^background\s+#[0-9a-f]{6}/im.test(raw) && /^foreground\s+#[0-9a-f]{6}/im.test(raw)) {
    const readKitty = (k: string) =>
      cleanHex(raw.match(new RegExp(`^${k}\\s+(#[0-9a-f]{6})`, "im"))?.[1]);
    const bg = readKitty("background");
    const fg = readKitty("foreground");
    if (bg && fg) {
      const overrides: Record<string, string> = {};
      for (let i = 0; i < 16; i++) {
        const h = readKitty(`color${i}`);
        if (h) overrides[`ansi${i}`] = h;
      }
      const sel = readKitty("selection_background");
      if (sel) overrides.selection = sel;
      return buildThemeFromColors({
        name,
        format: "kitty conf",
        background: bg,
        foreground: fg,
        accent: readKitty("cursor") ?? overrides.ansi4,
        muted: overrides.ansi8,
        success: overrides.ansi2,
        warning: overrides.ansi3,
        error: overrides.ansi1,
        overrides,
      });
    }
  }

  // 9. Alacritty / WezTerm TOML
  if (/\[colors(\.primary)?\]/.test(raw)) {
    const readToml = (k: string) =>
      cleanHex(
        raw.match(new RegExp(`^\\s*${k}\\s*=\\s*['"]([^'"]+)['"]`, "m"))?.[1],
      );
    const bg = readToml("background");
    const fg = readToml("foreground");
    if (bg && fg) {
      const overrides: Record<string, string> = {};
      const ansiArr = raw.match(/ansi\s*=\s*\[([^\]]+)\]/);
      const brightArr = raw.match(/brights\s*=\s*\[([^\]]+)\]/);
      if (ansiArr) {
        [...ansiArr[1].matchAll(/#[0-9a-f]{6}/gi)].forEach((m, i) => {
          if (i < 8) overrides[`ansi${i}`] = m[0].toLowerCase();
        });
      }
      if (brightArr) {
        [...brightArr[1].matchAll(/#[0-9a-f]{6}/gi)].forEach((m, i) => {
          if (i < 8) overrides[`ansi${i + 8}`] = m[0].toLowerCase();
        });
      }
      const names = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
      ];
      const normBlock = raw.match(/\[colors\.normal\]([\s\S]*?)(\n\[|$)/)?.[1];
      const brightBlock = raw.match(/\[colors\.bright\]([\s\S]*?)(\n\[|$)/)?.[1];
      if (normBlock) {
        names.forEach((n, i) => {
          const h = cleanHex(
            normBlock.match(new RegExp(`${n}\\s*=\\s*['"]([^'"]+)['"]`))?.[1],
          );
          if (h) overrides[`ansi${i}`] = h;
        });
      }
      if (brightBlock) {
        names.forEach((n, i) => {
          const h = cleanHex(
            brightBlock.match(new RegExp(`${n}\\s*=\\s*['"]([^'"]+)['"]`))?.[1],
          );
          if (h) overrides[`ansi${i + 8}`] = h;
        });
      }
      return buildThemeFromColors({
        name,
        format: ansiArr ? "WezTerm TOML" : "Alacritty TOML",
        background: bg,
        foreground: fg,
        accent:
          readToml("cursor_bg") ?? readToml("cursor") ?? overrides.ansi4,
        muted: overrides.ansi8,
        success: overrides.ansi2,
        warning: overrides.ansi3,
        error: overrides.ansi1,
        overrides,
      });
    }
  }

  // 10. CSS custom properties (--ts-background, --background, --primary, etc.)
  const cssVars: Record<string, string> = {};
  for (const m of raw.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{3,8})\b/gi)) {
    const h = cleanHex(m[2]);
    if (h) cssVars[m[1].toLowerCase()] = h;
  }
  const cssBg =
    cssVars["--ts-background"] ??
    cssVars["--background"] ??
    cssVars["--bg"] ??
    cssVars["--window-bg"];
  const cssFg =
    cssVars["--ts-foreground"] ??
    cssVars["--foreground"] ??
    cssVars["--fg"] ??
    cssVars["--text"];
  if (cssBg && cssFg) {
    return buildThemeFromColors({
      name,
      format: "CSS variables",
      background: cssBg,
      foreground: cssFg,
      surface:
        cssVars["--ts-surface"] ??
        cssVars["--surface"] ??
        cssVars["--card"] ??
        cssVars["--secondary"],
      accent:
        cssVars["--ts-accent"] ??
        cssVars["--primary"] ??
        cssVars["--accent"],
      muted:
        cssVars["--ts-muted"] ??
        cssVars["--muted-foreground"] ??
        cssVars["--muted"],
      success: cssVars["--ts-success"] ?? cssVars["--success"],
      warning: cssVars["--ts-warning"] ?? cssVars["--warning"],
      error:
        cssVars["--ts-error"] ??
        cssVars["--destructive"] ??
        cssVars["--error"],
    });
  }

  throw new Error(
    "Unrecognized theme format. Supported: ThemeSpace, VS Code, T3 Code, Windows Terminal, Ghostty, kitty, Alacritty, WezTerm, Konsole, Xresources, and CSS variables.",
  );
}
