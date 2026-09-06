import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { presets } from "../lib/theme";
import { generateTarget, semanticVariables } from "../lib/exporters";

test("shadcn previews run real controls and keep exported tokens across portals and draft updates", async () => {
  const dom = new JSDOM(
    '<!doctype html><html data-site-mode="light"><body><div id="root"></div></body></html>',
    {
      url: "https://themespace.example/components?library=shadcn",
      pretendToBeVisual: true,
    },
  );
  const w = dom.window;
  const d = w.document;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  for (const [key, value] of Object.entries({
    window: w,
    document: d,
    navigator: w.navigator,
    HTMLElement: w.HTMLElement,
    HTMLInputElement: w.HTMLInputElement,
    HTMLSelectElement: w.HTMLSelectElement,
    HTMLButtonElement: w.HTMLButtonElement,
    HTMLFormElement: w.HTMLFormElement,
    HTMLTextAreaElement: w.HTMLTextAreaElement,
    SVGElement: w.SVGElement,
    FormData: w.FormData,
    Element: w.Element,
    Node: w.Node,
    NodeFilter: w.NodeFilter,
    DocumentFragment: w.DocumentFragment,
    MutationObserver: w.MutationObserver,
    Event: w.Event,
    CustomEvent: w.CustomEvent,
    MouseEvent: w.MouseEvent,
    KeyboardEvent: w.KeyboardEvent,
    FocusEvent: w.FocusEvent,
    getComputedStyle: w.getComputedStyle.bind(w),
    requestAnimationFrame: w.requestAnimationFrame.bind(w),
    cancelAnimationFrame: w.cancelAnimationFrame.bind(w),
    ResizeObserver: ResizeObserverStub,
    matchMedia,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  Object.assign(w, { ResizeObserver: ResizeObserverStub, matchMedia });
  let commandScrolls = 0;
  w.HTMLElement.prototype.scrollIntoView = function () {
    if (this.closest("[cmdk-root]")) commandScrolls++;
  };
  w.HTMLElement.prototype.hasPointerCapture = () => false;
  w.HTMLElement.prototype.setPointerCapture = () => {};
  w.HTMLElement.prototype.releasePointerCapture = () => {};
  // JSDOM has no layout engine; give only the responsive chart a measured box.
  const originalBounds = w.HTMLElement.prototype.getBoundingClientRect;
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    return this.classList.contains("recharts-responsive-container")
      ? new w.DOMRect(0, 0, 640, 224)
      : originalBounds.call(this);
  };
  const { createRoot } = await import("react-dom/client");
  const { ShadcnPreview, shadcnExamples } =
    await import("../components/shadcn-preview");
  const container = d.getElementById("root")!;
  const root = createRoot(container);
  const theme = structuredClone(presets[0]);
  const query = <T extends HTMLElement = HTMLElement>(selector: string) => {
    const element = d.querySelector<T>(selector);
    assert.ok(element, `Expected ${selector}`);
    return element;
  };
  const click = async (selector: string) => {
    await act(async () => {
      query(selector).click();
    });
  };
  const keyboard = async (element: HTMLElement, key: string) => {
    await act(async () => {
      element.dispatchEvent(
        new w.KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };
  const setInput = async (selector: string, value: string) => {
    await act(async () => {
      const element = query<HTMLInputElement>(selector);
      Object.getOwnPropertyDescriptor(
        w.HTMLInputElement.prototype,
        "value",
      )!.set!.call(element, value);
      element.dispatchEvent(new w.Event("input", { bubbles: true }));
    });
  };
  try {
    await act(async () => {
      root.render(createElement(ShadcnPreview, { theme, mode: "dark" }));
    });
    assert.equal(
      d.querySelectorAll("[data-preview-component]").length,
      shadcnExamples.length,
    );
    assert.equal(shadcnExamples.length, 31);
    assert.equal(
      commandScrolls,
      0,
      "Loading the command example must not scroll the gallery",
    );
    const commandInput = query('[aria-label="Search example commands"]');
    await keyboard(commandInput, "ArrowDown");
    assert.ok(
      d.querySelector('[cmdk-item][aria-selected="true"]'),
      "Keyboard navigation still selects a command",
    );
    for (const slot of [
      "button",
      "input",
      "textarea",
      "checkbox",
      "switch",
      "radio-group",
      "slider",
      "tabs",
      "accordion",
      "calendar",
      "chart",
      "table",
      "command",
      "scroll-area",
      "toggle-group",
      "card",
      "badge",
      "avatar",
      "alert",
      "skeleton",
      "progress",
      "breadcrumb",
      "collapsible",
      "pagination",
    ]) {
      assert.ok(
        d.querySelector(`[data-slot="${slot}"]`),
        `Real ${slot} component mounted`,
      );
    }
    assert.ok(
      d.querySelector(".recharts-surface"),
      "Recharts renders an actual SVG chart",
    );

    const checkbox = '[data-preview-component="checkbox"] [role="checkbox"]';
    assert.equal(query(checkbox).getAttribute("aria-checked"), "false");
    await click(checkbox);
    assert.equal(query(checkbox).getAttribute("aria-checked"), "true");
    await click('[data-preview-component="switch"] [role="switch"]');
    assert.equal(
      query('[data-preview-component="switch"] [role="switch"]').getAttribute(
        "aria-checked",
      ),
      "false",
    );

    // Open by keyboard, update the draft while portalled, then choose an option.
    const trigger = query(
      '[data-preview-component="select"] [role="combobox"]',
    );
    await keyboard(trigger, "Enter");
    const popup = query('[data-slot="select-content"]');
    assert.ok(
      !container.contains(popup),
      "The real Radix menu is portalled to body",
    );
    const portal = popup.closest<HTMLElement>(".shadcn-preview-portal")!;
    assert.equal(portal.dataset.theme, "dark");
    assert.equal(
      portal.style.getPropertyValue("--primary"),
      theme.modes.dark!.accent,
    );
    const edited = structuredClone(theme);
    edited.modes.dark!.accent = "#c52d91";
    edited.style.radius = 17;
    edited.style.spacing = 5;
    await act(async () => {
      root.render(
        createElement(ShadcnPreview, { theme: edited, mode: "dark" }),
      );
    });
    assert.equal(portal.style.getPropertyValue("--primary"), "#c52d91");
    assert.equal(portal.style.getPropertyValue("--radius"), "17px");
    assert.equal(portal.style.getPropertyValue("--ts-spacing"), "5px");
    const exported = generateTarget(edited, "shadcn").find(
      (file) => file.path === "theme.css",
    )!.content;
    for (const [name, value] of Object.entries(
      semanticVariables(edited, "dark"),
    )) {
      assert.equal(portal.style.getPropertyValue(name), value, name);
      assert.ok(
        exported.includes(`${name}: ${value};`),
        `${name} matches export`,
      );
    }
    const option = [...d.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (element) => element.textContent === "Design studio",
    )!;
    assert.ok(option);
    await keyboard(option, "Enter");
    assert.equal(d.querySelector('[data-slot="select-content"]'), null);
    assert.match(trigger.textContent!, /Design studio/);

    // Dialog focus management, editable local state, and theme inheritance.
    const dialogTrigger = query(
      '[data-preview-component="dialog"] [data-slot="dialog-trigger"]',
    );
    await act(async () => {
      dialogTrigger.focus();
      dialogTrigger.click();
    });
    const dialog = query('[data-slot="dialog-content"]');
    assert.ok(
      dialog.contains(d.activeElement),
      "Focus moves inside the dialog",
    );
    assert.equal(
      dialog
        .closest<HTMLElement>(".shadcn-preview-portal")!
        .style.getPropertyValue("--primary"),
      "#c52d91",
    );
    await setInput('[data-slot="dialog-content"] input', "A calmer workspace");
    await click('[data-slot="dialog-content"] button[type="submit"]');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    assert.equal(d.querySelector('[data-slot="dialog-content"]'), null);
    assert.match(
      query('[data-preview-component="dialog"] [role="status"]').textContent!,
      /A calmer workspace/,
    );
    assert.equal(
      d.activeElement,
      dialogTrigger,
      "Focus returns to the trigger",
    );

    const tab = query(
      '[data-preview-component="tabs"] [role="tab"][data-state="active"]',
    );
    await act(async () => {
      tab.focus();
    });
    await keyboard(tab, "ArrowRight");
    assert.match(
      query(
        '[data-preview-component="tabs"] [role="tabpanel"][data-state="active"]',
      ).textContent!,
      /Recent activity/,
    );

    await setInput('[aria-label="Filter example themes"]', "Moss");
    const tableRows = d.querySelectorAll(
      '[data-preview-component="table"] tbody tr',
    );
    assert.equal(tableRows.length, 1);
    assert.match(tableRows[0].textContent!, /Moss/);
    await click('[aria-label="Select visible themes"]');
    assert.match(
      query('[data-preview-component="table"] caption').textContent!,
      /1 selected/,
    );
    await setInput('[aria-label="Search example commands"]', "Preferences");
    assert.equal(d.querySelectorAll("[cmdk-item]:not([hidden])").length, 1);
    await click("[cmdk-item]:not([hidden])");
    assert.match(
      query('[data-preview-component="command"] [role="status"]').textContent!,
      /Preferences selected/,
    );

    // The preview appearance is independent from the site's dark appearance.
    d.documentElement.dataset.siteMode = "dark";
    await click('[aria-label="light shadcn preview"]');
    await keyboard(trigger, "Enter");
    const lightPortal = query(
      '[data-slot="select-content"]',
    ).closest<HTMLElement>(".shadcn-preview-portal")!;
    assert.equal(lightPortal.dataset.theme, "light");
    assert.equal(lightPortal.classList.contains("dark"), false);
    assert.equal(
      lightPortal.style.getPropertyValue("--primary"),
      edited.modes.light!.accent,
    );
    await keyboard(query('[data-slot="select-content"]'), "Escape");

    // Search renders the actual chosen component and has a working empty state.
    await setInput('[aria-label="Search shadcn components"]', "calendar");
    assert.equal(d.querySelectorAll("[data-preview-component]").length, 2);
    await setInput('[aria-label="Search shadcn components"]', "does-not-exist");
    assert.equal(d.querySelectorAll("[data-preview-component]").length, 0);
    assert.match(container.textContent!, /No components found/);
    await click(".shadcn-empty button");
    assert.equal(d.querySelectorAll("[data-preview-component]").length, 31);
  } finally {
    await act(async () => {
      root.unmount();
      // Allow Radix's deferred focus/animation cleanup to finish before restoring globals.
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
