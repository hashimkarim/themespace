import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { presets } from "../lib/theme";
import { EDITOR_READY, type EditorFrameConfig } from "../lib/editor-preview";

test("editor frames keep themes independent and reject messages from other origins or windows", async () => {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: "https://themespace.example/" },
  );
  const w = dom.window,
    originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: w,
    document: w.document,
    location: w.location,
    navigator: w.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const { createRoot } = await import("react-dom/client");
  const { CodeSurface } = await import("../components/renderers/code-surface");
  const root = createRoot(w.document.getElementById("root")!);
  const theme = structuredClone(presets[0]);
  const changes: string[] = [];
  const render = () =>
    act(async () =>
      root.render(
        createElement(
          "div",
          null,
          createElement(CodeSurface, {
            theme,
            mode: "dark",
            target: "vscode",
            file: "theme.ts",
            onChange: (value) => changes.push(value),
          }),
          createElement(CodeSurface, {
            theme,
            mode: "light",
            target: "vscode",
            file: "theme.ts",
          }),
        ),
      ),
    );
  try {
    await render();
    const frames = [...w.document.querySelectorAll("iframe")];
    assert.equal(frames.length, 2);
    const sent: EditorFrameConfig[][] = [[], []];
    frames.forEach((frame, index) => {
      frame.contentWindow!.postMessage = (payload) => sent[index].push(payload);
    });
    const receive = (
      source: Window | null,
      data: unknown,
      origin = w.location.origin,
    ) =>
      act(async () => {
        w.dispatchEvent(
          new w.MessageEvent("message", { source, data, origin }),
        );
      });
    await receive(frames[0].contentWindow, { type: EDITOR_READY });
    await receive(frames[1].contentWindow, { type: EDITOR_READY });
    assert.equal(sent[0].at(-1)?.mode, "dark");
    assert.equal(sent[1].at(-1)?.mode, "light");
    const update = {
      type: "themespace-editor-change",
      file: "theme.ts",
      value: "saved local edit",
    };
    await receive(null, update);
    await receive(frames[0].contentWindow, update, "https://unrelated.example");
    await receive(frames[1].contentWindow, update);
    await receive(frames[0].contentWindow, { ...update, file: "other.ts" });
    await receive(frames[0].contentWindow, {
      ...update,
      value: "x".repeat(100001),
    });
    assert.deepEqual(changes, []);
    await receive(frames[0].contentWindow, update);
    assert.deepEqual(changes, ["saved local edit"]);
    theme.modes.dark!.accent = "#abcdef";
    await render();
    assert.equal(
      w.document.querySelector("iframe"),
      frames[0],
      "Palette updates retain the iframe and its editor instance",
    );
    assert.equal(sent[0].at(-1)?.theme.modes.dark!.accent, "#abcdef");
  } finally {
    await act(async () => root.unmount());
    w.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
