"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sun, Moon, ArrowUpRight } from "lucide-react";
import { componentFixtures, componentDocument } from "@/lib/component-fixtures";
import { cssOutput } from "@/lib/exporters";
import { type Theme, type Appearance } from "@/lib/theme";
import { useSitePreferences } from "./site-preferences";
import { fontVariable } from "@/lib/preferences";
// Data URLs let the sandboxed component document use the app's loaded fonts
// without cross-origin requests from the iframe's opaque origin.
const previewFonts = new Map<string, Promise<string>>();
function embeddedFont(url: string) {
  if (!previewFonts.has(url))
    previewFonts.set(
      url,
      fetch(url)
        .then(async (response) => {
          if (!response.ok) throw new Error("Font unavailable");
          const blob = await response.blob();
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        })
        .catch(() => url),
    );
  return previewFonts.get(url)!;
}
export function ComponentLibrary({
  theme,
  mode,
  compact = false,
}: {
  theme: Theme;
  mode: Appearance;
  compact?: boolean;
}) {
  const { settings } = useSitePreferences();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [chosenMode, setChosenMode] = useState<Appearance | undefined>(),
    [height, setHeight] = useState(900),
    [loadedDocument, setLoadedDocument] = useState<string | null>(null),
    [fontCSS, setFontCSS] = useState("");
  const iframe = useRef<HTMLIFrameElement>(null),
    appearance = chosenMode && theme.modes[chosenMode] ? chosenMode : mode;
  const fixtures = componentFixtures(theme, appearance),
    categories = ["All", "Foundations", "Controls", "Patterns", "App surfaces"];
  const filtered = fixtures.filter(
    (f) =>
      (category === "All" || f.category === category) &&
      `${f.name} ${f.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    let active = true;
    document.fonts.ready
      .then(async () => {
        const computed = getComputedStyle(document.documentElement);
        const family = (name: string) =>
          fontVariable(name).replace(/var\((--[^)]+)\)/g, (_, key) =>
            computed.getPropertyValue(key).trim(),
          );
        const sans = family(theme.fonts.sans),
          mono = family(theme.fonts.mono);
        const names = new Set(
          (sans + "," + mono)
            .split(",")
            .map((s) => s.replace(/["']/g, "").trim()),
        );
        const rules: { css: string; base: string }[] = [];
        function collect(list: CSSRuleList, base: string) {
          for (const rule of Array.from(list)) {
            if (
              rule instanceof CSSFontFaceRule &&
              names.has(
                rule.style
                  .getPropertyValue("font-family")
                  .replace(/["']/g, "")
                  .trim(),
              )
            )
              rules.push({ css: rule.cssText, base });
            else if ("cssRules" in rule)
              collect((rule as CSSGroupingRule).cssRules, base);
          }
        }
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            collect(sheet.cssRules, sheet.href || document.baseURI);
          } catch {}
        }
        const faces = await Promise.all(
          rules.map(async ({ css, base }) => {
            for (const match of Array.from(
              css.matchAll(/url\(["']?([^"')]+)["']?\)/g),
            )) {
              const url = new URL(match[1], base).href;
              css = css.replace(match[0], `url("${await embeddedFont(url)}")`);
            }
            return css;
          }),
        );
        if (active)
          setFontCSS(
            faces.join("\n") +
              `:root{--ts-font-sans:${sans},system-ui,sans-serif;--ts-font-mono:${mono},ui-monospace,monospace;}`,
          );
      })
      .catch(() => {
        /* The exported system font fallbacks remain usable. */
      });
    return () => {
      active = false;
    };
  }, [theme.fonts.sans, theme.fonts.mono]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.source !== iframe.current?.contentWindow ||
        e.data?.type !== "themespace-fixture-height"
      )
        return;
      const next = Number(e.data.height);
      if (Number.isFinite(next) && next > 0 && next < 100000)
        setHeight(Math.ceil(next));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  const ids = filtered.map((f) => f.id).join(",");
  const doc = useMemo(
    () =>
      componentDocument(
        theme,
        appearance,
        cssOutput(theme),
        ids ? ids.split(",") : [],
        true,
        fontCSS +
          (settings.motion === "reduced"
            ? "*{animation:none!important;transition:none!important}"
            : ""),
      ),
    [theme, appearance, ids, fontCSS, settings.motion],
  );
  return (
    <section
      className={`component-library ${compact ? "compact" : ""}`}
      aria-label="Component library"
    >
      <div className="library-toolbar">
        <label className="search-field">
          <Search size={15} />
          <input
            placeholder="Find a component…"
            aria-label="Search components"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="appearance-toggle">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              disabled={!theme.modes[m]}
              aria-label={`${m} component preview`}
              aria-pressed={appearance === m}
              onClick={() => setChosenMode(m)}
            >
              {m === "light" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          ))}
        </div>
        <span className="small muted">
          {filtered.length} / {fixtures.length} examples
        </span>
      </div>
      <div className="library-categories">
        {categories.map((c) => (
          <button
            key={c}
            aria-pressed={c === category}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="fixture-frame-shell" aria-busy={loadedDocument !== doc}>
          {loadedDocument !== doc && (
            <div className="fixture-loading" role="status">
              <span className="live-dot" />
              Preparing component examples…
            </div>
          )}
          <iframe
            ref={iframe}
            title={`${theme.name} interactive component examples`}
            srcDoc={doc}
            sandbox="allow-scripts"
            onLoad={() => setLoadedDocument(doc)}
            style={{ height }}
          />
        </div>
      ) : (
        <div className="empty-state">
          <Search size={24} />
          <h3>No matching components.</h3>
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
          >
            Show all examples
          </button>
        </div>
      )}
      <div className="library-provenance">
        <span>
          Includes all 20 Comfy cards, its 7 editor/terminal surfaces, and Open
          Design component families.
        </span>
        <a
          href="https://github.com/nexu-io/open-design/tree/main/design-systems"
          target="_blank"
          rel="noreferrer"
        >
          Reference library <ArrowUpRight size={12} />
        </a>
      </div>
    </section>
  );
}
