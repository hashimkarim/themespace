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
body,a,button,.card,header{transition:color .4s,background-color .4s,border-color .4s}
.alert{background:#d1242f;color:#fff;padding:6px 10px;border-radius:6px}
footer{background:#24292f;color:#fff;padding:6px 24px;font-size:13px}
</style></head><body>
<header><strong>Example News</strong> <a href="#">Home</a> <a href="#">World</a></header>
<main><h1>Scanning a website into a theme</h1>
<p>Body text explains things at length so the scan has plenty of text to weigh, and it keeps going for a while longer.</p>
<p class="muted">Muted supporting text with a date and byline that is long enough to count.</p>
<div class="card"><p>A card with <a href="#">a link inside it</a> and more body copy for weighting purposes.</p>
<button>Subscribe</button> <input placeholder="Email"></div>
<p class="alert" id="alert">Breaking: an alert banner with white text</p>
<div id="later"></div></main><footer id="footer">Footer text on a dark band</footer></body></html>`;

const tokenPage = (
  title,
  css,
  extra = "",
) => `<!doctype html><html><head><title>${title}</title><style>
${css}
main{padding:24px;font:16px system-ui}
.card{padding:16px;margin:16px 0;border-radius:8px}
</style></head><body><main><h1>${title}</h1>
<p>Body copy long enough to carry weight in the scan, and then a bit more so text is the heaviest color here.</p>
<div class="card"><p>Card content with more words to weigh.</p><button>Primary action</button> <a href="#">A hardcoded link</a></div>
${extra}</main></body></html>`;
const pages = {
  "/tokens-hsl": tokenPage(
    "Bare HSL tokens",
    `:root{--background:0 0% 100%;--foreground:222 47% 11%;--secondary:210 40% 96%;--primary:221 83% 53%;--primary-foreground:0 0% 100%;--border:214 32% 91%;--muted-foreground:215 16% 47%}
body{margin:0;background:hsl(var(--background));color:hsl(var(--foreground))}
.card{background:hsl(var(--secondary));border:1px solid hsl(var(--border))}
button{background:hsl(var(--primary));color:hsl(var(--primary-foreground));border:0;padding:8px 12px;border-radius:6px}
a{color:#7c3aed}`,
  ),
  "/tokens-oklch": tokenPage(
    "Oklch tokens",
    `:root{--background:oklch(1 0 0);--foreground:oklch(0.21 0.03 265);--secondary:oklch(0.97 0.01 265);--primary:oklch(0.55 0.22 265);--primary-foreground:oklch(0.99 0 0);--border:oklch(0.92 0.01 265)}
body{margin:0;background:var(--background);color:var(--foreground)}
.card{background:var(--secondary);border:1px solid var(--border)}
button{background:var(--primary);color:var(--primary-foreground);border:0;padding:8px 12px;border-radius:6px}
a{color:#7c3aed}`,
  ),
  "/tokens-partial": tokenPage(
    "Starter tokens",
    `:root{--background:#ffffff;--foreground:#171717}
body{margin:0;background:var(--background);color:var(--foreground)}
.card{background:#f5f5f5;border:1px solid #e5e5e5}
button{background:#0070f3;color:#fff;border:0;padding:8px 12px;border-radius:6px}
a{color:#0070f3}`,
  ),
};

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
  res.end(
    pages[url.pathname] ?? (url.pathname === "/site" ? lightSite : studio),
  );
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
  await check(
    "alerts keep their hue and every text stays readable",
    async () => {
      await call({
        type: "preview",
        tabId,
        entry: { ref: { kind: "picked", id: "night" }, theme: dark },
        appearance: "dark",
      });
      await page.waitForTimeout(100);
      const read = await page.evaluate(() => {
        const rgb = (v) => v.match(/\d+/g).slice(0, 3).map(Number);
        const lum = (c) => {
          const [r, g, b] = c.map((x) => {
            x /= 255;
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const ratio = (a, b) => {
          const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
          return (x + 0.05) / (y + 0.05);
        };
        const pair = (sel) => {
          const s = getComputedStyle(document.querySelector(sel));
          return {
            bg: rgb(s.backgroundColor),
            fg: rgb(s.color),
            ratio: ratio(rgb(s.backgroundColor), rgb(s.color)),
          };
        };
        return { alert: pair("#alert"), footer: pair("#footer") };
      });
      const [r, g, b] = read.alert.bg;
      assert.ok(r > g + 60 && r > b + 60, `alert stays red: ${read.alert.bg}`);
      assert.ok(
        read.alert.ratio >= 4.5,
        `alert text contrast ${read.alert.ratio.toFixed(2)}`,
      );
      assert.ok(
        read.footer.ratio >= 4.5,
        `footer text contrast ${read.footer.ratio.toFixed(2)}`,
      );
      await page.screenshot({ path: join(shots, "3b-night-alerts.png") });
    },
  );
  await check(
    "switching themes and scanning while themed use the site's own colors",
    async () => {
      const rose = structuredClone(dark);
      rose.id = "rose";
      rose.name = "Rose";
      rose.modes.dark = {
        ...dark.modes.dark,
        background: "#1d1015",
        surface: "#2a1820",
        overrides: { ...dark.modes.dark.overrides, accentFill: "#ff7ab6" },
      };
      await call({
        type: "preview",
        tabId,
        entry: { ref: { kind: "picked", id: "rose" }, theme: rose },
        appearance: "dark",
      });
      const colors = await page.evaluate(() => ({
        page: getComputedStyle(document.documentElement).backgroundColor,
        button: getComputedStyle(document.querySelector("button"))
          .backgroundColor,
        text: getComputedStyle(document.querySelector("h1")).color,
      }));
      assert.equal(colors.page, "rgb(29, 16, 21)");
      assert.equal(colors.button, "rgb(255, 122, 182)");
      assert.equal(
        colors.text,
        "rgb(232, 235, 242)",
        "text isn't remapped twice",
      );
      const again = await call({ type: "scan", tabId });
      assert.deepEqual(
        again.modes.light,
        picked.modes.light,
        "a scan while themed matches the original scan",
      );
      const stillThemed = await page.evaluate(
        () => getComputedStyle(document.documentElement).backgroundColor,
      );
      assert.equal(
        stillThemed,
        "rgb(29, 16, 21)",
        "scanning doesn't revert the theme",
      );
    },
  );
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
  for (const path of Object.keys(pages)) {
    await check(`token site ${path}: identity, theme, and revert`, async () => {
      const tab = await context.newPage();
      const url = `http://127.0.0.1:${port}${path}`;
      await tab.goto(url);
      await tab.bringToFront();
      const id2 = await popup.evaluate(
        async (u) => (await chrome.tabs.query({ url: u })).at(0).id,
        url,
      );
      const before = await tab.screenshot();
      const own = await call({ type: "scan", tabId: id2 });
      await call({
        type: "preview",
        tabId: id2,
        entry: { ref: { kind: "picked", id: own.id }, theme: own },
        appearance: "auto",
      });
      assert.ok(
        (await tab.screenshot()).equals(before),
        "own theme is pixel-identical",
      );
      const status = await call({
        type: "preview",
        tabId: id2,
        entry: { ref: { kind: "picked", id: "night" }, theme: dark },
        appearance: "dark",
      });
      assert.equal(status.tier, "tokens");
      await tab.waitForTimeout(100);
      const c = await tab.evaluate(() => ({
        body: getComputedStyle(document.body).backgroundColor,
        button: getComputedStyle(document.querySelector("button"))
          .backgroundColor,
        link: getComputedStyle(document.querySelector("a")).color,
        text: getComputedStyle(document.querySelector("h1")).color,
      }));
      await tab.screenshot({
        path: join(shots, `7${path.replace(/\//g, "-")}.png`),
      });
      assert.equal(
        c.body,
        "rgb(16, 19, 26)",
        "page token rewritten in a valid format",
      );
      assert.equal(c.text, "rgb(232, 235, 242)");
      assert.notEqual(c.button, "rgb(0, 112, 243)", "buttons are themed");
      assert.notEqual(
        c.link,
        "rgb(124, 58, 237)",
        "hardcoded links are themed too",
      );
      await call({ type: "revert", tabId: id2 });
      assert.ok(
        (await tab.screenshot()).equals(before),
        "revert is pixel-identical",
      );
      await tab.close();
    });
  }
  await check(
    "pinning a theme loads it on every visit, and unpinning stops it",
    async () => {
      const origin = new URL(site).origin;
      await call({
        type: "assign",
        origin,
        assignment: {
          ref: { kind: "picked", id: "night" },
          theme: dark,
          appearance: "dark",
        },
      });
      await page.reload();
      await page.waitForFunction(
        () =>
          getComputedStyle(document.documentElement).backgroundColor ===
          "rgb(16, 19, 26)",
        null,
        { timeout: 5000 },
      );
      const scanned = await call({ type: "scan", tabId });
      assert.deepEqual(
        scanned.modes.light,
        picked.modes.light,
        "scanning a pinned site reads the site",
      );
      assert.equal(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).backgroundColor,
        ),
        "rgb(16, 19, 26)",
        "and leaves the pinned theme on",
      );
      await call({ type: "assign", origin, assignment: null });
      await page.reload();
      await page.waitForTimeout(600);
      assert.ok(
        (await page.screenshot()).equals(original),
        "unpinned site loads with its own colors",
      );
    },
  );
  await check("other localhost pages can't set the studio draft", async () => {
    const other = await context.newPage();
    await other.goto(`http://127.0.0.1:${port}/`);
    await other.evaluate(
      (theme) =>
        window.postMessage(
          {
            source: "themespace-app",
            type: "draft",
            theme: { ...theme, name: "Imposter" },
          },
          location.origin,
        ),
      dark,
    );
    await other.waitForTimeout(500);
    const lib = await call({ type: "library" });
    assert.notEqual(lib.studio?.theme.name, "Imposter");
    await other.close();
  });
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
