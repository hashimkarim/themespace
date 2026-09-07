import {
  parseTheme,
  resolve,
  rgb,
  slugify,
  type Appearance,
  type Resolved,
  type Theme,
} from "./theme.js";
import { componentDocument } from "./component-fixtures.js";
import { getTarget } from "./targets.js";

export type ThemeFile = { path: string; content: string };
export const generatorVersion = "0.1.0";
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const clean = (value: string) =>
  value.replace(/\*\//g, "* /").replace(/[\r\n]/g, " ");
const kebab = (value: string) =>
  value.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const ansiNames = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
];
const appearanceList = (theme: Theme): Appearance[] =>
  (["light", "dark"] as const).filter((mode) => theme.modes[mode]);
const syntax = (c: Resolved) => ({
  keyword: c.syntaxKeyword,
  string: c.syntaxString,
  number: c.syntaxNumber,
  function: c.syntaxFunction,
  type: c.syntaxType,
  comment: c.syntaxComment,
  variable: c.foreground,
  constant: c.syntaxNumber,
  operator: c.accent,
  punctuation: c.muted,
});
const comment = (theme: Theme) =>
  `/* ${clean(theme.name)} by ${clean(theme.author)} · Generated with ThemeSpace ${generatorVersion} */\n`;
export function cssVariables(theme: Theme, mode: Appearance) {
  const c = resolve(theme, mode);
  return {
    ...Object.fromEntries(
      Object.entries(c).map(([key, value]) => [`--ts-${kebab(key)}`, value]),
    ),
    "--ts-font-sans":
      theme.fonts.sans === "system-ui"
        ? "system-ui, sans-serif"
        : `"${theme.fonts.sans}", system-ui, sans-serif`,
    "--ts-font-mono":
      theme.fonts.mono === "ui-monospace"
        ? "ui-monospace, monospace"
        : `"${theme.fonts.mono}", ui-monospace, monospace`,
    "--ts-font-size": `${theme.fonts.size}px`,
    "--ts-radius": `${theme.style.radius}px`,
    "--ts-spacing": `${theme.style.spacing}px`,
    "--ts-shadow": `0 6px 24px rgb(0 0 0 / ${theme.style.shadow})`,
    "--ts-motion": `${theme.style.motion}ms`,
  };
}
function cssBlock(selector: string, values: Record<string, string>) {
  return `${selector} {\n${Object.entries(values)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n")}\n}\n`;
}
export function cssOutput(theme: Theme) {
  return (
    comment(theme) +
    appearanceList(theme)
      .map((mode) =>
        cssBlock(
          `${mode === theme.defaultAppearance ? ":root, " : ""}[data-theme="${mode}"]`,
          { "color-scheme": mode, ...cssVariables(theme, mode) },
        ),
      )
      .join("\n")
  );
}
export function semanticVariables(theme: Theme, mode: Appearance) {
  const c = resolve(theme, mode);
  const values: Record<string, string> = {
    background: c.background,
    foreground: c.foreground,
    card: c.elevated,
    "card-foreground": c.foreground,
    popover: c.elevated,
    "popover-foreground": c.foreground,
    primary: c.accentFill,
    "primary-foreground": c.accentForeground,
    secondary: c.surface,
    "secondary-foreground": c.foreground,
    muted: c.surface,
    "muted-foreground": c.muted,
    accent: c.hover,
    "accent-foreground": c.foreground,
    "accent-2": c.accent2,
    "accent-2-foreground": c.accent2Foreground,
    "accent-3": c.accent3,
    "accent-3-foreground": c.accent3Foreground,
    destructive: c.error,
    "destructive-foreground": contrastForeground(c.error),
    border: c.border,
    input: c.border,
    ring: c.focus,
    sidebar: c.surface,
    "sidebar-foreground": c.foreground,
    "sidebar-primary": c.accentFill,
    "sidebar-primary-foreground": c.accentForeground,
    "sidebar-accent": c.selection,
    "sidebar-accent-foreground": c.selectionForeground,
    "sidebar-border": c.border,
    "sidebar-ring": c.focus,
    success: c.success,
    "success-foreground": contrastForeground(c.success),
    warning: c.warning,
    "warning-foreground": contrastForeground(c.warning),
  };
  for (let i = 1; i <= 5; i++) values[`chart-${i}`] = c[`chart${i}`];
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [`--${key}`, value]),
  );
}
import { readableOn as contrastForeground } from "./theme.js";
function tailwindMappings(theme: Theme) {
  const colors = Object.keys(semanticVariables(theme, theme.defaultAppearance))
    .map((k) => `  --color-${k.slice(2)}: var(${k});`)
    .join("\n");
  return `@theme inline {\n${colors}\n  --font-sans: var(--ts-font-sans);\n  --font-mono: var(--ts-font-mono);\n  --radius-sm: calc(var(--ts-radius) * 0.6);\n  --radius-md: calc(var(--ts-radius) * 0.8);\n  --radius-lg: var(--ts-radius);\n  --radius-xl: calc(var(--ts-radius) * 1.4);\n  --spacing: var(--ts-spacing);\n  --text-base: var(--ts-font-size);\n  --shadow-theme: var(--ts-shadow);\n  --default-transition-duration: var(--ts-motion);\n}\n`;
}
function frameworkCSS(theme: Theme, shadcn: boolean) {
  const blocks = appearanceList(theme)
    .map((mode) => {
      const selectors = [
        `[data-theme="${mode}"]`,
        ...(mode === theme.defaultAppearance ? [":root"] : []),
        ...(mode === "dark" ? [".dark"] : [".light"]),
      ];
      return cssBlock(selectors.join(", "), {
        "color-scheme": mode,
        ...cssVariables(theme, mode),
        ...semanticVariables(theme, mode),
        "--radius": `${theme.style.radius}px`,
      });
    })
    .join("\n");
  return `${comment(theme)}/* Import after @import "tailwindcss"; in your application. */\n@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));\n\n${blocks}\n${tailwindMappings(theme)}${shadcn ? "\n/* Keeps your existing components, resets, and base styles. */\n" : ""}`;
}
function scss(theme: Theme) {
  return (
    `${comment(theme)}@use "sass:map";\n\n` +
    appearanceList(theme)
      .map(
        (mode) =>
          `$colors-${mode}: (\n${Object.entries(resolve(theme, mode))
            .map(([key, value]) => `  "${kebab(key)}": ${value},`)
            .join("\n")}\n);\n`,
      )
      .join("\n") +
    `\n$font-sans: ${JSON.stringify(theme.fonts.sans)};\n$font-mono: ${JSON.stringify(theme.fonts.mono)};\n$font-size: ${theme.fonts.size}px;\n$radius: ${theme.style.radius}px;\n$spacing: ${theme.style.spacing}px;\n$shadow: 0 6px 24px rgb(0 0 0 / ${theme.style.shadow});\n$motion: ${theme.style.motion}ms;\n$appearances: (${appearanceList(
      theme,
    )
      .map((mode) => `"${mode}": $colors-${mode}`)
      .join(
        ", ",
      )});\n\n@mixin emit($appearance: "${theme.defaultAppearance}") {\n  @if not map.has-key($appearances, $appearance) { @error "Appearance not exported: #{$appearance}"; }\n  @each $role, $value in map.get($appearances, $appearance) {\n    --ts-#{$role}: #{$value};\n  }\n  --ts-font-sans: #{$font-sans}, system-ui, sans-serif;\n  --ts-font-mono: #{$font-mono}, ui-monospace, monospace;\n  --ts-font-size: #{$font-size};\n  --ts-radius: #{$radius};\n  --ts-spacing: #{$spacing};\n  --ts-shadow: #{$shadow};\n  --ts-motion: #{$motion};\n}\n`
  );
}
function tokenJSON(theme: Theme, mode: Appearance) {
  return json({
    colors: Object.fromEntries(
      Object.entries(resolve(theme, mode)).map(([key, color]) => [
        key,
        {
          $type: "color",
          $value: {
            colorSpace: "srgb",
            components: rgb(color).map((c) => c / 255),
            alpha: 1,
            hex: color,
          },
        },
      ]),
    ),
    radius: {
      $type: "dimension",
      $value: { value: theme.style.radius, unit: "px" },
    },
    spacing: {
      $type: "dimension",
      $value: { value: theme.style.spacing, unit: "px" },
    },
    fontSize: {
      $type: "dimension",
      $value: { value: theme.fonts.size, unit: "px" },
    },
    fontSans: { $type: "fontFamily", $value: [theme.fonts.sans, "sans-serif"] },
    fontMono: { $type: "fontFamily", $value: [theme.fonts.mono, "monospace"] },
    motion: {
      $type: "duration",
      $value: { value: theme.style.motion, unit: "ms" },
    },
  });
}
function vscodeColors(c: Resolved) {
  const groups: Record<string, string[]> = {
    background: [
      "editor.background",
      "editorGutter.background",
      "sideBarSectionHeader.background",
      "panel.background",
      "peekViewEditor.background",
    ],
    surface: [
      "sideBar.background",
      "activityBar.background",
      "titleBar.activeBackground",
      "titleBar.inactiveBackground",
      "statusBar.background",
      "tab.inactiveBackground",
      "editorGroupHeader.tabsBackground",
    ],
    elevated: [
      "editorWidget.background",
      "dropdown.background",
      "menu.background",
      "quickInput.background",
      "notificationCenterHeader.background",
      "notifications.background",
    ],
    foreground: [
      "foreground",
      "editor.foreground",
      "sideBar.foreground",
      "activityBar.foreground",
      "titleBar.activeForeground",
      "statusBar.foreground",
      "tab.activeForeground",
      "input.foreground",
      "dropdown.foreground",
      "menu.foreground",
      "notifications.foreground",
    ],
    muted: [
      "descriptionForeground",
      "editorLineNumber.foreground",
      "tab.inactiveForeground",
      "input.placeholderForeground",
    ],
    accent: [
      "focusBorder",
      "textLink.foreground",
      "progressBar.background",
      "editorCursor.foreground",
      "editorLink.activeForeground",
    ],
    accentFill: ["button.background", "activityBarBadge.background"],
    accentForeground: ["button.foreground", "activityBarBadge.foreground"],
    input: ["input.background"],
    border: [
      "editorGroup.border",
      "panel.border",
      "sideBar.border",
      "input.border",
      "dropdown.border",
      "widget.border",
      "menu.border",
      "editorIndentGuide.background1",
    ],
    selection: [
      "editor.selectionBackground",
      "list.activeSelectionBackground",
      "list.inactiveSelectionBackground",
    ],
    selectionForeground: ["list.activeSelectionForeground"],
    hover: ["list.hoverBackground", "toolbar.hoverBackground"],
    success: [
      "gitDecoration.addedResourceForeground",
      "gitDecoration.untrackedResourceForeground",
      "editorGutter.addedBackground",
    ],
    error: [
      "errorForeground",
      "editorError.foreground",
      "gitDecoration.deletedResourceForeground",
      "editorGutter.deletedBackground",
    ],
    warning: [
      "editorWarning.foreground",
      "gitDecoration.modifiedResourceForeground",
      "editorGutter.modifiedBackground",
    ],
  };
  const out: Record<string, string> = {};
  for (const [role, keys] of Object.entries(groups))
    for (const key of keys) out[key] = c[role];
  out["diffEditor.insertedTextBackground"] = c.success + "25";
  out["diffEditor.removedTextBackground"] = c.error + "25";
  for (let i = 0; i < 16; i++)
    out[
      `terminal.ansi${i >= 8 ? "Bright" : ""}${ansiNames[i % 8][0].toUpperCase() + ansiNames[i % 8].slice(1)}`
    ] = c[`ansi${i}`];
  out["terminal.background"] = c.background;
  out["terminal.foreground"] = c.foreground;
  return out;
}
function discord(theme: Theme, mode: Appearance) {
  const c = resolve(theme, mode);
  const vars: Record<string, string> = {
    "--background-primary": c.background,
    "--background-secondary": c.surface,
    "--background-secondary-alt": c.surface,
    "--background-tertiary": c.surface,
    "--background-floating": c.elevated,
    "--background-base-lowest": c.surface,
    "--background-base-lower": c.background,
    "--background-base-low": c.background,
    "--background-surface-high": c.elevated,
    "--background-surface-higher": c.elevated,
    "--background-surface-highest": c.elevated,
    "--text-normal": c.foreground,
    "--text-primary": c.foreground,
    "--text-default": c.foreground,
    "--text-muted": c.muted,
    "--text-secondary": c.muted,
    "--text-link": c.accent,
    "--header-primary": c.foreground,
    "--header-secondary": c.muted,
    "--interactive-normal": c.muted,
    "--interactive-hover": c.foreground,
    "--interactive-active": c.foreground,
    "--channeltextarea-background": c.input,
    "--background-modifier-hover": c.hover,
    "--background-modifier-selected": c.selection,
    "--channels-default": c.muted,
    "--brand-500": c.accent,
    "--brand-560": c.accent,
    "--brand-600": c.accent,
    "--button-positive-background": c.success,
    "--status-positive": c.success,
    "--status-danger": c.error,
    "--status-warning": c.warning,
    "--scrollbar-auto-track": c.surface,
    "--scrollbar-auto-thumb": c.border,
    "--scrollbar-thin-thumb": c.border,
    "--background-accent": c.accent,
  };
  return (
    `/**\n * @name ${clean(theme.name)} ${mode}\n * @author ${clean(theme.author)}\n * @description ${clean(theme.description)}\n * @version ${generatorVersion}\n */\n/* Experimental: Discord may rename variables after client updates. */\n` +
    cssBlock(`.theme-${mode}, .theme-${mode} :not(code)`, vars)
  );
}
export function generateTarget(source: Theme, targetId: string): ThemeFile[] {
  const theme = parseTheme(source),
    target = getTarget(targetId);
  if (target.status !== "export")
    throw new Error(`${target.name} is planned and has no exporter yet.`);
  const files: ThemeFile[] = [];
  const add = (path: string, content: string) => files.push({ path, content });
  const modes = appearanceList(theme),
    slug = slugify(theme.name);
  if (targetId === "css") add("theme.css", cssOutput(theme));
  else if (targetId === "scss") add("_theme.scss", scss(theme));
  else if (targetId === "tailwind" || targetId === "shadcn")
    add("theme.css", frameworkCSS(theme, targetId === "shadcn"));
  else if (targetId === "tokens")
    for (const mode of modes)
      add(`tokens-${mode}.json`, tokenJSON(theme, mode));
  else if (targetId === "vscode") {
    add(
      ".vscode/launch.json",
      json({
        version: "0.2.0",
        configurations: [
          {
            name: "Preview theme",
            type: "extensionHost",
            request: "launch",
            args: ["--extensionDevelopmentPath=${workspaceFolder}"],
          },
        ],
      }),
    );
    add(
      "package.json",
      json({
        name: slug,
        displayName: theme.name,
        description: theme.description,
        version: generatorVersion,
        publisher: "themespace-local",
        engines: { vscode: "^1.90.0" },
        categories: ["Themes"],
        contributes: {
          themes: modes.map((mode) => ({
            label: `${theme.name} ${mode}`,
            uiTheme: mode === "dark" ? "vs-dark" : "vs",
            path: `./themes/${slug}-${mode}.json`,
          })),
        },
      }),
    );
    for (const mode of modes) {
      const c = resolve(theme, mode);
      add(
        `themes/${slug}-${mode}.json`,
        json({
          $schema: "vscode://schemas/color-theme",
          name: `${theme.name} ${mode}`,
          type: mode,
          colors: vscodeColors(c),
          semanticHighlighting: true,
          semanticTokenColors: syntax(c),
          tokenColors: Object.entries(syntax(c)).map(([scope, color]) => ({
            scope:
              scope === "function"
                ? "entity.name.function"
                : scope === "type"
                  ? "entity.name.type"
                  : scope,
            settings: { foreground: color },
          })),
        }),
      );
    }
  } else if (targetId === "zed") {
    add(
      `${slug}.json`,
      json({
        $schema: "https://zed.dev/schema/themes/v0.2.0.json",
        name: theme.name,
        author: theme.author,
        themes: modes.map((mode) => {
          const c = resolve(theme, mode);
          return {
            name: `${theme.name} ${mode}`,
            appearance: mode,
            style: {
              background: c.background,
              "surface.background": c.surface,
              "elevated_surface.background": c.elevated,
              border: c.border,
              "border.focused": c.focus,
              text: c.foreground,
              "text.muted": c.muted,
              "text.accent": c.accent,
              "icon.accent": c.accent,
              "editor.background": c.background,
              "editor.foreground": c.foreground,
              "editor.gutter.background": c.background,
              "editor.line_number": c.muted,
              "editor.active_line_number": c.foreground,
              "editor.active_line.background": c.hover,
              "toolbar.background": c.surface,
              "title_bar.background": c.surface,
              "status_bar.background": c.surface,
              "tab_bar.background": c.surface,
              "tab.active_background": c.background,
              "tab.inactive_background": c.surface,
              "panel.background": c.surface,
              "element.background": c.elevated,
              "element.hover": c.hover,
              "element.selected": c.selection,
              "terminal.background": c.background,
              "terminal.foreground": c.foreground,
              ...Object.fromEntries(
                Array.from({ length: 16 }, (_, i) => [
                  `terminal.ansi.${i >= 8 ? "bright_" : ""}${ansiNames[i % 8]}`,
                  c[`ansi${i}`],
                ]),
              ),
              created: c.success,
              modified: c.warning,
              deleted: c.error,
              error: c.error,
              warning: c.warning,
              info: c.info,
              players: [
                {
                  cursor: c.accent,
                  background: c.accent,
                  selection: c.selection,
                },
              ],
              syntax: Object.fromEntries(
                Object.entries(syntax(c)).map(([key, color]) => [
                  key,
                  { color },
                ]),
              ),
            },
          };
        }),
      }),
    );
  } else if (targetId === "spicetify") {
    add(
      "color.ini",
      modes
        .map((mode) => {
          const c = resolve(theme, mode);
          const colors = {
            text: c.foreground,
            subtext: c.muted,
            main: c.background,
            sidebar: c.surface,
            player: c.surface,
            card: c.elevated,
            shadow: "#000000",
            "selected-row": c.foreground,
            button: c.accentFill,
            "button-active": c.accentFill,
            "button-disabled": c.muted,
            tab: c.accent,
            notification: c.elevated,
            "notification-error": c.error,
            misc: c.border,
            "main-elevated": c.elevated,
            highlight: c.hover,
            "highlight-elevated": c.selection,
          };
          return (
            `[${mode}]\n` +
            Object.entries(colors)
              .map(([key, color]) => `${key} = ${color.slice(1)}`)
              .join("\n")
          );
        })
        .join("\n\n") + "\n",
    );
    add(
      "user.css",
      comment(theme) +
        `/* The native Spicetify color mapping does the color work. */\n:root { --border-radius: ${theme.style.radius}px; --button-radius: ${theme.style.radius}px; --cover-art-radius: ${theme.style.radius}px; }\n`,
    );
  } else if (targetId === "obsidian") {
    add(
      "manifest.json",
      json({
        name: theme.name,
        version: generatorVersion,
        minAppVersion: "1.5.0",
        author: theme.author,
      }),
    );
    add(
      "theme.css",
      comment(theme) +
        modes
          .map((mode) => {
            const c = resolve(theme, mode);
            return cssBlock(`.theme-${mode}`, {
              "--background-primary": c.background,
              "--background-primary-alt": c.background,
              "--background-secondary": c.surface,
              "--background-secondary-alt": c.elevated,
              "--background-modifier-border": c.border,
              "--background-modifier-hover": c.hover,
              "--text-normal": c.foreground,
              "--text-muted": c.muted,
              "--text-faint": c.muted,
              "--text-accent": c.accent,
              "--text-on-accent": c.accentForeground,
              "--interactive-accent": c.accentFill,
              "--interactive-accent-hover": c.accentFill,
              "--text-selection": c.selection,
              "--text-error": c.error,
              "--text-success": c.success,
              "--code-background": c.surface,
              "--code-normal": c.foreground,
              "--code-comment": c.syntaxComment,
              "--code-keyword": c.syntaxKeyword,
              "--code-string": c.syntaxString,
              "--code-function": c.syntaxFunction,
              "--font-text-theme": `"${theme.fonts.sans}"`,
              "--font-interface-theme": `"${theme.fonts.sans}"`,
              "--font-monospace-theme": `"${theme.fonts.mono}"`,
              "--radius-s": `${theme.style.radius * 0.6}px`,
              "--radius-m": `${theme.style.radius}px`,
              "--radius-l": `${theme.style.radius * 1.4}px`,
            });
          })
          .join("\n"),
    );
  } else
    for (const mode of modes) {
      const c = resolve(theme, mode),
        name = `${theme.name} ${mode}`,
        file = `${slug}-${mode}`,
        ansi = Array.from({ length: 16 }, (_, i) => c[`ansi${i}`]);
      switch (targetId) {
        case "ghostty":
          add(
            file,
            ansi.map((color, i) => `palette = ${i}=${color}`).join("\n") +
              `\n\nbackground = ${c.background}\nforeground = ${c.foreground}\ncursor-color = ${c.accentFill}\ncursor-text = ${c.accentForeground}\nselection-background = ${c.selection}\nselection-foreground = ${c.selectionForeground}\n`,
          );
          break;
        case "kitty":
          add(
            `${file}.conf`,
            `background ${c.background}\nforeground ${c.foreground}\ncursor ${c.accentFill}\ncursor_text_color ${c.accentForeground}\nselection_background ${c.selection}\nselection_foreground ${c.selectionForeground}\n` +
              ansi.map((color, i) => `color${i} ${color}`).join("\n") +
              "\n",
          );
          break;
        case "alacritty":
          add(
            `${file}.toml`,
            `[colors.primary]\nbackground = "${c.background}"\nforeground = "${c.foreground}"\n\n[colors.cursor]\ntext = "${c.accentForeground}"\ncursor = "${c.accentFill}"\n\n[colors.selection]\ntext = "${c.selectionForeground}"\nbackground = "${c.selection}"\n\n` +
              ["normal", "bright"]
                .map(
                  (part, n) =>
                    `[colors.${part}]\n` +
                    ansiNames
                      .map((key, i) => `${key} = "${ansi[i + n * 8]}"`)
                      .join("\n"),
                )
                .join("\n\n") +
              "\n",
          );
          break;
        case "wezterm":
          add(
            `${file}.toml`,
            `[metadata]\nname = ${JSON.stringify(name)}\nauthor = ${JSON.stringify(theme.author)}\n\n[colors]\nforeground = "${c.foreground}"\nbackground = "${c.background}"\ncursor_bg = "${c.accentFill}"\ncursor_fg = "${c.accentForeground}"\ncursor_border = "${c.accentFill}"\nselection_bg = "${c.selection}"\nselection_fg = "${c.selectionForeground}"\nansi = ${JSON.stringify(ansi.slice(0, 8))}\nbrights = ${JSON.stringify(ansi.slice(8))}\n`,
          );
          break;
        case "windows-terminal":
          add(
            `${file}.json`,
            json({
              name,
              background: c.background,
              foreground: c.foreground,
              cursorColor: c.accentFill,
              selectionBackground: c.selection,
              ...Object.fromEntries(
                ansi.map((color, i) => [
                  i >= 8
                    ? "bright" +
                      ansiNames[i % 8][0].toUpperCase() +
                      ansiNames[i % 8].slice(1)
                    : ansiNames[i],
                  color,
                ]),
              ),
            }),
          );
          break;
        case "iterm2": {
          const colors = {
            ...Object.fromEntries(
              ansi.map((color, i) => [`Ansi ${i} Color`, color]),
            ),
            "Background Color": c.background,
            "Foreground Color": c.foreground,
            "Cursor Color": c.accentFill,
            "Cursor Text Color": c.accentForeground,
            "Selection Color": c.selection,
            "Selected Text Color": c.selectionForeground,
          };
          add(
            `${file}.itermcolors`,
            '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n' +
              Object.entries(colors)
                .map(
                  ([key, color]) =>
                    `<key>${key}</key><dict><key>Color Space</key><string>sRGB</string>${rgb(
                      color,
                    )
                      .map(
                        (v, i) =>
                          `<key>${["Red", "Green", "Blue"][i]} Component</key><real>${v / 255}</real>`,
                      )
                      .join(
                        "",
                      )}<key>Alpha Component</key><real>1</real></dict>`,
                )
                .join("\n") +
              "\n</dict></plist>\n",
          );
          break;
        }
        case "warp":
          add(
            `${file}.yaml`,
            `name: ${JSON.stringify(name)}\naccent: "${c.accent}"\nbackground: "${c.background}"\nforeground: "${c.foreground}"\ndetails: ${mode === "dark" ? "darker" : "lighter"}\nterminal_colors:\n` +
              ["normal", "bright"]
                .map(
                  (part, n) =>
                    `  ${part}:\n` +
                    ansiNames
                      .map((key, i) => `    ${key}: "${ansi[i + n * 8]}"`)
                      .join("\n"),
                )
                .join("\n") +
              "\n",
          );
          break;
        case "foot":
          add(
            `${file}.ini`,
            `[colors]\nbackground=${c.background.slice(1)}\nforeground=${c.foreground.slice(1)}\nselection-background=${c.selection.slice(1)}\nselection-foreground=${c.selectionForeground.slice(1)}\n` +
              ansi
                .map(
                  (color, i) =>
                    `${i >= 8 ? "bright" : "regular"}${i % 8}=${color.slice(1)}`,
                )
                .join("\n") +
              "\n",
          );
          break;
        case "termux":
          add(
            `${mode}/colors.properties`,
            `background=${c.background}\nforeground=${c.foreground}\ncursor=${c.accentFill}\n` +
              ansi.map((color, i) => `color${i}=${color}`).join("\n") +
              "\n",
          );
          break;
        case "xresources":
          add(
            `${file}.Xresources`,
            `*.background: ${c.background}\n*.foreground: ${c.foreground}\n*.cursorColor: ${c.accentFill}\n` +
              ansi.map((color, i) => `*.color${i}: ${color}`).join("\n") +
              "\n",
          );
          break;
        case "betterdiscord":
        case "vencord":
          add(`${file}.theme.css`, discord(theme, mode));
          break;
        case "firefox":
          add(
            `${mode}/manifest.json`,
            json({
              manifest_version: 2,
              name,
              version: generatorVersion,
              description: theme.description,
              theme: {
                colors: {
                  frame: c.surface,
                  tab_background_text: c.muted,
                  tab_selected: c.background,
                  tab_text: c.foreground,
                  tab_line: c.accent,
                  toolbar: c.background,
                  toolbar_text: c.foreground,
                  toolbar_field: c.input,
                  toolbar_field_text: c.foreground,
                  toolbar_field_border: c.border,
                  toolbar_bottom_separator: c.border,
                  button_background_hover: c.hover,
                  button_background_active: c.selection,
                  popup: c.elevated,
                  popup_text: c.foreground,
                  popup_border: c.border,
                  popup_highlight: c.selection,
                  popup_highlight_text: c.selectionForeground,
                  sidebar: c.surface,
                  sidebar_text: c.foreground,
                  sidebar_border: c.border,
                  sidebar_highlight: c.selection,
                  sidebar_highlight_text: c.selectionForeground,
                  ntp_background: c.background,
                  ntp_text: c.foreground,
                },
              },
            }),
          );
          break;
        case "chromium":
          add(
            `${mode}/manifest.json`,
            json({
              manifest_version: 3,
              name,
              version: generatorVersion,
              description: theme.description,
              theme: {
                colors: Object.fromEntries(
                  Object.entries({
                    frame: c.surface,
                    frame_inactive: c.surface,
                    toolbar: c.background,
                    tab_text: c.foreground,
                    tab_background_text: c.muted,
                    bookmark_text: c.foreground,
                    ntp_background: c.background,
                    ntp_text: c.foreground,
                    ntp_link: c.accent,
                    button_background: c.elevated,
                  }).map(([key, color]) => [key, rgb(color)]),
                ),
              },
            }),
          );
          break;
        case "neovim": {
          const groups: Record<string, Record<string, string | boolean>> = {
            Normal: { fg: c.foreground, bg: c.background },
            NormalFloat: { fg: c.foreground, bg: c.elevated },
            FloatBorder: { fg: c.border, bg: c.elevated },
            LineNr: { fg: c.muted },
            CursorLineNr: { fg: c.accent },
            CursorLine: { bg: c.hover },
            Visual: { bg: c.selection, fg: c.selectionForeground },
            Search: { bg: c.accentFill, fg: c.accentForeground },
            StatusLine: { bg: c.surface, fg: c.foreground },
            Pmenu: { bg: c.elevated, fg: c.foreground },
            PmenuSel: { bg: c.selection, fg: c.selectionForeground },
            Comment: { fg: c.syntaxComment, italic: true },
            String: { fg: c.syntaxString },
            Number: { fg: c.syntaxNumber },
            Constant: { fg: c.syntaxNumber },
            Function: { fg: c.syntaxFunction },
            Identifier: { fg: c.foreground },
            Statement: { fg: c.syntaxKeyword },
            Type: { fg: c.syntaxType },
            Special: { fg: c.accent },
            Error: { fg: c.error },
            DiagnosticError: { fg: c.error },
            DiagnosticWarn: { fg: c.warning },
            DiagnosticInfo: { fg: c.info },
            DiffAdd: { bg: c.surface, fg: c.success },
            DiffDelete: { fg: c.error },
            DiffChange: { fg: c.warning },
          };
          for (const [key, color] of Object.entries(syntax(c)))
            groups[`@${key}`] = { fg: color };
          add(
            `${file}.lua`,
            `vim.cmd("highlight clear")\nvim.o.background = "${mode}"\nvim.o.termguicolors = true\nvim.g.colors_name = ${JSON.stringify(file)}\n` +
              Object.entries(groups)
                .map(
                  ([key, values]) =>
                    `vim.api.nvim_set_hl(0, ${JSON.stringify(key)}, { ${Object.entries(
                      values,
                    )
                      .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
                      .join(", ")} })`,
                )
                .join("\n") +
              "\n" +
              ansi
                .map((color, i) => `vim.g.terminal_color_${i} = "${color}"`)
                .join("\n") +
              "\n",
          );
          break;
        }
        case "helix":
          add(
            `${file}.toml`,
            Object.entries({
              "ui.background": { bg: c.background },
              "ui.text": { fg: c.foreground },
              "ui.cursor": { fg: c.accentForeground, bg: c.accentFill },
              "ui.selection": { bg: c.selection },
              "ui.linenr": { fg: c.muted },
              "ui.statusline": { fg: c.foreground, bg: c.surface },
              "ui.popup": { fg: c.foreground, bg: c.elevated },
              "ui.menu": { fg: c.foreground, bg: c.elevated },
              "ui.menu.selected": {
                fg: c.selectionForeground,
                bg: c.selection,
              },
              "diagnostic.error": { fg: c.error },
              "diagnostic.warning": { fg: c.warning },
              ...Object.fromEntries(
                Object.entries(syntax(c)).map(([key, color]) => [
                  key,
                  { fg: color },
                ]),
              ),
            })
              .map(
                ([key, values]) =>
                  `${JSON.stringify(key)} = { ${Object.entries(values)
                    .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
                    .join(", ")} }`,
              )
              .join("\n") + "\n",
          );
          break;
        case "sublime":
          add(
            `${file}.sublime-color-scheme`,
            json({
              name,
              globals: {
                background: c.background,
                foreground: c.foreground,
                caret: c.accent,
                line_highlight: c.hover,
                selection: c.selection,
                selection_foreground: c.selectionForeground,
                gutter: c.surface,
                gutter_foreground: c.muted,
              },
              rules: Object.entries(syntax(c)).map(([scope, foreground]) => ({
                scope: scope === "function" ? "entity.name.function" : scope,
                foreground,
              })),
            }),
          );
          break;
        default:
          throw new Error(`No exporter registered for ${targetId}.`);
      }
    }
  const native = target.category !== "Web frameworks";
  add(
    "README.md",
    `# ${theme.name} for ${target.name}\n\n${theme.description}\n\n## Install\n\n${target.install}\n\n## Export\n\nFormat: ${target.format}. Generator: ThemeSpace ${generatorVersion}.\nAppearances: ${modes.join(", ")}.\n${native ? "\nNative application loading has not been verified in this environment. Treat this export as beta and check it in your target version.\n" : ""}\n${target.limitation}\n\n[Official documentation](${target.docs})\n\n## Attribution\n\nTheme by ${theme.author}. Declared license: ${theme.license}.\n${theme.parent ? `Remixed from ${theme.parent.name} by ${theme.parent.author}.\n` : ""}Generated files contain color and appearance settings only. Keep existing application configuration separate.\n`,
  );
  return files;
}

export function designSystemFiles(theme: Theme): ThemeFile[] {
  const colors = resolve(theme, theme.defaultAppearance),
    slug = slugify(theme.name);
  const html = componentDocument(theme, theme.defaultAppearance);
  const design = `# ${theme.name}\n\n${theme.description}\n\n## Character\n\nA shared visual identity for applications and web projects. Author: ${theme.author}.\n\n## Color\n\n${Object.entries(
    colors,
  )
    .map(([key, color]) => `- ${key}: ${color}`)
    .join(
      "\n",
    )}\n\n## Typography\n\nUI: ${theme.fonts.sans}. Code: ${theme.fonts.mono}. Base size: ${theme.fonts.size}px. Keep native application fonts unless explicitly installing typography settings.\n\n## Spacing\n\nBase unit: ${theme.style.spacing}px. Use multiples for consistent rhythm.\n\n## Shape and elevation\n\nBase radius: ${theme.style.radius}px. Shadow opacity: ${theme.style.shadow}.\n\n## Components\n\nUse paired foregrounds on primary and selected surfaces. The interactive component gallery is components.html; canonical CSS is tokens.css. It contains the complete Comfy foundation/card families and editor/terminal surfaces, plus forms, tables, charts, navigation, overlays, marketing layouts, and motion states. All example interactions are local demonstrations; they do not connect to application services.\n\n## Interaction\n\nFocus follows the accent. Base transition: ${theme.style.motion}ms. Respect reduced-motion preferences.\n\n## Appearances\n\nExported appearances: ${appearanceList(theme).join(", ")}. Default: ${theme.defaultAppearance}.\n\n## Guidance\n\nPreserve semantic meanings, check foreground/background contrast, and use the per-target installation guide. Native apps retain their own layout and unsupported typography.\n\n## Provenance\n\n${theme.parent ? `Remixed from ${theme.parent.name} by ${theme.parent.author}.` : theme.id === "comfy" ? "Dark palette references https://github.com/Hashim-K/comfy-themes; the light companion is a ThemeSpace interpretation." : "Created in ThemeSpace."}\n`;
  return [
    { path: "DESIGN.md", content: design },
    { path: "tokens.css", content: cssOutput(theme) },
    { path: "components.html", content: html },
    {
      path: "manifest.json",
      content: json({
        schemaVersion: "od-design-system-project/v1",
        id: slug,
        name: theme.name,
        category: "Personal themes",
        description: theme.description || theme.name,
        source: {
          type: "bundled",
          origin: "Generated by ThemeSpace " + generatorVersion,
        },
        files: {
          design: "DESIGN.md",
          tokens: "tokens.css",
          components: "components.html",
        },
      }),
    },
    ...appearanceList(theme).map((mode) => ({
      path: `tokens-${mode}.json`,
      content: tokenJSON(theme, mode),
    })),
  ];
}
