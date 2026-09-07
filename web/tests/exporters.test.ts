import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import Ajv from "ajv";
import { JSDOM } from "jsdom";
import { fixtureScript } from "../lib/component-fixtures";
import TOML from "@iarna/toml";
import YAML from "yaml";
import * as sass from "sass";
import { compile } from "@tailwindcss/node";
import {
  presets,
  parseTheme,
  resolve,
  contrast,
  remixTheme,
  slugify,
} from "../lib/theme";
import { exportTargets, targets } from "../lib/targets";
import {
  generateTarget,
  designSystemFiles,
  semanticVariables,
} from "../lib/exporters";
import { bundleFiles } from "../lib/package";

const source = structuredClone(presets[1]);
source.name = "Export contract";
source.id = "export-contract";
source.fonts.sans = "IBM Plex Sans";
source.modes.dark!.accent = "#123abc";
source.modes.light!.accent = "#874201";
source.modes.dark!.overrides = {
  syntaxKeyword: "#ab12cd",
  ansi15: "#eeddff",
  chart5: "#fd3478",
};
const mainFile = (id: string, suffix: string) =>
  generateTarget(source, id).find((f) => f.path.endsWith(suffix))!.content;

test("normalizes validated source and rejects malformed or unsafe imported values", () => {
  assert.equal(parseTheme(source).modes.dark!.accent, "#123abc");
  for (const mutation of [
    { schemaVersion: 2 },
    { modes: { dark: { ...source.modes.dark, accent: "red; color: red" } } },
    {
      modes: {
        dark: { ...source.modes.dark, overrides: { unknown: "#123456" } },
      },
    },
    { style: { ...source.style, shadow: NaN } },
    { fonts: { ...source.fonts, sans: '"; background: red;' } },
    { targets: ["../../file"] },
    { defaultAppearance: "other" },
    { name: "Bad\nName" },
  ])
    assert.throws(() => parseTheme({ ...source, ...mutation }));
  const darkOnly = { ...source, modes: { dark: source.modes.dark } };
  assert.equal(parseTheme(darkOnly).modes.light, undefined);
  assert.throws(
    () => parseTheme({ ...darkOnly, defaultAppearance: "light" }),
    /missing/,
  );
  assert.deepEqual(parseTheme({ ...source, targets: ["css", "css"] }).targets, [
    "css",
  ]);
});

test("semantic foregrounds, explicit overrides, and independent appearances survive export", () => {
  const dark = resolve(source, "dark"),
    light = resolve(source, "light");
  assert.equal(dark.syntaxKeyword, "#ab12cd");
  assert.equal(dark.ansi15, "#eeddff");
  assert.equal(dark.chart5, "#fd3478");
  assert.equal(light.accent, "#874201");
  assert.notEqual(dark.background, light.background);
  const semantic = semanticVariables(source, "dark");
  assert.equal(semantic["--primary"], "#123abc");
  assert.notEqual(semantic["--accent"], semantic["--primary"]);
  for (const [a, b] of [
    ["--primary", "--primary-foreground"],
    ["--destructive", "--destructive-foreground"],
    ["--success", "--success-foreground"],
  ])
    assert.ok(contrast(semantic[a], semantic[b]) >= 4.5);
  assert.equal(contrast("#ffffff", "#000000"), 21);
  const remix = remixTheme(source, 3);
  remix.modes.dark!.accent = "#ffff00";
  assert.equal(source.modes.dark!.accent, "#123abc");
  assert.equal(remix.parent?.version, 3);
});

test("all export targets generate parseable files; planned targets cannot be downloaded", async () => {
  for (const target of exportTargets) {
    const files = generateTarget(source, target.id);
    assert.ok(files.length > 1, target.id);
    assert.ok(files.some((f) => f.path === "README.md"));
    for (const file of files) {
      assert.ok(file.content.length > 0);
      assert.ok(!file.content.includes("undefined"), file.path);
      assert.ok(
        !file.path.startsWith("/") && !file.path.split("/").includes(".."),
      );
      if (
        file.path.endsWith(".json") ||
        file.path.endsWith(".sublime-color-scheme")
      )
        JSON.parse(file.content);
      if (file.path.endsWith(".toml")) TOML.parse(file.content);
      if (file.path.endsWith(".yaml")) YAML.parse(file.content);
      if (file.path.endsWith(".itermcolors"))
        execFileSync(
          "python3",
          [
            "-c",
            'import plistlib,sys; p=plistlib.loads(sys.stdin.buffer.read()); assert len(p)==22; assert 0 <= p["Ansi 15 Color"]["Red Component"] <= 1',
          ],
          { input: file.content },
        );
    }
  }
  for (const target of targets.filter((t) => t.status === "planned"))
    assert.throws(() => generateTarget(source, target.id), /planned/);
  assert.throws(() => generateTarget(source, "../../oops"), /Unknown/);
});

test("Zed output validates against the published native JSON schema", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL("./fixtures/zed-theme-schema.json", import.meta.url),
      "utf8",
    ),
  );
  const validate = new Ajv({ strict: false, allErrors: true }).compile(schema);
  const family = JSON.parse(mainFile("zed", ".json"));
  assert.equal(validate(family), true, JSON.stringify(validate.errors));
  assert.equal(family.themes[1].style.syntax.keyword.color, "#ab12cd");
  assert.equal(family.themes[1].style["terminal.ansi.bright_white"], "#eeddff");
});

test("Sass module compiles both modes, multiword font names, and explicit overrides", () => {
  const css = sass.compileString(
    mainFile("scss", ".scss") +
      '\n.dark { @include emit("dark"); }\n.light { @include emit("light"); }',
  ).css;
  assert.match(css, /--ts-accent: #123abc/);
  assert.match(css, /--ts-accent: #874201/);
  assert.match(css, /--ts-syntax-keyword: #ab12cd/);
  assert.match(css, /--ts-font-sans: IBM Plex Sans/);
  assert.throws(
    () =>
      sass.compileString(
        mainFile("scss", ".scss") + '\n.x { @include emit("missing"); }',
      ),
    /Appearance not exported/,
  );
});

test("Tailwind v4 and shadcn exports compile real utility candidates", async () => {
  for (const target of ["tailwind", "shadcn"]) {
    const compiler = await compile(
      '@import "tailwindcss";\n' + mainFile(target, ".css"),
      { base: process.cwd(), onDependency: () => {} },
    );
    const css = compiler.build([
      "bg-primary",
      "text-primary-foreground",
      "bg-accent-2",
      "text-accent-2-foreground",
      "bg-accent-3",
      "hover:bg-accent",
      "focus-visible:ring-ring",
      "border-input",
      "rounded-lg",
      "bg-chart-5",
      "bg-sidebar",
      "font-sans",
      "p-4",
      "text-base",
      "dark:bg-input/30",
    ]);
    assert.match(css, /background-color: var\(--primary\)/);
    assert.match(css, /color: var\(--primary-foreground\)/);
    assert.match(css, /background-color: var\(--accent-2\)/);
    assert.match(css, /color: var\(--accent-2-foreground\)/);
    assert.match(css, /background-color: var\(--accent-3\)/);
    assert.match(css, /border-radius: var\(--ts-radius\)/);
    assert.match(css, /font-family: var\(--ts-font-sans\)/);
    assert.match(css, /--primary: #123abc/);
    assert.match(css, /--primary: #874201/);
    assert.match(css, /\.dark/);
    assert.match(css, /--chart-5: #fd3478/);
  }
});

test("terminal and browser exports preserve native data shapes and all ANSI colors", () => {
  const windows = JSON.parse(mainFile("windows-terminal", "-dark.json"));
  assert.equal(windows.brightWhite, "#eeddff");
  assert.equal(windows.blue, "#123abc");
  const ini = mainFile("spicetify", "color.ini");
  assert.match(ini, /\[light\]/);
  assert.match(ini, /\[dark\]/);
  assert.match(ini, /button = 123abc/);
  assert.doesNotMatch(ini, /#123abc/);
  const chrome = JSON.parse(
    generateTarget(source, "chromium").find(
      (f) => f.path === "dark/manifest.json",
    )!.content,
  );
  assert.equal(chrome.manifest_version, 3);
  assert.deepEqual(chrome.theme.colors.toolbar, [41, 35, 41]);
  const firefox = JSON.parse(
    generateTarget(source, "firefox").find(
      (f) => f.path === "dark/manifest.json",
    )!.content,
  );
  assert.equal(firefox.theme.colors.tab_line, "#123abc");
  const tokens = JSON.parse(mainFile("tokens", "-dark.json"));
  assert.equal(tokens.colors.accent.$type, "color");
  assert.deepEqual(tokens.colors.accent.$value.components, [
    18 / 255,
    58 / 255,
    188 / 255,
  ]);
  assert.equal(tokens.fontSans.$type, "fontFamily");
  assert.equal(tokens.motion.$value.unit, "ms");
});

test("component fixture escapes user text and contains only valid theme file references", () => {
  const hostile = parseTheme({
    ...source,
    name: "Ink */ </style><script>alert(1)</script>",
    description: "<img src=x onerror=alert(1)>",
  });
  const files = designSystemFiles(hostile),
    html = files.find((f) => f.path === "components.html")!.content;
  const dom = new JSDOM(html);
  assert.equal(dom.window.document.querySelectorAll("script").length, 1);
  assert.equal(
    dom.window.document.querySelector("script")!.textContent,
    fixtureScript,
  );
  assert.equal(dom.window.document.querySelector("img,[onerror]"), null);
  dom.window.close();
  assert.match(html, /&lt;script&gt;/);
  const manifest = JSON.parse(
    files.find((f) => f.path === "manifest.json")!.content,
  );
  assert.equal(manifest.id, slugify(hostile.name));
  assert.equal(manifest.source.type, "bundled");
  for (const path of Object.values(manifest.files))
    assert.ok(files.some((f) => f.path === path));
});

test("downloaded repository builds independently and regenerates all outputs deterministically", async () => {
  const directory = await mkdtemp(join(tmpdir(), "themespace-repository-"));
  try {
    const sources = Object.fromEntries(
      await Promise.all(
        [
          "theme.ts",
          "targets.ts",
          "exporters.ts",
          "package.ts",
          "component-fixtures.ts",
        ].map(async (name) => [
          name,
          await readFile(new URL("../lib/" + name, import.meta.url), "utf8"),
        ]),
      ),
    );
    const files = bundleFiles(
      source,
      exportTargets.map((t) => t.id),
      true,
      sources,
    );
    for (const file of files) {
      const target = join(directory, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }
    execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: directory,
      stdio: "pipe",
      timeout: 120_000,
    });
    execFileSync("npm", ["run", "build"], {
      cwd: directory,
      stdio: "pipe",
      timeout: 60_000,
    });
    for (const file of files)
      assert.equal(
        await readFile(join(directory, file.path), "utf8"),
        file.content,
        file.path,
      );
    await writeFile(join(directory, "my-notes.txt"), "Keep my notes");
    const edited = JSON.parse(
      await readFile(join(directory, "theme.json"), "utf8"),
    );
    edited.name = "An updated theme";
    edited.modes.dark.accent = "#ef7854";
    edited.targets = ["css", "kitty"];
    await writeFile(join(directory, "theme.json"), JSON.stringify(edited));
    execFileSync("npm", ["run", "build"], {
      cwd: directory,
      stdio: "pipe",
      timeout: 60_000,
    });
    assert.match(
      await readFile(join(directory, "integrations/css/theme.css"), "utf8"),
      /--ts-accent: #ef7854/,
    );
    assert.match(
      await readFile(join(directory, "README.md"), "utf8"),
      /An updated theme/,
    );
    assert.deepEqual(
      Object.keys(
        JSON.parse(await readFile(join(directory, "theme.lock.json"), "utf8"))
          .exporters,
      ),
      ["css", "kitty"],
    );
    assert.equal(
      await readFile(join(directory, "my-notes.txt"), "utf8"),
      "Keep my notes",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("ZIP downloads round-trip complete UTF-8 files and reject traversal", async () => {
  const { zipFiles } = await import("../lib/archive");
  const { unzipSync, strFromU8 } = await import("fflate");
  const files = bundleFiles({ ...source, name: "Café 夕方" }, [
    "spicetify",
    "betterdiscord",
    "firefox",
    "css",
  ]);
  const bytes = zipFiles("Café 夕方", files),
    contents = unzipSync(bytes);
  assert.equal(Object.keys(contents).length, files.length);
  for (const file of files)
    assert.equal(strFromU8(contents[`cafe/${file.path}`]), file.content);
  for (const path of ["../escape", "/absolute", "a/../../escape", "a\\b"])
    assert.throws(
      () => zipFiles("test", [{ path, content: "test" }]),
      /Unsafe/,
    );
  const lua = mainFile("neovim", "-dark.lua");
  execFileSync("luac", ["-p", "-"], { input: lua });
});
