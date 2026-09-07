import assert from "node:assert/strict";
import { test } from "node:test";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import {
  extractImagePalette,
  IMAGE_PALETTE_MAX_BYTES,
} from "../lib/image-palette";
import {
  palettesFromImage,
  suggestImageRoles,
  type GeneratedPalettes,
  type PaletteTarget,
} from "../lib/palette-tools";
import { rgb } from "../lib/theme";

test("image imports reject unsupported or oversized files before decoding", async () => {
  await assert.rejects(
    extractImagePalette(
      new File(["not an image"], "theme.svg", { type: "image/svg+xml" }),
    ),
    /PNG, JPG/,
  );
  await assert.rejects(
    extractImagePalette(
      new File([new Uint8Array(IMAGE_PALETTE_MAX_BYTES + 1)], "large.png", {
        type: "image/png",
      }),
    ),
    /12 MB/,
  );
});

test("image picker keeps independent light/dark combinations, applies the selected mode, and handles uploads safely", async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://themespace.example/",
  });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  type Bitmap = { width: number; height: number; close: () => void };
  const pending: {
    file: File;
    resolve: (bitmap: Bitmap) => void;
    reject: (error: Error) => void;
  }[] = [];
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLImageElement: dom.window.HTMLImageElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    createImageBitmap: (file: File) =>
      new Promise<Bitmap>((resolve, reject) =>
        pending.push({ file, resolve, reject }),
      ),
    fetch: () => {
      throw new Error("Image import must not send network requests");
    },
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const rendered: number[][] = [];
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", {
    value: () => ({
      drawImage: (_source: Bitmap, ...dimensions: number[]) =>
        rendered.push(dimensions),
      getImageData: () => ({
        data: new Uint8ClampedArray([255, 170, 51, 255, 51, 102, 204, 255]),
      }),
    }),
  });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "toDataURL", {
    value: () => "data:image/png;base64,dGh1bWJuYWls",
  });
  const { createRoot } = await import("react-dom/client");
  const { ImagePalettePicker } =
    await import("../components/image-palette-picker");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const applied: { palettes: GeneratedPalettes; target: PaletteTarget }[] = [];
  let cancelled = 0,
    closed = 0;
  const bitmap = (width = 2400, height = 1200) => ({
    width,
    height,
    close: () => {
      closed++;
    },
  });
  const button = (text: string) =>
    [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes(text),
    )!;
  const clickLabel = async (label: string) =>
    act(async () => {
      const control = container.querySelector<HTMLButtonElement>(
        `button[aria-label="${label}"]`,
      );
      assert.ok(control, `Missing control: ${label}`);
      control.click();
    });
  const roleColors = () =>
    [...container.querySelectorAll(".image-palette-roles code")].map(
      (element) => element.textContent,
    );
  const assign = async (colors: string[]) => {
    const labels = ["surfaces", "buttons", "accent 2", "accent 3"];
    for (const [index, label] of labels.entries()) {
      await clickLabel(`Choose ${label} color`);
      await clickLabel(`Use ${colors[index]} for ${label}`);
    }
  };
  const upload = async (name: string) => {
    await act(async () => {
      const input =
        container.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, "files", {
        value: [new File(["image bytes"], name, { type: "image/png" })],
        configurable: true,
      });
      input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
  };
  let unmounted = false;
  try {
    await act(async () =>
      root.render(
        createElement(ImagePalettePicker, {
          appearance: "dark",
          onApply: (palettes, target) => applied.push({ palettes, target }),
          onCancel: () => {
            cancelled++;
          },
        }),
      ),
    );
    assert.equal(button("Apply both palettes").disabled, true);
    await upload("first.png");
    await upload("second.png");
    assert.equal(button("Apply both palettes").disabled, true);
    await act(async () => pending[1].resolve(bitmap()));
    assert.ok(container.textContent?.includes("second.png"));
    assert.deepEqual(
      rendered[0],
      [0, 0, 240, 120],
      "Large images are sampled at a bounded size, preserving their shape",
    );
    assert.equal(
      applied.length,
      0,
      "Extracting an image must not edit the draft",
    );
    await act(async () => pending[0].resolve(bitmap()));
    assert.ok(
      container.textContent?.includes("second.png"),
      "A slower earlier upload must not replace the chosen image",
    );
    assert.equal(closed, 2);
    const suggested = roleColors();
    await clickLabel("Use #ffaa33 for buttons");
    const originalBackground = container.querySelector<HTMLElement>(
      ".image-palette-preview",
    )!.style.background;
    await clickLabel("Choose surfaces color");
    await clickLabel("Use #3366cc for surfaces");
    assert.notEqual(
      container.querySelector<HTMLElement>(".image-palette-preview")!.style
        .background,
      originalBackground,
    );
    assert.equal(
      container.querySelector<HTMLElement>(".image-palette-preview-accent")!
        .style.background,
      "rgb(255, 170, 51)",
      "Changing the foundation must leave the button color alone",
    );
    const darkColors = ["#3366cc", "#ffaa33", "#3366cc", "#ffaa33"];
    const lightColors = ["#ffaa33", "#3366cc", "#ffaa33", "#3366cc"];
    await assign(darkColors);
    await clickLabel("Edit light palette");
    assert.deepEqual(
      roleColors(),
      suggested,
      "Dark edits leave light colors alone",
    );
    await assign(lightColors);
    await clickLabel("Edit dark palette");
    assert.deepEqual(
      roleColors(),
      darkColors,
      "Switching preserves all four dark assignments",
    );
    await clickLabel("Auto assign dark colors");
    assert.deepEqual(roleColors(), suggested);
    await clickLabel("Edit light palette");
    assert.deepEqual(
      roleColors(),
      lightColors,
      "Auto assign only resets the edited appearance",
    );
    await clickLabel("Edit dark palette");
    await assign(darkColors);
    await clickLabel("Edit light palette");
    const colors = [
      { hex: "#ffaa33", share: 0.5 },
      { hex: "#3366cc", share: 0.5 },
    ];
    const expected = palettesFromImage(colors, {
      dark: { surface: 1, primary: 0, secondary: 1, tertiary: 0 },
      light: { surface: 0, primary: 1, secondary: 0, tertiary: 1 },
    });
    assert.equal(
      container.querySelector<HTMLElement>(".image-palette-preview")!.style
        .background,
      `rgb(${rgb(expected.light.background).join(", ")})`,
    );
    assert.equal(
      container.querySelector<HTMLElement>(".image-palette-preview-accent")!
        .style.background,
      "rgb(51, 102, 204)",
      "The preview uses the light combination's own button color",
    );
    assert.equal(
      applied.length,
      0,
      "Editing must not change the draft before Apply",
    );
    await act(async () => button("Apply both palettes").click());
    assert.deepEqual(applied, [{ palettes: expected, target: "both" }]);
    await act(async () =>
      container
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click(),
    );
    assert.ok(
      container.textContent?.includes("Only replaces your light palette"),
    );
    await act(async () => button("Apply light palette").click());
    assert.deepEqual(applied[1], { palettes: expected, target: "light" });
    await clickLabel("Edit dark palette");
    assert.ok(
      container.textContent?.includes("Only replaces your dark palette"),
    );
    await act(async () => button("Apply dark palette").click());
    assert.deepEqual(applied[2], { palettes: expected, target: "dark" });

    await upload("replacement.png");
    await act(async () => pending[2].resolve(bitmap()));
    assert.deepEqual(
      roleColors(),
      suggested,
      "A new image resets dark assignments",
    );
    await clickLabel("Edit light palette");
    assert.deepEqual(
      roleColors(),
      suggested,
      "A new image resets light assignments",
    );
    await act(async () => button("Apply light palette").click());
    assert.deepEqual(applied[3], {
      palettes: palettesFromImage(colors, suggestImageRoles(colors)),
      target: "light",
    });

    await upload("broken.png");
    await act(async () => pending[3].reject(new Error("Decode error")));
    assert.match(
      container.querySelector('[role="alert"]')!.textContent!,
      /could not be read/,
    );
    assert.equal(
      button("Apply light palette").disabled,
      true,
      "A failed upload must not apply stale colors",
    );
    await upload("transparent.png");
    Object.defineProperty(
      dom.window.HTMLCanvasElement.prototype,
      "getContext",
      {
        value: () => ({
          drawImage() {},
          getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        }),
      },
    );
    await act(async () => pending[4].resolve(bitmap()));
    assert.match(
      container.querySelector('[role="alert"]')!.textContent!,
      /transparent/,
    );
    assert.equal(
      closed,
      4,
      "Images are released even when color extraction fails",
    );
    await upload("huge.png");
    await act(async () => pending[5].resolve(bitmap(10000, 10000)));
    assert.match(
      container.querySelector('[role="alert"]')!.textContent!,
      /64 megapixels/,
    );
    assert.equal(closed, 5);
    await upload("cancelled.png");
    await act(async () => button("Cancel").click());
    assert.equal(cancelled, 1);
    await act(async () => root.unmount());
    unmounted = true;
    await act(async () => pending[6].resolve(bitmap()));
    assert.equal(
      closed,
      6,
      "Closing the dialog during decoding still releases the eventual image",
    );
    assert.equal(applied.length, 4, "Cancel never applies a palette");
  } finally {
    if (!unmounted) await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
