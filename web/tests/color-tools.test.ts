import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, parseTheme, resolve } from "../lib/theme";
import {
  autoFixContrast,
  contrastAudit,
  decodeThemeShare,
  deriveCounterpartMode,
  encodeThemeShare,
  transformPalette,
  type PaletteTransform,
} from "../lib/color-tools";

test("autoFixContrast repairs low-contrast palettes so every WCAG AA check passes", () => {
  const broken = structuredClone(presets[0]);
  broken.modes.dark = {
    background: "#1c1f26",
    surface: "#22262e",
    foreground: "#3a3f4b",
    muted: "#2c303a",
    accent: "#2e3c5c",
    success: "#28402e",
    warning: "#483a22",
    error: "#4a2428",
    overrides: {},
  };
  const before = contrastAudit(broken, "dark");
  assert.ok(before.some((c) => !c.pass));

  const fixed = parseTheme(autoFixContrast(broken, "dark"));
  const after = contrastAudit(fixed, "dark");
  for (const item of after)
    assert.ok(item.pass, `${item.label} failed (${item.ratio.toFixed(2)}:1)`);
});

test("deriveCounterpartMode creates a readable counterpart appearance", () => {
  const darkOnly = structuredClone(presets[0]);
  delete darkOnly.modes.light;
  const both = parseTheme(deriveCounterpartMode(darkOnly, "dark"));
  assert.ok(both.modes.light);
  const checks = contrastAudit(both, "light");
  for (const item of checks)
    assert.ok(item.pass, `derived light ${item.label} failed (${item.ratio.toFixed(2)}:1)`);

  const lightOnly = structuredClone(presets[1]);
  lightOnly.defaultAppearance = "light";
  delete lightOnly.modes.dark;
  const both2 = parseTheme(deriveCounterpartMode(lightOnly, "light"));
  assert.ok(both2.modes.dark);
  for (const item of contrastAudit(both2, "dark"))
    assert.ok(item.pass, `derived dark ${item.label} failed (${item.ratio.toFixed(2)}:1)`);
});

test("palette transforms produce valid themes and preserve readability", () => {
  const base = structuredClone(presets[0]);
  for (const kind of [
    "warmer",
    "cooler",
    "vivid",
    "muted",
    "hue-plus",
    "hue-minus",
  ] as PaletteTransform[]) {
    const next = parseTheme(transformPalette(base, "dark", kind));
    assert.notEqual(
      resolve(next, "dark").accent,
      resolve(base, "dark").accent,
      kind,
    );
    const fgCheck = contrastAudit(next, "dark").find((c) => c.id === "fg-bg")!;
    assert.ok(fgCheck.pass, `${kind} kept foreground contrast`);
  }
});

test("shareable URL encoding round-trips themes and rejects malformed payloads", () => {
  const original = structuredClone(presets[1]);
  original.name = "Café Dusk 🌙";
  const token = encodeThemeShare(original);
  assert.ok(/^[A-Za-z0-9_-]+$/.test(token));
  const decoded = decodeThemeShare(token);
  assert.equal(decoded.name, original.name);
  assert.deepEqual(decoded.modes, original.modes);
  assert.throws(() => decodeThemeShare(""), /invalid/);
  assert.throws(() => decodeThemeShare("!!!not-valid-base64!!!"));
  assert.throws(() => decodeThemeShare("a".repeat(40_000)), /too large/);
});
