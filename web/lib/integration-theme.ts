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
      if (!key.startsWith("ui.") && value.fg) {
        result.syntax[key === "constant.numeric" ? "number" : key] = value.fg;
      }
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
    const scopeKey = (scope: string) => {
      const first = scope.split(",")[0].trim();
      if (first === "constant.numeric") return "number";
      if (first === "keyword.operator") return "operator";
      if (first.startsWith("constant.")) return "constant";
      return first.replace("entity.name.", "");
    };
    result.syntax = Object.fromEntries(
      data.rules.map((rule: { scope: string; foreground: string }) => [
        scopeKey(rule.scope),
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
    const vc = JSON.parse(read((f) => f.path === `${mode}/settings.json`)) as Record<
      string,
      string
    >;
    result.variables = {
      "--browser-frame": vc.colorWindowBg,
      "--browser-toolbar": vc.colorBg,
      "--browser-tab-selected": vc.colorBg,
      "--browser-tab-text": vc.colorFg,
      "--browser-tab-background-text": c.muted,
      "--browser-tab-line": vc.colorHighlightBg,
      "--browser-toolbar-text": vc.colorFg,
      "--browser-toolbar-field": vc.colorAccentBg,
      "--browser-toolbar-field-text": vc.colorFg,
      "--browser-ntp-background": vc.colorBg,
      "--browser-ntp-text": vc.colorFg,
    };
    apply({
      title: vc.colorWindowBg,
      tabs: vc.colorWindowBg,
      surface: vc.colorAccentBg,
      background: vc.colorBg,
      foreground: vc.colorFg,
      accent: vc.colorHighlightBg,
      accentFill: vc.colorHighlightBg,
    });
  } else if (target === "zen") {
    const raw = read((f) => f.path === `${mode}/userChrome.css`).replaceAll(
      /\s*!important/gi,
      "",
    );
    const v = cssDeclarations(raw, ":root");
    result.variables = {
      ...v,
      "--browser-frame": v["--zen-main-browser-background"],
      "--browser-toolbar": v["--zen-themed-toolbar-bg"],
      "--browser-tab-selected": v["--zen-colors-primary"],
      "--browser-tab-text": v["--tab-selected-textcolor"],
      "--browser-tab-background-text": c.muted,
      "--browser-tab-line": v["--zen-primary-color"],
      "--browser-toolbar-text": v["--toolbar-color"],
      "--browser-toolbar-field": v["--zen-colors-tertiary"],
      "--browser-toolbar-field-text": v["--toolbar-field-color"],
      "--browser-toolbar-bottom-separator": v["--zen-colors-border"],
      "--browser-sidebar": v["--lwt-sidebar-background-color"],
      "--browser-sidebar-text": v["--lwt-sidebar-text-color"],
      "--browser-sidebar-border": v["--zen-colors-border"],
      "--browser-ntp-background": v["--newtab-background-color"],
      "--browser-ntp-text": v["--newtab-text-primary-color"],
    };
    apply({
      title: v["--zen-main-browser-background"],
      surface: v["--zen-colors-secondary"],
      elevated: v["--zen-colors-primary"],
      background: v["--newtab-background-color"],
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
    const bundle = JSON.parse(read((f) => f.path.endsWith(".json"))) as {
      themes: Array<{
        appearance: string;
        colors: {
          surface: Record<string, string>;
          foreground: Record<string, string | { hex: string }>;
          stroke: Record<string, string | { hex: string }>;
          interaction: Record<string, string | { hex: string }>;
          accent: Record<string, string>;
          diff: Record<string, Record<string, string>>;
          graph_lane_palette?: string[];
        };
        syntax?: Record<string, string>;
      }>;
    };
    const entry =
      bundle.themes.find((t) => t.appearance === mode) ?? bundle.themes[0];
    const h6 = (v?: string | { hex: string }) => {
      const s = typeof v === "string" ? v : v?.hex;
      return s ? s.slice(0, 7).toLowerCase() : undefined;
    };
    const gc = entry.colors;
    apply({
      background: h6(gc.surface.canvas),
      surface: h6(gc.surface.chrome),
      elevated: h6(gc.surface.raised),
      input: h6(gc.surface.input),
      foreground: h6(gc.foreground.primary),
      muted: h6(gc.foreground.secondary),
      border: h6(gc.stroke.default),
      accent: h6(gc.accent.foreground),
      accentFill: h6(gc.accent.solid),
      accentForeground: h6(gc.accent.on_solid),
      selection: h6(gc.interaction.selected_background),
      selectionForeground: h6(gc.interaction.selected_foreground),
      hover: h6(gc.interaction.hover_background),
      success: h6(gc.diff.added.foreground),
      error: h6(gc.diff.removed.foreground),
      warning: h6(gc.diff.modified.foreground),
      chart1: h6(gc.graph_lane_palette?.[0]),
      chart2: h6(gc.graph_lane_palette?.[1]),
      chart3: h6(gc.graph_lane_palette?.[2]),
      chart4: h6(gc.graph_lane_palette?.[3]),
      chart5: h6(gc.graph_lane_palette?.[4]),
    });
    if (entry.syntax) {
      result.syntax = {
        comment: h6(entry.syntax.comment) ?? c.syntaxComment,
        keyword: h6(entry.syntax.keyword) ?? c.syntaxKeyword,
        string: h6(entry.syntax.string) ?? c.syntaxString,
        number: h6(entry.syntax.number) ?? c.syntaxNumber,
        function: h6(entry.syntax.function) ?? c.syntaxFunction,
        type: h6(entry.syntax.type) ?? c.syntaxType,
      };
    }
  } else if (target === "smartgit") {
    const p = section(read((f) => f.path === `${mode}-patch.theme`));
    const refVal = (v?: string) => (v && p[v] ? p[v] : v);
    apply({
      surface: refVal(p.background1),
      background: refVal(p.background2),
      elevated: refVal(p["selection.background.unfocused"]),
      foreground: refVal(p.foreground1),
      border: refVal(p["composite.background#border"]),
      selection: refVal(p["selection.background"]),
      selectionForeground: refVal(p["selection.foreground"]),
      hover: refVal(p["toolBar.background.hover"]),
      success: refVal(p["branches#approved"]),
      error: refVal(p["branches#rejected"]),
      warning: refVal(p["branches#ahead"]),
      info: refVal(p["branches#behind"]),
      chart1: refVal(p["branches#approved"]),
      chart2: refVal(p["branches#behind"]),
      chart3: refVal(p["branches#ahead"]),
      chart4: refVal(p["branches#rejected"]),
    });
  } else if (target === "slack") {
    const lines = named(".txt")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^#[0-9a-f]{6}(,#[0-9a-f]{6})+$/i.test(l));
    const modern4 = lines[0]?.split(",") ?? [];
    const legacy8 = lines[1]?.split(",") ?? [];
    const colBg = legacy8[0] ?? modern4[0];
    const menuHover = legacy8[1] ?? c.elevated;
    const activeItem = modern4[1] ?? legacy8[2];
    const activeText = legacy8[3] ?? c.accentForeground;
    const hoverItem = legacy8[4] ?? c.hover;
    const textCol = legacy8[5] ?? c.foreground;
    const presence = modern4[2] ?? legacy8[6];
    const mention = modern4[3] ?? legacy8[7];
    result.variables = {
      "--slack-column-bg": colBg,
      "--slack-menu-hover": menuHover,
      "--slack-active-item": activeItem,
      "--slack-active-text": activeText,
      "--slack-hover-item": hoverItem,
      "--slack-text": textCol,
      "--slack-presence": presence,
      "--slack-mention": mention,
      "--slack-window-bg": c.background,
      "--slack-border": c.border,
    };
    apply({
      sidebar: colBg,
      surface: colBg,
      elevated: menuHover,
      foreground: textCol,
      accent: activeItem,
      accentFill: activeItem,
      accentForeground: activeText,
      hover: hoverItem,
      success: presence,
      error: mention,
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
  } else if (target === "jetbrains") {
    const content = named(".icls");
    const optHex = (re: RegExp) => {
      const m = content.match(re)?.[1];
      return m ? hex(m) : undefined;
    };
    const colorOpt = (k: string) =>
      optHex(new RegExp(`<option name="${k}" value="([0-9a-fA-F]{6})"`, "i"));
    const attrFg = (k: string) =>
      optHex(
        new RegExp(
          `<option name="${k}">[\\s\\S]*?<option name="FOREGROUND" value="([0-9a-fA-F]{6})"`,
          "i",
        ),
      );
    const attrBg = (k: string) =>
      optHex(
        new RegExp(
          `<option name="${k}">[\\s\\S]*?<option name="BACKGROUND" value="([0-9a-fA-F]{6})"`,
          "i",
        ),
      );
    apply({
      background: attrBg("TEXT"),
      foreground: attrFg("TEXT"),
      surface: colorOpt("GUTTER_BACKGROUND"),
      sidebar: colorOpt("GUTTER_BACKGROUND"),
      title: colorOpt("GUTTER_BACKGROUND"),
      tabs: colorOpt("GUTTER_BACKGROUND"),
      status: colorOpt("GUTTER_BACKGROUND"),
      muted: colorOpt("LINE_NUMBERS_COLOR"),
      cursor: colorOpt("CARET_COLOR"),
      hover: colorOpt("CARET_ROW_COLOR"),
      selection: colorOpt("SELECTION_BACKGROUND"),
      selectionForeground: colorOpt("SELECTION_FOREGROUND"),
      border: colorOpt("TEARLINE_COLOR"),
    });
    result.syntax = {
      keyword: attrFg("DEFAULT_KEYWORD") ?? c.syntaxKeyword,
      string: attrFg("DEFAULT_STRING") ?? c.syntaxString,
      number: attrFg("DEFAULT_NUMBER") ?? c.syntaxNumber,
      function: attrFg("DEFAULT_FUNCTION_DECLARATION") ?? c.syntaxFunction,
      type: attrFg("DEFAULT_CLASS_NAME") ?? c.syntaxType,
      comment: attrFg("DEFAULT_LINE_COMMENT") ?? c.syntaxComment,
    };
  } else if (target === "bat") {
    const content = named(".tmTheme");
    const setting = (k: string) =>
      content.match(
        new RegExp(`<key>${k}</key><string>(#[0-9a-fA-F]{6})</string>`, "i"),
      )?.[1]?.toLowerCase();
    const ruleFg = (label: string) =>
      content.match(
        new RegExp(
          `<key>name</key><string>${label}</string>[\\s\\S]*?<key>foreground</key><string>(#[0-9a-fA-F]{6})</string>`,
          "i",
        ),
      )?.[1]?.toLowerCase();
    apply({
      background: setting("background"),
      foreground: setting("foreground"),
      cursor: setting("caret"),
      hover: setting("lineHighlight"),
      selection: setting("selection"),
      surface: setting("gutter"),
      sidebar: setting("gutter"),
      muted: setting("gutterForeground"),
      success: ruleFg("Diff Inserted"),
      error: ruleFg("Diff Deleted"),
      warning: ruleFg("Diff Changed"),
    });
    result.syntax = {
      comment: ruleFg("Comment") ?? c.syntaxComment,
      keyword: ruleFg("Keyword") ?? c.syntaxKeyword,
      string: ruleFg("String") ?? c.syntaxString,
      number: ruleFg("Number") ?? c.syntaxNumber,
      function: ruleFg("Function") ?? c.syntaxFunction,
      type: ruleFg("Type") ?? c.syntaxType,
    };
  } else if (target === "tmux") {
    const content = named(".conf");
    const styleVal = (opt: string, part: "bg" | "fg") =>
      content.match(
        new RegExp(`set -g ${opt} "[^"]*${part}=(#[0-9a-fA-F]{6})`, "i"),
      )?.[1]?.toLowerCase();
    apply({
      surface: styleVal("status-style", "bg"),
      status: styleVal("status-style", "bg"),
      foreground: styleVal("status-style", "fg"),
      statusText: styleVal("status-style", "fg"),
      muted: styleVal("window-status-style", "fg"),
      accentFill: styleVal("window-status-current-style", "bg"),
      accentForeground: styleVal("window-status-current-style", "fg"),
      border: styleVal("pane-border-style", "fg"),
      accent: styleVal("pane-active-border-style", "fg"),
      elevated: styleVal("message-style", "bg"),
      selection: styleVal("mode-style", "bg"),
      selectionForeground: styleVal("mode-style", "fg"),
    });
    Object.assign(terminal, {
      background: c.background,
      foreground: styleVal("status-style", "fg") ?? c.foreground,
    });
  } else if (target === "zellij") {
    const content = named(".kdl");
    const blockHex = (blockName: string, prop: string) => {
      const m = content.match(
        new RegExp(
          `${blockName}\\s*\\{[\\s\\S]*?${prop}\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)`,
          "i",
        ),
      );
      return m ? csvHex(`${m[1]},${m[2]},${m[3]}`) : undefined;
    };
    apply({
      foreground: blockHex("text_unselected", "base"),
      background: blockHex("text_unselected", "background"),
      selection: blockHex("text_selected", "background"),
      selectionForeground: blockHex("text_selected", "base"),
      surface: blockHex("ribbon_unselected", "background"),
      accentFill: blockHex("ribbon_selected", "background"),
      accentForeground: blockHex("ribbon_selected", "base"),
      accent: blockHex("frame_selected", "base"),
      border: blockHex("frame_unselected", "base"),
      warning: blockHex("frame_highlight", "base"),
      success: blockHex("exit_code_success", "base"),
      error: blockHex("exit_code_error", "base"),
    });
    Object.assign(terminal, {
      background: result.roles.background,
      foreground: result.roles.foreground,
    });
  } else if (target === "starship") {
    const data = parseToml(named(".toml")) as unknown as {
      palette: string;
      palettes: Record<string, Record<string, string>>;
    };
    const p = data.palettes[data.palette] ?? {};
    apply({
      background: p.background,
      surface: p.surface,
      foreground: p.foreground,
      muted: p.muted,
      accent: p.accent,
      accentFill: p.accent_fill,
      accentForeground: p.accent_fg,
      success: p.success,
      warning: p.warning,
      error: p.error,
      info: p.info,
    });
    Object.assign(terminal, {
      background: p.background,
      foreground: p.foreground,
    });
  } else if (target === "btop") {
    const content = named(".theme");
    const btop = (k: string) =>
      content.match(
        new RegExp(`^theme\\[${k}\\]="(#[0-9a-fA-F]{6})"`, "im"),
      )?.[1]?.toLowerCase();
    apply({
      background: btop("main_bg"),
      foreground: btop("main_fg"),
      accent: btop("hi_fg"),
      accentFill: btop("hi_fg"),
      selection: btop("selected_bg"),
      selectionForeground: btop("selected_fg"),
      muted: btop("inactive_fg"),
      surface: btop("meter_bg"),
      border: btop("div_line"),
      success: btop("temp_start"),
      warning: btop("temp_mid"),
      error: btop("temp_end"),
      info: btop("download_start"),
      chart1: btop("cpu_start"),
      chart2: btop("cpu_mid"),
      chart3: btop("used_start"),
      chart4: btop("used_end"),
      chart5: btop("download_end"),
    });
    Object.assign(terminal, {
      background: btop("main_bg"),
      foreground: btop("main_fg"),
    });
  } else if (target === "lazygit") {
    const data = parseYaml(named(".yaml")) as {
      gui?: { theme?: Record<string, string[] | Record<string, string>> };
    };
    const t = data.gui?.theme ?? {};
    const first = (k: string) => {
      const v = t[k];
      return Array.isArray(v) ? v[0] : undefined;
    };
    apply({
      accent: first("activeBorderColor"),
      border: first("inactiveBorderColor"),
      warning: first("searchingActiveBorderColor"),
      selection: first("selectedLineBgColor"),
      selectionForeground: first("selectedLineFgColor"),
      hover: first("selectedRangeBgColor"),
      elevated: first("inactiveViewSelectedLineBgColor"),
      accentFill: first("cherryPickedCommitBgColor"),
      accentForeground: first("cherryPickedCommitFgColor"),
      error: first("unstagedChangesColor"),
      foreground: first("defaultFgColor"),
    });
    Object.assign(terminal, {
      background: c.background,
      foreground: first("defaultFgColor") ?? c.foreground,
    });
  } else if (target === "hyprland") {
    const content = named(".conf");
    const hv = (k: string) => {
      const m = content.match(
        new RegExp(`^\\$ts_${k}\\s*=\\s*rgba\\(([0-9a-fA-F]{6})`, "im"),
      );
      return m ? `#${m[1].toLowerCase()}` : undefined;
    };
    apply({
      background: hv("bg"),
      surface: hv("surface"),
      sidebar: hv("surface"),
      foreground: hv("fg"),
      muted: hv("muted"),
      accent: hv("accent"),
      accentFill: hv("accent"),
      accent2: hv("accent2"),
      border: hv("border"),
      error: hv("error"),
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
    ![
      "vscode",
      "zed",
      "neovim",
      "helix",
      "sublime",
      "t3-code",
      "jetbrains",
      "tmux",
      "zellij",
      "starship",
      "btop",
      "lazygit",
    ].includes(target) &&
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
