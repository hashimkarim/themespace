import assert from "node:assert/strict";
import { test } from "node:test";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import {
  extractImagePalette,
  IMAGE_PALETTE_MAX_BYTES,
} from "../lib/image-palette";
import {
  palettesFromColors,
  type GeneratedPalettes,
} from "../lib/palette-tools";

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

test("image picker previews before applying, handles replacement uploads and errors, and releases image resources", async () => {
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
  const applied: { palettes: GeneratedPalettes; both: boolean }[] = [];
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
          onApply: (palettes, both) => applied.push({ palettes, both }),
          onCancel: () => {
            cancelled++;
          },
        }),
      ),
    );
    assert.equal(button("Apply palette").disabled, true);
    await upload("first.png");
    await upload("second.png");
    assert.equal(button("Apply palette").disabled, true);
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
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Use #3366cc as accent"]',
        )!
        .click(),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Preview light palette"]',
        )!
        .click(),
    );
    const expected = palettesFromColors(["#ffaa33", "#3366cc"], 1);
    assert.equal(
      container.querySelector<HTMLElement>(".image-palette-preview")!.style
        .background,
      `rgb(${parseInt(expected.light.background.slice(1, 3), 16)}, ${parseInt(expected.light.background.slice(3, 5), 16)}, ${parseInt(expected.light.background.slice(5, 7), 16)})`,
    );
    await act(async () =>
      container
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click(),
    );
    assert.ok(
      container.textContent?.includes("Only replaces your dark palette"),
    );
    assert.equal(
      applied.length,
      0,
      "Changing the preview and accent must not edit the draft",
    );
    await act(async () => button("Apply palette").click());
    assert.deepEqual(applied, [{ palettes: expected, both: false }]);

    await upload("broken.png");
    await act(async () => pending[2].reject(new Error("Decode error")));
    assert.match(
      container.querySelector('[role="alert"]')!.textContent!,
      /could not be read/,
    );
    assert.equal(
      button("Apply palette").disabled,
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
    await act(async () => pending[3].resolve(bitmap()));
    assert.match(
      container.querySelector('[role="alert"]')!.textContent!,
      /transparent/,
    );
    assert.equal(
      closed,
      3,
      "Images are released even when color extraction fails",
    );
    await upload("huge.png");
    await act(async () => pending[4].resolve(bitmap(10000, 10000)));
    assert.match(
      container.querySelector('[role="alert"]')!.textContent!,
      /64 megapixels/,
    );
    assert.equal(closed, 4);
    await upload("cancelled.png");
    await act(async () => button("Cancel").click());
    assert.equal(cancelled, 1);
    await act(async () => root.unmount());
    unmounted = true;
    await act(async () => pending[5].resolve(bitmap()));
    assert.equal(
      closed,
      5,
      "Closing the dialog during decoding still releases the eventual image",
    );
    assert.equal(applied.length, 1, "Cancel never applies a palette");
  } finally {
    if (!unmounted) await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
