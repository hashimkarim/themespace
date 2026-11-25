import { bareHsl, contrastRatio, formatColor, mixHex } from "../core/color";
import {
  themeFromScan,
  type Channel,
  type ScanResult,
  type ScanSample,
} from "../core/scan";
import { planRemap, type Remap } from "../core/remap";
import type { Theme } from "../../../web/lib/theme";
import type {
  AppearanceChoice,
  EngineMessage,
  EngineStatus,
} from "../shared/messages";
import { allElements, collect, isSkipped, toRgba } from "./collect";

type Saved = { value: string; priority: string };
const colorProps: [string, Channel][] = [
  ["background-color", "bg"],
  ["color", "text"],
  ["border-top-color", "border"],
  ["border-right-color", "border"],
  ["border-bottom-color", "border"],
  ["border-left-color", "border"],
  ["outline-color", "border"],
  ["text-decoration-color", "text"],
];
const svgProps: [string, Channel][] = [
  ["fill", "text"],
  ["stroke", "text"],
];
/** Inherited properties: a value equal to the parent's is inheritance, not a choice. */
const inherited = new Set(["color", "fill", "stroke"]);

/**
 * Recolors the page in place.
 *
 * The untouched page is read once: its scan and each element's original
 * colors are kept, so switching themes, scanning while themed, or CSS
 * transitions never feed themed colors back in as the site's own.
 *
 * Tier 1 rewrites the site's own design tokens (exact, keeps hover states).
 * Tier 2 recolors every other color with recorded inline overrides, which
 * revert restores exactly.
 */
class Engine {
  private sample: ScanSample | null = null;
  private scan: ScanResult | null = null;
  /** Original computed value per element and property, for everything we changed. */
  private originals = new Map<Element, Map<string, string>>();
  /** The element's own inline value before we touched it. */
  private saved = new Map<Element, Map<string, Saved>>();
  private rootSaved = new Map<string, Saved>();
  private observer: MutationObserver | null = null;
  private remap: Remap | null = null;
  /** Colors that already come from rewritten tokens; recoloring them again would double-shift. */
  private tokenColors = new Set<string>();
  private status: EngineStatus = { applied: false };
  private queue = new Set<Element>();
  private scheduled = false;
  private calm: CSSStyleSheet | null = null;

  /** The site's own colors, read before any theme touches them. */
  siteSample() {
    return this.sample ?? collect();
  }

  apply(theme: Theme, appearance: AppearanceChoice, label: string) {
    this.pauseTransitions();
    if (!this.sample || !this.status.applied) {
      this.release();
      this.sample = collect();
      this.scan = themeFromScan(this.sample);
    }
    const scan = this.scan!;
    const remap = (this.remap = planRemap(scan, theme, appearance));
    this.setRoot("color-scheme", remap.appearance);
    const formats = this.sample.tokenFormats ?? {};
    this.tokenColors.clear();
    for (const [name, value] of Object.entries(remap.tokens)) {
      this.setRoot(name, formats[name] === "bare-hsl" ? bareHsl(value) : value);
      this.tokenColors.add(value);
    }
    const tier = scan.tokens.some((t) => t.role === "background")
      ? "tokens"
      : "computed";
    // Pages that paint nothing show the browser canvas; give it the theme's page color.
    const page = scan.anchors.find((a) => a.role === "background")!.color;
    this.setRoot("background-color", remap.color(page, "bg"));
    for (const el of allElements(document.body ?? document.documentElement))
      this.queue.add(el);
    this.flush();
    if (!this.observer) {
      this.observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "attributes") {
            // The site changed this element's styling: its originals are stale.
            this.restore(record.target as Element);
            this.queue.add(record.target as Element);
          }
          for (const node of record.addedNodes)
            if (node instanceof Element)
              for (const el of allElements(node)) this.queue.add(el);
        }
        this.schedule();
      });
      this.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    this.status = { applied: true, label, appearance: remap.appearance, tier };
  }

  /** Suspend CSS transitions while colors change, so reads never see an in-between color. */
  private pauseTransitions() {
    if (!this.calm) {
      this.calm = new CSSStyleSheet();
      this.calm.replaceSync("*,*::before,*::after{transition:none!important}");
    }
    const sheets = document.adoptedStyleSheets;
    if (!sheets.includes(this.calm))
      document.adoptedStyleSheets = [...sheets, this.calm];
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (this.queue.size) return this.pauseTransitions();
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
          (s) => s !== this.calm,
        );
      }),
    );
  }

  private setRoot(prop: string, value: string) {
    const root = document.documentElement.style;
    if (!this.rootSaved.has(prop))
      this.rootSaved.set(prop, {
        value: root.getPropertyValue(prop),
        priority: root.getPropertyPriority(prop),
      });
    root.setProperty(prop, value, "important");
  }

  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.flush();
    });
  }

  /** Recolor queued elements in slices so large pages stay responsive. */
  private flush() {
    const started = performance.now();
    for (const el of this.queue) {
      this.queue.delete(el);
      this.recolor(el);
      if (performance.now() - started > 12) return this.schedule();
    }
  }

  /** What the site itself sets for this property: recorded original, else current value. */
  private original(el: Element, style: CSSStyleDeclaration, prop: string) {
    return this.originals.get(el)?.get(prop) ?? style.getPropertyValue(prop);
  }

  /** The site's own text color for an element, looking through inheritance from recolored parents. */
  private originalColor(el: Element) {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const recorded = this.originals.get(node)?.get("color");
      if (recorded) return recorded;
      const parent = node.parentElement;
      const value = getComputedStyle(node).color;
      if (!parent || getComputedStyle(parent).color !== value) return value;
    }
    return getComputedStyle(el).color;
  }

  /** The opaque background behind an element, now (themed) or as the site had it. */
  private backdrop(el: Element, themed: boolean) {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const c = toRgba(
        themed
          ? style.backgroundColor
          : this.original(node, style, "background-color"),
      );
      if (c && c.alpha >= 0.9) return c.hex;
    }
    const page =
      this.scan?.anchors.find((a) => a.role === "background")?.color ??
      "#ffffff";
    return themed && this.remap ? this.remap.color(page, "bg") : page;
  }

  private recolor(el: Element) {
    const remap = this.remap;
    if (
      !remap ||
      isSkipped(el) ||
      !(el instanceof HTMLElement || el instanceof SVGElement)
    )
      return;
    const style = getComputedStyle(el);
    const own = this.originals.get(el);
    const parent =
      el.parentElement ?? (el.getRootNode() as ShadowRoot).host ?? null;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    const ownColor = this.original(el, style, "color");
    const props =
      el instanceof SVGElement ? [...colorProps, ...svgProps] : colorProps;
    const changes = new Map<string, { from: string; to: string | null }>();
    for (const [prop, channel] of props) {
      const value = this.original(el, style, prop);
      if (!value || value === "none" || value.startsWith("url(")) continue;
      // Inherited from a parent we've already recolored (or will): nothing to do here.
      if (
        !own?.has(prop) &&
        inherited.has(prop) &&
        parentStyle?.getPropertyValue(prop) === value
      )
        continue;
      // Borders, outlines, and underlines that follow currentColor track the text color.
      if (
        prop !== "color" &&
        prop !== "background-color" &&
        !inherited.has(prop)
      ) {
        if (value === ownColor) continue;
        const side = prop.startsWith("border-")
          ? prop.replace("-color", "")
          : prop.startsWith("outline")
            ? "outline"
            : null;
        if (
          side &&
          (style.getPropertyValue(`${side}-style`) === "none" ||
            !parseFloat(style.getPropertyValue(`${side}-width`)))
        )
          continue;
      }
      const color = toRgba(value);
      if (!color || color.alpha === 0) continue;
      // Already themed through the site's own tokens.
      if (!own?.has(prop) && this.tokenColors.has(color.hex)) continue;
      const next = remap.color(color.hex, channel);
      changes.set(prop, {
        from: value,
        to:
          next === color.hex
            ? null
            : formatColor({ hex: next, alpha: color.alpha }),
      });
    }
    for (const [prop, { from, to }] of changes) {
      if (to === null) this.restoreProp(el, prop);
      else this.setProp(el, prop, from, to);
    }
    this.keepReadable(el);
  }

  /** Text keeps at least the contrast it had on the site (up to 4.5:1) against its new background. */
  private keepReadable(el: HTMLElement | SVGElement) {
    let hasText = false;
    for (const node of el.childNodes)
      if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim())
        hasText = true;
    if (!hasText) return;
    const original = this.originalColor(el);
    const before = toRgba(original);
    const now = toRgba(getComputedStyle(el).color);
    if (!before || !now || now.alpha < 0.5) return;
    const want = Math.min(
      4.5,
      contrastRatio(before.hex, this.backdrop(el, false)),
    );
    const bg = this.backdrop(el, true);
    if (contrastRatio(now.hex, bg) >= want) return;
    const toward =
      contrastRatio("#ffffff", bg) > contrastRatio("#000000", bg)
        ? "#ffffff"
        : "#000000";
    let fixed = now.hex;
    for (let step = 1; step <= 20 && contrastRatio(fixed, bg) < want; step++)
      fixed = mixHex(now.hex, toward, step / 20);
    this.setProp(
      el,
      "color",
      original,
      formatColor({ hex: fixed, alpha: now.alpha }),
    );
  }

  private setProp(
    el: HTMLElement | SVGElement,
    prop: string,
    original: string,
    value: string,
  ) {
    let originals = this.originals.get(el);
    if (!originals) this.originals.set(el, (originals = new Map()));
    if (!originals.has(prop)) originals.set(prop, original);
    let saved = this.saved.get(el);
    if (!saved) this.saved.set(el, (saved = new Map()));
    if (!saved.has(prop))
      saved.set(prop, {
        value: el.style.getPropertyValue(prop),
        priority: el.style.getPropertyPriority(prop),
      });
    el.style.setProperty(prop, value, "important");
  }

  private restoreProp(el: Element, prop: string) {
    const saved = this.saved.get(el)?.get(prop);
    if (!saved || !(el instanceof HTMLElement || el instanceof SVGElement))
      return;
    if (saved.value) el.style.setProperty(prop, saved.value, saved.priority);
    else el.style.removeProperty(prop);
    this.saved.get(el)!.delete(prop);
    this.originals.get(el)?.delete(prop);
  }

  private restore(el: Element) {
    for (const prop of [...(this.saved.get(el)?.keys() ?? [])])
      this.restoreProp(el, prop);
    this.saved.delete(el);
    this.originals.delete(el);
  }

  /** Remove every change and forget what we read. */
  private release() {
    this.observer?.disconnect();
    this.observer = null;
    this.queue.clear();
    for (const el of [...this.saved.keys()]) this.restore(el);
    const root = document.documentElement.style;
    for (const [prop, s] of this.rootSaved) {
      if (s.value) root.setProperty(prop, s.value, s.priority);
      else root.removeProperty(prop);
    }
    this.rootSaved.clear();
    this.tokenColors.clear();
    this.remap = null;
    this.sample = null;
    this.scan = null;
  }

  revert() {
    this.pauseTransitions();
    this.release();
    this.status = { applied: false };
  }

  getStatus() {
    return this.status;
  }
}

declare global {
  interface Window {
    __themespaceCompanion?: Engine;
  }
}

// Injected on demand and by registered content scripts; only the first copy listens.
if (!window.__themespaceCompanion) {
  const engine = (window.__themespaceCompanion = new Engine());
  chrome.runtime.onMessage.addListener(
    (message: EngineMessage, _sender, reply: (value: unknown) => void) => {
      try {
        if (message.type === "ts:scan") reply({ sample: engine.siteSample() });
        else if (message.type === "ts:apply") {
          engine.apply(message.theme, message.appearance, message.label);
          reply(engine.getStatus());
        } else if (message.type === "ts:revert") {
          engine.revert();
          reply(engine.getStatus());
        } else if (message.type === "ts:status") reply(engine.getStatus());
      } catch (error) {
        reply({
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return false;
    },
  );
  // Let the background apply this site's pinned theme.
  chrome.runtime.sendMessage({ type: "engine-ready" }).catch(() => {});
}
