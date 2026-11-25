// Full end-to-end check: Companion extension ⇄ real ThemeSpace web app
// (live draft sync, signed-in session & saved draft, instant import, publish -> Community,
// Send to Companion, and extension ZIP downloads).
// Usage: node tests/e2e-studio.mjs http://127.0.0.1:5173
import { chromium } from "playwright-core";
import { mkdtemp } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] ?? "http://127.0.0.1:5173";
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
  // Wait for Studio to finish opening and announce Companion sync.
  let lib;
  for (let i = 0; i < 40 && !lib?.studio?.live; i++) {
    await editor.waitForTimeout(500);
    lib = await call({ type: "library" });
  }
  assert.ok(lib.studio?.live, "editor draft reached the extension");
  assert.ok(
    lib.community.some((c) => c.preset),
    "starter palettes are available in Community",
  );
  await editor.getByText("Companion synced · live draft").waitFor({ timeout: 5000 });
  console.log("✔ live editor draft & Studio indicator:", lib.studio.theme.name);

  // 1. Live import into the already-open Studio tab (no reload, undo preserved).
  const picked = structuredClone(lib.studio.theme);
  picked.name = "picked.example";
  picked.id = "site-picked-example";
  picked.author = "Companion Tester";
  await call({ type: "publish", theme: picked });
  await editor.getByText(/Picked up picked\.example/).waitFor({ timeout: 10000 });
  assert.ok(!editor.url().includes("companion="), "import query stays clean");
  await editor.waitForTimeout(500);
  const afterImport = await call({ type: "library" });
  assert.equal(
    afterImport.studio.theme.name,
    "picked.example",
    "imported theme is now the live draft",
  );
  console.log("✔ instant live import landed in Studio");

  // 2. Sign up a real account inside the browser and verify extension reads session + saved draft.
  const email = `companion-${crypto.randomUUID()}@example.invalid`;
  const password = randomBytes(16).toString("base64url");
  const signUpOk = await editor.evaluate(
    async ({ email, password }) => {
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Companion User", email, password }),
      });
      return res.ok;
    },
    { email, password },
  );
  assert.ok(signUpOk, "signed up test account");
  await editor.reload({ waitUntil: "load" });
  await editor.waitForTimeout(1500);

  // Check popup displays signed-in displayName and links to /account.
  await popup.reload();
  await popup.waitForTimeout(500);
  assert.equal(
    await popup.locator("#account").textContent(),
    "Companion User",
    "popup displays signed-in user's displayName",
  );
  assert.ok(
    (await popup.locator("#account").getAttribute("href"))?.endsWith("/account"),
    "signed-in account link opens /account",
  );
  console.log("✔ signed-in session synced to extension popup");

  // Re-import picked theme now that we're signed in, wait for autosave to /api/draft, then publish.
  await call({ type: "publish", theme: picked });
  await editor.getByText(/Picked up picked\.example/).waitFor({ timeout: 10000 });
  await editor.getByText("All changes saved").waitFor({ timeout: 10000 });
  // Clear local studio cache and verify extension reads saved account draft from /api/draft!
  await popup.evaluate(() => chrome.storage.local.remove("studio"));
  const savedLib = await call({ type: "library" });
  assert.equal(savedLib.user?.displayName, "Companion User");
  assert.equal(savedLib.studio?.live, false);
  assert.equal(savedLib.studio?.theme.name, "picked.example");
  console.log("✔ signed-in saved draft fetched from /api/draft");

  // Publish the picked theme through the real Studio UI and verify it appears in Community.
  await editor.getByRole("button", { name: "Publish theme" }).click();
  await editor.getByRole("button", { name: "Publish this version" }).click();
  await editor.getByText(/Published picked\.example/).waitFor({ timeout: 10000 });
  const publishedLib = await call({ type: "library" });
  assert.ok(
    publishedLib.community.some(
      (c) => !c.preset && c.theme.name === "picked.example",
    ),
    "published theme appears in extension Community library",
  );
  console.log("✔ published picked theme appears in extension Community");

  // 3. Test "Save to Companion" button on the published theme detail page.
  await editor.getByRole("button", { name: "Save to Companion" }).click();
  await editor.getByText(/picked\.example saved to ThemeSpace Companion/).waitFor({
    timeout: 5000,
  });
  const afterSave = await call({ type: "library" });
  assert.ok(
    afterSave.picked.some((t) => t.name === "picked.example"),
    "Save to Companion stored theme in extension",
  );
  console.log("✔ Save to Companion synced theme back to extension");

  // 4. Verify /integrations shows Connected status and serves both extension ZIPs.
  await editor.getByRole("link", { name: "Integrations" }).click();
  await editor.getByText("Connected · syncing live draft").waitFor({
    timeout: 5000,
  });
  for (const name of [
    "themespace-companion-chrome.zip",
    "themespace-companion-firefox.zip",
  ]) {
    const res = await fetch(`${base}/downloads/${name}`);
    assert.equal(res.status, 200, `${name} downloadable`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.equal(bytes[0], 0x50, `${name} starts with ZIP magic P`);
    assert.equal(bytes[1], 0x4b, `${name} starts with ZIP magic K`);
    assert.ok(bytes.length > 5000, `${name} is non-empty (${bytes.length} bytes)`);
  }
  console.log("✔ /integrations connected badge & Chrome/Firefox ZIP downloads verified");

  await editor.screenshot({
    path: process.env.SHOT ?? join(tmpdir(), "studio.png"),
  });
} finally {
  await context.close();
}
