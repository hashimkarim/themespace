// End-to-end check in a real Chromium with the built extension loaded.
// Usage: npm run build && node tests/e2e.mjs [path-to-chromium]
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const executablePath = process.argv[2] ?? "/usr/bin/chromium-browser";
const shots = process.env.SHOTS ?? (await mkdtemp(join(tmpdir(), "ts-e2e-")));
await mkdir(shots, { recursive: true });

const lightSite = `<!doctype html><html><head><title>Example News</title><style>
body{margin:0;background:#fff;color:#1f2328;font:16px system-ui}
header{background:#f6f8fa;border-bottom:1px solid #d1d9e0;padding:16px 24px}
main{padding:24px;max-width:720px}
.card{background:#f6f8fa;border:1px solid #d1d9e0;border-radius:6px;padding:16px;margin:16px 0}
.muted{color:#59636e}
a{color:#0969da}
button{background:#1f6feb;color:#fff;border:0;border-radius:6px;padding:8px 14px}
input{background:#fbfcfd;border:1px solid #d1d9e0;padding:6px}
</style></head><body>
<header><strong>Example News</strong> <a href="#">Home</a> <a href="#">World</a></header>
<main><h1>Scanning a website into a theme</h1>
<p>Body text explains things at length so the scan has plenty of text to weigh, and it keeps going for a while longer.</p>
<p class="muted">Muted supporting text with a date and byline that is long enough to count.</p>
<div class="card"><p>A card with <a href="#">a link inside it</a> and more body copy for weighting purposes.</p>
<button>Subscribe</button> <input placeholder="Email"></div>
<div id="later"></div></main></body></html>`;

const studio = `<!doctype html><html><head><title>ThemeSpace (fake)</title></head><body>
<p id="log">waiting</p><script>
window.received = [];
addEventListener("message", (e) => {
  if (e.source !== window || e.data?.source !== "themespace-companion") return;
  window.received.push(e.data);
  if (e.data.type === "hello" && window.draft) postMessage({source:"themespace-app",type:"draft",theme:window.draft}, location.origin);
  document.getElementById("log").textContent = JSON.stringify(window.received.map(m=>m.type));
});
postMessage({source:"themespace-app",type:"ready"}, location.origin);
</script></body></html>`;

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/themes")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ themes: [] }));
  }
  if (url.pathname.startsWith("/api/session")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ user: null }));
  }
  if (url.pathname.startsWith("/api/draft")) {
    res.writeHead(401, { "content-type": "application/json" });
    return res.end("{}");
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(url.pathname === "/site" ? lightSite : studio);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const site = `http://127.0.0.1:${port}/site`;
const studioUrl = `http://localhost:${port}`;

const extension = join(root, "dist/chrome");
const context = await chromium.launchPersistentContext(
  await mkdtemp(join(tmpdir(), "ts-profile-")),
  {
    executablePath,
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    viewport: { width: 900, height: 700 },
  },
);
let failures = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log("✔", name);
  } catch (error) {
    failures++;
    console.log("✖", name, "\n ", error.message);
  }
};
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(site);
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  const tabId = await popup.evaluate(
    async (url) => (await chrome.tabs.query({ url })).at(0).id,
    site,
  );
  const call = (message) =>
    popup.evaluate(async (m) => {
      const r = await chrome.runtime.sendMessage(m);
      if (!r.ok) throw new Error(r.error);
      return r.value;
    }, message);
  await call({ type: "set-server", server: studioUrl });

  const original = await page.screenshot({
    path: join(shots, "1-original.png"),
  });
  let picked;
  await check("scan picks up the site's own colors", async () => {
    picked = await call({ type: "scan", tabId });
    const p = picked.modes[picked.defaultAppearance];
    assert.equal(picked.defaultAppearance, "light");
    assert.equal(p.background, "#ffffff");
    assert.equal(p.foreground, "#1f2328");
    assert.equal(p.surface, "#f6f8fa");
    assert.equal(p.accent, "#0969da");
    assert.equal(p.overrides.accentFill, "#1f6feb");
    assert.equal(p.overrides.border, "#d1d9e0");
  });
  await check(
    "applying the site's own theme leaves it pixel-identical",
    async () => {
      await call({
        type: "preview",
        tabId,
        entry: { ref: { kind: "picked", id: picked.id }, theme: picked },
        appearance: "auto",
      });
      const same = await page.screenshot({
        path: join(shots, "2-identity.png"),
      });
      assert.ok(same.equals(original), "screenshots differ");
    },
  );
  const dark = structuredClone(picked);
  dark.id = "night";
  dark.name = "Night";
  dark.defaultAppearance = "dark";
  dark.modes.dark = {
    background: "#10131a",
    surface: "#1a1f2b",
    foreground: "#e8ebf2",
    accent: "#9ab4ff",
    muted: "#9aa3b5",
    success: "#63ce9b",
    warning: "#e6bd71",
    error: "#ed8a96",
    overrides: {
      accentFill: "#c9f438",
      accentForeground: "#101320",
      border: "#2c3343",
    },
  };
  await check("another theme recolors the page onto its roles", async () => {
    await call({
      type: "preview",
      tabId,
      entry: { ref: { kind: "picked", id: "night" }, theme: dark },
      appearance: "dark",
    });
    await page.screenshot({ path: join(shots, "3-night.png") });
    const colors = await page.evaluate(() => ({
      page: getComputedStyle(document.documentElement).backgroundColor,
      text: getComputedStyle(document.querySelector("h1")).color,
      button: getComputedStyle(document.querySelector("button"))
        .backgroundColor,
      link: getComputedStyle(document.querySelector("a")).color,
    }));
    assert.equal(colors.page, "rgb(16, 19, 26)");
    assert.equal(colors.text, "rgb(232, 235, 242)");
    assert.equal(colors.button, "rgb(201, 244, 56)");
    assert.equal(colors.link, "rgb(154, 180, 255)");
  });
  await check("content added later is themed too", async () => {
    await page.evaluate(() => {
      document.getElementById("later").innerHTML =
        '<div class="card"><p>Late card</p></div>';
    });
    await page.waitForTimeout(150);
    const bg = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector("#later .card"))
          .backgroundColor,
    );
    assert.notEqual(bg, "rgb(246, 248, 250)");
  });
  await check("revert restores the page exactly", async () => {
    await page.evaluate(
      () => (document.getElementById("later").innerHTML = ""),
    );
    await call({ type: "revert", tabId });
    const back = await page.screenshot({ path: join(shots, "4-reverted.png") });
    assert.ok(back.equals(original), "screenshots differ after revert");
  });
  await check(
    "the editor's live draft reaches the library and updates previews",
    async () => {
      const studioPage = await context.newPage();
      await studioPage.goto(studioUrl);
      await studioPage.evaluate((theme) => {
        window.postMessage(
          { source: "themespace-app", type: "draft", theme },
          location.origin,
        );
      }, dark);
      await studioPage.waitForTimeout(400);
      const lib = await call({ type: "library" });
      assert.equal(lib.studio?.theme.name, "Night");
      assert.equal(lib.studio.live, true);
      await call({
        type: "preview",
        tabId,
        entry: { ref: { kind: "studio" }, theme: lib.studio.theme },
        appearance: "dark",
      });
      const edited = structuredClone(dark);
      edited.modes.dark.background = "#2a0f1f";
      await studioPage.evaluate((theme) => {
        window.postMessage(
          { source: "themespace-app", type: "draft", theme },
          location.origin,
        );
      }, edited);
      await page.waitForTimeout(700);
      const bg = await page.evaluate(
        () => getComputedStyle(document.documentElement).backgroundColor,
      );
      assert.equal(
        bg,
        "rgb(42, 15, 31)",
        "live edit reached the previewed site",
      );
      await call({ type: "revert", tabId });
      await studioPage.close();
    },
  );
  await check(
    "open in ThemeSpace hands the picked theme to the site",
    async () => {
      const opened = context.waitForEvent("page");
      await call({ type: "publish", theme: picked });
      const tab = await opened;
      await tab.waitForLoadState();
      await tab.waitForFunction(
        () => window.received?.some((m) => m.type === "import"),
        null,
        { timeout: 5000 },
      );
      const imported = await tab.evaluate(
        () => window.received.find((m) => m.type === "import").theme,
      );
      assert.equal(imported.name, picked.name);
      assert.ok(tab.url().includes("companion=import"));
    },
  );
  await check("other pages can't drive the bridge", async () => {
    // A cross-origin frame posting app messages is ignored.
    const studioPage = await context.newPage();
    await studioPage.goto(studioUrl);
    await studioPage.evaluate((port) => {
      const f = document.createElement("iframe");
      f.src = `http://127.0.0.1:${port}/site`;
      document.body.append(f);
    }, port);
    await studioPage.waitForTimeout(300);
    await studioPage.frames()[1].evaluate(() => {
      window.parent.postMessage(
        { source: "themespace-app", type: "draft", theme: { name: "evil" } },
        "*",
      );
    });
    await studioPage.waitForTimeout(400);
    const lib = await call({ type: "library" });
    assert.equal(lib.studio.theme.name, "Night");
  });
  await popup.setViewportSize({ width: 360, height: 640 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForTimeout(500);
  await popup.screenshot({ path: join(shots, "5-popup.png") });
} finally {
  await context.close();
  server.close();
}
console.log(`screenshots: ${shots}`);
process.exit(failures ? 1 : 0);
