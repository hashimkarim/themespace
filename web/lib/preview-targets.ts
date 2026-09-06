import { integrationTheme } from "./integration-theme";
import { cssVariables, semanticVariables } from "./exporters";
import { fontVariable } from "./preferences";
import { type Theme, type Appearance } from "./theme";
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
/** Native preview roles are read from each target's actual generated files. */
export function nativePreviewColors(
  theme: Theme,
  mode: Appearance,
  target: string,
) {
  return integrationTheme(theme, mode, target).roles;
}
