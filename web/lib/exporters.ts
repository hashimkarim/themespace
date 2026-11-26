import {
  mix,
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
      "tab.activeBackground",
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
    hover: [
      "list.hoverBackground",
      "toolbar.hoverBackground",
      "editor.lineHighlightBackground",
    ],
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
  out["editorLineNumber.activeForeground"] = c.foreground;
  out["editorBracketHighlight.foreground1"] = c.accent;
  out["editorBracketHighlight.foreground2"] = c.chart2;
  out["editorBracketHighlight.foreground3"] = c.chart3;
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
              scope === "keyword"
                ? "keyword, storage.type, storage.modifier"
                : scope === "function"
                  ? "entity.name.function, support.function"
                  : scope === "type"
                    ? "entity.name.type, entity.name.class, support.type"
                    : scope === "number"
                      ? "constant.numeric"
                      : scope === "constant"
                        ? "constant.language, constant.other"
                        : scope === "operator"
                          ? "keyword.operator"
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
            "tab-active": c.accent,
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
              "--link-color": c.accent,
              "--tag-background": c.selection,
              "--tag-color": c.accent,
              "--blockquote-border-color": c.accent,
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
  } else if (targetId === "t3-code") {
    const t3Palette = (mode: Appearance) => {
      const c = resolve(theme, mode);
      return {
        canvas: c.background,
        chrome: c.surface,
        toolbar: c.surface,
        toolbarForeground: c.foreground,
        toolbarBorder: c.border,
        toolbarControl: c.elevated,
        toolbarControlForeground: c.foreground,
        toolbarControlHover: c.hover,
        surface: c.surface,
        surfaceRaised: c.elevated,
        surfaceOverlay: c.elevated,
        text: c.foreground,
        textMuted: c.muted,
        border: c.border,
        input: c.input,
        focus: c.focus,
        accent: c.accentFill,
        accentForeground: c.accentForeground,
        secondary: c.surface,
        secondaryForeground: c.foreground,
        muted: c.surface,
        mutedForeground: c.muted,
        placeholder: c.muted,
        secondaryLabel: c.muted,
        iconMuted: c.muted,
        error: c.error,
        errorForeground: contrastForeground(c.error),
        errorSurface: c.elevated,
        warning: c.warning,
        warningForeground: contrastForeground(c.warning),
        warningSurface: c.elevated,
        update: c.success,
        updateForeground: contrastForeground(c.success),
        updateSurface: c.elevated,
        accentSurface: c.selection,
        accentSurfaceForeground: c.selectionForeground,
        messageSurface: c.surface,
        messageForeground: c.foreground,
        messageAction: c.elevated,
        messageActionForeground: c.foreground,
        messageActionHover: c.hover,
        codeBackground: c.surface,
        codeForeground: c.foreground,
        searchMatchBackground: c.selection,
        searchMatchForeground: c.selectionForeground,
        searchMatchActiveBackground: c.accentFill,
        searchMatchActiveForeground: c.accentForeground,
        sidebar: c.surface,
        sidebarForeground: c.foreground,
        sidebarMutedForeground: c.muted,
        sidebarControlSurface: c.elevated,
        sidebarRowHover: c.hover,
        sidebarRowActive: c.selection,
        sidebarRowSelected: c.selection,
        sidebarBorder: c.border,
        terminalBackground: c.background,
        terminalForeground: c.foreground,
        terminalCursor: c.accentFill,
        terminalSelection: c.selection,
        terminalScrollbar: c.border,
        terminalScrollbarHover: c.muted,
      };
    };
    const primary = resolve(theme, theme.defaultAppearance);
    const other: Appearance =
      theme.defaultAppearance === "dark" ? "light" : "dark";
    add(
      `${slug}.json`,
      json({
        version: 1,
        name: theme.name,
        appearance: theme.defaultAppearance,
        canvas: primary.background,
        accent: primary.accentFill,
        colors: t3Palette(theme.defaultAppearance),
        ...(theme.modes[other]
          ? { variants: { [other]: t3Palette(other) } }
          : {}),
      }),
    );
  } else if (targetId === "stylus") {
    const primary = resolve(theme, theme.defaultAppearance);
    const blocks = modes
      .map((mode) => {
        const rules =
          `  :root {\n` +
          Object.entries(cssVariables(theme, mode))
            .map(([k, v]) => `    ${k}: ${v};`)
            .join("\n") +
          `\n  }\n` +
          `  html, body { background-color: var(--ts-background); color: var(--ts-foreground); }\n` +
          `  a { color: var(--ts-accent); }\n` +
          `  hr, input, textarea, select, pre, code { border-color: var(--ts-border); }\n` +
          `  pre, code { background-color: var(--ts-surface); }`;
        return modes.length > 1
          ? `@media (prefers-color-scheme: ${mode}) {\n${rules}\n}`
          : rules.replace(/^  /gm, "");
      })
      .join("\n\n");
    add(
      `${slug}.user.css`,
      `/* ==UserStyle==\n` +
        `@name           ${clean(theme.name)}\n` +
        `@namespace      themespace.app/${slug}\n` +
        `@version        ${generatorVersion}\n` +
        `@description    ${clean(theme.description || theme.name)}\n` +
        `@author         ${clean(theme.author)}\n` +
        `@license        ${clean(theme.license)}\n` +
        `@preprocessor   default\n` +
        `@var color      tsBg "Background" ${primary.background}\n` +
        `@var color      tsSurface "Surface" ${primary.surface}\n` +
        `@var color      tsFg "Foreground" ${primary.foreground}\n` +
        `@var color      tsAccent "Accent" ${primary.accent}\n` +
        `@var color      tsBorder "Border" ${primary.border}\n` +
        `==/UserStyle== */\n\n` +
        `@-moz-document regexp("https?://.*") {\n` +
        `${blocks}\n` +
        `}\n`,
    );
  } else if (targetId === "gitcomet") {
    const reserved = new Set([
      "gitcomet",
      "github",
      "nord",
      "catppuccin",
      "eldritch",
      "tokyo-night",
      "solarized",
      "gruvbox",
      "one-dark-pro",
      "monokai",
      "night-owl",
    ]);
    const fileBase = reserved.has(slug) ? `themespace-${slug}` : slug;
    const rgba = (hex: string, alpha = "ff") =>
      `${hex.toLowerCase()}${alpha}`;
    const entryFor = (mode: Appearance) => {
      const c = resolve(theme, mode);
      const syn = syntax(c);
      const dark = mode === "dark";
      return {
        key: `${fileBase.replaceAll("-", "_")}_${mode}`,
        name: `${theme.name} ${mode === "dark" ? "Dark" : "Light"}`,
        appearance: mode,
        graph_fade_opacity: 0.1,
        colors: {
          surface: {
            canvas: rgba(c.background),
            chrome: rgba(c.surface),
            panel: rgba(c.surface),
            raised: rgba(c.elevated),
            input: rgba(c.input),
          },
          foreground: {
            primary: rgba(c.foreground),
            secondary: rgba(c.muted),
            disabled: { hex: rgba(c.muted), alpha: 0.62 },
            placeholder: { hex: rgba(c.muted), alpha: 0.72 },
            emphasis: rgba(dark ? "#ffffff" : "#0b0e14"),
          },
          stroke: {
            subtle: { hex: rgba(c.border), alpha: 0.45 },
            default: rgba(c.border),
            control: rgba(mix(c.border, c.foreground, 0.2)),
          },
          interaction: {
            hover_overlay: { hex: rgba(c.foreground), alpha: 0.07 },
            pressed_overlay: { hex: rgba(c.foreground), alpha: 0.11 },
            hover_background: rgba(c.hover),
            pressed_background: rgba(c.selection),
            selected_background: rgba(c.selection),
            selected_foreground: rgba(c.selectionForeground),
            selected_indicator: rgba(c.accent),
            focus_ring: rgba(c.focus),
            focus_background: { hex: rgba(c.focus), alpha: 0.16 },
          },
          accent: {
            foreground: rgba(c.accent),
            solid: rgba(c.accentFill),
            on_solid: rgba(c.accentForeground),
            subtle_background: rgba(mix(c.background, c.accent, 0.18)),
          },
          status: {
            info: {
              foreground: rgba(c.info),
              background: rgba(mix(c.background, c.info, 0.16)),
              border: rgba(mix(c.border, c.info, 0.45)),
            },
            success: {
              foreground: rgba(c.success),
              background: rgba(mix(c.background, c.success, 0.16)),
              border: rgba(mix(c.border, c.success, 0.45)),
            },
            warning: {
              foreground: rgba(c.warning),
              background: rgba(mix(c.background, c.warning, 0.16)),
              border: rgba(mix(c.border, c.warning, 0.45)),
            },
            danger: {
              foreground: rgba(c.error),
              background: rgba(mix(c.background, c.error, 0.16)),
              border: rgba(mix(c.border, c.error, 0.45)),
            },
          },
          editor: {
            background: rgba(c.background),
            foreground: rgba(c.foreground),
            gutter_background: rgba(c.background),
            line_number: rgba(c.muted),
            cursor: rgba(c.accent, "e0"),
            selection_background: rgba(c.selection, "99"),
            search_match_background: rgba(mix(c.background, c.warning, 0.25)),
            search_match_foreground: rgba(c.warning),
            bracket_match_background: { hex: rgba(c.accent), alpha: 0.22 },
            indent_guide: { hex: rgba(c.border), alpha: 0.55 },
          },
          diff: {
            added: {
              foreground: rgba(c.success),
              background: rgba(mix(c.background, c.success, 0.14)),
              word_background: rgba(c.success, "38"),
              focused_background: rgba(c.success, "33"),
            },
            removed: {
              foreground: rgba(c.error),
              background: rgba(mix(c.background, c.error, 0.14)),
              word_background: rgba(c.error, "38"),
              focused_background: rgba(c.error, "33"),
            },
            modified: {
              foreground: rgba(c.warning),
              background: rgba(mix(c.background, c.warning, 0.14)),
              word_background: rgba(c.warning, "38"),
              focused_background: rgba(c.warning, "33"),
            },
          },
          tooltip: {
            background: rgba(c.elevated),
            foreground: rgba(c.foreground),
          },
          scrollbar: {
            thumb: { hex: rgba(c.muted), alpha: 0.3 },
            thumb_hover: { hex: rgba(c.muted), alpha: 0.45 },
            thumb_pressed: { hex: rgba(c.muted), alpha: 0.6 },
          },
          notice: {
            background: { hex: rgba(c.warning), alpha: 0.13 },
            border: { hex: rgba(c.warning), alpha: 0.3 },
            foreground: rgba(c.foreground),
            secondary: rgba(c.muted),
          },
          interstitial: {
            text: rgba(c.foreground),
            muted: rgba(c.muted),
            primary: {
              text: rgba(c.accentForeground),
              background: rgba(c.accentFill),
              background_hover: rgba(mix(c.accentFill, c.foreground, 0.1)),
              background_active: rgba(mix(c.accentFill, c.background, 0.1)),
              border: rgba(c.accentFill),
              border_hover: rgba(mix(c.accentFill, c.foreground, 0.1)),
              border_active: rgba(mix(c.accentFill, c.background, 0.1)),
            },
            secondary: {
              text: rgba(c.foreground),
              background: rgba(c.elevated),
              background_hover: rgba(c.hover),
              background_active: rgba(c.selection),
              border: rgba(c.border),
              border_hover: rgba(c.accent),
              border_active: rgba(c.accent),
            },
          },
          shadow: "#000000ff",
          graph_lane_palette: [
            rgba(c.chart1),
            rgba(c.chart2),
            rgba(c.chart3),
            rgba(c.chart4),
            rgba(c.chart5),
          ],
        },
        syntax: {
          comment: rgba(syn.comment),
          comment_doc: rgba(mix(syn.comment, c.foreground, 0.15)),
          string: rgba(syn.string),
          string_escape: rgba(c.info),
          string_regex: rgba(c.error),
          string_special: rgba(syn.string),
          keyword: rgba(syn.keyword),
          keyword_control: rgba(syn.keyword),
          preproc: rgba(c.info),
          number: rgba(syn.number),
          boolean: rgba(syn.number),
          function: rgba(syn.function),
          function_method: rgba(syn.function),
          function_special: rgba(syn.function),
          constructor: rgba(syn.type),
          type: rgba(syn.type),
          type_builtin: rgba(syn.type),
          type_interface: rgba(syn.type),
          namespace: rgba(c.accent),
          variable: rgba(c.foreground),
          variable_parameter: rgba(mix(c.foreground, c.muted, 0.3)),
          variable_special: rgba(c.accent),
          variable_builtin: rgba(c.info),
          property: rgba(syn.function),
          label: rgba(c.chart5),
          constant: rgba(syn.number),
          constant_builtin: rgba(syn.number),
          operator: rgba(c.foreground),
          punctuation: rgba(c.muted),
          punctuation_bracket: rgba(c.muted),
          punctuation_delimiter: rgba(c.muted),
          punctuation_special: rgba(c.accent),
          punctuation_list_marker: rgba(c.error),
          tag: rgba(syn.type),
          attribute: rgba(syn.function),
          markup_heading: rgba(syn.keyword),
          markup_link: rgba(c.accent),
          text_literal: rgba(syn.string),
          diff_plus: rgba(c.success),
          diff_minus: rgba(c.error),
          diff_delta: rgba(c.warning),
          lifetime: rgba(c.info),
        },
        radii: {
          panel: Math.min(18, theme.style.radius),
          pill: 999.0,
          row: Math.min(12, Math.max(4, theme.style.radius * 0.7)),
          control: Math.min(12, Math.max(4, theme.style.radius * 0.7)),
          popover: Math.min(16, theme.style.radius),
          window: Math.min(18, theme.style.radius),
        },
      };
    };
    add(
      `${fileBase}.json`,
      json({
        schema_version: 2,
        name: theme.name,
        author: theme.author,
        themes: modes.map(entryFor),
      }),
    );
  } else if (targetId === "waybar") {
    for (const mode of modes) {
      const c = resolve(theme, mode);
      add(
        `colors-${mode}.css`,
        comment(theme) +
          Object.entries({
            background: c.background,
            surface: c.surface,
            elevated: c.elevated,
            foreground: c.foreground,
            muted: c.muted,
            border: c.border,
            accent: c.accent,
            "accent-fill": c.accentFill,
            "accent-foreground": c.accentForeground,
            selection: c.selection,
            hover: c.hover,
            success: c.success,
            warning: c.warning,
            error: c.error,
          })
            .map(([k, v]) => `@define-color ${k} ${v};`)
            .join("\n") +
          "\n",
      );
    }
    add(
      "style.css",
      comment(theme) +
        `@import "./colors-${theme.defaultAppearance}.css";\n\n` +
        `* {\n  font-family: "${theme.fonts.sans}", sans-serif;\n  font-size: ${theme.fonts.size}px;\n}\n\n` +
        `window#waybar {\n  background: @surface;\n  color: @foreground;\n  border-bottom: 1px solid @border;\n}\n\n` +
        `#workspaces button {\n  padding: 0 ${theme.style.spacing * 2}px;\n  border-radius: ${Math.min(12, theme.style.radius)}px;\n  color: @muted;\n}\n\n` +
        `#workspaces button.active {\n  background: @accent-fill;\n  color: @accent-foreground;\n}\n\n` +
        `#clock, #battery, #network, #pulseaudio, #tray {\n  padding: 0 ${theme.style.spacing * 2}px;\n  margin: ${theme.style.spacing}px 3px;\n  background: @elevated;\n  color: @foreground;\n  border: 1px solid @border;\n  border-radius: ${Math.min(12, theme.style.radius)}px;\n}\n\n` +
        `#battery.warning { color: @warning; }\n` +
        `#battery.critical { color: @error; }\n`,
    );
  } else
    for (const mode of modes) {
      const c = resolve(theme, mode),
        name = `${theme.name} ${mode}`,
        file = `${slug}-${mode}`,
        ansi = Array.from({ length: 16 }, (_, i) => c[`ansi${i}`]);
      const rgbCsv = (color: string) => rgb(color).join(",");
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
            NormalNC: { fg: c.foreground, bg: c.background },
            NormalFloat: { fg: c.foreground, bg: c.elevated },
            FloatBorder: { fg: c.border, bg: c.elevated },
            WinSeparator: { fg: c.border },
            SignColumn: { bg: c.background },
            LineNr: { fg: c.muted },
            CursorLineNr: { fg: c.accent },
            CursorLine: { bg: c.hover },
            Visual: { bg: c.selection, fg: c.selectionForeground },
            Search: { bg: c.accentFill, fg: c.accentForeground },
            IncSearch: { bg: c.accentFill, fg: c.accentForeground },
            CurSearch: { bg: c.accentFill, fg: c.accentForeground },
            StatusLine: { bg: c.surface, fg: c.foreground },
            StatusLineNC: { bg: c.surface, fg: c.muted },
            TabLine: { bg: c.surface, fg: c.muted },
            TabLineSel: { bg: c.background, fg: c.foreground },
            TabLineFill: { bg: c.surface },
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
            DiagnosticHint: { fg: c.muted },
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
              "ui.window": { fg: c.border },
              "ui.text": { fg: c.foreground },
              "ui.cursor": { fg: c.accentForeground, bg: c.accentFill },
              "ui.cursorline.primary": { bg: c.hover },
              "ui.selection": { bg: c.selection },
              "ui.linenr": { fg: c.muted },
              "ui.linenr.selected": { fg: c.foreground },
              "ui.statusline": { fg: c.foreground, bg: c.surface },
              "ui.statusline.inactive": { fg: c.muted, bg: c.surface },
              "ui.statusline.normal": { fg: c.accentForeground, bg: c.accentFill },
              "ui.statusline.insert": { fg: contrastForeground(c.success), bg: c.success },
              "ui.statusline.select": { fg: c.selectionForeground, bg: c.selection },
              "ui.popup": { fg: c.foreground, bg: c.elevated },
              "ui.menu": { fg: c.foreground, bg: c.elevated },
              "ui.menu.selected": {
                fg: c.selectionForeground,
                bg: c.selection,
              },
              "diagnostic.error": { fg: c.error },
              "diagnostic.warning": { fg: c.warning },
              "diagnostic.info": { fg: c.info },
              "diff.plus": { fg: c.success },
              "diff.minus": { fg: c.error },
              "diff.delta": { fg: c.warning },
              ...Object.fromEntries(
                Object.entries(syntax(c)).map(([key, color]) => [
                  key === "number" ? "constant.numeric" : key,
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
                scope:
                  scope === "keyword"
                    ? "keyword, storage.type, storage.modifier"
                    : scope === "function"
                      ? "entity.name.function, support.function"
                      : scope === "type"
                        ? "entity.name.type, entity.name.class, support.type"
                        : scope === "number"
                          ? "constant.numeric"
                          : scope === "constant"
                            ? "constant.language, constant.other"
                            : scope === "operator"
                              ? "keyword.operator"
                              : scope,
                foreground,
              })),
            }),
          );
          break;
        case "vivaldi":
          add(
            `${mode}/settings.json`,
            json({
              accentFromPage: false,
              accentOnWindow: true,
              accentSaturationLimit: 1,
              alpha: 1,
              backgroundPosition: "stretch",
              blur: 0,
              colorAccentBg: c.surface,
              colorBg: c.background,
              colorFg: c.foreground,
              colorHighlightBg: c.accentFill,
              colorWindowBg: c.surface,
              contrast: 0,
              dimBlurred: false,
              engineVersion: 1,
              id: `${slug}-${mode}`,
              name,
              preferSystemAccent: false,
              radius: Math.min(14, theme.style.radius),
              simpleScrollbar: false,
              transparencyTabBar: false,
              transparencyTabs: false,
              url: "",
              version: 1,
            }),
          );
          break;
        case "zen":
          add(
            `${mode}/userChrome.css`,
            `/* ${name} for Zen Browser · Generated with ThemeSpace ${generatorVersion} */\n\n` +
              `@media (prefers-color-scheme: ${mode}) {\n` +
              `  :root {\n` +
              `    --zen-colors-primary: ${c.elevated} !important;\n` +
              `    --zen-primary-color: ${c.accentFill} !important;\n` +
              `    --zen-colors-secondary: ${c.surface} !important;\n` +
              `    --zen-colors-tertiary: ${c.background} !important;\n` +
              `    --zen-colors-border: ${c.border} !important;\n` +
              `    --toolbarbutton-icon-fill: ${c.accent} !important;\n` +
              `    --lwt-text-color: ${c.foreground} !important;\n` +
              `    --toolbar-field-color: ${c.foreground} !important;\n` +
              `    --toolbar-field-focus-color: ${c.foreground} !important;\n` +
              `    --tab-selected-textcolor: ${c.foreground} !important;\n` +
              `    --toolbar-color: ${c.foreground} !important;\n` +
              `    --newtab-text-primary-color: ${c.foreground} !important;\n` +
              `    --arrowpanel-color: ${c.foreground} !important;\n` +
              `    --arrowpanel-background: ${c.elevated} !important;\n` +
              `    --sidebar-text-color: ${c.foreground} !important;\n` +
              `    --lwt-sidebar-text-color: ${c.foreground} !important;\n` +
              `    --lwt-sidebar-background-color: ${c.surface} !important;\n` +
              `    --toolbar-bgcolor: ${c.elevated} !important;\n` +
              `    --newtab-background-color: ${c.background} !important;\n` +
              `    --zen-themed-toolbar-bg: ${c.surface} !important;\n` +
              `    --zen-main-browser-background: ${c.surface} !important;\n` +
              `    --toolbox-bgcolor-inactive: ${c.surface} !important;\n` +
              `  }\n\n` +
              `  #TabsToolbar, hbox#titlebar, #zen-appcontent-navbar-container {\n` +
              `    background-color: ${c.surface} !important;\n` +
              `  }\n` +
              `  .sidebar-placesTree, #zen-workspaces-button, .urlbar-background {\n` +
              `    background-color: ${c.background} !important;\n` +
              `  }\n` +
              `  .urlbarView-url {\n` +
              `    color: ${c.accent} !important;\n` +
              `  }\n` +
              `}\n`,
          );
          add(
            `${mode}/userContent.css`,
            `/* ${name} for Zen Browser about: pages · Generated with ThemeSpace ${generatorVersion} */\n\n` +
              `@media (prefers-color-scheme: ${mode}) {\n` +
              `  @-moz-document url-prefix("about:") {\n` +
              `    :root {\n` +
              `      --in-content-page-color: ${c.foreground} !important;\n` +
              `      --in-content-page-background: ${c.background} !important;\n` +
              `      --color-accent-primary: ${c.accentFill} !important;\n` +
              `      background-color: ${c.background} !important;\n` +
              `    }\n` +
              `  }\n` +
              `  @-moz-document url("about:newtab"), url("about:home") {\n` +
              `    :root {\n` +
              `      --newtab-background-color: ${c.background} !important;\n` +
              `      --newtab-background-color-secondary: ${c.surface} !important;\n` +
              `      --newtab-element-hover-color: ${c.hover} !important;\n` +
              `      --newtab-text-primary-color: ${c.foreground} !important;\n` +
              `      --newtab-wordmark-color: ${c.foreground} !important;\n` +
              `      --newtab-primary-action-background: ${c.accentFill} !important;\n` +
              `    }\n` +
              `  }\n` +
              `}\n`,
          );
          break;
        case "konsole":
          add(
            `${file}.colorscheme`,
            `[Background]\nColor=${rgbCsv(c.background)}\n\n` +
              `[BackgroundFaint]\nColor=${rgbCsv(c.surface)}\n\n` +
              `[BackgroundIntense]\nColor=${rgbCsv(c.elevated)}\n\n` +
              `[Foreground]\nColor=${rgbCsv(c.foreground)}\n\n` +
              `[ForegroundFaint]\nColor=${rgbCsv(c.muted)}\n\n` +
              `[ForegroundIntense]\nColor=${rgbCsv(c.foreground)}\n\n` +
              ansi
                .slice(0, 8)
                .map(
                  (color, i) =>
                    `[Color${i}]\nColor=${rgbCsv(color)}\n\n` +
                    `[Color${i}Faint]\nColor=${rgbCsv(color)}\n\n` +
                    `[Color${i}Intense]\nColor=${rgbCsv(ansi[i + 8])}`,
                )
                .join("\n\n") +
              `\n\n[General]\nBlur=false\nColorRandomization=false\nDescription=${name}\nOpacity=1\nWallpaper=\n`,
          );
          break;
        case "gnome-terminal":
          add(
            `${file}.dconf`,
            `[/]\n` +
              `visible-name='${name.replace(/'/g, "")}'\n` +
              `use-theme-colors=false\n` +
              `background-color='${c.background}'\n` +
              `foreground-color='${c.foreground}'\n` +
              `cursor-colors-set=true\n` +
              `cursor-background-color='${c.accentFill}'\n` +
              `cursor-foreground-color='${c.accentForeground}'\n` +
              `highlight-colors-set=true\n` +
              `highlight-background-color='${c.selection}'\n` +
              `highlight-foreground-color='${c.selectionForeground}'\n` +
              `palette=[${ansi.map((col) => `'${col}'`).join(", ")}]\n`,
          );
          add(
            `${mode}/install.sh`,
            `#!/usr/bin/env bash\nset -euo pipefail\n` +
              `# Installs ${name} as a new GNOME Terminal profile via dconf.\n` +
              `command -v dconf >/dev/null || { echo "dconf is required."; exit 1; }\n` +
              `UUID=$(uuidgen)\n` +
              `DIR=$(cd "$(dirname "$0")/.." && pwd)\n` +
              `dconf load "/org/gnome/terminal/legacy/profiles:/:$UUID/" < "$DIR/${file}.dconf"\n` +
              `EXISTING=$(dconf read /org/gnome/terminal/legacy/profiles:/list 2>/dev/null || echo "[]")\n` +
              `if [ "$EXISTING" = "[]" ] || [ -z "$EXISTING" ]; then\n` +
              `  NEW_LIST="['$UUID']"\n` +
              `else\n` +
              `  NEW_LIST="\${EXISTING%]}, '$UUID']"\n` +
              `fi\n` +
              `dconf write /org/gnome/terminal/legacy/profiles:/list "$NEW_LIST"\n` +
              `echo "Installed GNOME Terminal profile '${name.replace(/'/g, "")}' ($UUID)."\n`,
          );
          break;
        case "smartgit":
          add(
            `${mode}-patch.theme`,
            `# ${name} for SmartGit · Generated with ThemeSpace ${generatorVersion}\n` +
              `# Place in SmartGit's Settings Directory and restart SmartGit.\n` +
              `extends=smartgit-${mode}-theme.properties\n` +
              `preferredEditorTheme=${mode}\n\n` +
              `background1=${c.surface}\n` +
              `background2=${c.background}\n` +
              `foreground1=${c.foreground}\n` +
              `foreground2=${c.foreground}\n` +
              `selection.background=${c.selection}\n` +
              `selection.foreground=${c.selectionForeground}\n` +
              `selection.background.unfocused=${c.elevated}\n` +
              `composite.background=background1\n` +
              `composite.background#border=${c.border}\n` +
              `composite.background#list=background2\n` +
              `composite.background#notification=${c.elevated}\n` +
              `composite.foreground#notification=${c.foreground}\n` +
              `toolBar.background.hover=${c.hover}\n` +
              `branches#ahead=${c.warning}\n` +
              `branches#approved=${c.success}\n` +
              `branches#behind=${c.info}\n` +
              `branches#rejected=${c.error}\n`,
          );
          break;
        case "slack": {
          const modern4 = [
            c.surface,
            c.accentFill,
            c.success,
            c.error,
          ].join(",");
          const legacy8 = [
            c.surface,
            c.elevated,
            c.accentFill,
            c.accentForeground,
            c.hover,
            c.foreground,
            c.success,
            c.error,
          ].join(",");
          add(
            `${file}.txt`,
            `# ${name} for Slack\n` +
              `# Open Slack → Preferences → Appearance → Custom theme → Import\n\n` +
              `# Modern 4-color import string (System Nav, Selected Items, Presence, Notifications):\n${modern4}\n\n` +
              `# Legacy 8-color import string:\n${legacy8}\n`,
          );
          break;
        }
        case "gtk": {
          const gtk4Map = {
            window_bg_color: c.background,
            window_fg_color: c.foreground,
            view_bg_color: c.background,
            view_fg_color: c.foreground,
            headerbar_bg_color: c.surface,
            headerbar_fg_color: c.foreground,
            headerbar_border_color: c.border,
            card_bg_color: c.elevated,
            card_fg_color: c.foreground,
            popover_bg_color: c.elevated,
            popover_fg_color: c.foreground,
            dialog_bg_color: c.elevated,
            dialog_fg_color: c.foreground,
            sidebar_bg_color: c.surface,
            sidebar_fg_color: c.foreground,
            accent_bg_color: c.accentFill,
            accent_fg_color: c.accentForeground,
            accent_color: c.accent,
            destructive_bg_color: c.error,
            destructive_fg_color: contrastForeground(c.error),
            success_bg_color: c.success,
            success_fg_color: contrastForeground(c.success),
            warning_bg_color: c.warning,
            warning_fg_color: contrastForeground(c.warning),
            borders: c.border,
          };
          const gtk4Defines = Object.entries(gtk4Map)
            .map(([k, v]) => `@define-color ${k} ${v};`)
            .join("\n");
          const gtk4Root =
            `:root {\n` +
            Object.entries(gtk4Map)
              .map(([k, v]) => `  --${k.replaceAll("_", "-")}: ${v};`)
              .join("\n") +
            `\n}\n`;
          const gtk3Map = {
            theme_bg_color: c.surface,
            theme_fg_color: c.foreground,
            theme_base_color: c.background,
            theme_text_color: c.foreground,
            theme_selected_bg_color: c.accentFill,
            theme_selected_fg_color: c.accentForeground,
            insensitive_bg_color: c.surface,
            insensitive_fg_color: c.muted,
            insensitive_base_color: c.background,
            theme_unfocused_bg_color: c.surface,
            theme_unfocused_fg_color: c.muted,
            theme_unfocused_base_color: c.background,
            theme_unfocused_selected_bg_color: c.selection,
            theme_unfocused_selected_fg_color: c.selectionForeground,
            content_view_bg: c.background,
            borders: c.border,
            warning_color: c.warning,
            error_color: c.error,
            success_color: c.success,
            wm_bg: c.surface,
            wm_title: c.foreground,
          };
          const gtk3Defines = Object.entries(gtk3Map)
            .map(([k, v]) => `@define-color ${k} ${v};`)
            .join("\n");
          add(
            `${mode}/gtk-4.0/gtk.css`,
            comment(theme) + gtk4Defines + "\n\n" + gtk4Root,
          );
          add(`${mode}/gtk-3.0/gtk.css`, comment(theme) + gtk3Defines + "\n");
          break;
        }
        case "kde":
          add(
            `${file}.colors`,
            `[ColorEffects:Disabled]\nColor=${rgbCsv(c.muted)}\nColorAmount=0\nColorEffect=0\nContrastAmount=0.5\nContrastEffect=1\nIntensityAmount=0.05\nIntensityEffect=2\n\n` +
              `[ColorEffects:Inactive]\nChangeSelectionColor=true\nColor=${rgbCsv(c.surface)}\nColorAmount=0.025\nColorEffect=2\nContrastAmount=0.1\nContrastEffect=2\nEnable=false\nIntensityAmount=0\nIntensityEffect=0\n\n` +
              `[Colors:Button]\nBackgroundAlternate=${rgbCsv(c.surface)}\nBackgroundNormal=${rgbCsv(c.elevated)}\nDecorationFocus=${rgbCsv(c.focus)}\nDecorationHover=${rgbCsv(c.hover)}\nForegroundActive=${rgbCsv(c.accent)}\nForegroundInactive=${rgbCsv(c.muted)}\nForegroundLink=${rgbCsv(c.accent)}\nForegroundNegative=${rgbCsv(c.error)}\nForegroundNeutral=${rgbCsv(c.warning)}\nForegroundNormal=${rgbCsv(c.foreground)}\nForegroundPositive=${rgbCsv(c.success)}\nForegroundVisited=${rgbCsv(c.chart5)}\n\n` +
              `[Colors:Complementary]\nBackgroundAlternate=${rgbCsv(c.elevated)}\nBackgroundNormal=${rgbCsv(c.surface)}\nDecorationFocus=${rgbCsv(c.focus)}\nDecorationHover=${rgbCsv(c.hover)}\nForegroundActive=${rgbCsv(c.accent)}\nForegroundInactive=${rgbCsv(c.muted)}\nForegroundLink=${rgbCsv(c.accent)}\nForegroundNegative=${rgbCsv(c.error)}\nForegroundNeutral=${rgbCsv(c.warning)}\nForegroundNormal=${rgbCsv(c.foreground)}\nForegroundPositive=${rgbCsv(c.success)}\nForegroundVisited=${rgbCsv(c.chart5)}\n\n` +
              `[Colors:Header]\nBackgroundAlternate=${rgbCsv(c.background)}\nBackgroundNormal=${rgbCsv(c.surface)}\nDecorationFocus=${rgbCsv(c.focus)}\nDecorationHover=${rgbCsv(c.hover)}\nForegroundActive=${rgbCsv(c.accent)}\nForegroundInactive=${rgbCsv(c.muted)}\nForegroundLink=${rgbCsv(c.accent)}\nForegroundNegative=${rgbCsv(c.error)}\nForegroundNeutral=${rgbCsv(c.warning)}\nForegroundNormal=${rgbCsv(c.foreground)}\nForegroundPositive=${rgbCsv(c.success)}\nForegroundVisited=${rgbCsv(c.chart5)}\n\n` +
              `[Colors:Header][Inactive]\nBackgroundAlternate=${rgbCsv(c.background)}\nBackgroundNormal=${rgbCsv(c.surface)}\nForegroundInactive=${rgbCsv(c.muted)}\nForegroundNormal=${rgbCsv(c.muted)}\n\n` +
              `[Colors:Selection]\nBackgroundAlternate=${rgbCsv(c.selection)}\nBackgroundNormal=${rgbCsv(c.accentFill)}\nDecorationFocus=${rgbCsv(c.focus)}\nDecorationHover=${rgbCsv(c.hover)}\nForegroundActive=${rgbCsv(c.accentForeground)}\nForegroundInactive=${rgbCsv(c.selectionForeground)}\nForegroundLink=${rgbCsv(c.accentForeground)}\nForegroundNegative=${rgbCsv(c.error)}\nForegroundNeutral=${rgbCsv(c.warning)}\nForegroundNormal=${rgbCsv(c.accentForeground)}\nForegroundPositive=${rgbCsv(c.success)}\nForegroundVisited=${rgbCsv(c.chart5)}\n\n` +
              `[Colors:Tooltip]\nBackgroundAlternate=${rgbCsv(c.surface)}\nBackgroundNormal=${rgbCsv(c.elevated)}\nDecorationFocus=${rgbCsv(c.focus)}\nDecorationHover=${rgbCsv(c.hover)}\nForegroundActive=${rgbCsv(c.accent)}\nForegroundInactive=${rgbCsv(c.muted)}\nForegroundLink=${rgbCsv(c.accent)}\nForegroundNegative=${rgbCsv(c.error)}\nForegroundNeutral=${rgbCsv(c.warning)}\nForegroundNormal=${rgbCsv(c.foreground)}\nForegroundPositive=${rgbCsv(c.success)}\nForegroundVisited=${rgbCsv(c.chart5)}\n\n` +
              `[Colors:View]\nBackgroundAlternate=${rgbCsv(c.surface)}\nBackgroundNormal=${rgbCsv(c.background)}\nDecorationFocus=${rgbCsv(c.focus)}\nDecorationHover=${rgbCsv(c.hover)}\nForegroundActive=${rgbCsv(c.accent)}\nForegroundInactive=${rgbCsv(c.muted)}\nForegroundLink=${rgbCsv(c.accent)}\nForegroundNegative=${rgbCsv(c.error)}\nForegroundNeutral=${rgbCsv(c.warning)}\nForegroundNormal=${rgbCsv(c.foreground)}\nForegroundPositive=${rgbCsv(c.success)}\nForegroundVisited=${rgbCsv(c.chart5)}\n\n` +
              `[Colors:Window]\nBackgroundAlternate=${rgbCsv(c.elevated)}\nBackgroundNormal=${rgbCsv(c.surface)}\nDecorationFocus=${rgbCsv(c.focus)}\nDecorationHover=${rgbCsv(c.hover)}\nForegroundActive=${rgbCsv(c.accent)}\nForegroundInactive=${rgbCsv(c.muted)}\nForegroundLink=${rgbCsv(c.accent)}\nForegroundNegative=${rgbCsv(c.error)}\nForegroundNeutral=${rgbCsv(c.warning)}\nForegroundNormal=${rgbCsv(c.foreground)}\nForegroundPositive=${rgbCsv(c.success)}\nForegroundVisited=${rgbCsv(c.chart5)}\n\n` +
              `[General]\nColorScheme=${slug}-${mode}\nName=${name}\nshadeSortColumn=true\n\n` +
              `[WM]\nactiveBackground=${rgbCsv(c.surface)}\nactiveBlend=${rgbCsv(c.foreground)}\nactiveForeground=${rgbCsv(c.foreground)}\ninactiveBackground=${rgbCsv(c.background)}\ninactiveBlend=${rgbCsv(c.muted)}\ninactiveForeground=${rgbCsv(c.muted)}\n`,
          );
          break;
        case "rofi":
          add(
            `${file}.rasi`,
            comment(theme) +
              `* {\n` +
              `  bg: ${c.background};\n` +
              `  bg-alt: ${c.surface};\n` +
              `  elevated: ${c.elevated};\n` +
              `  fg: ${c.foreground};\n` +
              `  fg-alt: ${c.muted};\n` +
              `  accent: ${c.accentFill};\n` +
              `  accent-fg: ${c.accentForeground};\n` +
              `  urgent: ${c.error};\n` +
              `  border-col: ${c.border};\n` +
              `  selection: ${c.selection};\n` +
              `  selection-fg: ${c.selectionForeground};\n` +
              `  radius: ${theme.style.radius}px;\n` +
              `  background-color: transparent;\n` +
              `  text-color: @fg;\n` +
              `  font: "${theme.fonts.sans} ${theme.fonts.size}";\n` +
              `}\n\n` +
              `window {\n  background-color: @bg;\n  border: 1px solid;\n  border-color: @border-col;\n  border-radius: @radius;\n  padding: 16px;\n}\n\n` +
              `mainbox {\n  spacing: 10px;\n}\n\n` +
              `inputbar {\n  background-color: @bg-alt;\n  border: 1px solid;\n  border-color: @border-col;\n  border-radius: @radius;\n  padding: 10px 12px;\n  spacing: 8px;\n  children: [ "prompt", "entry" ];\n}\n\n` +
              `prompt {\n  text-color: @accent;\n}\n\n` +
              `entry {\n  text-color: @fg;\n  placeholder-color: @fg-alt;\n}\n\n` +
              `listview {\n  lines: 6;\n  spacing: 4px;\n  scrollbar: true;\n}\n\n` +
              `scrollbar {\n  width: 4px;\n  handle-width: 6px;\n  handle-color: @fg-alt;\n}\n\n` +
              `element {\n  padding: 8px 10px;\n  border-radius: @radius;\n}\n\n` +
              `element normal.normal {\n  background-color: transparent;\n  text-color: @fg;\n}\n\n` +
              `element alternate.normal {\n  background-color: @bg-alt;\n  text-color: @fg;\n}\n\n` +
              `element normal.urgent {\n  background-color: transparent;\n  text-color: @urgent;\n}\n\n` +
              `element selected.normal {\n  background-color: @accent;\n  text-color: @accent-fg;\n}\n\n` +
              `element-text {\n  background-color: transparent;\n  text-color: inherit;\n}\n\n` +
              `element-icon {\n  background-color: transparent;\n  size: 1.1em;\n}\n`,
          );
          break;
        case "jetbrains": {
          const hexNoHash = (color: string) => color.slice(1).toLowerCase();
          const escXml = (s: string) =>
            s
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;");
          const parentScheme = mode === "dark" ? "Darcula" : "Default";
          const syn = syntax(c);
          const consoleNames = [
            "CONSOLE_BLACK_OUTPUT",
            "CONSOLE_RED_OUTPUT",
            "CONSOLE_GREEN_OUTPUT",
            "CONSOLE_YELLOW_OUTPUT",
            "CONSOLE_BLUE_OUTPUT",
            "CONSOLE_MAGENTA_OUTPUT",
            "CONSOLE_CYAN_OUTPUT",
            "CONSOLE_GRAY_OUTPUT",
            "CONSOLE_DARKGRAY_OUTPUT",
            "CONSOLE_RED_BRIGHT_OUTPUT",
            "CONSOLE_GREEN_BRIGHT_OUTPUT",
            "CONSOLE_YELLOW_BRIGHT_OUTPUT",
            "CONSOLE_BLUE_BRIGHT_OUTPUT",
            "CONSOLE_MAGENTA_BRIGHT_OUTPUT",
            "CONSOLE_CYAN_BRIGHT_OUTPUT",
            "CONSOLE_WHITE_OUTPUT",
          ];
          add(
            `${file}.icls`,
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
              `<scheme name="${escXml(name)}" version="142" parent_scheme="${parentScheme}">\n` +
              `  <metaInfo>\n    <property name="created">ThemeSpace ${generatorVersion}</property>\n  </metaInfo>\n` +
              `  <colors>\n` +
              `    <option name="CARET_COLOR" value="${hexNoHash(c.accent)}" />\n` +
              `    <option name="CARET_ROW_COLOR" value="${hexNoHash(c.hover)}" />\n` +
              `    <option name="CONSOLE_BACKGROUND_KEY" value="${hexNoHash(c.background)}" />\n` +
              `    <option name="GUTTER_BACKGROUND" value="${hexNoHash(c.surface)}" />\n` +
              `    <option name="INDENT_GUIDE" value="${hexNoHash(c.border)}" />\n` +
              `    <option name="LINE_NUMBERS_COLOR" value="${hexNoHash(c.muted)}" />\n` +
              `    <option name="RIGHT_MARGIN_COLOR" value="${hexNoHash(c.border)}" />\n` +
              `    <option name="SELECTION_BACKGROUND" value="${hexNoHash(c.selection)}" />\n` +
              `    <option name="SELECTION_FOREGROUND" value="${hexNoHash(c.selectionForeground)}" />\n` +
              `    <option name="TEARLINE_COLOR" value="${hexNoHash(c.border)}" />\n` +
              `  </colors>\n` +
              `  <attributes>\n` +
              `    <option name="TEXT">\n      <value>\n        <option name="FOREGROUND" value="${hexNoHash(c.foreground)}" />\n        <option name="BACKGROUND" value="${hexNoHash(c.background)}" />\n      </value>\n    </option>\n` +
              `    <option name="DEFAULT_IDENTIFIER">\n      <value><option name="FOREGROUND" value="${hexNoHash(c.foreground)}" /></value>\n    </option>\n` +
              `    <option name="DEFAULT_KEYWORD">\n      <value><option name="FOREGROUND" value="${hexNoHash(syn.keyword)}" /><option name="FONT_TYPE" value="1" /></value>\n    </option>\n` +
              `    <option name="DEFAULT_STRING">\n      <value><option name="FOREGROUND" value="${hexNoHash(syn.string)}" /></value>\n    </option>\n` +
              `    <option name="DEFAULT_NUMBER">\n      <value><option name="FOREGROUND" value="${hexNoHash(syn.number)}" /></value>\n    </option>\n` +
              `    <option name="DEFAULT_CONSTANT">\n      <value><option name="FOREGROUND" value="${hexNoHash(syn.number)}" /></value>\n    </option>\n` +
              `    <option name="DEFAULT_FUNCTION_DECLARATION">\n      <value><option name="FOREGROUND" value="${hexNoHash(syn.function)}" /></value>\n    </option>\n` +
              `    <option name="DEFAULT_CLASS_NAME">\n      <value><option name="FOREGROUND" value="${hexNoHash(syn.type)}" /></value>\n    </option>\n` +
              `    <option name="DEFAULT_LINE_COMMENT">\n      <value><option name="FOREGROUND" value="${hexNoHash(syn.comment)}" /><option name="FONT_TYPE" value="2" /></value>\n    </option>\n` +
              `    <option name="DEFAULT_BLOCK_COMMENT">\n      <value><option name="FOREGROUND" value="${hexNoHash(syn.comment)}" /><option name="FONT_TYPE" value="2" /></value>\n    </option>\n` +
              `    <option name="DIFF_INSERTED">\n      <value><option name="BACKGROUND" value="${hexNoHash(mix(c.background, c.success, 0.16))}" /></value>\n    </option>\n` +
              `    <option name="DIFF_DELETED">\n      <value><option name="BACKGROUND" value="${hexNoHash(mix(c.background, c.error, 0.16))}" /></value>\n    </option>\n` +
              `    <option name="DIFF_MODIFIED">\n      <value><option name="BACKGROUND" value="${hexNoHash(mix(c.background, c.warning, 0.16))}" /></value>\n    </option>\n` +
              `    <option name="ERRORS_ATTRIBUTES">\n      <value><option name="EFFECT_COLOR" value="${hexNoHash(c.error)}" /><option name="EFFECT_TYPE" value="2" /></value>\n    </option>\n` +
              `    <option name="WARNING_ATTRIBUTES">\n      <value><option name="EFFECT_COLOR" value="${hexNoHash(c.warning)}" /><option name="EFFECT_TYPE" value="2" /></value>\n    </option>\n` +
              consoleNames
                .map(
                  (key, idx) =>
                    `    <option name="${key}">\n      <value><option name="FOREGROUND" value="${hexNoHash(ansi[idx])}" /></value>\n    </option>`,
                )
                .join("\n") +
              `\n  </attributes>\n</scheme>\n`,
          );
          break;
        }
        case "bat": {
          const escXml = (s: string) =>
            s
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;");
          const syn = syntax(c);
          const rule = (label: string, scope: string, fg: string) =>
            `    <dict>\n      <key>name</key><string>${label}</string>\n      <key>scope</key><string>${scope}</string>\n      <key>settings</key><dict><key>foreground</key><string>${fg}</string></dict>\n    </dict>`;
          add(
            `${file}.tmTheme`,
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
              `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
              `<plist version="1.0">\n<dict>\n` +
              `  <key>name</key><string>${escXml(name)}</string>\n` +
              `  <key>settings</key>\n  <array>\n` +
              `    <dict>\n      <key>settings</key>\n      <dict>\n` +
              `        <key>background</key><string>${c.background}</string>\n` +
              `        <key>foreground</key><string>${c.foreground}</string>\n` +
              `        <key>caret</key><string>${c.accent}</string>\n` +
              `        <key>lineHighlight</key><string>${c.hover}</string>\n` +
              `        <key>selection</key><string>${c.selection}</string>\n` +
              `        <key>gutter</key><string>${c.surface}</string>\n` +
              `        <key>gutterForeground</key><string>${c.muted}</string>\n` +
              `      </dict>\n    </dict>\n` +
              [
                rule("Comment", "comment", syn.comment),
                rule("Keyword", "keyword, storage.type", syn.keyword),
                rule("String", "string", syn.string),
                rule("Number", "constant.numeric", syn.number),
                rule("Function", "entity.name.function", syn.function),
                rule("Type", "entity.name.type, support.type", syn.type),
                rule("Diff Inserted", "markup.inserted", c.success),
                rule("Diff Deleted", "markup.deleted", c.error),
                rule("Diff Changed", "markup.changed", c.warning),
              ].join("\n") +
              `\n  </array>\n</dict>\n</plist>\n`,
          );
          break;
        }
        case "tmux":
          add(
            `${file}.conf`,
            `# ${name} for tmux · Generated with ThemeSpace ${generatorVersion}\n` +
              `set -g status-style "bg=${c.surface},fg=${c.foreground}"\n` +
              `set -g window-status-style "bg=${c.surface},fg=${c.muted}"\n` +
              `set -g window-status-current-style "bg=${c.accentFill},fg=${c.accentForeground},bold"\n` +
              `set -g pane-border-style "fg=${c.border}"\n` +
              `set -g pane-active-border-style "fg=${c.accent}"\n` +
              `set -g message-style "bg=${c.elevated},fg=${c.foreground}"\n` +
              `set -g message-command-style "bg=${c.selection},fg=${c.selectionForeground}"\n` +
              `set -g mode-style "bg=${c.selection},fg=${c.selectionForeground}"\n` +
              `set -g status-left "#[bg=${c.accentFill},fg=${c.accentForeground},bold] #S #[bg=${c.surface},fg=${c.foreground}] "\n` +
              `set -g status-right "#[fg=${c.muted}]%H:%M #[fg=${c.success}]● #[fg=${c.foreground}]#h "\n`,
          );
          break;
        case "zellij": {
          const rgbSp = (color: string) => rgb(color).join(" ");
          const block = (
            key: string,
            baseCol: string,
            bgCol: string,
            e0: string,
            e1: string,
            e2: string,
            e3: string,
          ) =>
            `        ${key} {\n` +
            `            base ${rgbSp(baseCol)}\n` +
            `            background ${rgbSp(bgCol)}\n` +
            `            emphasis_0 ${rgbSp(e0)}\n` +
            `            emphasis_1 ${rgbSp(e1)}\n` +
            `            emphasis_2 ${rgbSp(e2)}\n` +
            `            emphasis_3 ${rgbSp(e3)}\n` +
            `        }`;
          add(
            `${file}.kdl`,
            `// ${name} for Zellij 0.40+ · Generated with ThemeSpace ${generatorVersion}\n` +
              `themes {\n` +
              `    ${file} {\n` +
              [
                block("text_unselected", c.foreground, c.background, c.warning, c.info, c.success, c.chart5),
                block("text_selected", c.selectionForeground, c.selection, c.warning, c.info, c.success, c.chart5),
                block("ribbon_unselected", c.foreground, c.surface, c.error, c.foreground, c.accent, c.chart5),
                block("ribbon_selected", c.accentForeground, c.accentFill, c.error, c.warning, c.chart5, c.info),
                block("table_title", c.accent, c.background, c.warning, c.info, c.success, c.chart5),
                block("table_cell_selected", c.selectionForeground, c.selection, c.warning, c.info, c.success, c.chart5),
                block("table_cell_unselected", c.foreground, c.background, c.warning, c.info, c.success, c.chart5),
                block("list_selected", c.selectionForeground, c.selection, c.warning, c.info, c.success, c.chart5),
                block("list_unselected", c.foreground, c.background, c.warning, c.info, c.success, c.chart5),
                block("frame_selected", c.accent, c.background, c.warning, c.info, c.success, c.chart5),
                block("frame_unselected", c.border, c.background, c.muted, c.muted, c.muted, c.muted),
                block("frame_highlight", c.warning, c.background, c.warning, c.warning, c.warning, c.warning),
                block("exit_code_success", c.success, c.background, c.info, c.surface, c.chart5, c.accent),
                block("exit_code_error", c.error, c.background, c.warning, c.surface, c.chart5, c.accent),
              ].join("\n") +
              `\n        multiplayer_user_colors {\n` +
              `            player_1 ${rgbSp(c.chart1)}\n` +
              `            player_2 ${rgbSp(c.chart2)}\n` +
              `            player_3 ${rgbSp(c.chart3)}\n` +
              `            player_4 ${rgbSp(c.chart4)}\n` +
              `            player_5 ${rgbSp(c.chart5)}\n` +
              `            player_6 ${rgbSp(c.info)}\n` +
              `            player_7 ${rgbSp(c.error)}\n` +
              `            player_8 ${rgbSp(c.warning)}\n` +
              `            player_9 ${rgbSp(c.success)}\n` +
              `            player_10 ${rgbSp(c.accent)}\n` +
              `        }\n` +
              `    }\n` +
              `}\n`,
          );
          break;
        }
        case "starship": {
          const palName = `${slug.replaceAll("-", "_")}_${mode}`;
          add(
            `${file}.toml`,
            `# ${name} for Starship · Generated with ThemeSpace ${generatorVersion}\n` +
              `palette = "${palName}"\n\n` +
              `[palettes.${palName}]\n` +
              `background = "${c.background}"\n` +
              `surface = "${c.surface}"\n` +
              `foreground = "${c.foreground}"\n` +
              `muted = "${c.muted}"\n` +
              `accent = "${c.accent}"\n` +
              `accent_fill = "${c.accentFill}"\n` +
              `accent_fg = "${c.accentForeground}"\n` +
              `success = "${c.success}"\n` +
              `warning = "${c.warning}"\n` +
              `error = "${c.error}"\n` +
              `info = "${c.info}"\n\n` +
              `[directory]\nstyle = "bold accent"\n\n` +
              `[git_branch]\nstyle = "bold success"\n\n` +
              `[character]\nsuccess_symbol = "[❯](bold accent)"\nerror_symbol = "[❯](bold error)"\n`,
          );
          break;
        }
        case "btop":
          add(
            `${file}.theme`,
            `# ${name} for btop++ · Generated with ThemeSpace ${generatorVersion}\n` +
              `theme[main_bg]="${c.background}"\n` +
              `theme[main_fg]="${c.foreground}"\n` +
              `theme[title]="${c.foreground}"\n` +
              `theme[hi_fg]="${c.accent}"\n` +
              `theme[selected_bg]="${c.selection}"\n` +
              `theme[selected_fg]="${c.selectionForeground}"\n` +
              `theme[inactive_fg]="${c.muted}"\n` +
              `theme[graph_text]="${c.foreground}"\n` +
              `theme[meter_bg]="${c.surface}"\n` +
              `theme[proc_misc]="${c.info}"\n` +
              `theme[cpu_box]="${c.accent}"\n` +
              `theme[mem_box]="${c.success}"\n` +
              `theme[net_box]="${c.error}"\n` +
              `theme[proc_box]="${c.info}"\n` +
              `theme[div_line]="${c.border}"\n` +
              `theme[temp_start]="${c.success}"\n` +
              `theme[temp_mid]="${c.warning}"\n` +
              `theme[temp_end]="${c.error}"\n` +
              `theme[cpu_start]="${c.accent}"\n` +
              `theme[cpu_mid]="${c.chart2}"\n` +
              `theme[cpu_end]="${c.error}"\n` +
              `theme[free_start]="${c.success}"\n` +
              `theme[free_mid]="${c.info}"\n` +
              `theme[free_end]="${c.accent}"\n` +
              `theme[cached_start]="${c.info}"\n` +
              `theme[cached_mid]="${c.accent}"\n` +
              `theme[cached_end]="${c.chart5}"\n` +
              `theme[available_start]="${c.warning}"\n` +
              `theme[available_mid]="${c.chart3}"\n` +
              `theme[available_end]="${c.error}"\n` +
              `theme[used_start]="${c.warning}"\n` +
              `theme[used_mid]="${c.chart5}"\n` +
              `theme[used_end]="${c.error}"\n` +
              `theme[download_start]="${c.info}"\n` +
              `theme[download_mid]="${c.accent}"\n` +
              `theme[download_end]="${c.chart5}"\n` +
              `theme[upload_start]="${c.success}"\n` +
              `theme[upload_mid]="${c.warning}"\n` +
              `theme[upload_end]="${c.error}"\n` +
              `theme[process_start]="${c.success}"\n` +
              `theme[process_mid]="${c.info}"\n` +
              `theme[process_end]="${c.accent}"\n`,
          );
          break;
        case "lazygit":
          add(
            `${file}.yaml`,
            `# ${name} for Lazygit · Generated with ThemeSpace ${generatorVersion}\n` +
              `gui:\n` +
              `  theme:\n` +
              `    activeBorderColor:\n      - "${c.accent}"\n      - bold\n` +
              `    inactiveBorderColor:\n      - "${c.border}"\n` +
              `    searchingActiveBorderColor:\n      - "${c.warning}"\n      - bold\n` +
              `    optionsTextColor:\n      - "${c.accent}"\n` +
              `    selectedLineBgColor:\n      - "${c.selection}"\n` +
              `    selectedLineFgColor:\n      - "${c.selectionForeground}"\n` +
              `    selectedRangeBgColor:\n      - "${c.hover}"\n` +
              `    inactiveViewSelectedLineBgColor:\n      - "${c.elevated}"\n` +
              `    cherryPickedCommitFgColor:\n      - "${c.accentForeground}"\n` +
              `    cherryPickedCommitBgColor:\n      - "${c.accentFill}"\n` +
              `    markedBaseCommitFgColor:\n      - "${c.accentForeground}"\n` +
              `    markedBaseCommitBgColor:\n      - "${c.warning}"\n` +
              `    unstagedChangesColor:\n      - "${c.error}"\n` +
              `    defaultFgColor:\n      - "${c.foreground}"\n` +
              `    authorColors:\n      "*": "${c.chart5}"\n`,
          );
          break;
        case "hyprland": {
          const rgbaHex = (color: string, alpha = "ff") =>
            `rgba(${color.slice(1).toLowerCase()}${alpha})`;
          add(
            `${file}.conf`,
            `# ${name} for Hyprland · Generated with ThemeSpace ${generatorVersion}\n` +
              `$ts_bg = ${rgbaHex(c.background)}\n` +
              `$ts_surface = ${rgbaHex(c.surface)}\n` +
              `$ts_fg = ${rgbaHex(c.foreground)}\n` +
              `$ts_muted = ${rgbaHex(c.muted)}\n` +
              `$ts_accent = ${rgbaHex(c.accentFill)}\n` +
              `$ts_accent2 = ${rgbaHex(c.accent2)}\n` +
              `$ts_border = ${rgbaHex(c.border)}\n` +
              `$ts_error = ${rgbaHex(c.error)}\n\n` +
              `general {\n` +
              `    col.active_border = $ts_accent $ts_accent2 45deg\n` +
              `    col.inactive_border = $ts_border\n` +
              `}\n\n` +
              `decoration {\n` +
              `    rounding = ${Math.min(18, theme.style.radius)}\n` +
              `    shadow {\n` +
              `        color = ${rgbaHex(c.background, "aa")}\n` +
              `    }\n` +
              `}\n\n` +
              `group {\n` +
              `    col.border_active = $ts_accent\n` +
              `    col.border_inactive = $ts_border\n` +
              `    groupbar {\n` +
              `        text_color = $ts_fg\n` +
              `        col.active = $ts_accent\n` +
              `        col.inactive = $ts_surface\n` +
              `    }\n` +
              `}\n`,
          );
          break;
        }
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
