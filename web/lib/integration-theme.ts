import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import { generateTarget, type ThemeFile } from "./exporters";
import { type Appearance, type Theme, resolve } from "./theme";

export const ansiKeys = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
] as const;
export type TerminalPalette = Partial<
  Record<
    | (typeof ansiKeys)[number]
    | "background"
    | "foreground"
    | "cursor"
    | "cursorAccent"
    | "selectionBackground"
    | "selectionForeground",
    string
  >
>;
/** ghostty-web 0.4's constructor cannot distinguish black defaults from unset. */
export function terminalEngine(target: string, palette: TerminalPalette) {
  return target === "ghostty" &&
    palette.foreground !== "#000000" &&
    palette.background !== "#000000"
    ? "ghostty-web"
    : "xterm.js";
}
export type IntegrationTheme = {
  target: string;
  mode: Appearance;
  sourceFiles: string[];
  roles: Record<string, string>;
  variables: Record<string, string>;
  syntax: Record<string, string>;
  terminal: TerminalPalette;
  editorColors: Record<string, string>;
};

function section(content: string, name = "") {
  const result: Record<string, string> = {};
  let active = "";
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^\s*\[([^\]]+)\]/);
    if (heading) {
      active = heading[1];
      continue;
    }
    const pair = line.match(/^\s*([^#;\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (pair && active === name) result[pair[1].trim()] = pair[2];
  }
  return result;
}
const hex = (value: string) => (value.startsWith("#") ? value : `#${value}`);
const csvHex = (value?: string) => {
  if (!value) return undefined;
  const parts = value.split(",").map((n) => Number(n.trim()));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n)))
    return undefined;
  return `#${parts
    .slice(0, 3)
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"))
    .join("")}`;
};
const defineColors = (content: string) =>
  Object.fromEntries(
    [...content.matchAll(/@define-color\s+([\w-]+)\s+(#[\da-fA-F]{6})\s*;/g)].map(
      (m) => [m[1], m[2].toLowerCase()],
    ),
  );
export function cssDeclarations(content: string, selector?: string) {
  const result: Record<string, string> = {};
  const blocks = [
    ...content
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .matchAll(/([^{}]+)\{([^{}]*)\}/g),
  ];
  for (const block of blocks) {
    if (selector && !block[1].split(",").some((s) => s.trim() === selector))
      continue;
    for (const pair of block[2].matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g))
      result[pair[1]] = pair[2].trim();
  }
  return result;
}

/** Read our generated files, without evaluating Lua/CSS or loading user URLs. */
export function integrationTheme(
  theme: Theme,
  mode: Appearance,
  target: string,
): IntegrationTheme {
  const source = {
    ...theme,
    name: theme.name.trim() || "My theme",
    author: theme.author.trim() || "You",
  };
  return integrationThemeFromFiles(
    source,
    mode,
    target,
    generateTarget(source, target),
  );
}

export function integrationThemeFromFiles(
  theme: Theme,
  mode: Appearance,
  target: string,
  files: ThemeFile[],
): IntegrationTheme {
  const c = resolve(theme, mode);
  const result: IntegrationTheme = {
    target,
    mode,
    sourceFiles: [],
    variables: {},
    syntax: {},
    terminal: {},
    editorColors: {},
    roles: {
      ...c,
      title: c.surface,
      sidebar: c.surface,
      tabs: c.surface,
      status: c.surface,
      statusText: c.foreground,
      terminalBackground: c.background,
      cursor: c.foreground,
    },
  };
  const read = (predicate: (f: ThemeFile) => boolean) => {
    const file = files.find(predicate);
    if (!file) throw new Error(`Missing ${target} preview theme for ${mode}.`);
    result.sourceFiles.push(file.path);
    return file.content;
  };
  const named = (suffix: string) =>
    read((f) => f.path.endsWith(`-${mode}${suffix}`));
  const apply = (roles: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(roles))
      if (value !== undefined) result.roles[key] = value;
  };
  const ansi = (values: string[]) =>
    values.forEach((value, index) => {
      result.terminal[ansiKeys[index]] = value;
    });
  const terminal = result.terminal;

  if (target === "vscode") {
    const data = JSON.parse(
      read(
        (f) => f.path.startsWith("themes/") && f.path.endsWith(`-${mode}.json`),
      ),
    );
    const colors = data.colors as Record<string, string>;
    result.editorColors = colors;
    result.syntax = data.semanticTokenColors;
    apply({
      background: colors["editor.background"],
      foreground: colors["editor.foreground"],
      title: colors["titleBar.activeBackground"],
      sidebar: colors["sideBar.background"],
      tabs: colors["tab.inactiveBackground"],
      status: colors["statusBar.background"],
      statusText: colors["statusBar.foreground"],
      cursor: colors["editorCursor.foreground"],
      selection: colors["editor.selectionBackground"],
      border: colors["editorGroup.border"],
      muted: colors["descriptionForeground"],
      accentFill: colors["button.background"],
      accentForeground: colors["button.foreground"],
    });
    Object.assign(terminal, {
      background: colors["terminal.background"],
      foreground: colors["terminal.foreground"],
    });
    ansi(
      ansiKeys.map(
        (key) => colors[`terminal.ansi${key[0].toUpperCase()}${key.slice(1)}`],
      ),
    );
  } else if (target === "zed") {
    const data = JSON.parse(
      read((f) => f.path.endsWith(".json") && f.path !== "manifest.json"),
    );
    const style = data.themes.find(
      (item: { appearance: string }) => item.appearance === mode,
    ).style;
    apply({
      background: style["editor.background"],
      foreground: style["editor.foreground"],
      surface: style["surface.background"],
      elevated: style["elevated_surface.background"],
      sidebar: style["panel.background"],
      title: style["title_bar.background"],
      tabs: style["tab_bar.background"],
      status: style["status_bar.background"],
      statusText: style.text,
      muted: style["text.muted"],
      border: style.border,
      selection: style.players[0].selection,
      cursor: style.players[0].cursor,
      hover: style["editor.active_line.background"],
    });
    result.syntax = Object.fromEntries(
      Object.entries(style.syntax).map(([key, value]) => [
        key,
        (value as { color: string }).color,
      ]),
    );
    Object.assign(terminal, {
      background: style["terminal.background"],
      foreground: style["terminal.foreground"],
    });
    ansi(
      ansiKeys.map(
        (key, index) =>
          style[
            `terminal.ansi.${index < 8 ? key : `bright_${ansiKeys[index - 8]}`}`
          ],
      ),
    );
  } else if (target === "neovim") {
    const content = named(".lua");
    const groups: Record<string, Record<string, string>> = {};
    // This reads the generator's highlight declarations; it never executes Lua.
    for (const match of content.matchAll(
      /vim\.api\.nvim_set_hl\(0, "([^"]+)", \{ ([^}]+) \}\)/g,
    )) {
      groups[match[1]] = Object.fromEntries(
        [...match[2].matchAll(/(fg|bg) = "([^"]+)"/g)].map((m) => [m[1], m[2]]),
      );
    }
    apply({
      background: groups.Normal.bg,
      foreground: groups.Normal.fg,
      selection: groups.Visual.bg,
      selectionForeground: groups.Visual.fg,
      status: groups.StatusLine.bg,
      statusText: groups.StatusLine.fg,
      muted: groups.LineNr.fg,
      hover: groups.CursorLine.bg,
      elevated: groups.NormalFloat.bg,
      border: groups.FloatBorder.fg,
    });
    for (const [group, value] of Object.entries(groups))
      if (group.startsWith("@") && value.fg)
        result.syntax[group.slice(1)] = value.fg;
    for (const match of content.matchAll(
      /vim\.g\.terminal_color_(\d+) = "([^"]+)"/g,
    ))
      terminal[ansiKeys[Number(match[1])]] = match[2];
  } else if (target === "helix") {
    const data = parseToml(named(".toml")) as Record<
      string,
      { bg?: string; fg?: string }
    >;
    apply({
      background: data["ui.background"].bg,
      foreground: data["ui.text"].fg,
      cursor: data["ui.cursor"].bg,
      selection: data["ui.selection"].bg,
      muted: data["ui.linenr"].fg,
      status: data["ui.statusline"].bg,
      statusText: data["ui.statusline"].fg,
      elevated: data["ui.popup"].bg,
    });
    for (const [key, value] of Object.entries(data))
      if (!key.startsWith("ui.") && value.fg) result.syntax[key] = value.fg;
  } else if (target === "sublime") {
    const data = JSON.parse(named(".sublime-color-scheme"));
    const g = data.globals;
    apply({
      background: g.background,
      foreground: g.foreground,
      cursor: g.caret,
      selection: g.selection,
      selectionForeground: g.selection_foreground,
      hover: g.line_highlight,
      muted: g.gutter_foreground,
      gutter: g.gutter,
    });
    // A Sublime color scheme does not change its separate UI theme.
    apply({
      title: mode === "dark" ? "#303030" : "#e5e5e5",
      sidebar: mode === "dark" ? "#252525" : "#f0f0f0",
      tabs: mode === "dark" ? "#303030" : "#e5e5e5",
      status: mode === "dark" ? "#303030" : "#e5e5e5",
    });
    result.syntax = Object.fromEntries(
      data.rules.map((rule: { scope: string; foreground: string }) => [
        rule.scope.replace("entity.name.", ""),
        rule.foreground,
      ]),
    );
  } else if (target === "ghostty") {
    const content = named("");
    const p = section(content);
    for (const match of content.matchAll(/^palette\s*=\s*(\d+)=(#[\da-f]+)/gm))
      terminal[ansiKeys[Number(match[1])]] = match[2];
    Object.assign(terminal, {
      background: p.background,
      foreground: p.foreground,
      cursor: p["cursor-color"],
      cursorAccent: p["cursor-text"],
      selectionBackground: p["selection-background"],
      selectionForeground: p["selection-foreground"],
    });
  } else if (target === "kitty") {
    const p = Object.fromEntries(
      named(".conf")
        .trim()
        .split("\n")
        .map((line) => line.split(/\s+/)),
    );
    ansi(ansiKeys.map((_, index) => p[`color${index}`]));
    Object.assign(terminal, {
      background: p.background,
      foreground: p.foreground,
      cursor: p.cursor,
      cursorAccent: p.cursor_text_color,
      selectionBackground: p.selection_background,
      selectionForeground: p.selection_foreground,
    });
  } else if (target === "alacritty") {
    const data = parseToml(named(".toml")) as unknown as {
      colors: {
        primary: Record<string, string>;
        cursor: Record<string, string>;
        selection: Record<string, string>;
        normal: Record<string, string>;
        bright: Record<string, string>;
      };
    };
    const p = data.colors;
    ansi(
      ansiKeys.map(
        (_, index) => (index < 8 ? p.normal : p.bright)[ansiKeys[index % 8]],
      ),
    );
    Object.assign(terminal, {
      background: p.primary.background,
      foreground: p.primary.foreground,
      cursor: p.cursor.cursor,
      cursorAccent: p.cursor.text,
      selectionBackground: p.selection.background,
      selectionForeground: p.selection.text,
    });
  } else if (target === "wezterm") {
    const { colors: p } = parseToml(named(".toml")) as unknown as {
      colors: Record<string, string> & { ansi: string[]; brights: string[] };
    };
    ansi([...p.ansi, ...p.brights]);
    Object.assign(terminal, {
      background: p.background,
      foreground: p.foreground,
      cursor: p.cursor_bg,
      cursorAccent: p.cursor_fg,
      selectionBackground: p.selection_bg,
      selectionForeground: p.selection_fg,
    });
  } else if (target === "windows-terminal") {
    const p = JSON.parse(named(".json"));
    ansi(ansiKeys.map((key) => p[key]));
    Object.assign(terminal, {
      background: p.background,
      foreground: p.foreground,
      cursor: p.cursorColor,
      selectionBackground: p.selectionBackground,
    });
  } else if (target === "iterm2") {
    const content = named(".itermcolors");
    const p: Record<string, string> = {};
    for (const match of content.matchAll(
      /<key>([^<]+)<\/key><dict>(.*?)<\/dict>/g,
    )) {
      const values = Object.fromEntries(
        [
          ...match[2].matchAll(
            /<key>(Red|Green|Blue) Component<\/key><real>([^<]+)<\/real>/g,
          ),
        ].map((v) => [v[1], Number(v[2])]),
      );
      p[match[1]] = `#${["Red", "Green", "Blue"]
        .map((key) =>
          Math.round(values[key] * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;
    }
    ansi(ansiKeys.map((_, index) => p[`Ansi ${index} Color`]));
    Object.assign(terminal, {
      background: p["Background Color"],
      foreground: p["Foreground Color"],
      cursor: p["Cursor Color"],
      cursorAccent: p["Cursor Text Color"],
      selectionBackground: p["Selection Color"],
      selectionForeground: p["Selected Text Color"],
    });
  } else if (target === "warp") {
    const p = parseYaml(named(".yaml"));
    ansi(
      ansiKeys.map(
        (_, index) =>
          p.terminal_colors[index < 8 ? "normal" : "bright"][
            ansiKeys[index % 8]
          ],
      ),
    );
    Object.assign(terminal, {
      background: p.background,
      foreground: p.foreground,
      cursor: p.accent,
    });
    apply({ accent: p.accent });
  } else if (target === "foot") {
    const p = section(named(".ini"), "colors");
    ansi(
      ansiKeys.map((_, index) =>
        hex(p[`${index < 8 ? "regular" : "bright"}${index % 8}`]),
      ),
    );
    Object.assign(terminal, {
      background: hex(p.background),
      foreground: hex(p.foreground),
      selectionBackground: hex(p["selection-background"]),
      selectionForeground: hex(p["selection-foreground"]),
    });
  } else if (target === "termux") {
    const p = section(read((f) => f.path === `${mode}/colors.properties`));
    ansi(ansiKeys.map((_, index) => p[`color${index}`]));
    Object.assign(terminal, {
      background: p.background,
      foreground: p.foreground,
      cursor: p.cursor,
    });
  } else if (target === "xresources") {
    const p = Object.fromEntries(
      [...named(".Xresources").matchAll(/^\*\.([\w]+):\s*(#[\da-f]+)/gm)].map(
        (v) => [v[1], v[2]],
      ),
    );
    ansi(ansiKeys.map((_, index) => p[`color${index}`]));
    Object.assign(terminal, {
      background: p.background,
      foreground: p.foreground,
      cursor: p.cursorColor,
    });
  } else if (target === "konsole") {
    const content = named(".colorscheme");
    const colorOf = (sec: string) => csvHex(section(content, sec).Color);
    ansi(
      ansiKeys.map((_, index) =>
        colorOf(`Color${index % 8}${index >= 8 ? "Intense" : ""}`),
      ) as string[],
    );
    Object.assign(terminal, {
      background: colorOf("Background"),
      foreground: colorOf("Foreground"),
    });
  } else if (target === "gnome-terminal") {
    const p = section(named(".dconf"), "/");
    const unquote = (v?: string) => v?.replace(/^'|'$/g, "");
    const palette = [...(p.palette?.matchAll(/'(#[\da-fA-F]{6})'/g) ?? [])].map(
      (m) => m[1].toLowerCase(),
    );
    ansi(palette);
    Object.assign(terminal, {
      background: unquote(p["background-color"]),
      foreground: unquote(p["foreground-color"]),
      cursor: unquote(p["cursor-background-color"]),
      cursorAccent: unquote(p["cursor-foreground-color"]),
      selectionBackground: unquote(p["highlight-background-color"]),
      selectionForeground: unquote(p["highlight-foreground-color"]),
    });
  } else if (target === "t3-code") {
    const data = JSON.parse(read((f) => f.path.endsWith(".json")));
    const p =
      (data.appearance === mode ? data.colors : data.variants?.[mode]) ??
      data.colors;
    apply({
      background: p.canvas,
      surface: p.surface,
      elevated: p.surfaceRaised,
      foreground: p.text,
      muted: p.textMuted,
      border: p.border,
      input: p.input,
      focus: p.focus,
      accent: p.accent,
      accentFill: p.accent,
      accentForeground: p.accentForeground,
      selection: p.accentSurface,
      selectionForeground: p.accentSurfaceForeground,
      hover: p.sidebarRowHover,
      sidebar: p.sidebar,
      title: p.toolbar,
      status: p.chrome,
      statusText: p.toolbarForeground,
      error: p.error,
      warning: p.warning,
      success: p.update,
    });
    Object.assign(terminal, {
      background: p.terminalBackground,
      foreground: p.terminalForeground,
      cursor: p.terminalCursor,
      selectionBackground: p.terminalSelection,
    });
    ansi(ansiKeys.map((_, index) => c[`ansi${index}`]));
  } else if (target === "vivaldi") {
    const data = JSON.parse(read((f) => f.path === `${mode}/settings.json`));
    const vc = data.colors as Record<string, string>;
    result.variables = {
      "--browser-frame": vc.colorWindowBg,
      "--browser-toolbar": vc.colorBg,
      "--browser-tab-selected": vc.colorBg,
      "--browser-tab-text": vc.colorFg,
      "--browser-tab-background-text": c.muted,
      "--browser-tab-line": vc.colorHi,
      "--browser-toolbar-text": vc.colorFg,
      "--browser-toolbar-field": vc.colorAc,
      "--browser-toolbar-field-text": vc.colorFg,
      "--browser-ntp-background": vc.colorBg,
      "--browser-ntp-text": vc.colorFg,
    };
    apply({
      title: vc.colorWindowBg,
      tabs: vc.colorWindowBg,
      surface: vc.colorAc,
      background: vc.colorBg,
      foreground: vc.colorFg,
      accent: vc.colorHi,
      accentFill: vc.colorHi,
      success: vc.colorSuccessBg,
      warning: vc.colorWarningBg,
      error: vc.colorErrorBg,
    });
  } else if (target === "zen") {
    const v = cssDeclarations(
      read((f) => f.path === `${mode}/userChrome.css`),
      ":root",
    );
    result.variables = {
      ...v,
      "--browser-frame": v["--zen-main-browser-background"],
      "--browser-toolbar": v["--zen-themed-toolbar-bg"],
      "--browser-tab-selected": v["--tab-selected-bgcolor"],
      "--browser-tab-text": v["--tab-selected-textcolor"],
      "--browser-tab-background-text": c.muted,
      "--browser-tab-line": v["--zen-primary-color"],
      "--browser-toolbar-text": v["--toolbar-color"],
      "--browser-toolbar-field": v["--urlbar-box-bgcolor"],
      "--browser-toolbar-field-text": v["--urlbar-box-text-color"],
      "--browser-toolbar-bottom-separator": v["--zen-colors-border"],
      "--browser-sidebar": v["--zen-colors-secondary"],
      "--browser-sidebar-text": v["--toolbar-color"],
      "--browser-sidebar-border": v["--zen-colors-border"],
      "--browser-ntp-background": v["--zen-themed-toolbar-bg"],
      "--browser-ntp-text": v["--toolbar-color"],
    };
    apply({
      title: v["--zen-main-browser-background"],
      surface: v["--zen-colors-secondary"],
      elevated: v["--zen-colors-tertiary"],
      background: v["--zen-themed-toolbar-bg"],
      foreground: v["--toolbar-color"],
      accent: v["--zen-primary-color"],
      accentFill: v["--zen-primary-color"],
      border: v["--zen-colors-border"],
    });
  } else if (target === "stylus") {
    const content = read((f) => f.path.endsWith(".user.css"));
    const mediaRe = new RegExp(
      `@media\\s*\\(prefers-color-scheme:\\s*${mode}\\)\\s*\\{([\\s\\S]*?)\\n\\}`,
    );
    const scoped = content.match(mediaRe)?.[1] ?? content;
    const v = cssDeclarations(scoped);
    result.variables = {
      ...v,
      "--browser-frame": mode === "dark" ? "#202124" : "#dee1e6",
      "--browser-toolbar": mode === "dark" ? "#292a2d" : "#ffffff",
      "--browser-tab-selected": mode === "dark" ? "#292a2d" : "#ffffff",
      "--browser-tab-text": mode === "dark" ? "#e8eaed" : "#202124",
      "--browser-tab-background-text": mode === "dark" ? "#9aa0a6" : "#5f6368",
      "--browser-ntp-background": v["--ts-background"] || c.background,
      "--browser-ntp-text": v["--ts-foreground"] || c.foreground,
    };
    apply({
      background: v["--ts-background"],
      surface: v["--ts-surface"],
      elevated: v["--ts-elevated"],
      foreground: v["--ts-foreground"],
      muted: v["--ts-muted"],
      accent: v["--ts-accent"],
      accentFill: v["--ts-accent-fill"],
      border: v["--ts-border"],
    });
  } else if (target === "gitcomet") {
    const data = JSON.parse(named(".json"));
    const gc = data.colors as Record<string, string>;
    apply({
      background: gc.background,
      surface: gc.surface,
      elevated: gc.elevated,
      foreground: gc.foreground,
      muted: gc.muted,
      border: gc.border,
      input: gc.input,
      accent: gc.accent,
      accentFill: gc.accentFill,
      accentForeground: gc.accentForeground,
      selection: gc.selection,
      selectionForeground: gc.selectionForeground,
      hover: gc.hover,
      success: data.diff.added,
      error: data.diff.removed,
      warning: data.diff.modified,
      chart1: data.graph[0],
      chart2: data.graph[1],
      chart3: data.graph[2],
      chart4: data.graph[3],
      chart5: data.graph[4],
    });
    result.syntax = data.syntax;
  } else if (target === "smartgit") {
    const p = section(named(".properties"));
    apply({
      surface: p["window.background"],
      background: p["control.background"],
      elevated: p["elevated.background"],
      foreground: p["window.foreground"],
      muted: p["muted.foreground"],
      border: p["border.color"],
      accent: p["accent.color"],
      accentFill: p["accent.color"],
      accentForeground: p["accent.foreground"],
      selection: p["selection.background"],
      selectionForeground: p["selection.foreground"],
      hover: p["hover.background"],
      success: p["diff.added"],
      error: p["diff.removed"],
      warning: p["diff.modified"],
      chart1: p["graph.branch.0"],
      chart2: p["graph.branch.1"],
      chart3: p["graph.branch.2"],
      chart4: p["graph.branch.3"],
      chart5: p["graph.branch.4"],
    });
  } else if (target === "slack") {
    const p = section(named(".txt"));
    result.variables = {
      "--slack-column-bg": p.column_bg,
      "--slack-menu-hover": p.menu_bg_hover,
      "--slack-active-item": p.active_item,
      "--slack-active-text": p.active_item_text,
      "--slack-hover-item": p.hover_item,
      "--slack-text": p.text_color,
      "--slack-presence": p.active_presence,
      "--slack-mention": p.mention_badge,
      "--slack-window-bg": p.window_bg,
      "--slack-border": p.border,
    };
    apply({
      sidebar: p.column_bg,
      surface: p.column_bg,
      background: p.window_bg,
      elevated: p.menu_bg_hover,
      foreground: p.text_color,
      accent: p.active_item,
      accentFill: p.active_item,
      accentForeground: p.active_item_text,
      hover: p.hover_item,
      success: p.active_presence,
      error: p.mention_badge,
      border: p.border,
    });
  } else if (target === "gtk") {
    const v = defineColors(read((f) => f.path === `${mode}/gtk-4.0/gtk.css`));
    result.variables = Object.fromEntries(
      Object.entries(v).map(([k, val]) => [`--gtk-${k.replaceAll("_", "-")}`, val]),
    );
    apply({
      background: v.window_bg_color,
      foreground: v.window_fg_color,
      surface: v.headerbar_bg_color,
      sidebar: v.sidebar_bg_color,
      elevated: v.card_bg_color,
      accent: v.accent_color,
      accentFill: v.accent_bg_color,
      accentForeground: v.accent_fg_color,
      border: v.borders,
      error: v.destructive_bg_color,
      success: v.success_bg_color,
      warning: v.warning_bg_color,
    });
  } else if (target === "kde") {
    const content = named(".colors");
    const win = section(content, "Colors:Window");
    const view = section(content, "Colors:View");
    const btn = section(content, "Colors:Button");
    const sel = section(content, "Colors:Selection");
    const wm = section(content, "WM");
    apply({
      background: csvHex(view.BackgroundNormal),
      surface: csvHex(win.BackgroundNormal),
      sidebar: csvHex(win.BackgroundNormal),
      elevated: csvHex(btn.BackgroundNormal),
      foreground: csvHex(win.ForegroundNormal),
      muted: csvHex(win.ForegroundInactive),
      accent: csvHex(win.ForegroundActive),
      accentFill: csvHex(sel.BackgroundNormal),
      accentForeground: csvHex(sel.ForegroundNormal),
      selection: csvHex(sel.BackgroundAlternate),
      selectionForeground: csvHex(sel.ForegroundInactive),
      title: csvHex(wm.activeBackground),
      success: csvHex(win.ForegroundPositive),
      warning: csvHex(win.ForegroundNeutral),
      error: csvHex(win.ForegroundNegative),
    });
  } else if (target === "waybar") {
    const v = defineColors(read((f) => f.path === `colors-${mode}.css`));
    result.variables = Object.fromEntries(
      Object.entries(v).map(([k, val]) => [`--waybar-${k}`, val]),
    );
    apply({
      background: v.background,
      surface: v.surface,
      elevated: v.elevated,
      foreground: v.foreground,
      muted: v.muted,
      border: v.border,
      accent: v.accent,
      accentFill: v["accent-fill"],
      accentForeground: v["accent-foreground"],
      selection: v.selection,
      hover: v.hover,
      success: v.success,
      warning: v.warning,
      error: v.error,
    });
  } else if (target === "rofi") {
    const content = named(".rasi");
    const vars = Object.fromEntries(
      [...content.matchAll(/^\s*([\w-]+):\s*(#[\da-fA-F]{6})\s*;/gm)].map(
        (m) => [m[1], m[2].toLowerCase()],
      ),
    );
    result.variables = Object.fromEntries(
      Object.entries(vars).map(([k, val]) => [`--rofi-${k}`, val]),
    );
    apply({
      background: vars.bg,
      surface: vars["bg-alt"],
      elevated: vars.elevated,
      foreground: vars.fg,
      muted: vars["fg-alt"],
      accent: vars.accent,
      accentFill: vars.accent,
      accentForeground: vars["accent-fg"],
      border: vars["border-col"],
      selection: vars.selection,
      selectionForeground: vars["selection-fg"],
    });
  } else if (target === "spicetify") {
    const p = section(
      read((f) => f.path === "color.ini"),
      mode,
    );
    result.variables = Object.fromEntries(
      Object.entries(p).flatMap(([key, value]) => {
        const color = hex(value);
        return [
          [`--spice-${key}`, color],
          [
            `--spice-rgb-${key}`,
            [1, 3, 5]
              .map((i) => parseInt(color.slice(i, i + 2), 16))
              .join(", "),
          ],
        ];
      }),
    );
    Object.assign(
      result.variables,
      cssDeclarations(read((f) => f.path === "user.css")),
    );
    apply({
      background: hex(p.main),
      foreground: hex(p.text),
      muted: hex(p.subtext),
      sidebar: hex(p.sidebar),
      surface: hex(p.player),
      elevated: hex(p.card),
      accent: hex(p.button),
      accentFill: hex(p.button),
      hover: hex(p.highlight),
      selection: hex(p["highlight-elevated"]),
      border: hex(p.misc),
    });
  } else if (
    target === "betterdiscord" ||
    target === "vencord" ||
    target === "obsidian"
  ) {
    result.variables = cssDeclarations(
      target === "obsidian"
        ? read((f) => f.path === "theme.css")
        : named(".theme.css"),
      `.theme-${mode}`,
    );
    const v = result.variables;
    apply({
      background: v["--background-primary"],
      foreground: v["--text-normal"],
      muted: v["--text-muted"],
      sidebar: v["--background-secondary"],
      surface: v["--background-secondary"],
      elevated: v["--background-floating"] || v["--background-secondary-alt"],
      input: v["--channeltextarea-background"],
      accent: v["--brand-500"] || v["--interactive-accent"],
      accentFill: v["--brand-500"] || v["--interactive-accent"],
      accentForeground: v["--text-on-accent"],
      selection: v["--background-modifier-selected"] || v["--text-selection"],
      hover: v["--background-modifier-hover"],
      border: v["--background-modifier-border"],
    });
    for (const key of ["comment", "keyword", "string", "function"])
      if (v[`--code-${key}`]) result.syntax[key] = v[`--code-${key}`];
  } else if (target === "firefox" || target === "chromium") {
    const data = JSON.parse(read((f) => f.path === `${mode}/manifest.json`));
    result.variables = Object.fromEntries(
      Object.entries(data.theme.colors).map(([key, value]) => [
        `--browser-${key.replaceAll("_", "-")}`,
        Array.isArray(value)
          ? `#${value.map((n) => n.toString(16).padStart(2, "0")).join("")}`
          : String(value),
      ]),
    );
    const v = result.variables;
    apply({
      title: v["--browser-frame"],
      tabs: v["--browser-frame"],
      surface: v["--browser-toolbar"],
      foreground: v["--browser-tab-text"],
      background: v["--browser-ntp-background"],
      muted: v["--browser-tab-background-text"],
    });
  } else if (target === "tokens") {
    const data = JSON.parse(read((f) => f.path === `tokens-${mode}.json`));
    // Keep the native DTCG document as the displayed source of token values.
    const visit = (node: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value !== "object" || !value) continue;
        const token = value as Record<string, unknown>;
        if (token.$type === "color" && token.$value) {
          const color = token.$value as { hex?: string };
          if (color.hex) result.variables[key] = color.hex;
        } else visit(token);
      }
    };
    visit(data);
  } else {
    result.sourceFiles = files
      .filter((f) => f.path !== "README.md")
      .map((f) => f.path);
  }

  apply({ terminalBackground: terminal.background });
  if (
    !["vscode", "zed", "neovim", "helix", "sublime", "t3-code"].includes(
      target,
    ) &&
    terminal.background
  ) {
    apply({
      background: terminal.background,
      foreground: terminal.foreground,
      cursor: terminal.cursor,
      cursorAccent: terminal.cursorAccent,
      selection: terminal.selectionBackground,
      selectionForeground: terminal.selectionForeground,
    });
    // Color-only terminal exports don't configure OS titlebars or application tabs.
    apply({
      title: mode === "dark" ? "#303030" : "#e7e7e7",
      tabs: mode === "dark" ? "#303030" : "#e7e7e7",
    });
  }
  ansiKeys.forEach((key, index) => {
    if (terminal[key]) result.roles[`ansi${index}`] = terminal[key]!;
  });
  for (const [key, value] of Object.entries(result.syntax))
    result.roles[`syntax${key.charAt(0).toUpperCase()}${key.slice(1)}`] = value;
  return result;
}
