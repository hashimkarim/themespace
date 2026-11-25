// Captures store listing screenshots (1280x800) and Chrome small promo tile (440x280)
// into extension/store/assets/.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "store/assets");
await mkdir(outDir, { recursive: true });

// Minimal realistic documentation/article page for the recolor + popup screenshot.
const sampleSiteHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Acme Docs — Design Tokens</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#ffffff;color:#1f2328;font:16px/1.6 Inter,system-ui,sans-serif}
  header{display:flex;align-items:center;justify-content:space-between;padding:16px 36px;background:#f6f8fa;border-bottom:1px solid #d1d9e0}
  .brand{font-weight:700;font-size:18px;letter-spacing:-0.3px}
  nav{display:flex;gap:24px;font-size:14px}
  nav a{color:#59636e;text-decoration:none}
  nav a.active{color:#0969da;font-weight:600}
  .layout{display:grid;grid-template-columns:230px minmax(0,1fr);max-width:1180px;margin:0 auto;padding:28px 36px;gap:36px}
  aside{border-right:1px solid #d1d9e0;padding-right:24px}
  aside h4{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#59636e}
  aside ul{list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:8px;font-size:14px}
  aside a{color:#1f2328;text-decoration:none}
  aside a.current{color:#0969da;font-weight:600}
  h1{margin:0 0 10px;font-size:34px;letter-spacing:-0.8px}
  .lead{color:#59636e;font-size:17px;margin:0 0 24px}
  .card{background:#f6f8fa;border:1px solid #d1d9e0;border-radius:12px;padding:20px 24px;margin:20px 0}
  .card h3{margin:0 0 8px;font-size:16px}
  .card p{margin:0 0 14px;color:#59636e;font-size:14px}
  .actions{display:flex;gap:12px;align-items:center}
  button.primary{background:#1f6feb;color:#ffffff;border:0;border-radius:8px;padding:9px 16px;font-weight:600;font-size:14px}
  button.secondary{background:#ffffff;color:#1f2328;border:1px solid #d1d9e0;border-radius:8px;padding:9px 16px;font-size:14px}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:20px}
  .metric{background:#f6f8fa;border:1px solid #d1d9e0;border-radius:10px;padding:16px}
  .metric strong{display:block;font-size:24px;margin-bottom:2px}
  .metric span{font-size:13px;color:#59636e}
</style></head>
<body>
<header>
  <div class="brand">Acme Docs</div>
  <nav><a href="#" class="active">Guides</a><a href="#">Components</a><a href="#">Tokens</a><a href="#">Changelog</a></nav>
</header>
<div class="layout">
  <aside>
    <h4>Getting started</h4>
    <ul><li><a href="#" class="current">Color tokens</a></li><li><a href="#">Typography</a></li><li><a href="#">Dark appearance</a></li><li><a href="#">Accessibility</a></li></ul>
    <h4>Integrations</h4>
    <ul><li><a href="#">CSS Variables</a></li><li><a href="#">Tailwind v4</a></li><li><a href="#">shadcn/ui</a></li></ul>
  </aside>
  <main>
    <h1>Color tokens across every surface</h1>
    <p class="lead">Every website defines its own palette. With ThemeSpace Companion, you can bring your personal theme to any page—or pick up a site's palette in one click.</p>
    <div class="card">
      <h3>Preview your live Studio draft</h3>
      <p>Edit a swatch in ThemeSpace Studio and watch previewed tabs update automatically with preserved contrast and clean revert.</p>
      <div class="actions"><button class="primary">Apply theme</button><button class="secondary">Inspect tokens</button> <a href="#" style="color:#0969da;font-size:14px">Learn more →</a></div>
    </div>
    <div class="grid">
      <div class="metric"><strong>4.5:1+</strong><span>Contrast preserved automatically</span></div>
      <div class="metric"><strong>1 click</strong><span>Revert to original site colors</span></div>
    </div>
  </main>
</div>
</body></html>`;

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(sampleSiteHtml);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const siteUrl = `http://127.0.0.1:${port}/`;

const profile = await mkdtemp(join(tmpdir(), "ts-assets-"));
const extDir = join(root, "dist/chrome");
const context = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium-browser",
  headless: true,
  viewport: { width: 1280, height: 800 },
  args: [
    `--disable-extensions-except=${extDir}`,
    `--load-extension=${extDir}`,
  ],
});

try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;

  // 1. Live Studio sync screenshot (1280x800) against live themespace.app.
  const studio = await context.newPage();
  await studio.setViewportSize({ width: 1280, height: 800 });
  await studio.goto("https://themespace.app/", {
    waitUntil: "load",
    timeout: 60000,
  });
  await studio
    .getByText("Companion synced · live draft")
    .waitFor({ timeout: 15000 });
  await studio.waitForTimeout(500);
  await studio.screenshot({ path: join(outDir, "2-live-studio-sync.png") });
  console.log("✔ 2-live-studio-sync.png");

  // 2. Integrations page with Connected badge (1280x800).
  await studio.getByRole("link", { name: "Integrations" }).click();
  await studio
    .getByText("Connected · syncing live draft")
    .waitFor({ timeout: 10000 });
  await studio.waitForTimeout(400);
  await studio.screenshot({
    path: join(outDir, "4-integrations-connected.png"),
  });
  console.log("✔ 4-integrations-connected.png");

  // 3. Recolored site + real Companion popup composite (1280x800) and Picked-up popup (1280x800).
  const site = await context.newPage();
  await site.setViewportSize({ width: 1280, height: 800 });
  await site.goto(siteUrl);

  const helper = await context.newPage();
  await helper.goto(`chrome-extension://${id}/popup.html`);
  const call = (m) =>
    helper.evaluate(async (msg) => {
      const r = await chrome.runtime.sendMessage(msg);
      if (!r.ok) throw new Error(r.error);
      return r.value;
    }, m);
  const siteTabId = await helper.evaluate(
    async (u) => (await chrome.tabs.query({ url: u })).at(0).id,
    siteUrl,
  );
  const lib = await call({ type: "library" });
  const lamplight =
    lib.community.find((c) => c.theme.name === "Lamplight") ?? lib.community[0];

  // Capture light original site + popup picking up its colors.
  const popupUi = await context.newPage();
  await popupUi.setViewportSize({ width: 360, height: 610 });
  await popupUi.goto(`chrome-extension://${id}/popup.html?tab=${siteTabId}`);
  await popupUi.waitForTimeout(400);
  await popupUi.getByText("Pick up this site's theme").click();
  await popupUi.locator("#picked-result").waitFor({ state: "visible" });
  await popupUi.evaluate(() => {
    document.getElementById("server-change")?.remove();
    const host = document.getElementById("host");
    if (host) host.textContent = "docs.acme.dev";
    const name = document.getElementById("picked-name");
    if (name) name.textContent = "docs.acme.dev";
  });
  await popupUi.waitForTimeout(100);
  const pickedPopupBuf = await popupUi.screenshot();
  const originalSiteBuf = await site.screenshot();

  // Apply Lamplight / dark theme to sample site and capture themed site + popup.
  await call({
    type: "preview",
    tabId: siteTabId,
    entry: {
      ref: { kind: "public", id: lamplight.id },
      theme: lamplight.theme,
    },
    appearance: "dark",
  });
  await site.waitForTimeout(200);
  await popupUi.reload();
  await popupUi.waitForTimeout(400);
  await popupUi.evaluate(() => {
    document.getElementById("server-change")?.remove();
    const host = document.getElementById("host");
    if (host) host.textContent = "docs.acme.dev";
  });
  await popupUi.waitForTimeout(100);
  const themedPopupBuf = await popupUi.screenshot();
  const themedSiteBuf = await site.screenshot();

  const compose = async (bgBuf, popBuf, dest) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setContent(`<!doctype html><html><body style="margin:0;width:1280px;height:800px;position:relative;overflow:hidden;background:#0f1117">
      <img src="data:image/png;base64,${bgBuf.toString("base64")}" style="width:1280px;height:800px;display:block">
      <img src="data:image/png;base64,${popBuf.toString("base64")}" style="position:absolute;top:24px;right:24px;width:360px;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.12)">
    </body></html>`);
    await page.screenshot({ path: dest });
    await page.close();
  };
  await compose(
    themedSiteBuf,
    themedPopupBuf,
    join(outDir, "1-recolor-sites.png"),
  );
  console.log("✔ 1-recolor-sites.png");
  await compose(
    originalSiteBuf,
    pickedPopupBuf,
    join(outDir, "3-pick-up-theme.png"),
  );
  console.log("✔ 3-pick-up-theme.png");

  // 4. Chrome Web Store small promo tile (440x280).
  const iconB64 = (
    await readFile(join(root, "static/icons/icon-128.png"))
  ).toString("base64");
  const promo = await context.newPage();
  await promo.setViewportSize({ width: 440, height: 280 });
  await promo.setContent(`<!doctype html><html><body style="margin:0;width:440px;height:280px;background:radial-gradient(circle at 85% 20%, #2a243f 0%, #13151d 65%);color:#eef0f5;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;padding:28px 30px;box-sizing:border-box">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="data:image/png;base64,${iconB64}" width="40" height="40" style="border-radius:10px">
      <div>
        <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#9aa1b2;font-weight:600">themespace.app</div>
        <div style="font-size:21px;font-weight:700;letter-spacing:-0.4px">ThemeSpace Companion</div>
      </div>
    </div>
    <p style="margin:0;font-size:14px;line-height:1.45;color:#cfd4e2;max-width:360px">
      Theme any website with your personal palettes, sync live with Studio, and pick up colors from sites you love.
    </p>
    <div style="display:flex;gap:8px;align-items:center">
      ${["#14110d", "#1c1813", "#f2a53b", "#8ea7ff", "#63ce9b", "#ed8a96"]
        .map(
          (c) =>
            `<span style="width:44px;height:22px;border-radius:6px;background:${c};border:1px solid rgba(255,255,255,0.14)"></span>`,
        )
        .join("")}
    </div>
  </body></html>`);
  await promo.screenshot({ path: join(outDir, "promo-440x280.png") });
  await promo.close();
  console.log("✔ promo-440x280.png");
} finally {
  await context.close();
  server.close();
  await rm(profile, { recursive: true, force: true });
}
