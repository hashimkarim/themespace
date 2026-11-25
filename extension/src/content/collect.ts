import { parseColor, type Rgba } from "../core/color";
import { knownTokens, type ScanSample, type Swatch } from "../core/scan";

const skip = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "IMG",
  "VIDEO",
  "CANVAS",
  "IFRAME",
  "PICTURE",
  "SOURCE",
  "META",
  "LINK",
  "HEAD",
  "BR",
]);
export const isSkipped = (el: Element) => skip.has(el.tagName);

let canvasContext: CanvasRenderingContext2D | null | undefined;
const normalized = new Map<string, Rgba | null>();
/** Normalize any CSS color (oklch, color(), lab) to sRGB hex through a 1px canvas. */
export function toRgba(value: string): Rgba | null {
  const direct = parseColor(value);
  if (direct) return direct;
  if (normalized.has(value)) return normalized.get(value)!;
  if (canvasContext === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    canvasContext = canvas.getContext("2d", { willReadFrequently: true });
  }
  let out: Rgba | null = null;
  if (canvasContext) {
    canvasContext.clearRect(0, 0, 1, 1);
    canvasContext.fillStyle = "#010203";
    canvasContext.fillStyle = value;
    canvasContext.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = canvasContext.getImageData(0, 0, 1, 1).data;
    out = parseColor(`rgba(${r}, ${g}, ${b}, ${a / 255})`);
  }
  normalized.set(value, out);
  return out;
}

const isButton = (el: Element) =>
  el.tagName === "BUTTON" ||
  el.getAttribute("role") === "button" ||
  (el.tagName === "INPUT" &&
    ["submit", "button", "reset"].includes((el as HTMLInputElement).type));
const isInput = (el: Element) =>
  (el.tagName === "INPUT" && !isButton(el)) ||
  el.tagName === "TEXTAREA" ||
  el.tagName === "SELECT";

/** Every element in the document, including open shadow roots. */
export function* allElements(root: ParentNode = document): Generator<Element> {
  if (root instanceof Element) yield root;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node as Element;
    yield el;
    if (el.shadowRoot) yield* allElements(el.shadowRoot);
  }
}

function add(map: Map<string, number>, hex: string, weight: number) {
  map.set(hex, (map.get(hex) ?? 0) + weight);
}
const swatches = (map: Map<string, number>, limit = 12): Swatch[] =>
  [...map]
    .map(([hex, weight]) => ({ hex, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);

/** The opaque background actually behind a point on screen. */
function backgroundAt(x: number, y: number): string | null {
  for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
    const c = toRgba(getComputedStyle(el).backgroundColor);
    if (c && c.alpha >= 0.9) return c.hex;
  }
  // Nothing opaque: the browser's default canvas shows through.
  return document.elementFromPoint(x, y) ? "#ffffff" : null;
}

function resolveToken(name: string): string | null {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return null;
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.documentElement.appendChild(probe);
  try {
    // shadcn v3 stores bare HSL components ("222 47% 11%").
    for (const candidate of [raw, `hsl(${raw})`]) {
      probe.style.color = "";
      probe.style.color = candidate;
      if (probe.style.color) {
        const c = toRgba(getComputedStyle(probe).color);
        return c && c.alpha >= 0.9 ? c.hex : null;
      }
    }
    return null;
  } finally {
    probe.remove();
  }
}

/** Read the page's colors, weighted by how much of the page each one covers. */
export function collect(limit = 8000): ScanSample {
  const surface = new Map<string, number>(),
    button = new Map<string, number>(),
    input = new Map<string, number>(),
    body = new Map<string, number>(),
    link = new Map<string, number>(),
    buttonText = new Map<string, number>(),
    borders = new Map<string, number>(),
    radii = new Map<number, number>();
  const viewportArea = innerWidth * innerHeight;
  let seen = 0;
  for (const el of allElements(document.body ?? document.documentElement)) {
    if (isSkipped(el) || ++seen > limit) continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const style = getComputedStyle(el);
    if (
      style.visibility === "hidden" ||
      style.display === "none" ||
      style.opacity === "0"
    )
      continue;
    const area = Math.min(rect.width * rect.height, viewportArea * 4);
    const bg = toRgba(style.backgroundColor);
    if (bg && bg.alpha >= 0.6) {
      if (isButton(el) || (el.tagName === "A" && area < 40_000)) {
        add(button, bg.hex, area);
        const r = parseFloat(style.borderTopLeftRadius);
        if (Number.isFinite(r)) radii.set(r, (radii.get(r) ?? 0) + 1);
      } else if (isInput(el)) add(input, bg.hex, area);
      else add(surface, bg.hex, area);
    }
    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      const width = parseFloat(
        style.getPropertyValue(`border-${side.toLowerCase()}-width`),
      );
      if (
        !width ||
        style.getPropertyValue(`border-${side.toLowerCase()}-style`) === "none"
      )
        continue;
      const c = toRgba(
        style.getPropertyValue(`border-${side.toLowerCase()}-color`),
      );
      if (c && c.alpha >= 0.3)
        add(
          borders,
          c.hex,
          side === "Top" || side === "Bottom" ? rect.width : rect.height,
        );
    }
    let chars = 0;
    for (const node of el.childNodes)
      if (node.nodeType === Node.TEXT_NODE)
        chars += node.textContent!.trim().length;
    if (chars) {
      const c = toRgba(style.color);
      if (c && c.alpha >= 0.5) {
        const weight = chars * parseFloat(style.fontSize || "16");
        if (el.closest("button,[role=button],input[type=submit]"))
          add(buttonText, c.hex, weight);
        else if (el.closest("a")) add(link, c.hex, weight);
        else add(body, c.hex, weight);
      }
    }
  }

  // The page color is what sits behind most of the viewport.
  const page = new Map<string, number>();
  for (let i = 1; i <= 5; i++)
    for (let j = 1; j <= 5; j++) {
      const hex = backgroundAt((innerWidth * i) / 6, (innerHeight * j) / 6);
      if (hex) add(page, hex, 1);
    }
  const pageColor = swatches(page, 1)[0]?.hex ?? "#ffffff";

  const tokens: Record<string, string> = {};
  for (const name of knownTokens) {
    const value = resolveToken(name);
    if (value) tokens[name] = value;
  }
  const family = getComputedStyle(document.body ?? document.documentElement)
    .fontFamily.split(",")[0]
    ?.replace(/["']/g, "")
    .trim();
  const radius = [...radii].sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    url: location.href,
    title: document.title,
    page: pageColor,
    tokens,
    backgrounds: {
      surface: swatches(surface),
      button: swatches(button),
      input: swatches(input),
    },
    texts: {
      body: swatches(body),
      link: swatches(link),
      button: swatches(buttonText),
    },
    borders: swatches(borders),
    font: family || undefined,
    radius,
  };
}
