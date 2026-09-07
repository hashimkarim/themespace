import {
  parseTheme,
  presets,
  resolve,
  type Appearance,
  type Theme,
} from "./theme";

export const SETTINGS_KEY = "themespace:settings:v1";
export const GUEST_DRAFT_KEY = "themespace:guest-draft";
export type Preferences = {
  version: 1;
  appearance: "system" | Appearance;
  themeId: string;
  customTheme?: Theme;
  draftTheme?: Theme;
  density: "comfortable" | "compact";
  motion: "system" | "reduced";
  rememberDraft: boolean;
  exportFormat: "bundle" | "repository";
};
export const defaultPreferences: Preferences = {
  version: 1,
  appearance: "system",
  themeId: "default",
  density: "comfortable",
  motion: "system",
  rememberDraft: true,
  exportFormat: "bundle",
};
export function parsePreferences(raw: unknown): Preferences {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { ...defaultPreferences };
  const p = raw as Record<string, unknown>;
  if (p.version !== 1) return { ...defaultPreferences };
  let customTheme: Theme | undefined, draftTheme: Theme | undefined;
  try {
    if (p.draftTheme) draftTheme = parseTheme(p.draftTheme);
  } catch {}
  try {
    if (p.customTheme) customTheme = parseTheme(p.customTheme);
  } catch {}
  return {
    version: 1,
    appearance:
      p.appearance === "light" || p.appearance === "dark"
        ? p.appearance
        : "system",
    themeId:
      p.themeId === "draft"
        ? "draft"
        : p.themeId === "custom" && customTheme
          ? "custom"
          : presets.some((t) => t.id === p.themeId)
            ? String(p.themeId)
            : "default",
    ...(customTheme ? { customTheme } : {}),
    ...(draftTheme ? { draftTheme } : {}),
    density: p.density === "compact" ? "compact" : "comfortable",
    motion: p.motion === "reduced" ? "reduced" : "system",
    rememberDraft: p.rememberDraft !== false,
    exportFormat: p.exportFormat === "repository" ? "repository" : "bundle",
  };
}
export function readPreferences(
  storage: Pick<Storage, "getItem">,
): Preferences {
  try {
    return parsePreferences(
      JSON.parse(storage.getItem(SETTINGS_KEY) || "null"),
    );
  } catch {
    return { ...defaultPreferences };
  }
}
export const fontVariable = (name: string) =>
  (
    ({
      Geist: "var(--font-geist-sans)",
      "Geist Mono": "var(--font-geist-mono)",
      Inter: "var(--preview-inter)",
      "IBM Plex Sans": "var(--preview-plex)",
      "Space Grotesk": "var(--preview-space)",
      "JetBrains Mono": "var(--preview-jetbrains)",
      "IBM Plex Mono": "var(--preview-plex-mono)",
    }) as Record<string, string>
  )[name] || name;
export function draftSnapshot(theme: Theme): Theme {
  return parseTheme({
    ...theme,
    name: theme.name.trim() || "My theme",
    author: theme.author.trim() || "You",
  });
}
export function appliedSiteTheme(settings: Preferences) {
  return settings.themeId === "draft"
    ? settings.draftTheme || presets[0]
    : settings.themeId === "custom"
      ? settings.customTheme
      : presets.find((t) => t.id === settings.themeId);
}
export function siteAppearance(settings: Preferences, system: Appearance) {
  const chosen =
    settings.appearance === "system" ? system : settings.appearance;
  const theme = appliedSiteTheme(settings);
  return theme && !theme.modes[chosen] ? theme.defaultAppearance : chosen;
}
export function siteVariables(
  settings: Preferences,
  system: Appearance,
): Record<string, string> {
  const appearance = siteAppearance(settings, system),
    theme = appliedSiteTheme(settings);
  const defaults =
    appearance === "dark"
      ? {
          bg: "#181923",
          panel: "#20222f",
          soft: "#282b3b",
          board: "#12141e",
          fg: "#e4e2ee",
          muted: "#a3a1b6",
          border: "#363849",
          primary: "#aaa0e8",
          primaryFg: "#201a39",
          input: "#191c28",
        }
      : {
          bg: "#f8f8fa",
          panel: "#ffffff",
          soft: "#f1eef6",
          board: "#eeebf3",
          fg: "#2c2938",
          muted: "#756b81",
          border: "#e5dfed",
          primary: "#7166aa",
          primaryFg: "#ffffff",
          input: "#fdfcfe",
        };
  const c = theme ? resolve(theme, appearance) : undefined;
  return {
    "--app-bg": c?.background || defaults.bg,
    "--app-panel": c?.surface || defaults.panel,
    "--app-soft": c?.elevated || defaults.soft,
    "--app-board": c?.input || defaults.board,
    "--app-fg": c?.foreground || defaults.fg,
    "--app-muted": c?.muted || defaults.muted,
    "--app-border": c?.border || defaults.border,
    "--app-primary": c?.accent || defaults.primary,
    "--app-primary-fill": c?.accentFill || defaults.primary,
    "--app-primary-fg": c?.accentForeground || defaults.primaryFg,
    "--app-input": c?.input || defaults.input,
    "--app-hover": c?.hover || defaults.soft,
    "--app-success":
      c?.success || (appearance === "dark" ? "#8ebda2" : "#4c775e"),
    "--app-warning":
      c?.warning || (appearance === "dark" ? "#d8bb86" : "#8e682e"),
    "--app-error": c?.error || (appearance === "dark" ? "#de939e" : "#b14e60"),
    "--app-overlay": "rgb(7 8 17 / 0.65)",
    "--app-contrast": c?.accentFill || defaults.primary,
    "--app-contrast-fg": c?.accentForeground || defaults.primaryFg,
    "--app-radius": `${theme?.style.radius ?? 9}px`,
    "--app-type-scale": String((theme?.fonts.size ?? 14) / 14),
    "--app-space-scale": String((theme?.style.spacing ?? 4) / 4),
    "--app-shadow": theme
      ? `0 6px 24px rgb(0 0 0 / ${theme.style.shadow})`
      : "none",
    "--app-sans": `${fontVariable(theme?.fonts.sans || "Geist")},system-ui,sans-serif`,
    "--app-mono": `${fontVariable(theme?.fonts.mono || "Geist Mono")},ui-monospace,monospace`,
    "--app-motion":
      settings.motion === "reduced" ? "0ms" : `${theme?.style.motion ?? 150}ms`,
  };
}
// Base appearance is applied before hydration. Stored palette values are applied by the provider.
export const appearanceBootstrap = `try{var p=JSON.parse(localStorage.getItem('${SETTINGS_KEY}')||'{}');var a=p.version===1&&['light','dark'].includes(p.appearance)?p.appearance:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.siteMode=a}catch{}`;

export function createPreferenceStore(
  storage: () => Pick<Storage, "getItem" | "setItem">,
) {
  let raw: string | null | undefined,
    cached: Preferences = { ...defaultPreferences },
    volatile = false;
  return {
    getSnapshot(): Preferences {
      if (volatile) return cached;
      try {
        const next = storage().getItem(SETTINGS_KEY);
        if (next !== raw) {
          raw = next;
          try {
            cached = parsePreferences(JSON.parse(next || "null"));
          } catch {
            cached = { ...defaultPreferences };
          }
        }
      } catch {
        /* Keep a stable in-memory snapshot when reads are unavailable. */
      }
      return cached;
    },
    save(next: Preferences): boolean {
      cached = parsePreferences(next);
      const value = JSON.stringify(cached);
      try {
        storage().setItem(SETTINGS_KEY, value);
        raw = value;
        volatile = false;
        return true;
      } catch {
        volatile = true;
        return false;
      }
    },
    refresh() {
      volatile = false;
      raw = undefined;
    },
  };
}
