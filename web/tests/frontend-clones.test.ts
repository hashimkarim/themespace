import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { presets, resolve } from "../lib/theme";

test("Spotify and Discord frontend adaptations work locally and retain state across theme edits", async () => {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: "https://themespace.example/", pretendToBeVisual: true },
  );
  const w = dom.window,
    d = w.document;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: w,
    document: d,
    navigator: w.navigator,
    HTMLElement: w.HTMLElement,
    HTMLInputElement: w.HTMLInputElement,
    Event: w.Event,
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
  const { IntegrationPreview } =
    await import("../components/integration-preview");
  const root = createRoot(d.getElementById("root")!);
  const theme = structuredClone(presets[0]);
  const query = <T extends HTMLElement = HTMLElement>(selector: string) => {
    const el = d.querySelector<T>(selector);
    assert.ok(el, selector);
    return el;
  };
  const click = async (selector: string) =>
    act(async () => query(selector).click());
  const input = async (selector: string, value: string) =>
    act(async () => {
      const el = query<HTMLInputElement>(selector);
      Object.getOwnPropertyDescriptor(
        w.HTMLInputElement.prototype,
        "value",
      )!.set!.call(el, value);
      el.dispatchEvent(new w.Event("input", { bubbles: true }));
    });
  const render = async (target: string, mode: "dark" | "light" = "dark") =>
    act(async () =>
      root.render(createElement(IntegrationPreview, { theme, target, mode })),
    );
  try {
    await render("spicetify");
    assert.equal(
      query("[data-preview-target]").style.getPropertyValue("--spice-main"),
      resolve(theme, "dark").background,
    );
    await input('[aria-label="Search sample music"]', "blue");
    assert.equal(d.querySelectorAll(".spotify-song-table tbody tr").length, 1);
    await click('[aria-label="Play Blue hour"]');
    assert.match(query(".spotify-song-details").textContent, /Blue hour/);
    await click('[aria-label="Show music queue"]');
    assert.ok(d.querySelector(".spotify-queue"));
    theme.modes.light!.accent = "#194c9d";
    await render("spicetify", "light");
    assert.equal(
      query("[data-preview-target]").style.getPropertyValue("--spice-button"),
      "#194c9d",
    );
    assert.match(query(".spotify-song-details").textContent, /Blue hour/);
    assert.ok(
      d.querySelector(".spotify-queue"),
      "Draft updates preserve queue state",
    );
    await click('[aria-label="Like current song"]');
    await click('[aria-label="Liked Songs"]');
    assert.match(query(".spotify-song-table").textContent, /Blue hour/);
    assert.equal(d.querySelector("audio"), null);
    assert.ok(
      [...d.querySelectorAll("img")].every(
        (img) => !img.src.startsWith("http"),
      ),
    );

    await render("betterdiscord");
    assert.equal(
      query("[data-preview-target]").style.getPropertyValue(
        "--background-primary",
      ),
      resolve(theme, "dark").background,
    );
    assert.ok(
      d.querySelector(".dmk-embed"),
      "Uses installed Discord message components",
    );
    await click('[aria-label="React with sparkle"]');
    assert.match(query('[aria-label="React with sparkle"]').textContent, /5/);
    await click('[aria-label="Mute microphone preview"]');
    assert.ok(d.querySelector('[aria-label="Unmute microphone preview"]'));
    await input(
      '[aria-label="Message #general"]',
      "<img src=x onerror=bad()> local message",
    );
    await act(async () => {
      query(".discord-input-wrapper").dispatchEvent(
        new w.Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    assert.match(
      query('[role="log"]').textContent,
      /<img src=x onerror=bad\(\)> local message/,
    );
    assert.equal(d.querySelector("img[onerror]"), null);
    const channel = [
      ...d.querySelectorAll<HTMLButtonElement>(".discord-channel-button"),
    ].find((el) => el.textContent === "showcase")!;
    await act(async () => channel.click());
    assert.doesNotMatch(query('[role="log"]').textContent, /local message/);
    await act(async () =>
      [...d.querySelectorAll<HTMLButtonElement>(".discord-channel-button")]
        .find((el) => el.textContent === "general")!
        .click(),
    );
    assert.match(query('[role="log"]').textContent, /local message/);
    await render("betterdiscord", "light");
    assert.equal(
      query("[data-preview-target]").style.getPropertyValue("--brand-500"),
      "#194c9d",
    );
    assert.match(query('[role="log"]').textContent, /local message/);
    assert.ok(
      [...d.querySelectorAll("img")].every((img) =>
        img.src.startsWith("data:"),
      ),
      "Message avatars are bundled locally",
    );
    await click('[aria-label="Toggle member list"]');
    assert.equal(d.querySelector(".discord-user-list"), null);

    await render("firefox");
    await click('[aria-label="Browser preview menu"]');
    assert.ok(d.querySelector(".native-browser-menu"));
    await act(async () =>
      [...d.querySelectorAll<HTMLButtonElement>(".native-browser-menu button")]
        .find((el) => el.textContent === "Bookmarks sidebar")!
        .click(),
    );
    assert.ok(d.querySelector(".native-browser-sidebar"));
  } finally {
    await act(async () => root.unmount());
    w.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
