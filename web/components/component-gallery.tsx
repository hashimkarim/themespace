"use client";

import { useState } from "react";
import { type Appearance, type Theme } from "@/lib/theme";
import { ComponentLibrary } from "./component-library";
import { ShadcnPreviewLoader } from "./shadcn-preview-loader";

export type ComponentGalleryKind = "design-system" | "shadcn";

export function ComponentGallery({
  theme,
  mode,
  compact = false,
  initialLibrary = "design-system",
}: {
  theme: Theme;
  mode: Appearance;
  compact?: boolean;
  initialLibrary?: ComponentGalleryKind;
}) {
  const [library, setLibrary] = useState(initialLibrary);
  return (
    <div className="component-gallery">
      <div
        className="component-gallery-switcher"
        aria-label="Component collection"
      >
        <button
          aria-pressed={library === "design-system"}
          onClick={() => setLibrary("design-system")}
        >
          Design system <span>54</span>
        </button>
        <button
          aria-pressed={library === "shadcn"}
          onClick={() => setLibrary("shadcn")}
        >
          shadcn/ui <span>31</span>
        </button>
      </div>
      {library === "shadcn" ? (
        <ShadcnPreviewLoader theme={theme} mode={mode} compact={compact} />
      ) : (
        <ComponentLibrary theme={theme} mode={mode} compact={compact} />
      )}
    </div>
  );
}
