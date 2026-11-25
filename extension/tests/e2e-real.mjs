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
/** Share of pixels whose lightness passes a test. */
async function share(buf, test) {
  const x = await sharp(buf).raw().toBuffer();
  let n = 0;
  for (let i = 0; i < x.length; i += 3) {
    const l =
      (Math.max(x[i], x[i + 1], x[i + 2]) +
        Math.min(x[i], x[i + 1], x[i + 2])) /
      510;
    if (test(l)) n++;
  }
  return n / (x.length / 3);
}
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
      "https://linear.app",
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
const paper = {
  background: "#fbf8f2",
  surface: "#f1ece2",
  foreground: "#22201c",
  accent: "#9a3412",
  muted: "#6b655c",
  success: "#24704d",
  warning: "#886014",
  error: "#ad3548",
  overrides: {
    accentFill: "#c2410c",
    accentForeground: "#ffffff",
    border: "#ddd5c7",
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
      const own = scanned.defaultAppearance;
      const p = scanned.modes[own];
      // The site's own scan must leave it as it was (beyond what the page changes by itself).
      await call({
        type: "preview",
        tabId,
        entry: { ref: { kind: "picked", id: scanned.id }, theme: scanned },
        appearance: "auto",
      });
      await page.waitForTimeout(800);
      const identityDiff = await changed(before, await page.screenshot());
      // Then the opposite appearance: a dark theme on light sites, a light theme on dark ones.
      const theme = structuredClone(scanned);
      theme.id = "probe";
      theme.name = own === "light" ? "Night" : "Paper";
      theme.defaultAppearance = own === "light" ? "dark" : "light";
      theme.modes[theme.defaultAppearance] = own === "light" ? night : paper;
      const t0 = Date.now();
      const status = await call({
        type: "preview",
        tabId,
        entry: { ref: { kind: "picked", id: "probe" }, theme },
        appearance: theme.defaultAppearance,
      });
      const took = Date.now() - t0;
      await page.waitForTimeout(800);
      const themed = await page.screenshot({
        path: join(shots, `${i}-${host}-b-${theme.name.toLowerCase()}.png`),
      });
      const wrongSide = await share(
        themed,
        theme.defaultAppearance === "dark" ? (l) => l > 0.75 : (l) => l < 0.25,
      );
      if (process.env.PROBE)
        console.log(
          await page.evaluate(([x, y]) => {
            const out = [];
            for (
              let el = document.elementFromPoint(x, y);
              el;
              el = el.parentElement
            ) {
              const s = getComputedStyle(el);
              out.push(
                `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${[...el.classList].slice(0, 3).join(".")} bg=${s.backgroundColor} color=${s.color} fill=${s.webkitTextFillColor} inline="${(el.getAttribute("style") ?? "").slice(0, 90)}"`,
              );
              if (out.length > 6) break;
            }
            return out.join("\n");
          }, process.env.PROBE.split(",").map(Number)),
        );
      await call({ type: "revert", tabId });
      await page.waitForTimeout(800);
      const after = await page.screenshot({
        path: join(shots, `${i}-${host}-c-reverted.png`),
      });
      console.log(
        `${host} [${status.tier}, ${took}ms] churn=${churn}px identity=${identityDiff}px revert=${await changed(before, after)}px ${theme.name}: ${(wrongSide * 100).toFixed(1)}% of viewport still ${own}`,
      );
      console.log(
        `  picked ${own}: bg=${p.background} surface=${p.surface} fg=${p.foreground} muted=${p.muted} accent=${p.accent} fill=${p.overrides.accentFill ?? "-"} fillText=${p.overrides.accentForeground ?? "-"} border=${p.overrides.border ?? "-"}`,
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
