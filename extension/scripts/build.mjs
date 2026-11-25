// Builds unpacked extensions for Chromium (dist/chrome) and Firefox (dist/firefox).
import { build, context } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const sites = [
  "https://themespace.app/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
];

const manifest = (browser) => ({
  manifest_version: 3,
  name: "ThemeSpace Companion",
  version: pkg.version,
  description:
    "See websites in your ThemeSpace themes, pick up a site's colors as a theme, and sync with themespace.app.",
  icons: {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  },
  action: {
    default_title: "ThemeSpace",
    default_popup: "popup.html",
    default_icon: { 16: "icons/icon-16.png", 32: "icons/icon-32.png" },
  },
  // activeTab covers one-off previews and scans; per-site access is asked for only when pinning.
  permissions: ["storage", "activeTab", "scripting"],
  host_permissions: sites,
  optional_host_permissions: ["https://*/*", "http://*/*"],
  content_scripts: [
    { matches: sites, js: ["bridge.js"], run_at: "document_start" },
  ],
  ...(browser === "firefox"
    ? {
        background: { scripts: ["background.js"] },
        browser_specific_settings: {
          gecko: {
            id: "companion@themespace.app",
            strict_min_version: "128.0",
          },
        },
      }
    : {
        background: { service_worker: "background.js" },
        minimum_chrome_version: "116",
      }),
});

const options = {
  entryPoints: {
    background: join(root, "src/background.ts"),
    engine: join(root, "src/content/engine.ts"),
    bridge: join(root, "src/bridge.ts"),
    popup: join(root, "src/popup/popup.ts"),
  },
  bundle: true,
  format: "iife",
  target: ["chrome116", "firefox128"],
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
};

async function assemble(browser) {
  const out = join(root, "dist", browser);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(join(root, "static"), out, { recursive: true });
  await cp(join(root, "src/popup/popup.html"), join(out, "popup.html"));
  await cp(join(root, "src/popup/popup.css"), join(out, "popup.css"));
  await writeFile(
    join(out, "manifest.json"),
    JSON.stringify(manifest(browser), null, 2),
  );
  return out;
}

for (const browser of ["chrome", "firefox"]) {
  const outdir = await assemble(browser);
  if (watch) await (await context({ ...options, outdir })).watch();
  else await build({ ...options, outdir });
}
