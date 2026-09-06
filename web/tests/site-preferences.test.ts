import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement, act } from "react";
import { presets } from "../lib/theme";
import { SETTINGS_KEY } from "../lib/preferences";

test("live Draft updates the application root, follows appearance, and restores after remount", async () => {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: "https://themespace.example/" },
  );
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const media = {
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  };
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    Event: dom.window.Event,
    matchMedia: () => media,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  }
  const { createRoot } = await import("react-dom/client");
  const { SitePreferences, useSitePreferences } =
    await import("../components/site-preferences");
  let preferences!: ReturnType<typeof useSitePreferences>;
  function Harness() {
    preferences = useSitePreferences();
    return createElement("span", null, preferences.settings.themeId);
  }
  const container = dom.window.document.getElementById("root")!;
  let root = createRoot(container);
  try {
    await act(async () => {
      root.render(createElement(SitePreferences, null, createElement(Harness)));
    });
    const draft = structuredClone(presets[0]);
    await act(async () => {
      preferences.followDraft(draft);
    });
    assert.equal(
      dom.window.document.documentElement.dataset.siteTheme,
      "draft",
    );
    draft.modes.dark!.accent = "#1278ad";
    draft.style.radius = 19;
    await act(async () => {
      preferences.syncDraft(draft);
    });
    assert.equal(
      dom.window.document.documentElement.style.getPropertyValue(
        "--app-primary",
      ),
      "#1278ad",
    );
    assert.equal(
      dom.window.document.documentElement.style.getPropertyValue(
        "--app-radius",
      ),
      "19px",
    );
    await act(async () => {
      preferences.update({ appearance: "light" });
    });
    assert.equal(dom.window.document.documentElement.dataset.siteMode, "light");
    assert.equal(
      dom.window.document.documentElement.style.getPropertyValue(
        "--app-primary",
      ),
      draft.modes.light!.accent,
    );
    const saved = JSON.parse(dom.window.localStorage.getItem(SETTINGS_KEY)!);
    assert.equal(saved.themeId, "draft");
    assert.equal(saved.draftTheme.modes.dark.accent, "#1278ad");
    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(SitePreferences, null, createElement(Harness)));
    });
    assert.equal(container.textContent, "draft");
    assert.equal(dom.window.document.documentElement.dataset.siteMode, "light");
    await act(async () => {
      preferences.update({ themeId: "default" });
      preferences.syncDraft({ ...draft, style: { ...draft.style, radius: 2 } });
    });
    assert.equal(
      dom.window.document.documentElement.style.getPropertyValue(
        "--app-radius",
      ),
      "9px",
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
