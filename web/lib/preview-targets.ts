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
  | "notes"
  | "workspace"
  | "git"
  | "slack"
  | "desktop"
  | "cli";
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
  "t3-code": { kind: "workspace", label: "T3 Code" },
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
  konsole: { kind: "terminal", label: "Konsole" },
  "gnome-terminal": { kind: "terminal", label: "GNOME Terminal" },
  spicetify: { kind: "music", label: "Spicetify" },
  betterdiscord: { kind: "chat", label: "BetterDiscord" },
  vencord: { kind: "chat", label: "Vencord" },
  slack: { kind: "slack", label: "Slack" },
  firefox: { kind: "browser", label: "Firefox" },
  chromium: { kind: "browser", label: "Chrome / Chromium" },
  vivaldi: { kind: "browser", label: "Vivaldi" },
  zen: { kind: "browser", label: "Zen Browser" },
  stylus: { kind: "browser", label: "Stylus userstyles" },
  obsidian: { kind: "notes", label: "Obsidian" },
  gitcomet: { kind: "git", label: "GitComet" },
  smartgit: { kind: "git", label: "SmartGit" },
  gtk: { kind: "desktop", label: "GTK", variant: "gtk" },
  kde: { kind: "desktop", label: "KDE Plasma", variant: "kde" },
  waybar: { kind: "desktop", label: "Waybar", variant: "waybar" },
  rofi: { kind: "desktop", label: "Rofi", variant: "rofi" },
  jetbrains: { kind: "editor", label: "JetBrains IDEs" },
  bat: { kind: "editor", label: "bat / TextMate" },
  tmux: { kind: "cli", label: "tmux", variant: "tmux" },
  zellij: { kind: "cli", label: "Zellij", variant: "zellij" },
  starship: { kind: "cli", label: "Starship", variant: "starship" },
  btop: { kind: "cli", label: "btop", variant: "btop" },
  lazygit: { kind: "cli", label: "Lazygit", variant: "lazygit" },
  hyprland: { kind: "desktop", label: "Hyprland", variant: "hyprland" },
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
