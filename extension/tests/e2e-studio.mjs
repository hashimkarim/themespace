// Bridge ⇄ real ThemeSpace editor. Usage: node tests/e2e-studio.mjs http://localhost:5391
import { chromium } from "playwright-core";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] ?? "http://localhost:5173";
const extension = join(root, "dist/chrome");
const context = await chromium.launchPersistentContext(
  await mkdtemp(join(tmpdir(), "ts-profile-")),
  {
    executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium-browser",
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  },
);
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  const call = (message) =>
    popup.evaluate(async (m) => {
      const r = await chrome.runtime.sendMessage(m);
      if (!r.ok) throw new Error(r.error);
      return r.value;
    }, message);
  await call({ type: "set-server", server: base });
  const editor = await context.newPage();
  await editor.goto(base, { waitUntil: "load", timeout: 120000 });
  // Dev servers can reload the page on first compile; wait for the draft instead of sleeping.
  let lib;
  for (let i = 0; i < 40 && !lib?.studio?.live; i++) {
    await editor.waitForTimeout(500);
    lib = await call({ type: "library" });
  }
  assert.ok(lib.studio?.live, "editor draft reached the extension");
  console.log("✔ live editor draft:", lib.studio.theme.name);

  const picked = structuredClone(lib.studio.theme);
  picked.name = "picked.example";
  picked.id = "site-picked-example";
  await call({ type: "publish", theme: picked });
  await editor.waitForTimeout(3000);
  const tab = context
    .pages()
    .find((p) => p.url().startsWith(base) && p !== popup);
  const body = await tab.evaluate(() => document.body.innerText);
  assert.ok(
    body.includes("Picked up picked.example"),
    "editor announced the import",
  );
  assert.ok(!tab.url().includes("companion="), "import query is cleaned up");
  console.log("✔ import landed in the editor:", tab.url());
  await tab.waitForTimeout(800);
  const after = await call({ type: "library" });
  assert.equal(
    after.studio.theme.name,
    "picked.example",
    "imported theme is now the live draft",
  );
  console.log("✔ draft follows the import");
  await tab.screenshot({
    path: process.env.SHOT ?? join(tmpdir(), "studio.png"),
  });
} finally {
  await context.close();
}
