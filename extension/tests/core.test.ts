import assert from "node:assert/strict";
import { test } from "node:test";
import { presets, resolve, parseTheme } from "../../web/lib/theme";
import { semanticVariables } from "../../web/lib/exporters";
import { parseColor, formatColor } from "../src/core/color";
import { themeFromScan, knownTokens, type ScanSample } from "../src/core/scan";
import { planRemap } from "../src/core/remap";

const lightSite: ScanSample = {
  url: "https://news.example.com/article",
  title: "Example News",
  page: "#ffffff",
  tokens: {},
  backgrounds: {
    surface: [
      { hex: "#f6f8fa", weight: 400_000 },
      { hex: "#eef1f4", weight: 30_000 },
    ],
    button: [
      { hex: "#1f6feb", weight: 9_000 },
      { hex: "#f6f8fa", weight: 4_000 },
    ],
    input: [{ hex: "#fbfcfd", weight: 6_000 }],
  },
  texts: {
    body: [
      { hex: "#1f2328", weight: 50_000 },
      { hex: "#59636e", weight: 9_000 },
      { hex: "#b4232c", weight: 200 },
    ],
    link: [{ hex: "#0969da", weight: 4_000 }],
    button: [{ hex: "#ffffff", weight: 1_200 }],
  },
  borders: [
    { hex: "#d1d9e0", weight: 8_000 },
    { hex: "#e6eaef", weight: 2_000 },
  ],
  font: "Inter",
  radius: 6,
};

const everyColor = (s: ScanSample) => [
  s.page,
  ...Object.values(s.backgrounds)
    .flat()
    .map((x) => x.hex),
  ...Object.values(s.texts)
    .flat()
    .map((x) => x.hex),
  ...s.borders.map((x) => x.hex),
];

test("scanning a site and applying the result back changes nothing", () => {
  const scan = themeFromScan(lightSite);
  assert.equal(scan.appearance, "light");
  const c = resolve(scan.theme, "light");
  assert.equal(c.background, "#ffffff");
  assert.equal(c.surface, "#f6f8fa");
  assert.equal(c.foreground, "#1f2328");
  assert.equal(c.muted, "#59636e");
  assert.equal(c.accent, "#0969da", "Links become the text accent");
  assert.equal(c.accentFill, "#1f6feb", "Colorful buttons become the fill");
  assert.equal(c.accentForeground, "#ffffff");
  assert.equal(c.border, "#d1d9e0");
  assert.equal(c.input, "#fbfcfd");
  assert.deepEqual(
    parseTheme(JSON.parse(JSON.stringify(scan.theme))),
    scan.theme,
  );

  const remap = planRemap(scan, scan.theme);
  for (const hex of everyColor(lightSite))
    for (const channel of ["bg", "text", "border"] as const)
      assert.equal(remap.color(hex, channel), hex, `${hex} as ${channel}`);
  // Colors the scan never saw are untouched too.
  for (const hex of ["#123456", "#abcdef", "#000000", "#fefefe"])
    assert.equal(remap.color(hex, "bg"), hex);
});

test("a site built from a ThemeSpace export scans back to the same roles", () => {
  const source = presets[1];
  for (const mode of ["dark", "light"] as const) {
    if (!source.modes[mode]) continue;
    const vars = semanticVariables(source, mode);
    const tokens = Object.fromEntries(
      Object.entries(vars).filter(([k]) => knownTokens.includes(k)),
    );
    const scan = themeFromScan({
      ...lightSite,
      page: "#777777",
      tokens,
    });
    const want = resolve(source, mode),
      got = resolve(scan.theme, scan.appearance);
    assert.equal(scan.appearance, mode);
    for (const role of [
      "background",
      "foreground",
      "surface",
      "muted",
      "accentFill",
      "accentForeground",
      "border",
    ])
      assert.equal(got[role], want[role], `${mode} ${role}`);
    const remap = planRemap(scan, scan.theme);
    for (const [name, value] of Object.entries(tokens))
      assert.equal(remap.tokens[name], value, `${name} is unchanged`);
  }
});

test("applying another theme lands the site's roles on the theme's colors", () => {
  const scan = themeFromScan(lightSite);
  const theme = presets[0];
  const dark = planRemap(scan, theme, "dark");
  const c = resolve(theme, "dark");
  assert.equal(dark.appearance, "dark");
  assert.equal(dark.color("#ffffff", "bg"), c.background);
  assert.equal(dark.color("#1f2328", "text"), c.foreground);
  assert.equal(dark.color("#1f6feb", "bg"), c.accentFill);
  assert.equal(dark.color("#0969da", "text"), c.accent);
  // The appearance flips, so a card darker than the light page ends up lighter than the dark one.
  const card = dark.color("#eef1f4", "bg");
  assert.ok(
    parseInt(card.slice(1, 3), 16) >= parseInt(c.background.slice(1, 3), 16),
    `${card} vs ${c.background}`,
  );
});

test("computed CSS colors parse, including alpha", () => {
  assert.deepEqual(parseColor("rgb(31, 35, 40)"), { hex: "#1f2328", alpha: 1 });
  assert.deepEqual(parseColor("rgba(0, 0, 0, 0)"), {
    hex: "#000000",
    alpha: 0,
  });
  assert.deepEqual(parseColor("rgb(255 128 0 / 50%)"), {
    hex: "#ff8000",
    alpha: 0.5,
  });
  assert.deepEqual(parseColor("#abc"), { hex: "#aabbcc", alpha: 1 });
  assert.equal(parseColor("oklch(0.5 0.1 200)"), null);
  assert.equal(
    formatColor({ hex: "#ff8000", alpha: 0.5 }),
    "rgba(255, 128, 0, 0.5)",
  );
});
