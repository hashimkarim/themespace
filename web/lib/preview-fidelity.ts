export type PreviewFidelity = {
  renderer: string;
  coverage: string;
  limitations: string;
  url: string;
};
const terminal = (format: string, extra = ""): PreviewFidelity => ({
  renderer: "xterm.js · real ANSI renderer",
  coverage: `Reads the generated ${format} for foreground, background, 16 ANSI colors and any exported cursor/selection settings. Try Colors, Styles, Unicode, typing and selecting text.`,
  limitations:
    `Window controls are reconstructed. Font, sizing, glyph shaping and terminal behavior can differ from the native client. Settings absent from the export use renderer defaults. ${extra}`.trim(),
  url: "https://xtermjs.org/",
});
const editor = (name: string, url: string): PreviewFidelity => ({
  renderer: "CodeMirror 6 · editable syntax preview",
  coverage: `Reads ${name}'s generated theme for editor surfaces, selection, syntax and the supported application chrome. Type or select text, switch files, and try undo.`,
  limitations: `The application shell is reconstructed. CodeMirror's grammar and browser keymap replace ${name}'s native parser and commands; plugins, semantic highlighting and native font rendering are not emulated.`,
  url,
});
const framework = (name: string, url: string): PreviewFidelity => ({
  renderer: `${name} · live component fixture`,
  coverage:
    "Real HTML controls styled with the generated CSS token contract, including light and dark appearances.",
  limitations:
    "Application layouts are examples. Framework-specific build output is validated by export tests.",
  url,
});
export const previewFidelity: Record<string, PreviewFidelity> = {
  css: framework(
    "CSS",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties",
  ),
  scss: framework("Sass", "https://sass-lang.com/documentation/"),
  tailwind: framework("Tailwind CSS", "https://tailwindcss.com/docs/theme"),
  shadcn: {
    renderer: "shadcn/ui · real components",
    coverage:
      "Official shadcn/ui components with Radix behavior, styled by your exported theme variables.",
    limitations:
      "These examples use the New York style. Components you customize in your app may differ.",
    url: "https://ui.shadcn.com/docs/theming",
  },
  tokens: {
    renderer: "DTCG · generated token inspector",
    coverage:
      "Displays color values read directly from the generated DTCG JSON document.",
    limitations:
      "This view covers color tokens. The export also includes fonts, dimensions and motion duration.",
    url: "https://www.designtokens.org/tr/2025.10/format/",
  },
  vscode: {
    renderer: "Monaco · VS Code's browser editor",
    coverage:
      "An editable Monaco editor, find widget and diff view using the generated VS Code editor colors, plus an optional xterm.js terminal. Select Source Control for the diff.",
    limitations:
      "The workbench is reconstructed. Monaco uses a browser grammar here, so TextMate scopes, extensions and language-server semantic highlighting can differ from desktop VS Code.",
    url: "https://github.com/microsoft/monaco-editor",
  },
  zed: editor("Zed", "https://zed.dev/docs/themes"),
  neovim: editor("Neovim", "https://neovim.io/doc/user/api.html#nvim_set_hl()"),
  helix: editor("Helix", "https://docs.helix-editor.com/themes.html"),
  sublime: {
    ...editor(
      "Sublime Text",
      "https://www.sublimetext.com/docs/color_schemes.html",
    ),
    limitations:
      "A color scheme styles the editor; Sublime's separate UI theme controls its sidebar and tabs. The example uses neutral UI chrome and a CodeMirror grammar/browser keymap.",
  },
  ghostty: {
    renderer: "Ghostty VT · WebAssembly",
    coverage:
      "ghostty-web runs a WebAssembly build of Ghostty's terminal core. The generated Ghostty configuration supplies all 16 ANSI colors, background, foreground, cursor and selection. Try typing, text selection and the sample scenes.",
    limitations:
      "The browser canvas renderer and reconstructed window are different from Ghostty's native GPU renderer. Fonts and some terminal capabilities can differ. Pure-black foreground/background palettes use xterm.js because this Ghostty browser release cannot apply those defaults.",
    url: "https://github.com/coder/ghostty-web",
  },
  kitty: terminal("kitty .conf"),
  alacritty: terminal(
    "Alacritty TOML",
    "Alacritty's window has no built-in tabs or split panes.",
  ),
  wezterm: terminal("WezTerm color-scheme TOML"),
  "windows-terminal": terminal(
    "Windows Terminal scheme JSON",
    "A color scheme does not set Windows Terminal's separate application theme.",
  ),
  iterm2: terminal("iTerm2 .itermcolors"),
  warp: terminal(
    "Warp YAML",
    "Warp's command-block header is reconstructed; its native block editor and AI features are not included.",
  ),
  foot: terminal("foot INI"),
  termux: terminal(
    "Termux colors.properties",
    "The Android frame and extra-key row are reconstructed; Android's keyboard and font rasterizer are not included.",
  ),
  xresources: terminal("Xresources"),
  spicetify: {
    renderer: "Spotify frontend clone · interactive",
    coverage:
      "Adapted from Franco Borrelli's MIT-licensed Spotify React client. The library, playlist, queue and playback controls use local data. Colors and exported radius variables come from color.ini and user.css.",
    limitations:
      "This community frontend reconstructs Spotify's UI. Playback is silent and there is no Spotify connection. Client updates, extensions and custom Spicetify CSS can change the installed result.",
    url: "https://github.com/francoborrelli/spotify-react-web-client",
  },
  betterdiscord: {
    renderer: "Discord frontend clone · rich messages",
    coverage:
      "Adapted from Leonardo Ronne's MIT-licensed Discord UI clone with Discord Message Kit for mentions, Markdown and embeds. Surfaces consume the generated Discord theme variables. Channels, composer and message display work locally.",
    limitations:
      "This is a community reconstruction. Discord may change private CSS variables or layouts; BetterDiscord plugins and custom CSS are not loaded.",
    url: "https://github.com/leoronne/discord-ui-clone",
  },
  vencord: {
    renderer: "Discord frontend clone · rich messages",
    coverage:
      "Uses the same Discord frontend adaptation and message components as BetterDiscord, with the generated Vencord theme variables. Channels and sample messages work locally.",
    limitations:
      "This is a community reconstruction. Discord may change private CSS variables or layouts; Vencord plugins and custom CSS are not loaded.",
    url: "https://github.com/leoronne/discord-ui-clone",
  },
  firefox: {
    renderer: "Firefox · manifest-driven reconstruction",
    coverage:
      "Tab strip, toolbar, address field and new-tab surfaces read colors from the generated Firefox theme manifest. Switch to Example website to compare browser chrome with page content.",
    limitations:
      "Browser chrome cannot run inside a web page. Layout, OS decorations and the new-tab layout are reconstructed; this is not a Firefox instance.",
    url: "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme",
  },
  chromium: {
    renderer: "Chromium · manifest-driven reconstruction",
    coverage:
      "Tab strip, toolbar and new-tab colors read the generated Chromium theme manifest. The example website retains its own colors.",
    limitations:
      "Browser chrome cannot run inside a web page. Layout and OS decorations are reconstructed; a theme extension does not style every Chrome surface.",
    url: "https://developer.chrome.com/docs/extensions/develop/ui/themes",
  },
  obsidian: {
    renderer: "CodeMirror 6 · Markdown editor",
    coverage:
      "Uses the same editor library as Obsidian, with the generated theme's CSS variables and fonts. Edit multiple notes, select text, or switch to the rendered Markdown view.",
    limitations:
      "The vault, backlinks and graph are reconstructed. Obsidian's live-preview extensions, plugins and custom Markdown syntax are not loaded.",
    url: "https://docs.obsidian.md/Plugins/Editor/Editor",
  },
  konsole: terminal(
    "Konsole .colorscheme",
    "Konsole's colorscheme format defines background, foreground, and 16 ANSI colors; cursor and selection follow terminal defaults.",
  ),
  "gnome-terminal": terminal("GNOME Terminal dconf profile"),
  "t3-code": {
    renderer: "T3 Code · workspace & terminal preview",
    coverage:
      "Reads the generated T3 Code theme JSON directly for sidebar, toolbar, message surfaces, code blocks, composer, and the integrated xterm.js terminal.",
    limitations:
      "The workspace shell is reconstructed from T3 Code's color role contract; custom CSS overrides and desktop window chrome are not emulated here.",
    url: "https://github.com/pingdotgg/t3code",
  },
  vivaldi: {
    renderer: "Vivaldi · settings.json reconstruction",
    coverage:
      "Reads window background, toolbar, foreground, accent, and highlight tokens from the generated Vivaldi settings.json file.",
    limitations:
      "Browser chrome cannot run inside a web page. Vivaldi's custom tab stacking, web panels, and background wallpaper settings are not emulated.",
    url: "https://help.vivaldi.com/desktop/appearance-customization/browser-themes/",
  },
  zen: {
    renderer: "Zen Browser · userChrome.css reconstruction",
    coverage:
      "Reads the generated --zen-* and toolbar CSS custom properties from userChrome.css for sidebar, toolbar, URL bar, and tab highlights.",
    limitations:
      "Browser chrome cannot run inside a web page. Zen's vertical tab layouts, workspaces, and gradient mods are reconstructed locally.",
    url: "https://docs.zen-browser.app/mods/zen-mods",
  },
  stylus: {
    renderer: "Stylus · UserCSS website preview",
    coverage:
      "Applies the generated UserCSS custom properties and base rules directly to the Example website tab so you can compare page content against browser chrome.",
    limitations:
      "Real websites have varied markup and specificity; the exported UserCSS is a clean starting template you can scope and extend per domain.",
    url: "https://github.com/openstyles/stylus/wiki/Writing-UserCSS",
  },
  gitcomet: {
    renderer: "GitComet · commit graph & diff preview",
    coverage:
      "Reads surfaces, selection, 5 branch graph lane colors, and diff additions/deletions directly from the generated GitComet JSON theme.",
    limitations:
      "The repository view is an interactive local reconstruction; real Git operations and native widget rendering are not emulated.",
    url: "https://github.com/Auto-Explore/GitComet/blob/main/docs/themes.md",
  },
  smartgit: {
    renderer: "SmartGit · patch-theme Git preview",
    coverage:
      "Reads window, control, selection, diff, and branch lane values directly from the generated SmartGit dark-patch.theme and light-patch.theme files.",
    limitations:
      "The Git client UI is reconstructed locally; native Swing/SWT platform chrome and third-party icons can differ on desktop.",
    url: "https://docs.syntevo.com/SmartGit/Latest/Manual/GUI/AdvancedSettings/Theme-Customization",
  },
  slack: {
    renderer: "Slack · custom theme workspace preview",
    coverage:
      "Reads column background, active item, presence indicator, mention badge, and hover colors from the generated Slack theme export.",
    limitations:
      "Slack custom themes style workspace navigation chrome; message canvas typography and enterprise branding remain controlled by Slack.",
    url: "https://slack.com/help/articles/205166337-Change-your-Slack-theme",
  },
  gtk: {
    renderer: "GTK 4 · desktop window reconstruction",
    coverage:
      "Reads @define-color declarations from gtk-4.0/gtk.css for window, headerbar, sidebar, cards, accent buttons, and semantic statuses.",
    limitations:
      "Native GTK/libadwaita widget geometry, shadows, and icon themes depend on your Linux desktop environment.",
    url: "https://docs.gtk.org/gtk4/css-overview.html",
  },
  kde: {
    renderer: "KDE Plasma · .colors scheme reconstruction",
    coverage:
      "Reads [Colors:Window], [Colors:View], [Colors:Button], [Colors:Selection], and [WM] RGB triplets directly from the exported .colors file.",
    limitations:
      "Desktop window decorations, Breeze widget metrics, and Plasma panel applets are reconstructed locally in the browser.",
    url: "https://develop.kde.org/docs/plasma/",
  },
  waybar: {
    renderer: "Waybar · Wayland status bar preview",
    coverage:
      "Reads @define-color tokens from colors-*.css for the top status bar, active workspace pill, and system status modules.",
    limitations:
      "Module layout and system icons depend on your local Waybar JSON config and Nerd Font installation.",
    url: "https://github.com/Alexays/Waybar/wiki/Styling",
  },
  rofi: {
    renderer: "Rofi · interactive launcher preview",
    coverage:
      "Reads palette and radius tokens directly from the generated .rasi file for the launcher window, search input bar, and selected row.",
    limitations:
      "Launcher search runs locally over sample applications; native X11/Wayland compositor blur and system icon packs are not emulated.",
    url: "https://github.com/davatorium/rofi/blob/next/doc/rofi-theme.5.markdown",
  },
  jetbrains: {
    renderer: "CodeMirror 6 · JetBrains .icls preview",
    coverage:
      "Parses TEXT, CARET_COLOR, SELECTION_BACKGROUND, GUTTER_BACKGROUND, and syntax attributes directly from the exported .icls XML file.",
    limitations:
      "JetBrains IDE tool windows and Darcula/Light UI chrome are separate from .icls editor color schemes; this preview focuses on the editor and gutter.",
    url: "https://www.jetbrains.com/help/idea/configuring-colors-and-fonts.html",
  },
  bat: {
    renderer: "CodeMirror 6 · TextMate .tmTheme preview",
    coverage:
      "Reads editor settings and comment, keyword, string, number, function, type, and diff scopes directly from the exported .tmTheme XML plist.",
    limitations:
      "Real TextMate grammars vary per language; this preview demonstrates the exported syntax tokens inside CodeMirror.",
    url: "https://github.com/sharkdp/bat#adding-new-themes",
  },
  tmux: {
    renderer: "xterm.js · truecolor tmux preview",
    coverage:
      "Renders real 24-bit ANSI escape sequences inside xterm.js using status-style, window-status-current-style, pane-border-style, pane-active-border-style, and mode-style parsed from the exported .conf file.",
    limitations:
      "Shows a real xterm.js rendering of tmux's panes and status bar; live shell multiplexing and tmux plugins are not executed in the browser.",
    url: "https://github.com/tmux/tmux/wiki/Getting-Started",
  },
  zellij: {
    renderer: "xterm.js · truecolor Zellij 0.40+ preview",
    coverage:
      "Renders real 24-bit ANSI escape sequences inside xterm.js using the text_unselected, ribbon_selected, frame_selected, and exit_code RGB triplets parsed from the exported .kdl file.",
    limitations:
      "Shows a real xterm.js rendering of Zellij's frames and tab ribbon; native Zellij plugins and custom layouts are not executed in the browser.",
    url: "https://zellij.dev/documentation/themes",
  },
  starship: {
    renderer: "xterm.js · truecolor Starship prompt preview",
    coverage:
      "Renders real 24-bit ANSI escape sequences inside xterm.js using the named [palettes.*] table parsed from the exported Starship TOML config.",
    limitations:
      "Shows representative prompt segments inside xterm.js; Nerd Font glyphs and your local Starship module order depend on your shell environment.",
    url: "https://starship.rs/config/#palettes",
  },
  btop: {
    renderer: "xterm.js · truecolor btop++ preview",
    coverage:
      "Renders real 24-bit ANSI escape sequences and Unicode Braille graphs inside xterm.js using main_bg, main_fg, hi_fg, selected_bg, box borders, and gradient stops parsed from the exported .theme file.",
    limitations:
      "Displays realistic Braille CPU/memory curves and process rows inside xterm.js; live OS telemetry is simulated locally.",
    url: "https://github.com/aristocratos/btop#themes",
  },
  lazygit: {
    renderer: "xterm.js · truecolor Lazygit TUI preview",
    coverage:
      "Renders real 24-bit ANSI escape sequences inside xterm.js using activeBorderColor, inactiveBorderColor, selectedLineBgColor, unstagedChangesColor, and defaultFgColor parsed from the exported YAML config.",
    limitations:
      "Displays a real xterm.js rendering of Lazygit's multi-panel TUI layout; live Git commands and custom keybindings run locally on your machine.",
    url: "https://github.com/jesseduffield/lazygit/blob/master/docs/Config.md#color-attributes",
  },
  hyprland: {
    renderer: "Hyprland · compositor borders & rounding preview",
    coverage:
      "Reads $ts_bg, $ts_surface, $ts_accent, $ts_accent2, $ts_border, and rounding tokens directly from the generated Hyprland .conf file.",
    limitations:
      "Reconstructs active gradient borders and tiled window chrome locally; real Wayland blur, animations, and shader effects run only in Hyprland.",
    url: "https://wiki.hyprland.org/Configuring/Variables/",
  },
};
