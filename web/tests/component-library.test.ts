import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { presets } from "../lib/theme";

test("component frames mount documents, accept only their own readiness, and release replaced documents", async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://themespace.example/",
  });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const blobs = new Map<string, Blob>();
  const revoked: string[] = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let nextURL = 0;
  URL.createObjectURL = (blob) => {
    assert.ok(blob instanceof Blob);
    const url = `blob:https://themespace.example/fixture-${++nextURL}`;
    blobs.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
  };
  Object.defineProperty(dom.window.document, "fonts", {
    value: { ready: new Promise(() => {}) },
  });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    Event: dom.window.Event,
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
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
  const { SitePreferences } = await import("../components/site-preferences");
  const { ComponentLibrary } = await import("../components/component-library");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const render = (theme = presets[0]) =>
    root.render(
      createElement(
        SitePreferences,
        null,
        createElement(ComponentLibrary, { theme, mode: "dark", compact: true }),
      ),
    );
  try {
    await act(async () => render());
    const frame = container.querySelector("iframe")!;
    const firstURL = frame.src;
    assert.equal(frame.getAttribute("sandbox"), "allow-scripts");
    assert.equal(frame.hasAttribute("srcdoc"), false);
    const rendered = new JSDOM(await blobs.get(firstURL)!.text());
    assert.equal(
      rendered.window.document.querySelectorAll(".fixture").length,
      54,
    );
    rendered.window.close();
    const shell = frame.parentElement!;
    assert.equal(shell.getAttribute("aria-busy"), "true");
    const ready = (url: string, source: Window | null, height: number) =>
      dom.window.dispatchEvent(
        new dom.window.MessageEvent("message", {
          source,
          data: { type: "themespace-fixture-height", url, height },
        }),
      );
    await act(async () => {
      ready(firstURL, null, 2000);
    });
    assert.equal(
      shell.getAttribute("aria-busy"),
      "true",
      "Unrelated frames cannot mark the gallery ready",
    );
    await act(async () => {
      ready(firstURL, frame.contentWindow, 2000);
    });
    assert.equal(shell.getAttribute("aria-busy"), "false");
    assert.equal(frame.style.height, "2000px");
    await act(async () => render({ ...presets[0], name: "Updated draft" }));
    assert.notEqual(frame.src, firstURL);
    assert.ok(revoked.includes(firstURL));
    assert.equal(shell.getAttribute("aria-busy"), "true");
    await act(async () => {
      ready(firstURL, frame.contentWindow, 3000);
    });
    assert.equal(
      shell.getAttribute("aria-busy"),
      "true",
      "A stale document must not hide the new loading state",
    );
    await act(async () => {
      ready(frame.src, frame.contentWindow, 2400);
    });
    assert.equal(shell.getAttribute("aria-busy"), "false");
    assert.equal(frame.style.height, "2400px");
  } finally {
    await act(async () => root.unmount());
    assert.equal(revoked.length, blobs.size);
    dom.window.close();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
