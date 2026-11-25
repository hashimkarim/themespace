import { formatColor } from "../core/color";
import { themeFromScan, type Channel } from "../core/scan";
import { planRemap, type Remap } from "../core/remap";
import type { Theme } from "../../../web/lib/theme";
import type {
  AppearanceChoice,
  EngineMessage,
  EngineStatus,
} from "../shared/messages";
import { allElements, collect, isSkipped, toRgba } from "./collect";

type Saved = { prop: string; value: string; priority: string };
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
/** Inherited properties: a value equal to the parent's is inheritance, not a choice. */
const inherited = new Set(["color", "fill", "stroke"]);
const svgProps: [string, Channel][] = [
  ["fill", "text"],
  ["stroke", "text"],
];

/**
 * Recolors the page in place. Tier 1 rewrites the site's own design tokens
 * (exact, keeps hover states). Tier 2 recolors computed styles element by
 * element with inline !important values and records what it replaced, so
 * revert restores the page exactly.
 */
class Engine {
  private saved = new Map<Element, Saved[]>();
  private rootSaved: Saved[] = [];
  private observer: MutationObserver | null = null;
  private remap: Remap | null = null;
  private status: EngineStatus = { applied: false };
  private queue = new Set<Element>();
  private scheduled = false;

  apply(theme: Theme, appearance: AppearanceChoice, label: string) {
    this.revert();
    const scan = themeFromScan(collect());
    const remap = planRemap(scan, theme, appearance);
    this.remap = remap;
    const root = document.documentElement;
    const setRoot = (prop: string, value: string) => {
      this.rootSaved.push({
        prop,
        value: root.style.getPropertyValue(prop),
        priority: root.style.getPropertyPriority(prop),
      });
      root.style.setProperty(prop, value, "important");
    };
    setRoot("color-scheme", remap.appearance);
    const tokenNames = Object.keys(remap.tokens);
    const tier = scan.tokens.some((t) => t.role === "background")
      ? "tokens"
      : "computed";
    for (const name of tokenNames) setRoot(name, remap.tokens[name]);
    if (tier === "computed") {
      // Pages that paint nothing show the browser canvas; give it the theme's page color.
      const page = scan.anchors.find((a) => a.role === "background")!.color;
      setRoot("background-color", remap.color(page, "bg"));
      for (const el of allElements(document.body ?? root)) this.queue.add(el);
      this.flush();
      this.observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "attributes") {
            this.restore(record.target as Element);
            this.queue.add(record.target as Element);
          }
          for (const node of record.addedNodes)
            if (node instanceof Element) {
              this.queue.add(node);
              for (const el of allElements(node)) this.queue.add(el);
            }
        }
        this.schedule();
      });
      this.observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    this.status = { applied: true, label, appearance: remap.appearance, tier };
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

  private recolor(el: Element) {
    const remap = this.remap;
    if (
      !remap ||
      isSkipped(el) ||
      !(el instanceof HTMLElement || el instanceof SVGElement)
    )
      return;
    const style = getComputedStyle(el);
    const parent = el.parentElement ?? (el.getRootNode() as ShadowRoot).host;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    const ownColor = style.color;
    const props =
      el instanceof SVGElement ? [...colorProps, ...svgProps] : colorProps;
    const changes: [string, string][] = [];
    for (const [prop, channel] of props) {
      const value = style.getPropertyValue(prop);
      if (!value || value === "none" || value.startsWith("url(")) continue;
      // Already right once the parent is recolored; remapping again would double-shift.
      if (inherited.has(prop) && parentStyle?.getPropertyValue(prop) === value)
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
      const next = remap.color(color.hex, channel);
      if (next !== color.hex)
        changes.push([prop, formatColor({ hex: next, alpha: color.alpha })]);
    }
    if (!changes.length) return;
    const saved = this.saved.get(el) ?? [];
    for (const [prop, value] of changes) {
      if (!saved.some((s) => s.prop === prop))
        saved.push({
          prop,
          value: el.style.getPropertyValue(prop),
          priority: el.style.getPropertyPriority(prop),
        });
      el.style.setProperty(prop, value, "important");
    }
    this.saved.set(el, saved);
  }

  private restore(el: Element) {
    const saved = this.saved.get(el);
    if (!saved || !(el instanceof HTMLElement || el instanceof SVGElement))
      return;
    for (const s of saved) {
      if (s.value) el.style.setProperty(s.prop, s.value, s.priority);
      else el.style.removeProperty(s.prop);
    }
    this.saved.delete(el);
  }

  revert() {
    this.observer?.disconnect();
    this.observer = null;
    this.queue.clear();
    for (const el of [...this.saved.keys()]) this.restore(el);
    const root = document.documentElement;
    for (const s of this.rootSaved.reverse()) {
      if (s.value) root.style.setProperty(s.prop, s.value, s.priority);
      else root.style.removeProperty(s.prop);
    }
    this.rootSaved = [];
    this.remap = null;
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
        if (message.type === "ts:scan") {
          // Scan the site's own colors, not a theme we're showing.
          const status = engine.getStatus();
          if (status.applied) engine.revert();
          reply({ sample: collect() });
        } else if (message.type === "ts:apply") {
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
  // Let the background re-apply this site's pinned theme.
  chrome.runtime.sendMessage({ type: "engine-ready" }).catch(() => {});
}
