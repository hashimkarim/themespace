"use client";
import { useEffect, useRef, useState } from "react";
import { parseTheme } from "@/lib/theme";
import { fontVariable } from "@/lib/preferences";
import {
  EDITOR_MESSAGE,
  EDITOR_READY,
  monacoTheme,
  type EditorFrameConfig,
} from "@/lib/editor-preview";
import { integrationTheme } from "@/lib/integration-theme";

export function EditorFrame() {
  const host = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<EditorFrameConfig | null>(null);
  const [error, setError] = useState("");
  const latest = useRef<EditorFrameConfig | null>(null);
  const refresh = useRef<((config: EditorFrameConfig) => void) | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== parent ||
        event.origin !== location.origin ||
        event.data?.type !== EDITOR_MESSAGE
      )
        return;
      try {
        const theme = parseTheme(event.data.theme);
        const { mode, target, file, value, diff } = event.data;
        if (
          !theme.modes[mode as "light" | "dark"] ||
          !["vscode", "zed", "neovim", "helix", "sublime", "obsidian"].includes(
            target,
          ) ||
          typeof file !== "string" ||
          typeof value !== "string" ||
          value.length > 100000
        )
          return;
        setConfig({
          type: EDITOR_MESSAGE,
          theme,
          mode,
          target,
          file,
          value,
          diff: diff === true,
        });
      } catch {
        /* Ignore malformed messages; the parent owns the current theme. */
      }
    };
    window.addEventListener("message", receive);
    parent.postMessage({ type: EDITOR_READY }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    latest.current = config;
    if (config) refresh.current?.(config);
  }, [config]);
  const engine =
    config?.target === "vscode" ? "monaco" : config ? "codemirror" : null;
  const isDiff = config?.diff ?? false;
  useEffect(() => {
    if (!engine || !host.current) return;
    const element = host.current;
    let cancelled = false;
    let dispose = () => {};
    async function mount() {
      if (engine === "monaco") {
        const [monaco, worker] = await Promise.all([
          import("monaco-editor/editor/editor.api.js"),
          import("monaco-editor/editor/editor.worker.js?worker"),
          import("monaco-editor/languages/definitions/typescript/register.js"),
          import("monaco-editor/languages/definitions/css/register.js"),
          import("monaco-editor/languages/definitions/markdown/register.js"),
          import("monaco-editor/features/find/register.js"),
          import("monaco-editor/features/diffEditor/register.js"),
          import("monaco-editor/features/tokenization/register.js"),
        ]);
        if (cancelled) return;
        (
          globalThis as typeof globalThis & {
            MonacoEnvironment?: { getWorker: () => Worker };
          }
        ).MonacoEnvironment = { getWorker: () => new worker.default() };
        const initial = latest.current!;
        const language = (file: string) =>
          file.endsWith(".md")
            ? "markdown"
            : file.endsWith(".css")
              ? "css"
              : "typescript";
        const model = monaco.editor.createModel(
          initial.value,
          language(initial.file),
        );
        const original = monaco.editor.createModel(
          initial.value.replace(/name: [^,]+,/, 'name: "Untitled",'),
          language(initial.file),
        );
        const contract = integrationTheme(
          initial.theme,
          initial.mode,
          initial.target,
        );
        monaco.editor.defineTheme(
          "themespace-preview",
          monacoTheme(contract, initial.mode),
        );
        const options = {
          theme: "themespace-preview",
          automaticLayout: true,
          fontSize: 13,
          fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
          minimap: { enabled: !isDiff },
          scrollBeyondLastLine: false,
          padding: { top: 14, bottom: 14 },
          renderWhitespace: "selection" as const,
          stickyScroll: { enabled: false },
          links: false,
          contextmenu: true,
          glyphMargin: true,
        };
        const editor = isDiff
          ? monaco.editor.createDiffEditor(element, {
              ...options,
              renderSideBySide: false,
              readOnly: false,
            })
          : monaco.editor.create(element, options);
        if ("getModifiedEditor" in editor)
          editor.setModel({ original, modified: model });
        else editor.setModel(model);
        let updating = false;
        const subscription = model.onDidChangeContent(() => {
          if (!updating)
            parent.postMessage(
              {
                type: "themespace-editor-change",
                file: latest.current?.file,
                value: model.getValue(),
              },
              location.origin,
            );
        });
        refresh.current = (next) => {
          monaco.editor.defineTheme(
            "themespace-preview",
            monacoTheme(
              integrationTheme(next.theme, next.mode, next.target),
              next.mode,
            ),
          );
          monaco.editor.setTheme("themespace-preview");
          monaco.editor.setModelLanguage(model, language(next.file));
          if (model.getValue() !== next.value) {
            updating = true;
            model.setValue(next.value);
            updating = false;
          }
        };
        refresh.current(latest.current!);
        dispose = () => {
          subscription.dispose();
          editor.dispose();
          model.dispose();
          original.dispose();
        };
      } else {
        const [
          {
            EditorView,
            keymap,
            lineNumbers,
            drawSelection,
            highlightActiveLine,
            highlightActiveLineGutter,
          },
          { EditorState, Compartment },
          { defaultKeymap, history, historyKeymap },
          { syntaxHighlighting, HighlightStyle },
          { tags },
          { javascript },
          { css },
          { markdown },
        ] = await Promise.all([
          import("@codemirror/view"),
          import("@codemirror/state"),
          import("@codemirror/commands"),
          import("@codemirror/language"),
          import("@lezer/highlight"),
          import("@codemirror/lang-javascript"),
          import("@codemirror/lang-css"),
          import("@codemirror/lang-markdown"),
        ]);
        if (cancelled) return;
        const appearance = new Compartment(),
          language = new Compartment();
        const themeExtension = (next: EditorFrameConfig) => {
          const contract = integrationTheme(next.theme, next.mode, next.target),
            c = contract.roles,
            s = contract.syntax;
          return [
            EditorView.theme(
              {
                "&": {
                  height: "100%",
                  backgroundColor: c.background,
                  color: c.foreground,
                  fontSize: "13px",
                },
                ".cm-content": {
                  fontFamily:
                    next.target === "obsidian"
                      ? `${fontVariable(contract.variables["--font-text-theme"].replaceAll('"', ""))}, system-ui, sans-serif`
                      : '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
                  padding: "16px 0",
                  caretColor: c.cursor,
                },
                ".cm-scroller": {
                  overflow: "auto",
                  scrollbarWidth: "thin",
                  scrollbarColor: `${c.muted} ${c.background}`,
                },
                ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.cursor },
                "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
                  { backgroundColor: c.selection },
                ".cm-gutters": {
                  backgroundColor: c.gutter || c.background,
                  color: c.muted,
                  border: "none",
                },
                ".cm-activeLine, .cm-activeLineGutter": {
                  backgroundColor: c.hover,
                },
                ".cm-tooltip": {
                  backgroundColor: c.elevated,
                  borderColor: c.border,
                  color: c.foreground,
                },
              },
              { dark: next.mode === "dark" },
            ),
            syntaxHighlighting(
              HighlightStyle.define([
                {
                  tag: tags.comment,
                  color: s.comment || c.muted,
                  fontStyle: "italic",
                },
                { tag: tags.keyword, color: s.keyword || c.foreground },
                { tag: tags.string, color: s.string || c.foreground },
                { tag: tags.number, color: s.number || c.foreground },
                {
                  tag: tags.function(tags.variableName),
                  color: s.function || c.foreground,
                },
                { tag: tags.typeName, color: s.type || c.foreground },
                { tag: tags.heading, color: c.foreground, fontWeight: "bold" },
                { tag: tags.link, color: c.accent },
                { tag: tags.monospace, color: s.string || c.foreground },
              ]),
            ),
          ];
        };
        const lang = (file: string) =>
          file.endsWith(".md")
            ? markdown()
            : file.endsWith(".css")
              ? css()
              : javascript({ typescript: true });
        let updating = false;
        const initial = latest.current!;
        const view = new EditorView({
          parent: element,
          state: EditorState.create({
            doc: initial.value,
            extensions: [
              history(),
              keymap.of([...defaultKeymap, ...historyKeymap]),
              ...(initial.target === "obsidian"
                ? [EditorView.lineWrapping]
                : [lineNumbers(), highlightActiveLineGutter()]),
              drawSelection(),
              highlightActiveLine(),
              appearance.of(themeExtension(initial)),
              language.of(lang(initial.file)),
              EditorView.updateListener.of((update) => {
                if (update.docChanged && !updating)
                  parent.postMessage(
                    {
                      type: "themespace-editor-change",
                      file: latest.current?.file,
                      value: update.state.doc.toString(),
                    },
                    location.origin,
                  );
              }),
            ],
          }),
        });
        refresh.current = (next) => {
          updating = true;
          view.dispatch({
            effects: [
              appearance.reconfigure(themeExtension(next)),
              language.reconfigure(lang(next.file)),
            ],
            ...(view.state.doc.toString() !== next.value
              ? {
                  changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: next.value,
                  },
                }
              : {}),
          });
          updating = false;
        };
        refresh.current(latest.current!);
        dispose = () => view.destroy();
      }
    }
    mount().catch(() => {
      if (!cancelled)
        setError("The editor could not load. Reopen the preview to retry.");
    });
    return () => {
      cancelled = true;
      refresh.current = null;
      dispose();
      element.replaceChildren();
    };
  }, [engine, isDiff]);
  const palette = config
    ? integrationTheme(config.theme, config.mode, config.target).roles
    : null;
  return (
    <main
      className="editor-renderer-page"
      data-editor-engine={engine || "waiting"}
      style={
        palette
          ? {
              backgroundColor: palette.background,
              color: palette.foreground,
              colorScheme: config!.mode,
            }
          : undefined
      }
    >
      <div ref={host} className="editor-renderer-host" />
      {error && <p role="alert">{error}</p>}
      {!error && (
        <p className="editor-renderer-waiting">Loading editor preview…</p>
      )}
    </main>
  );
}
