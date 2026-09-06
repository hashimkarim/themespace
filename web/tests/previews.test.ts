import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup, renderToReadableStream } from "react-dom/server";
import {
  componentFixtures,
  componentDocument,
  fixtureScript,
} from "../lib/component-fixtures";
import { cssOutput, designSystemFiles, generateTarget } from "../lib/exporters";
import { presets, resolve, slugify } from "../lib/theme";
import { exportTargets } from "../lib/targets";
import { previewProfiles, nativePreviewColors } from "../lib/preview-targets";
import { IntegrationPreview } from "../components/integration-preview";

const theme = structuredClone(presets[0]);
test("component library and downloaded fixture cover all Comfy cards and application surfaces", () => {
  const fixtures = componentFixtures(theme, "dark"),
    ids = new Set(fixtures.map((f) => f.id));
  assert.equal(ids.size, 54);
  for (const id of [
    "brand-wordmark",
    "color-backgrounds",
    "color-accents",
    "color-text",
    "color-semantic",
    "color-syntax",
    "color-surfaces",
    "type-families",
    "type-scale",
    "type-code",
    "spacing-scale",
    "radii",
    "elevation",
    "borders",
    "comp-buttons",
    "comp-badges",
    "comp-card",
    "comp-inputs",
    "comp-toggle",
    "comp-listrows",
    "titlebar",
    "activityrail",
    "filetree",
    "editor-tabs",
    "codeview",
    "terminal",
    "statusbar",
  ])
    assert.ok(ids.has(id), id);
  for (const id of [
    "hero",
    "feature-cards",
    "forms",
    "motion",
    "select",
    "dialog",
    "charts",
    "table",
    "composer",
  ])
    assert.ok(ids.has(id), id);
  const exported = designSystemFiles(theme).find(
      (f) => f.path === "components.html",
    )!.content,
    dom = new JSDOM(exported);
  assert.equal(dom.window.document.querySelectorAll(".fixture").length, 54);
  assert.equal(
    dom.window.document.querySelector("link")?.getAttribute("href"),
    "tokens.css",
  );
  assert.equal(dom.window.document.querySelectorAll("script").length, 1);
  assert.match(exported, /style-src 'self' file:/);
  dom.window.close();
});
test("fixture content escapes imported theme text and filters to the requested examples", () => {
  const source = {
    ...theme,
    name: "</style><script>bad()</script>",
    description: '" onmouseover="bad()',
  };
  const dom = new JSDOM(
    componentDocument(
      source,
      "dark",
      cssOutput(theme),
      ["brand-wordmark", "comp-inputs"],
      true,
    ),
  );
  assert.equal(dom.window.document.querySelectorAll(".fixture").length, 2);
  assert.equal(
    dom.window.document.querySelector(".wordmark strong")?.textContent,
    source.name,
  );
  assert.equal(dom.window.document.querySelectorAll("script").length, 1);
  assert.equal(dom.window.document.querySelector("[onmouseover]"), null);
  dom.window.close();
});
test("exported component controls work offline without submitting forms or running shell commands", () => {
  const dom = new JSDOM(componentDocument(theme, "dark", cssOutput(theme)), {
      runScripts: "outside-only",
      url: "https://fixture.example/",
    }),
    w = dom.window,
    d = w.document;
  Object.defineProperty(w, "ResizeObserver", {
    value: class {
      observe() {}
    },
  });
  w.eval(fixtureScript);
  const click = (s: string) => (d.querySelector(s) as HTMLElement).click();
  click('#tabs [data-tab="Activity"]');
  assert.equal(
    d.querySelector("#tabs [role=tabpanel] b")?.textContent,
    "Activity",
  );
  click('#select [data-select="Compact"]');
  assert.match(d.querySelector("#select summary")!.textContent!, /Compact/);
  assert.equal(d.querySelector("#select details")?.hasAttribute("open"), false);
  const range = d.querySelector("#slider input") as HTMLInputElement;
  range.value = "84";
  range.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert.equal(d.querySelector("#slider output")?.textContent, "84");
  click("#table [data-check-all]");
  assert.ok(
    [...d.querySelectorAll("#table tbody input")].every(
      (el) => (el as HTMLInputElement).checked,
    ),
  );
  const terminal = d.querySelector("#terminal form")!,
    input = terminal.querySelector("input") as HTMLInputElement;
  input.value = "echo hello from preview";
  assert.equal(
    terminal.dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    ),
    false,
  );
  assert.equal(
    d.querySelector("#terminal output")?.textContent,
    "hello from preview",
  );
  input.value = "rm -rf /";
  terminal.dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert.match(
    d.querySelector("#terminal output")!.textContent!,
    /Demo terminal/,
  );
  const composer = d.querySelector("#composer form")!,
    area = composer.querySelector("textarea")!;
  area.value = "<img onerror=bad()>";
  composer.dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert.equal(
    d.querySelector("#composer output")?.textContent,
    "Preview message: <img onerror=bad()>",
  );
  assert.equal(d.querySelector("#composer img"), null);
  click("[data-mode=light]");
  assert.equal(d.documentElement.dataset.theme, "light");
  dom.window.close();
});
test("every working integration has a renderable preview in both appearances", async () => {
  assert.deepEqual(
    Object.keys(previewProfiles).sort(),
    exportTargets.map((t) => t.id).sort(),
  );
  for (const target of exportTargets)
    for (const mode of ["dark", "light"] as const) {
      const element = createElement(IntegrationPreview, {
        theme,
        mode,
        target: target.id,
      });
      // The real shadcn gallery is loaded on demand; finish the Suspense stream.
      const html =
        target.id === "shadcn"
          ? await new Response(await renderToReadableStream(element)).text()
          : renderToStaticMarkup(element);
      assert.ok(html.includes(`data-preview-target="${target.id}"`), target.id);
      assert.ok(html.length > 500, target.id);
      if (target.id === "shadcn") {
        assert.ok(html.includes('data-preview-renderer="shadcn-react"'));
        assert.ok(html.includes('data-slot="calendar"'));
        assert.ok(html.includes('data-slot="table"'));
      }
    }
  const darkOnly = { ...theme, modes: { dark: theme.modes.dark } };
  assert.doesNotThrow(() =>
    renderToStaticMarkup(
      createElement(IntegrationPreview, {
        theme: darkOnly,
        mode: "dark",
        target: "vscode",
      }),
    ),
  );
  assert.doesNotThrow(() =>
    nativePreviewColors({ ...theme, name: "", author: "" }, "dark", "vscode"),
  );
});
test("VS Code and Windows Terminal previews use the colors in their actual exported files", () => {
  const custom = structuredClone(theme);
  custom.modes.dark!.accent = "#fe1209";
  custom.modes.dark!.overrides = { ansi3: "#02468a", selection: "#13579a" };
  const vscode = JSON.parse(
      generateTarget(custom, "vscode").find(
        (f) => f.path === `themes/${slugify(custom.name)}-dark.json`,
      )!.content,
    ),
    vs = nativePreviewColors(custom, "dark", "vscode");
  assert.equal(vs.background, vscode.colors["editor.background"]);
  assert.equal(vs.status, vscode.colors["statusBar.background"]);
  assert.equal(vs.cursor, vscode.colors["editorCursor.foreground"]);
  const wt = JSON.parse(
      generateTarget(custom, "windows-terminal").find((f) =>
        f.path.endsWith("-dark.json"),
      )!.content,
    ),
    win = nativePreviewColors(custom, "dark", "windows-terminal");
  assert.equal(win.background, wt.background);
  assert.equal(win.selection, wt.selectionBackground);
  assert.equal(win.ansi3, wt.yellow);
  assert.equal(win.ansi3, "#02468a");
  assert.equal(win.cursor, "#fe1209");
  assert.equal(win.foreground, resolve(custom, "dark").foreground);
});
