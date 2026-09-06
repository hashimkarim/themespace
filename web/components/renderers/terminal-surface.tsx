"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  integrationTheme,
  terminalEngine,
  type TerminalPalette,
} from "@/lib/integration-theme";
import {
  createTerminalSession,
  createTerminalTranscript,
  terminalScene,
  terminalScenes,
  type TerminalScene,
} from "@/lib/terminal-session";
import { type Appearance, type Theme } from "@/lib/theme";
import type { Ghostty } from "ghostty-web";

type TerminalHandle = {
  options: { theme?: TerminalPalette };
  focus(): void;
  write(text: string): void;
  dispose(): void;
};
let ghosttyCore: Promise<Ghostty> | undefined;

export function TerminalSurface({
  theme,
  mode,
  target,
  compact = false,
  windows = false,
}: {
  theme: Theme;
  mode: Appearance;
  target: string;
  compact?: boolean;
  windows?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const terminal = useRef<TerminalHandle | null>(null);
  const session = useRef<ReturnType<typeof createTerminalSession> | null>(null);
  const transcript = useRef(createTerminalTranscript());
  const context = useRef({ name: theme.name, windows });
  const restoreTerminalFocus = useRef(false);
  const [scene, setScene] = useState<TerminalScene>("shell");
  const [state, setState] = useState("loading");
  const [size, setSize] = useState("");
  const palette = useMemo(
    () => integrationTheme(theme, mode, target).terminal,
    [theme, mode, target],
  );
  const engine = terminalEngine(target, palette);
  const latest = useRef({ palette, name: theme.name, scene });
  // ghostty-web 0.4 does not apply options.theme after open(). Recreate its
  // renderer for a changed palette and replay ANSI, retaining the local session.
  const ghosttyPaletteKey =
    engine === "ghostty-web" ? JSON.stringify(palette) : "";
  useEffect(() => {
    latest.current = { palette, name: theme.name, scene };
    context.current.name = theme.name;
    context.current.windows = windows;
  }, [palette, theme.name, scene, windows]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false,
      frame = 0;
    let cleanup = () => {};
    async function mount() {
      const fontFamily = windows
        ? '"Cascadia Code", Consolas, monospace'
        : '"JetBrains Mono", "SFMono-Regular", Consolas, monospace';
      const options = {
        cols: 80,
        rows: compact ? 9 : 20,
        fontSize: compact ? 12 : 13,
        fontFamily,
        theme: latest.current.palette,
        cursorBlink: false,
        scrollback: 300,
        convertEol: true,
      };
      let instance:
        import("@xterm/xterm").Terminal | import("ghostty-web").Terminal;
      let fit: { fit(): void; dispose(): void };
      if (engine === "ghostty-web") {
        const api = await import("ghostty-web");
        const { default: wasm } =
          await import("ghostty-web/ghostty-vt.wasm?url");
        ghosttyCore ??= api.Ghostty.load(wasm).catch((error) => {
          ghosttyCore = undefined;
          throw error;
        });
        const core = await ghosttyCore;
        if (cancelled) return;
        instance = new api.Terminal({ ...options, ghostty: core });
        const addon = new api.FitAddon();
        instance.loadAddon(addon);
        fit = addon;
      } else {
        const [api, addon] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
        ]);
        if (cancelled) return;
        instance = new api.Terminal({
          ...options,
          screenReaderMode: true,
          allowProposedApi: false,
        });
        const fitAddon = new addon.FitAddon();
        instance.loadAddon(fitAddon);
        fit = fitAddon;
      }
      cleanup = () => {
        instance.dispose();
        element!.replaceChildren();
      };
      const previousFocus = document.activeElement;
      // Ghostty adds contenteditable and DOM listeners to its host. Give each
      // instance a fresh element so switching engines/palettes removes them all.
      const renderHost = document.createElement("div");
      renderHost.className = "engine-terminal-host";
      element!.appendChild(renderHost);
      instance.open(renderHost);
      // Ghostty's open() focuses its textarea automatically. Preserve the draft
      // field being edited, including during a live palette change.
      if (restoreTerminalFocus.current) instance.focus();
      else if (engine === "ghostty-web") {
        if (
          previousFocus instanceof HTMLElement &&
          previousFocus !== document.body &&
          previousFocus.isConnected
        )
          previousFocus.focus({ preventScroll: true });
        else instance.textarea?.blur();
      }
      terminal.current = instance;
      if (!session.current) {
        session.current = createTerminalSession((text) => {
          transcript.current.append(text);
          terminal.current?.write(text);
        }, context.current);
        session.current.start(latest.current.scene);
      } else instance.write(transcript.current.replay());
      const input = session.current;
      const subscription = instance.onData((data) => input.input(data));
      const resize = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (cancelled || !element!.clientWidth || !element!.clientHeight)
            return;
          fit.fit();
          setSize(`${instance.cols} × ${instance.rows}`);
        });
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element!);
      resize();
      document.fonts?.ready.then(() => {
        if (!cancelled) resize();
      });
      if (instance.textarea)
        instance.textarea.setAttribute(
          "aria-label",
          `${target} local terminal input`,
        );
      setState("ready");
      cleanup = () => {
        restoreTerminalFocus.current = element!.contains(
          document.activeElement,
        );
        observer.disconnect();
        subscription.dispose();
        instance.dispose();
        element!.replaceChildren();
      };
    }
    mount().catch(() => {
      if (!cancelled) {
        cleanup();
        setState("error");
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanup();
      terminal.current = null;
    };
  }, [target, compact, windows, engine, ghosttyPaletteKey]);
  useEffect(() => {
    if (terminal.current && engine !== "ghostty-web")
      terminal.current.options.theme = palette;
  }, [palette, engine]);
  const choose = (next: TerminalScene) => {
    setScene(next);
    session.current?.start(next);
  };
  return (
    <div
      className={`engine-terminal ${compact ? "compact" : ""}`}
      data-renderer={engine}
      data-engine-state={state}
    >
      <div className="engine-scenes" aria-label="Terminal sample output">
        {terminalScenes.map((item) => (
          <button
            key={item.id}
            aria-pressed={scene === item.id}
            onClick={() => choose(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={host}
        className="engine-terminal-canvas"
        aria-label={`${target} terminal emulator`}
      />
      {target === "termux" && (
        <div className="engine-termux-keys" aria-label="Termux extra keys">
          {[
            ["ESC", "\u001b"],
            ["TAB", "\t"],
            ["CTRL+C", "\u0003"],
            ["←", "\u001b[D"],
            ["↓", "\u001b[B"],
            ["↑", "\u001b[A"],
            ["→", "\u001b[C"],
          ].map(([label, data]) => (
            <button
              key={label}
              aria-label={`Terminal ${label}`}
              onClick={() => {
                session.current?.input(data);
                terminal.current?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {state !== "ready" && (
        <div className="engine-terminal-fallback">
          <pre>
            {terminalScene("shell", theme.name, windows).replace(
              /\x1b\[[\d;]*m/g,
              "",
            )}
          </pre>
          <p role="status">
            {state === "error"
              ? "The terminal renderer could not load. Reload this preview to retry."
              : "Starting terminal renderer…"}
          </p>
        </div>
      )}
      <div className="engine-terminal-meta">
        <span>
          {engine === "ghostty-web"
            ? "Ghostty VT · WebAssembly"
            : "xterm.js · ANSI terminal"}
        </span>
        <span>{size || "Auto fit"} · local demo</span>
      </div>
    </div>
  );
}
