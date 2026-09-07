"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Keep the complete app scene visible in a viewport-sized studio panel. */
export function FittedPreview({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const outer = viewport.current;
    const inner = content.current;
    if (!outer || !inner) return;
    const fit = () => {
      outer.style.setProperty("--scene-height", `${outer.clientHeight}px`);
      const scale = Math.min(
        1,
        outer.clientHeight / Math.max(1, inner.scrollHeight),
      );
      inner.style.setProperty("--scene-scale", String(scale));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    observer.observe(inner);
    fit();
    return () => observer.disconnect();
  }, []);
  return (
    <div className="fitted-preview" ref={viewport}>
      <div className="fitted-preview-scene" ref={content}>
        {children}
      </div>
    </div>
  );
}
