import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPalettes,
  extractColors,
  palettesFromColors,
  palettesFromImage,
  randomPalettes,
  suggestedAccent,
  suggestImageRoles,
} from "../lib/palette-tools";
import {
  baseRoles,
  contrast,
  hexPattern,
  parseTheme,
  presets,
  rgb,
  resolve,
  type Theme,
} from "../lib/theme";
import {
  cssVariables,
  semanticVariables,
  generateTarget,
} from "../lib/exporters";
import { defaultPreferences, siteVariables } from "../lib/preferences";

const pixels = (...areas: [string, number, number?][]) =>
  new Uint8ClampedArray(
    areas.flatMap(([hex, count, alpha = 255]) =>
      Array.from({ length: count }, () => [...rgb(hex), alpha]).flat(),
    ),
  );

test("image palettes retain dominant colors and ignore transparent pixels", () => {
  const extracted = extractColors(
    pixels(["#000000", 1000, 0], ["#f1b040", 70], ["#3456ba", 30]),
  );
  assert.deepEqual(extracted, [
    { hex: "#f1b040", share: 0.7 },
    { hex: "#3456ba", share: 0.3 },
  ]);
  assert.deepEqual(extractColors(pixels(["#9a9a9a", 100])), [
    { hex: "#9a9a9a", share: 1 },
  ]);
  assert.throws(() => extractColors(pixels(["#000000", 4, 0])), /transparent/);
  assert.throws(() => extractColors(new Uint8ClampedArray(3)), /Invalid image/);
  assert.throws(
    () => extractColors(pixels(["#ffffff", 1]), 0),
    /Invalid image/,
  );
});

test("image quantization merges close shades, weights opacity, and avoids picking a white background as accent", () => {
  const extracted = extractColors(
    pixels(["#ee2211", 50], ["#ed2312", 50], ["#1122ee", 40, 128]),
  );
  assert.equal(extracted.length, 2);
  assert.ok(extracted[0].share > 0.8);
  assert.ok(rgb(extracted[0].hex)[0] >= 237);
  const whiteBackdrop = extractColors(pixels(["#ffffff", 90], ["#2288ee", 10]));
  assert.equal(whiteBackdrop[suggestedAccent(whiteBackdrop)].hex, "#2288ee");
  const noisyImage = pixels(
    ...Array.from({ length: 100 }, (_, i): [string, number] => [
      `#${((i * 15485863) % 0xffffff).toString(16).padStart(6, "0")}`,
      10,
    ]),
  );
  assert.equal(extractColors(noisyImage).length, 6);
  assert.deepEqual(
    extractColors(noisyImage),
    extractColors(noisyImage),
    "The same image yields the same colors",
  );
});

test("generated palettes keep semantic text readable in both appearances and remain valid theme files", () => {
  let seed = 71;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const candidates = [
    ...["#000000", "#ffffff", "#888888", "#ff0000", "#ffff00", "#0000ff"].map(
      (c) => palettesFromColors([c]),
    ),
    ...Array.from({ length: 100 }, () => randomPalettes(random)),
  ];
  for (const palettes of candidates) {
    const theme = applyPalettes(presets[0], palettes, true);
    assert.deepEqual(parseTheme(theme), theme);
    for (const palette of Object.values(palettes)) {
      for (const role of baseRoles) assert.match(palette[role], hexPattern);
      for (const role of [
        "foreground",
        "muted",
        "accent",
        "success",
        "warning",
        "error",
      ] as const) {
        for (const background of [palette.background, palette.surface])
          assert.ok(
            contrast(palette[role], background) >= 4.5,
            `${role} ${palette[role]} on ${background}`,
          );
      }
      for (const [role, color] of Object.entries(palette.overrides))
        assert.ok(
          contrast(color, palette.surface) >=
            (role.startsWith("chart") ? 3 : 4.5),
        );
    }
  }
  assert.equal(
    new Set(candidates.slice(6).map((p) => p.dark.accent)).size,
    100,
  );
  assert.throws(() => palettesFromColors([]), /valid palette/);
  assert.throws(() => palettesFromColors(["not a color"]), /valid palette/);
});

test("choosing an accent updates generated palettes; applying preserves the draft identity and can change only one mode", () => {
  const red = palettesFromColors(["#dd3344", "#4488cc"], 0);
  const blue = palettesFromColors(["#dd3344", "#4488cc"], 1);
  assert.notEqual(red.dark.accent, blue.dark.accent);
  const original = structuredClone(presets[0]);
  const snapshot = structuredClone(original);
  const updated = applyPalettes(original, blue, false);
  assert.deepEqual(updated.modes.light, original.modes.light);
  assert.notDeepEqual(updated.modes.dark, original.modes.dark);
  assert.deepEqual({ ...updated, modes: original.modes }, original);
  const both = applyPalettes(original, blue, true);
  assert.notDeepEqual(both.modes.light, original.modes.light);
  both.modes.dark!.accent = "#ffffff";
  assert.notEqual(
    blue.dark.accent,
    "#ffffff",
    "Draft edits cannot mutate a generated palette",
  );
  assert.deepEqual(
    original,
    snapshot,
    "The previous draft stays intact for Undo",
  );
  const lightOnly: Theme = {
    ...original,
    defaultAppearance: "light",
    modes: { light: original.modes.light },
  };
  assert.equal(applyPalettes(lightOnly, red, false).modes.dark, undefined);
  assert.ok(applyPalettes(lightOnly, red, true).modes.dark);
});

// Only color/coverage statistics from the reported image; no source photo is stored.
const blueAndGold = [
  { hex: "#0342a1", share: 0.28188 },
  { hex: "#202a34", share: 0.16157 },
  { hex: "#d8d8e0", share: 0.13652 },
  { hex: "#564641", share: 0.11658 },
  { hex: "#0865b9", share: 0.07237 },
  { hex: "#947052", share: 0.07168 },
  { hex: "#f4c42a", share: 0.05089 },
  { hex: "#4b587b", share: 0.04941 },
  { hex: "#97919b", share: 0.04423 },
  { hex: "#068cd0", share: 0.01487 },
];

test("blue-and-gold images produce blue surfaces, yellow buttons, and distinct supporting blue accents", () => {
  const roles = suggestImageRoles(blueAndGold);
  assert.equal(blueAndGold[roles.surface].hex, "#0342a1");
  assert.equal(
    blueAndGold[roles.primary].hex,
    "#f4c42a",
    "A small, contrasting highlight must beat the dominant blue for buttons",
  );
  const generated = palettesFromImage(blueAndGold);
  for (const mode of ["dark", "light"] as const) {
    const c = resolve(applyPalettes(presets[0], generated, true), mode);
    const [r, , b] = rgb(c.background);
    assert.ok(
      b > r,
      "Surfaces retain the blue foundation in either appearance",
    );
    assert.equal(
      c.accentFill,
      "#f4c42a",
      "Yellow button fills must not become brown in light mode",
    );
    assert.equal(new Set([c.accent, c.accent2, c.accent3]).size, 3);
    assert.equal(c.chart2, c.accent2);
    assert.equal(c.chart3, c.accent3);
    assert.equal(c.syntaxFunction, c.accent2);
    assert.equal(c.syntaxString, c.accent3);
    assert.ok(contrast(c.accentFill, c.accentForeground) >= 4.5);
  }
  const changedButtons = palettesFromImage(blueAndGold, {
    ...roles,
    primary: roles.tertiary,
  });
  assert.equal(changedButtons.dark.background, generated.dark.background);
  assert.equal(changedButtons.dark.surface, generated.dark.surface);
  assert.notEqual(
    changedButtons.dark.overrides.accentFill,
    generated.dark.overrides.accentFill,
  );
  const changedSurface = palettesFromImage(blueAndGold, {
    ...roles,
    surface: roles.primary,
  });
  assert.notEqual(changedSurface.dark.background, generated.dark.background);
  assert.equal(
    changedSurface.dark.overrides.accentFill,
    generated.dark.overrides.accentFill,
  );
  const forest = suggestImageRoles([
    { hex: "#146637", share: 0.7 },
    { hex: "#eb705b", share: 0.2 },
    { hex: "#dddddd", share: 0.1 },
  ]);
  assert.equal(forest.surface, 0);
  assert.equal(
    forest.primary,
    1,
    "Role selection must follow the image rather than hardcode blue and yellow",
  );
});

test("image palettes stay readable across diverse and monochrome sources, and survive save/export", () => {
  let seed = 73;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const sources = [
    blueAndGold,
    ...["#000000", "#ffffff", "#808080"].map((hex) => [{ hex, share: 1 }]),
    ...Array.from({ length: 80 }, () =>
      Array.from({ length: 5 }, () => ({
        hex: `#${Math.floor(random() * 0xffffff)
          .toString(16)
          .padStart(6, "0")}`,
        share: 0.2,
      })),
    ),
  ];
  for (const colors of sources) {
    const t = applyPalettes(presets[0], palettesFromImage(colors), true);
    assert.deepEqual(parseTheme(JSON.parse(JSON.stringify(t))), t);
    for (const mode of ["dark", "light"] as const) {
      const c = resolve(t, mode);
      for (const role of [
        "foreground",
        "muted",
        "accent",
        "accent2",
        "accent3",
        "syntaxFunction",
        "syntaxString",
        "success",
        "warning",
        "error",
      ])
        for (const background of [c.background, c.surface, c.input, c.elevated])
          assert.ok(
            contrast(c[role], background) >= 4.5,
            `${role}: ${c[role]} on ${background}`,
          );
      assert.ok(contrast(c.accentFill, c.accentForeground) >= 4.5);
    }
  }
  const t = applyPalettes(presets[0], palettesFromImage(blueAndGold), true);
  const c = resolve(t, "light");
  const css: Record<string, string> = cssVariables(t, "light"),
    framework = semanticVariables(t, "light");
  assert.equal(css["--ts-accent-fill"], "#f4c42a");
  assert.equal(css["--ts-accent2"], c.accent2);
  assert.equal(framework["--primary"], c.accentFill);
  assert.equal(framework["--accent-2"], c.accent2);
  assert.equal(framework["--accent-3"], c.accent3);
  const site = siteVariables(
    {
      ...defaultPreferences,
      themeId: "custom",
      customTheme: t,
      appearance: "light",
    },
    "light",
  );
  assert.equal(site["--app-primary-fill"], c.accentFill);
  assert.equal(site["--app-primary"], c.accent);
  assert.ok(contrast(site["--app-primary"], site["--app-bg"]) >= 4.5);
  const vscode = JSON.parse(
    generateTarget(t, "vscode").find(
      (f) => f.path.includes("light") && f.path.endsWith(".json"),
    )!.content,
  );
  assert.equal(vscode.colors["button.background"], c.accentFill);
  assert.equal(vscode.colors["textLink.foreground"], c.accent);
  const older = resolve(presets[0], "dark");
  assert.equal(older.accentFill, older.accent);
  assert.equal(older.accent2, older.success);
});
