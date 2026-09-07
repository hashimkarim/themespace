import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPalettes,
  extractColors,
  palettesFromColors,
  randomPalettes,
  suggestedAccent,
} from "../lib/palette-tools";
import {
  baseRoles,
  contrast,
  hexPattern,
  parseTheme,
  presets,
  rgb,
  type Theme,
} from "../lib/theme";

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
