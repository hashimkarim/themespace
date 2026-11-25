// Builds unpacked extensions for Chromium (dist/chrome) and Firefox (dist/firefox).
// Pass --pack [dir] to also write zip archives (themespace-companion-{chrome,firefox}.zip).
import { build, context } from "esbuild";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");
// Development builds also sync with local ThemeSpace servers and expose test hooks.
const dev = watch || process.argv.includes("--dev");
const packArg = process.argv.findIndex((a) => a === "--pack");
const packDir =
  packArg !== -1
    ? resolve(
        root,
        process.argv[packArg + 1] && !process.argv[packArg + 1].startsWith("--")
          ? process.argv[packArg + 1]
          : "dist",
      )
    : null;
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const sites = [
  "https://themespace.app/*",
  ...(dev ? ["http://localhost/*", "http://127.0.0.1/*"] : []),
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
  minify: !dev,
  define: { __DEV__: String(dev) },
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

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c >>> 0;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
async function collectFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectFiles(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
}
async function writeZip(srcDir, destFile) {
  const files = await collectFiles(srcDir);
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(relative(srcDir, file).replace(/\\/g, "/"), "utf8");
    const raw = await readFile(file);
    const data = deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    locals.push(local, data);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  await mkdir(dirname(destFile), { recursive: true });
  await writeFile(destFile, Buffer.concat([...locals, ...centrals, eocd]));
}

for (const browser of ["chrome", "firefox"]) {
  const outdir = await assemble(browser);
  if (watch) await (await context({ ...options, outdir })).watch();
  else {
    await build({ ...options, outdir });
    if (packDir) {
      await writeZip(
        outdir,
        join(packDir, `themespace-companion-${browser}.zip`),
      );
    }
  }
}
