import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPreferenceStore,
  defaultPreferences,
  parsePreferences,
  siteVariables,
  siteAppearance,
  SETTINGS_KEY,
  draftSnapshot,
  appearanceBootstrap,
} from "../lib/preferences";
import { presets, resolve } from "../lib/theme";
import { runInNewContext } from "node:vm";
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) || null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

test("preferences survive a new store, synchronize external writes, and recover from invalid data", () => {
  const storage = memoryStorage(),
    first = createPreferenceStore(() => storage);
  assert.strictEqual(first.getSnapshot(), first.getSnapshot());
  assert.equal(
    first.save({
      ...defaultPreferences,
      appearance: "dark",
      density: "compact",
      themeId: "matcha",
      exportFormat: "repository",
    }),
    true,
  );
  const restored = createPreferenceStore(() => storage);
  assert.equal(restored.getSnapshot().appearance, "dark");
  assert.equal(restored.getSnapshot().themeId, "matcha");
  assert.equal(restored.getSnapshot().exportFormat, "repository");
  storage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...defaultPreferences, appearance: "light" }),
  );
  restored.refresh();
  assert.equal(restored.getSnapshot().appearance, "light");
  storage.setItem(SETTINGS_KEY, "{broken");
  assert.deepEqual(restored.getSnapshot(), defaultPreferences);
  assert.strictEqual(restored.getSnapshot(), restored.getSnapshot());
  storage.removeItem(SETTINGS_KEY);
  assert.deepEqual(restored.getSnapshot(), defaultPreferences);
  for (const raw of [
    null,
    [],
    {},
    { version: 2, appearance: "dark" },
    {
      version: 1,
      appearance: "evil",
      themeId: "missing",
      customTheme: { name: "bad" },
    },
  ])
    assert.deepEqual(parsePreferences(raw), defaultPreferences);
});
test("unavailable or full storage keeps stable usable session preferences", () => {
  const store = createPreferenceStore(() => ({
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("full");
    },
  }));
  assert.strictEqual(store.getSnapshot(), store.getSnapshot());
  assert.equal(
    store.save({ ...defaultPreferences, appearance: "dark" }),
    false,
  );
  assert.equal(store.getSnapshot().appearance, "dark");
  assert.strictEqual(store.getSnapshot(), store.getSnapshot());
  const readable = createPreferenceStore(() => ({
    getItem: () => JSON.stringify(defaultPreferences),
    setItem() {
      throw new Error("quota");
    },
  }));
  assert.equal(
    readable.save({
      ...defaultPreferences,
      appearance: "light",
      themeId: "comfy",
    }),
    false,
  );
  assert.equal(readable.getSnapshot().themeId, "comfy");
});
test("site palettes use supported appearances and snapshot their own fonts and colors", () => {
  const theme = structuredClone(presets[0]);
  delete theme.modes.light;
  theme.fonts.mono = "JetBrains Mono";
  const prefs = parsePreferences({
    ...defaultPreferences,
    appearance: "light",
    themeId: "custom",
    customTheme: theme,
  });
  assert.equal(siteAppearance(prefs, "light"), "dark");
  const vars = siteVariables(prefs, "light");
  assert.equal(vars["--app-bg"], resolve(theme, "dark").background);
  assert.equal(vars["--app-primary"], resolve(theme, "dark").accent);
  assert.match(vars["--app-mono"], /preview-jetbrains/);
  assert.notEqual(
    siteVariables(defaultPreferences, "dark")["--app-bg"],
    siteVariables(defaultPreferences, "light")["--app-bg"],
  );
  assert.equal(
    siteVariables({ ...prefs, motion: "reduced" }, "dark")["--app-motion"],
    "0ms",
  );
  assert.equal(
    parsePreferences({
      ...prefs,
      customTheme: {
        ...theme,
        modes: { dark: { ...theme.modes.dark, accent: "red; color:blue" } },
      },
    }).themeId,
    "default",
  );
});
test("Draft site mode follows edits, survives reload, and leaves fixed snapshots unchanged", () => {
  const storage = memoryStorage(),
    store = createPreferenceStore(() => storage),
    draft = structuredClone(presets[0]);
  const fixed = structuredClone(draft);
  store.save({
    ...defaultPreferences,
    themeId: "draft",
    customTheme: fixed,
    draftTheme: draftSnapshot(draft),
  });
  draft.modes.dark!.accent = "#12abcf";
  draft.fonts.sans = "IBM Plex Sans";
  draft.style.radius = 17;
  draft.name = "";
  draft.author = "";
  store.save({ ...store.getSnapshot(), draftTheme: draftSnapshot(draft) });
  const reloaded = createPreferenceStore(() => storage).getSnapshot();
  assert.equal(reloaded.themeId, "draft");
  const vars = siteVariables(reloaded, "dark");
  assert.equal(vars["--app-primary"], "#12abcf");
  assert.equal(vars["--app-radius"], "17px");
  assert.match(vars["--app-sans"], /preview-plex/);
  assert.equal(
    reloaded.customTheme!.modes.dark!.accent,
    fixed.modes.dark!.accent,
  );
  assert.equal(reloaded.draftTheme!.name, "My theme");
  assert.equal(
    parsePreferences({ ...defaultPreferences, themeId: "draft" }).themeId,
    "draft",
  );
});
test("initial appearance script honors persisted selection before hydration", () => {
  for (const [value, system, expected] of [
    [{ version: 1, appearance: "light" }, true, "light"],
    [{ version: 1, appearance: "dark" }, false, "dark"],
    [{ version: 1, appearance: "system" }, true, "dark"],
    [{ version: 2, appearance: "dark" }, false, "light"],
  ] as const) {
    const dataset: Record<string, string> = {};
    runInNewContext(appearanceBootstrap, {
      localStorage: { getItem: () => JSON.stringify(value) },
      matchMedia: () => ({ matches: system }),
      document: { documentElement: { dataset } },
    });
    assert.equal(dataset.siteMode, expected);
  }
});
