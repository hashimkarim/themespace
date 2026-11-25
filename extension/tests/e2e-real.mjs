// Apply, revert, and scan on real public sites with a test-only build that has broad host access.
// Usage: npm run build && node tests/e2e-real.mjs [urls...]
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { cp, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Pixel diffs use the web app's sharp; this script is a dev tool, not a dependency.
const sharp = createRequire(join(root, "../web/package.json"))("sharp");
async function changed(a, b) {
  const [x, y] = await Promise.all(
    [a, b].map((buf) => sharp(buf).raw().toBuffer()),
  );
  let n = 0;
  for (let i = 0; i < x.length; i += 3)
    if (
      Math.abs(x[i] - y[i]) +
        Math.abs(x[i + 1] - y[i + 1]) +
        Math.abs(x[i + 2] - y[i + 2]) >
      24
    )
      n++;
  return n;
}
const shots = process.env.SHOTS ?? (await mkdtemp(join(tmpdir(), "ts-real-")));
await mkdir(shots, { recursive: true });
const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "https://developer.mozilla.org/en-US/docs/Web/CSS",
      "https://news.ycombinator.com",
      "https://en.wikipedia.org/wiki/Color",
      "https://github.com/microsoft/vscode",
      "https://ui.shadcn.com",
    ];
const ext = await mkdtemp(join(tmpdir(), "ts-ext-"));
await cp(join(root, "dist/chrome"), ext, { recursive: true });
const manifest = JSON.parse(await readFile(join(ext, "manifest.json"), "utf8"));
manifest.host_permissions = ["<all_urls>"];
await writeFile(join(ext, "manifest.json"), JSON.stringify(manifest));

const night = {
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
const context = await chromium.launchPersistentContext(
  await mkdtemp(join(tmpdir(), "ts-profile-")),
  {
    executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium-browser",
    headless: true,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
    viewport: { width: 1100, height: 760 },
  },
);
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  const call = (m) =>
    popup.evaluate(async (m) => {
      const r = await chrome.runtime.sendMessage(m);
      if (!r.ok) throw new Error(r.error);
      return r.value;
    }, m);
  for (const [i, url] of urls.entries()) {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(2500);
      const tabId = await popup.evaluate(
        async (u) =>
          (await chrome.tabs.query({})).find((t) =>
            t.url?.startsWith(u.slice(0, 30)),
          )?.id,
        url,
      );
      const host = new URL(url).hostname;
      await page.screenshot({
        path: join(shots, `${i}-${host}-a-original.png`),
      });
      const before = await page.screenshot();
      await page.waitForTimeout(1600);
      const churn = await changed(before, await page.screenshot());
      const scanned = await call({ type: "scan", tabId });
      const theme = structuredClone(scanned);
      theme.id = "night";
      theme.name = "Night";
      theme.defaultAppearance = "dark";
      theme.modes.dark = night;
      const t0 = Date.now();
      const status = await call({
        type: "preview",
        tabId,
        entry: { ref: { kind: "picked", id: "night" }, theme },
        appearance: "dark",
      });
      const took = Date.now() - t0;
      await page.waitForTimeout(800);
      if (process.env.DEBUG_SELECTOR)
        console.log(
          await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el
              ? `${sel}: inline="${el.getAttribute("style")}" bg=${getComputedStyle(el).backgroundColor} visible=${document.visibilityState}`
              : "missing";
          }, process.env.DEBUG_SELECTOR),
        );
      await page.screenshot({ path: join(shots, `${i}-${host}-b-night.png`) });
      await call({ type: "revert", tabId });
      await page.waitForTimeout(800);
      const after = await page.screenshot({
        path: join(shots, `${i}-${host}-c-reverted.png`),
      });
      const p = scanned.modes[scanned.defaultAppearance];
      console.log(
        `${host}: tier=${status.tier} apply=${took}ms revertDiff=${await changed(before, after)}px pageChurn=${churn}px scan=${scanned.defaultAppearance} bg=${p.background} fg=${p.foreground} accent=${p.accent} fill=${p.overrides.accentFill ?? "-"} border=${p.overrides.border ?? "-"}`,
      );
    } catch (error) {
      console.log(`${url}: ERROR ${error.message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await context.close();
}
console.log(`screenshots: ${shots}`);
