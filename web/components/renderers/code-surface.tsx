"use client";
import { useEffect, useMemo, useRef } from "react";
import {
  EDITOR_MESSAGE,
  EDITOR_READY,
  exampleCode,
  type EditorFrameConfig,
} from "@/lib/editor-preview";
import { type Appearance, type Theme } from "@/lib/theme";

/** An isolated browsing context keeps Monaco themes independent across open previews. */
export function CodeSurface({
  theme,
  mode,
  target,
  file,
  value,
  diff = false,
  onChange,
}: {
  theme: Theme;
  mode: Appearance;
  target: string;
  file: string;
  value?: string;
  diff?: boolean;
  onChange?: (value: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const payload = useMemo<EditorFrameConfig>(
    () => ({
      type: EDITOR_MESSAGE,
      theme,
      mode,
      target,
      file,
      value: value ?? exampleCode(theme, file),
      diff,
    }),
    [theme, mode, target, file, value, diff],
  );
  useEffect(() => {
    const send = () =>
      frame.current?.contentWindow?.postMessage(payload, location.origin);
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== location.origin
      )
        return;
      if (event.data?.type === EDITOR_READY) send();
      if (
        event.data?.type === "themespace-editor-change" &&
        event.data.file === file &&
        typeof event.data.value === "string" &&
        event.data.value.length <= 100000
      )
        onChange?.(event.data.value);
    };
    window.addEventListener("message", receive);
    send();
    return () => window.removeEventListener("message", receive);
  }, [payload, file, onChange]);
  return (
    <iframe
      ref={frame}
      src="/renderers/editor"
      title={`${target === "vscode" ? "Monaco" : "CodeMirror"} ${target} ${file} preview`}
      className={`engine-code-frame ${target === "obsidian" ? "markdown-engine" : ""}`}
      data-renderer={target === "vscode" ? "monaco" : "codemirror"}
      onLoad={() =>
        frame.current?.contentWindow?.postMessage(payload, location.origin)
      }
    />
  );
}
