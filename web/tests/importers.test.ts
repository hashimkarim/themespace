import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, resolve } from "../lib/theme";
import { generateTarget } from "../lib/exporters";
import { importNativeTheme } from "../lib/importers";

const sample = structuredClone(presets[0]);
sample.name = "Import Fixture";
sample.modes.dark!.accent = "#5588ff";
sample.modes.dark!.overrides = {
  syntaxKeyword: "#cc66ff",
  ansi15: "#f0f4ff",
};

test("universal importer round-trips native exports from 11 formats", () => {
  const dark = resolve(sample, "dark");

  const cases: Array<{
    name: string;
    content: string;
    fileName: string;
    expectedFormat: RegExp;
  }> = [
    {
      name: "ThemeSpace JSON",
      content: JSON.stringify(sample),
      fileName: "theme.json",
      expectedFormat: /ThemeSpace/,
    },
    {
      name: "T3 Code JSON",
      content: generateTarget(sample, "t3-code").find((f) =>
        f.path.endsWith(".json"),
      )!.content,
      fileName: "import-fixture.json",
      expectedFormat: /T3 Code/,
    },
    {
      name: "VS Code JSON",
      content: generateTarget(sample, "vscode").find((f) =>
        f.path.endsWith("-dark.json"),
      )!.content,
      fileName: "import-fixture-dark.json",
      expectedFormat: /VS Code/,
    },
    {
      name: "Windows Terminal JSON",
      content: generateTarget(sample, "windows-terminal").find((f) =>
        f.path.endsWith("-dark.json"),
      )!.content,
      fileName: "import-fixture-dark.json",
      expectedFormat: /Windows Terminal/,
    },
    {
      name: "Ghostty",
      content: generateTarget(sample, "ghostty").find((f) =>
        f.path.endsWith("-dark"),
      )!.content,
      fileName: "import-fixture-dark",
      expectedFormat: /Ghostty/,
    },
    {
      name: "kitty",
      content: generateTarget(sample, "kitty").find((f) =>
        f.path.endsWith("-dark.conf"),
      )!.content,
      fileName: "import-fixture-dark.conf",
      expectedFormat: /kitty/,
    },
    {
      name: "Alacritty TOML",
      content: generateTarget(sample, "alacritty").find((f) =>
        f.path.endsWith("-dark.toml"),
      )!.content,
      fileName: "import-fixture-dark.toml",
      expectedFormat: /Alacritty/,
    },
    {
      name: "WezTerm TOML",
      content: generateTarget(sample, "wezterm").find((f) =>
        f.path.endsWith("-dark.toml"),
      )!.content,
      fileName: "import-fixture-dark.toml",
      expectedFormat: /WezTerm/,
    },
    {
      name: "Konsole colorscheme",
      content: generateTarget(sample, "konsole").find((f) =>
        f.path.endsWith("-dark.colorscheme"),
      )!.content,
      fileName: "import-fixture-dark.colorscheme",
      expectedFormat: /Konsole/,
    },
    {
      name: "Xresources",
      content: generateTarget(sample, "xresources").find((f) =>
        f.path.endsWith("-dark.Xresources"),
      )!.content,
      fileName: "import-fixture-dark.Xresources",
      expectedFormat: /Xresources/,
    },
    {
      name: "CSS variables",
      content: `:root { --ts-background: ${dark.background}; --ts-foreground: ${dark.foreground}; --ts-accent: ${dark.accent}; }`,
      fileName: "my-site.css",
      expectedFormat: /CSS/,
    },
  ];

  for (const item of cases) {
    const { theme, format } = importNativeTheme(item.content, item.fileName);
    assert.match(format, item.expectedFormat, item.name);
    assert.equal(theme.modes.dark!.background, dark.background, item.name);
    assert.equal(theme.modes.dark!.foreground, dark.foreground, item.name);
    assert.ok(theme.modes.light, `${item.name} also derives a light mode`);
  }

  assert.throws(() => importNativeTheme("hello world not a theme"), /Unrecognized/);
});
