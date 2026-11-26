import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTarget } from "../lib/exporters";
import {
  ansiKeys,
  integrationTheme,
  integrationThemeFromFiles,
} from "../lib/integration-theme";
import { previewProfiles } from "../lib/preview-targets";
import { previewFidelity } from "../lib/preview-fidelity";
import { tuiAnsi } from "../lib/tui-ansi";
import { exportTargets } from "../lib/targets";
import { presets, resolve } from "../lib/theme";
import { monacoTheme } from "../lib/editor-preview";

const theme = structuredClone(presets[0]);
theme.modes.dark!.overrides = {
  ansi3: "#13579a",
  selection: "#123456",
  syntaxKeyword: "#abcd12",
};
theme.modes.light!.overrides = {
  ansi3: "#2468ac",
  selection: "#654321",
  syntaxKeyword: "#123abc",
};

test("all 47 integrations parse their real export and disclose renderer coverage", () => {
  assert.equal(exportTargets.length, 47);
  assert.deepEqual(
    Object.keys(previewFidelity).sort(),
    exportTargets.map((target) => target.id).sort(),
  );
  assert.deepEqual(
    Object.keys(previewProfiles).sort(),
    exportTargets.map((target) => target.id).sort(),
  );
  for (const target of exportTargets)
    for (const mode of ["dark", "light"] as const) {
      const result = integrationTheme(theme, mode, target.id);
      const files = generateTarget(theme, target.id);
      assert.ok(result.sourceFiles.length, target.id);
      assert.ok(
        result.sourceFiles.every((path) =>
          files.some((file) => file.path === path),
        ),
        target.id,
      );
      assert.ok(previewFidelity[target.id].coverage.length > 40);
      assert.ok(previewFidelity[target.id].limitations.length > 40);
      assert.ok(
        Object.values(result.roles).every(
          (value) => typeof value === "string" && value !== "#undefined",
        ),
        target.id,
      );
    }
});

test("all twelve terminal adapters preserve every ANSI color and only exported cursor/selection settings", () => {
  const targets = Object.entries(previewProfiles)
    .filter(([, profile]) => profile.kind === "terminal")
    .map(([target]) => target);
  assert.equal(targets.length, 12);
  for (const target of targets)
    for (const mode of ["dark", "light"] as const) {
      const result = integrationTheme(theme, mode, target),
        c = resolve(theme, mode);
      assert.equal(result.terminal.background, c.background, target);
      assert.equal(result.terminal.foreground, c.foreground, target);
      ansiKeys.forEach((key, index) =>
        assert.equal(
          result.terminal[key],
          c[`ansi${index}`],
          `${target} ${key}`,
        ),
      );
      if (["warp", "termux", "xresources", "konsole"].includes(target))
        assert.equal(result.terminal.selectionBackground, undefined);
      else
        assert.equal(result.terminal.selectionBackground, c.selection, target);
      if (["foot", "konsole"].includes(target))
        assert.equal(result.terminal.cursor, undefined);
      else assert.equal(result.terminal.cursor, c.accent, target);
      if (
        [
          "warp",
          "termux",
          "xresources",
          "windows-terminal",
          "konsole",
        ].includes(target)
      )
        assert.equal(result.terminal.selectionForeground, undefined);
      else
        assert.equal(
          result.terminal.selectionForeground,
          c.selectionForeground,
          target,
        );
    }
});

test("editor adapters read independently changed native surface and syntax fields", () => {
  const files = generateTarget(theme, "vscode");
  const file = files.find(
    (f) => f.path.startsWith("themes/") && f.path.endsWith("-dark.json"),
  )!;
  const data = JSON.parse(file.content);
  data.colors["editor.background"] = "#010203";
  data.colors["terminal.background"] = "#040506";
  data.colors["statusBar.background"] = "#070809";
  data.semanticTokenColors.keyword = "#121314";
  file.content = JSON.stringify(data);
  const result = integrationThemeFromFiles(theme, "dark", "vscode", files);
  assert.equal(result.roles.background, "#010203");
  assert.equal(result.terminal.background, "#040506");
  assert.equal(result.roles.status, "#070809");
  assert.equal(
    monacoTheme(result, "dark").rules.find((rule) => rule.token === "keyword")
      ?.foreground,
    "121314",
  );
  assert.equal(
    monacoTheme(result, "dark").colors["editor.background"],
    "#010203",
  );
  for (const target of ["zed", "neovim", "helix", "sublime"]) {
    const result = integrationTheme(theme, "dark", target);
    assert.equal(
      result.roles.background,
      resolve(theme, "dark").background,
      target,
    );
    assert.equal(result.syntax.keyword, "#abcd12", target);
  }
  const sublime = integrationTheme(theme, "dark", "sublime");
  assert.notEqual(sublime.roles.title, resolve(theme, "dark").surface);
});

test("frontend clones consume generated variables, including independently changed native fields", () => {
  const files = generateTarget(theme, "spicetify");
  files.find((f) => f.path === "color.ini")!.content =
    "[dark]\ntext = 112233\nsubtext = 223344\nmain = 101112\nsidebar = 131415\nplayer = 161718\ncard = 191a1b\nbutton = abcdef\nhighlight = 123456\nhighlight-elevated = 234567\nmisc = 345678\n";
  const spotify = integrationThemeFromFiles(theme, "dark", "spicetify", files);
  assert.equal(spotify.variables["--spice-button"], "#abcdef");
  assert.equal(spotify.variables["--spice-rgb-button"], "171, 205, 239");
  assert.equal(spotify.roles.sidebar, "#131415");
  assert.equal(
    spotify.variables["--cover-art-radius"],
    `${theme.style.radius}px`,
  );
  for (const target of ["betterdiscord", "vencord", "obsidian"]) {
    const files = generateTarget(theme, target);
    for (const file of files)
      file.content = file.content.replaceAll(
        `--background-primary: ${resolve(theme, "dark").background}`,
        "--background-primary: #010203",
      );
    const result = integrationThemeFromFiles(theme, "dark", target, files);
    assert.equal(result.roles.background, "#010203", target);
    assert.equal(result.variables["--background-primary"], "#010203", target);
  }
  assert.equal(
    integrationTheme(theme, "dark", "obsidian").variables["--font-text-theme"],
    `"${theme.fonts.sans}"`,
  );
});

test("browser manifests and DTCG token values drive the preview, not a second palette mapping", () => {
  for (const target of ["firefox", "chromium"]) {
    const files = generateTarget(theme, target),
      file = files.find((f) => f.path === "light/manifest.json")!;
    const data = JSON.parse(file.content);
    data.theme.colors.ntp_background =
      target === "firefox" ? "#102030" : [16, 32, 48];
    file.content = JSON.stringify(data);
    assert.equal(
      integrationThemeFromFiles(theme, "light", target, files).variables[
        "--browser-ntp-background"
      ],
      "#102030",
    );
  }
  const files = generateTarget(theme, "tokens"),
    file = files.find((f) => f.path === "tokens-dark.json")!;
  const data = JSON.parse(file.content);
  data.colors.accent.$value.hex = "#102030";
  file.content = JSON.stringify(data);
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "tokens", files).variables.accent,
    "#102030",
  );
});

test("workspace, git, slack, browser, and desktop adapters read independently changed native fields", () => {
  const t3Files = generateTarget(theme, "t3-code");
  const t3File = t3Files.find((f) => f.path.endsWith(".json"))!;
  const t3Data = JSON.parse(t3File.content);
  const t3Palette =
    t3Data.appearance === "dark" ? t3Data.colors : t3Data.variants.dark;
  t3Palette.canvas = "#050607";
  t3Palette.accent = "#abcdef";
  t3File.content = JSON.stringify(t3Data);
  const t3 = integrationThemeFromFiles(theme, "dark", "t3-code", t3Files);
  assert.equal(t3.roles.background, "#050607");
  assert.equal(t3.roles.accent, "#abcdef");

  const gcFiles = generateTarget(theme, "gitcomet");
  const gcFile = gcFiles.find((f) => f.path.endsWith(".json"))!;
  const gcBundle = JSON.parse(gcFile.content);
  const gcDark = gcBundle.themes.find(
    (t: { appearance: string }) => t.appearance === "dark",
  );
  gcDark.colors.diff.added.foreground = "#11aa22ff";
  gcDark.colors.graph_lane_palette[0] = "#334455ff";
  gcFile.content = JSON.stringify(gcBundle);
  const gc = integrationThemeFromFiles(theme, "dark", "gitcomet", gcFiles);
  assert.equal(gc.roles.success, "#11aa22");
  assert.equal(gc.roles.chart1, "#334455");

  const sgFiles = generateTarget(theme, "smartgit");
  const sgFile = sgFiles.find((f) => f.path === "dark-patch.theme")!;
  sgFile.content = sgFile.content.replace(
    /background2=#[0-9a-f]{6}/i,
    "background2=#223344",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "smartgit", sgFiles).roles
      .background,
    "#223344",
  );

  const slackFiles = generateTarget(theme, "slack");
  const slackFile = slackFiles.find((f) => f.path.endsWith("-dark.txt"))!;
  slackFile.content = slackFile.content.replace(
    /^#[0-9a-f]{6},#[0-9a-f]{6},#[0-9a-f]{6},#[0-9a-f]{6}$/im,
    "#1a1b1c,#2a2b2c,#3a3b3c,#4a4b4c",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "slack", slackFiles).roles.accent,
    "#2a2b2c",
  );

  const gtkFiles = generateTarget(theme, "gtk");
  const gtkFile = gtkFiles.find((f) => f.path === "dark/gtk-4.0/gtk.css")!;
  gtkFile.content = gtkFile.content.replace(
    /@define-color window_bg_color #[0-9a-f]{6};/i,
    "@define-color window_bg_color #0a0b0c;",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "gtk", gtkFiles).roles.background,
    "#0a0b0c",
  );

  const kdeFiles = generateTarget(theme, "kde");
  const kdeFile = kdeFiles.find((f) => f.path.endsWith("-dark.colors"))!;
  kdeFile.content = kdeFile.content.replace(
    /(\[Colors:View\][\s\S]*?\nBackgroundNormal=)\d+,\d+,\d+/,
    "$116,32,48",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "kde", kdeFiles).roles.background,
    "#102030",
  );

  const waybarFiles = generateTarget(theme, "waybar");
  const waybarFile = waybarFiles.find((f) => f.path === "colors-dark.css")!;
  waybarFile.content = waybarFile.content.replace(
    /@define-color accent #[0-9a-f]{6};/i,
    "@define-color accent #fedcba;",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "waybar", waybarFiles).roles.accent,
    "#fedcba",
  );

  const rofiFiles = generateTarget(theme, "rofi");
  const rofiFile = rofiFiles.find((f) => f.path.endsWith("-dark.rasi"))!;
  rofiFile.content = rofiFile.content.replace(
    /accent: #[0-9a-f]{6};/i,
    "accent: #445566;",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "rofi", rofiFiles).roles.accent,
    "#445566",
  );

  const jbFiles = generateTarget(theme, "jetbrains");
  const jbFile = jbFiles.find((f) => f.path.endsWith("-dark.icls"))!;
  jbFile.content = jbFile.content.replace(
    /name="CARET_COLOR" value="[0-9a-f]{6}"/i,
    'name="CARET_COLOR" value="112233"',
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "jetbrains", jbFiles).roles.cursor,
    "#112233",
  );

  const batFiles = generateTarget(theme, "bat");
  const batFile = batFiles.find((f) => f.path.endsWith("-dark.tmTheme"))!;
  batFile.content = batFile.content.replace(
    /<key>caret<\/key><string>#[0-9a-f]{6}<\/string>/i,
    "<key>caret</key><string>#223344</string>",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "bat", batFiles).roles.cursor,
    "#223344",
  );

  const tmuxFiles = generateTarget(theme, "tmux");
  const tmuxFile = tmuxFiles.find((f) => f.path.endsWith("-dark.conf"))!;
  tmuxFile.content = tmuxFile.content.replace(
    /pane-active-border-style "fg=#[0-9a-f]{6}"/i,
    'pane-active-border-style "fg=#334455"',
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "tmux", tmuxFiles).roles.accent,
    "#334455",
  );

  const zellijFiles = generateTarget(theme, "zellij");
  const zellijFile = zellijFiles.find((f) => f.path.endsWith("-dark.kdl"))!;
  zellijFile.content = zellijFile.content.replace(
    /frame_selected \{\n\s*base \d+ \d+ \d+/,
    "frame_selected {\n            base 68 85 102",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "zellij", zellijFiles).roles.accent,
    "#445566",
  );

  const starshipFiles = generateTarget(theme, "starship");
  const starshipFile = starshipFiles.find((f) => f.path.endsWith("-dark.toml"))!;
  starshipFile.content = starshipFile.content.replace(
    /accent = "#[0-9a-f]{6}"/i,
    'accent = "#556677"',
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "starship", starshipFiles).roles
      .accent,
    "#556677",
  );

  const btopFiles = generateTarget(theme, "btop");
  const btopFile = btopFiles.find((f) => f.path.endsWith("-dark.theme"))!;
  btopFile.content = btopFile.content.replace(
    /theme\[hi_fg\]="#[0-9a-f]{6}"/i,
    'theme[hi_fg]="#667788"',
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "btop", btopFiles).roles.accent,
    "#667788",
  );

  const lgFiles = generateTarget(theme, "lazygit");
  const lgFile = lgFiles.find((f) => f.path.endsWith("-dark.yaml"))!;
  lgFile.content = lgFile.content.replace(
    /activeBorderColor:\n\s+- "#[0-9a-f]{6}"/i,
    'activeBorderColor:\n      - "#778899"',
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "lazygit", lgFiles).roles.accent,
    "#778899",
  );

  const hyprFiles = generateTarget(theme, "hyprland");
  const hyprFile = hyprFiles.find((f) => f.path.endsWith("-dark.conf"))!;
  hyprFile.content = hyprFile.content.replace(
    /\$ts_accent = rgba\([0-9a-f]{6}ff\)/i,
    "$ts_accent = rgba(8899aaff)",
  );
  assert.equal(
    integrationThemeFromFiles(theme, "dark", "hyprland", hyprFiles).roles.accent,
    "#8899aa",
  );
});

test("xterm.js TUI ANSI scenes fit exact column widths without wrapping", () => {
  const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
  for (const target of ["btop", "lazygit", "tmux", "zellij", "starship"]) {
    for (const cols of [56, 74, 90]) {
      const frame = tuiAnsi(target, theme, "dark", cols);
      const lines = frame.split("\r\n");
      assert.ok(lines.length >= 6, `${target} has TUI lines`);
      for (const line of lines) {
        const visible = stripAnsi(line).length;
        assert.ok(
          visible <= cols,
          `${target} at ${cols} cols overflowed (${visible} chars): ${stripAnsi(line)}`,
        );
      }
    }
  }
});
