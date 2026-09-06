import { cssVariables, semanticVariables, generateTarget } from "./exporters";
import { fontVariable } from "./preferences";
import { resolve, type Theme, type Appearance } from "./theme";
export type PreviewKind =
  | "framework"
  | "tokens"
  | "editor"
  | "terminal"
  | "music"
  | "chat"
  | "browser"
  | "notes";
export const previewProfiles: Record<
  string,
  { kind: PreviewKind; label: string; variant?: string }
> = {
  css: { kind: "framework", label: "CSS variables" },
  scss: { kind: "framework", label: "Sass / SCSS" },
  tailwind: { kind: "framework", label: "Tailwind CSS" },
  shadcn: { kind: "framework", label: "shadcn/ui" },
  tokens: { kind: "tokens", label: "Design tokens" },
  vscode: { kind: "editor", label: "Visual Studio Code" },
  zed: { kind: "editor", label: "Zed" },
  neovim: { kind: "editor", label: "Neovim", variant: "modal" },
  helix: { kind: "editor", label: "Helix", variant: "modal" },
  sublime: { kind: "editor", label: "Sublime Text" },
  ghostty: { kind: "terminal", label: "Ghostty" },
  kitty: { kind: "terminal", label: "kitty" },
  alacritty: { kind: "terminal", label: "Alacritty" },
  wezterm: { kind: "terminal", label: "WezTerm" },
  "windows-terminal": {
    kind: "terminal",
    label: "Windows Terminal",
    variant: "windows",
  },
  iterm2: { kind: "terminal", label: "iTerm2" },
  warp: { kind: "terminal", label: "Warp", variant: "blocks" },
  foot: { kind: "terminal", label: "foot" },
  termux: { kind: "terminal", label: "Termux", variant: "mobile" },
  xresources: { kind: "terminal", label: "Xresources / xterm" },
  spicetify: { kind: "music", label: "Spicetify" },
  betterdiscord: { kind: "chat", label: "BetterDiscord" },
  vencord: { kind: "chat", label: "Vencord" },
  firefox: { kind: "browser", label: "Firefox" },
  chromium: { kind: "browser", label: "Chrome / Chromium" },
  obsidian: { kind: "notes", label: "Obsidian" },
};
export function previewStyle(
  theme: Theme,
  mode: Appearance,
): Record<string, string> {
  return {
    ...cssVariables(theme, mode),
    ...semanticVariables(theme, mode),
    "--ts-font-sans": `${fontVariable(theme.fonts.sans)},system-ui,sans-serif`,
    "--ts-font-mono": `${fontVariable(theme.fonts.mono)},ui-monospace,monospace`,
    "--radius": `${theme.style.radius}px`,
    colorScheme: mode,
  };
}
// These two previews read the native export itself, so colors follow exporter mappings.
export function nativePreviewColors(
  theme: Theme,
  mode: Appearance,
  target: string,
) {
  const c = resolve(theme, mode),
    result: Record<string, string> = {
      ...c,
      title: c.surface,
      sidebar: c.surface,
      tabs: c.surface,
      status: c.surface,
      statusText: c.foreground,
      terminalBackground: c.background,
      cursor: c.accent,
    };
  if (target === "vscode") {
    const file = generateTarget(
      {
        ...theme,
        name: theme.name.trim() || "My theme",
        author: theme.author.trim() || "You",
      },
      target,
    ).find(
      (f) => f.path.endsWith(`-${mode}.json`) && f.path.startsWith("themes/"),
    );
    if (file) {
      const data = JSON.parse(file.content),
        colors = data.colors;
      Object.assign(result, {
        background: colors["editor.background"],
        foreground: colors["editor.foreground"],
        title: colors["titleBar.activeBackground"],
        sidebar: colors["sideBar.background"],
        tabs: colors["editorGroupHeader.tabsBackground"],
        status: colors["statusBar.background"],
        statusText: colors["statusBar.foreground"],
        terminalBackground: colors["terminal.background"],
        cursor: colors["editorCursor.foreground"],
      });
    }
  }
  if (target === "windows-terminal") {
    const file = generateTarget(
      {
        ...theme,
        name: theme.name.trim() || "My theme",
        author: theme.author.trim() || "You",
      },
      target,
    ).find((f) => f.path.endsWith(`-${mode}.json`));
    if (file) {
      const colors = JSON.parse(file.content),
        names = [
          "black",
          "red",
          "green",
          "yellow",
          "blue",
          "magenta",
          "cyan",
          "white",
        ];
      Object.assign(result, {
        background: colors.background,
        foreground: colors.foreground,
        terminalBackground: colors.background,
        cursor: colors.cursorColor,
        selection: colors.selectionBackground,
      });
      for (let i = 0; i < 16; i++) {
        const n = names[i % 8];
        result[`ansi${i}`] =
          colors[i < 8 ? n : "bright" + n[0].toUpperCase() + n.slice(1)];
      }
    }
  }
  return result;
}
