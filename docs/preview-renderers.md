# Preview renderers and reference research

ThemeSpace's 26 working integrations now combine reusable frontend components,
real terminal/editor engines, and native-format adapters. The adapter in
`web/lib/integration-theme.ts` reads `generateTarget()` output. It does not evaluate
Lua, import arbitrary theme CSS, or execute source code shown in an editor.

The UI's **About this preview** section identifies the renderer and the generated
files used. Complete native apps are not embedded. Native OS font rasterization,
application plugins, custom CSS and later client updates can change the result.

## Spotify and Discord clones

| Project reviewed | Decision |
| --- | --- |
| [Franco Borrelli's Spotify React client](https://github.com/francoborrelli/spotify-react-web-client) | Adopted its MIT presentation patterns and components: navbar, library/content/queue/player layout, Encore chips, song table, player/cover styling. Replaced Redux, authentication and Spotify SDK calls with local data. |
| [Leonardo Ronne's Discord UI clone](https://github.com/leoronne/discord-ui-clone) | Adopted its MIT named grid layout, server/channel rails, member rail, profile strip and composer structure. Converted styled-components to scoped CSS with preview-container breakpoints. |
| [Discord Message Kit](https://github.com/BF-GO/discord-message-kit) | Installed its MIT React components for rich messages, Markdown, mentions, timestamps and embeds. Bundled avatars and disabled font injection; no Discord API connection. |
| [twlite's Discord UI clone](https://github.com/twlite/discord-ui-clone) | MIT, but largely a sidebar/server-rail shell; less complete for this task. |
| [Gibbu's ThemePreview](https://github.com/Gibbu/ThemePreview) | Useful reference for Discord theme previews, but no repository license was found during this review; no source was copied. |
| [JL978's Spotify clone](https://github.com/JL978/spotify-clone-client), [Pau1fitz's React Spotify](https://github.com/Pau1fitz/react-spotify) | Alternatives reviewed; chose Franco's TypeScript frontend and its more recent multi-panel layout. |

Pinned commits, adapted file paths, changes and complete license notices are in
[`web/components/clones/README.md`](../web/components/clones/README.md). These are
community implementations with fictional local data. Spotify playback is silent;
Discord messages and microphone/voice controls affect the local fixture only.

Spicetify maps its [`color.ini` roles](https://spicetify.app/docs/development/themes)
to `--spice-*` and `--spice-rgb-*`; the preview also consumes the radius declarations
actually emitted into `user.css`. Both Discord integrations consume their own
export's `.theme-dark` or `.theme-light` declarations. Message Kit's component
variables map onto those Discord variables.

## Terminal coverage

| Integration | Engine | Native file consumed |
| --- | --- | --- |
| Ghostty | [ghostty-web](https://github.com/coder/ghostty-web) 0.4.0, Ghostty VT compiled to WebAssembly | Ghostty key/value config and 16 `palette` entries |
| kitty | [xterm.js](https://xtermjs.org/) 6.0.0 | kitty `.conf` |
| Alacritty | xterm.js | `[colors]` TOML |
| WezTerm | xterm.js | Color-scheme TOML |
| Windows Terminal | xterm.js | Scheme JSON |
| iTerm2 | xterm.js | `.itermcolors` sRGB plist |
| Warp | xterm.js, reconstructed command-block header | Warp YAML |
| foot | xterm.js | `[colors]` INI |
| Termux | xterm.js, Android frame and working extra keys | `colors.properties` |
| Xresources / xterm | xterm.js | Xresources color entries |

All ten previews use real ANSI output and input events, not colored HTML text.
They include 16-color swatches, bold/italic/underline/inverse, build output, diffs,
Unicode, text selection, cursor movement, command history and bounded local commands.
The local session has no PTY, subprocess or network access. Tabs/splits are offered
where appropriate; Alacritty, foot and Xresources examples have simple windows.

Fonts are host font stacks rather than the design system's exported website font.
Terminal theme formats which omit cursor/selection fields leave those fields unset
in the engine's theme. A Windows Terminal color scheme does not configure its
separate app theme; its example chrome remains neutral. xterm.js emulates terminal
output, not the individual native GPU renderers or every escape-sequence extension.

Ghostty 0.4.0 does not apply `options.theme` after opening. Palette changes recreate
the canvas renderer and replay a bounded ANSI transcript while retaining local
command state and focus. The WebAssembly module is bundled locally and shared
between simultaneous Ghostty previews. Palettes with pure-black foreground/background use xterm.js: this Ghostty release
treats numeric zero as an unset default and cannot apply OSC color updates. The
visible engine badge reflects this fallback; exported Ghostty files are unaffected.

## Editors, notes, browsers and web frameworks

| Integration | Implementation and limits |
| --- | --- |
| VS Code | [Monaco](https://github.com/microsoft/monaco-editor) 0.56.0 standalone editor, find and diff views, with exact exported workbench/editor color values. Monarch tokens map exported syntax roles. Workbench UI is reconstructed; no TextMate grammar, extension host or language server. |
| Zed | CodeMirror 6 with Zed JSON appearance/style/syntax mapping, a reconstructed project panel and optional xterm terminal. Zed's native GPUI app does not supply a browser renderer. |
| Neovim | CodeMirror reads generated Lua highlight declarations as data. Terminal-style shell; browser editing keys, without native Vim behavior or plugins. |
| Helix | CodeMirror maps TOML `ui.*` and syntax roles. Terminal-style shell; browser editing keys replace Helix's modal keymap. |
| Sublime Text | CodeMirror maps JSON globals/scopes. Neutral sidebar and tabs because a [color scheme is separate from a UI theme](https://www.sublimetext.com/docs/color_schemes.html). |
| Obsidian | CodeMirror 6, which [Obsidian uses for editing](https://docs.obsidian.md/Plugins/Editor/Editor), plus React Markdown for reading. Theme CSS supplies editor colors and fonts. Vault/graph/backlinks are illustrative; Obsidian's live-preview extensions and plugins are absent. |
| Firefox | Reconstructed browser UI driven by [theme manifest colors](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme), including menus/sidebar and new-tab fields. |
| Chromium | Reconstructed browser UI driven by [theme manifest colors](https://developer.chrome.com/docs/extensions/develop/ui/themes), including RGB-array conversion and new-tab fields. Ordinary web content remains independently styled. |
| CSS, Sass, Tailwind CSS | Existing shared interactive HTML fixture with generated CSS tokens; export tests compile Sass and Tailwind output. |
| shadcn/ui | Existing official shadcn React/Radix components with generated semantic variables and scoped portals. |
| DTCG tokens | Searchable colors read from the generated token JSON, including explicit overrides. |

Editor engines load on demand in a same-origin iframe. Monaco's global theme
service therefore cannot recolor another open preview. Messages require matching
origin and frame identity, validate the ThemeSpace document, and limit source
text size. Workers, WASM and renderer scripts are served by the app, not a CDN.

## Verification

- Native adapter tests cover all 26 targets, both appearances, all terminal ANSI
  entries, absent settings, comments before CSS selectors, and independently
  modified export fields so fallback palette values cannot hide mapping failures.
- Headless xterm and the real bundled Ghostty WASM core parse ANSI samples and
  exercise indexed colors, text styles, input editing, Unicode and resize.
- JSDOM exercises Spotify search/queue/likes and Discord channels, messages,
  reactions, member controls and appearance updates using installed components.
- Existing exporter, shadcn and preference tests remain in place; production
  build/type checking/lint and local HTTP route/asset checks cover bundling.

Browser screenshots, real-browser engine interaction and native client
installation checks were not performed in this task.
