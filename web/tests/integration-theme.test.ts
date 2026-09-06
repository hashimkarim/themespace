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

test("all 26 integrations parse their real export and disclose renderer coverage", () => {
  assert.deepEqual(
    Object.keys(previewFidelity).sort(),
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

test("all ten terminal adapters preserve every ANSI color and only exported cursor/selection settings", () => {
  const targets = Object.entries(previewProfiles)
    .filter(([, profile]) => profile.kind === "terminal")
    .map(([target]) => target);
  assert.equal(targets.length, 10);
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
      if (["warp", "termux", "xresources"].includes(target))
        assert.equal(result.terminal.selectionBackground, undefined);
      else
        assert.equal(result.terminal.selectionBackground, c.selection, target);
      if (target === "foot") assert.equal(result.terminal.cursor, undefined);
      else assert.equal(result.terminal.cursor, c.accent, target);
      if (["warp", "termux", "xresources", "windows-terminal"].includes(target))
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
