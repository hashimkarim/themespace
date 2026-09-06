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
};
