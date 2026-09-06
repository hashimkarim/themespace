"use client";

import { lazy, Suspense } from "react";
import { type Appearance, type Theme } from "@/lib/theme";

// Keep charts, calendars, and the component gallery out of the initial Studio bundle.
const Gallery = lazy(() =>
  import("./shadcn-preview").then((module) => ({
    default: module.ShadcnPreview,
  })),
);

export function ShadcnPreviewLoader(props: {
  theme: Theme;
  mode: Appearance;
  compact?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="shadcn-loading" role="status">
          <span className="live-dot" />
          Loading shadcn/ui components…
        </div>
      }
    >
      <Gallery {...props} />
    </Suspense>
  );
}
