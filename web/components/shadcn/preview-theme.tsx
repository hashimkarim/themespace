"use client";

import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { previewStyle } from "@/lib/preview-targets";
import { type Appearance, type Theme } from "@/lib/theme";
import { useSitePreferences } from "../site-preferences";

type PreviewTheme = { mode: Appearance; style: CSSProperties; motion: number };
const PreviewThemeContext = createContext<PreviewTheme | null>(null);

/** The preview uses the same semantic variables as the downloaded shadcn CSS. */
export function ShadcnThemeScope({
  theme,
  mode,
  children,
}: {
  theme: Theme;
  mode: Appearance;
  children: ReactNode;
}) {
  const { settings } = useSitePreferences();
  const value = useMemo(
    () => ({
      mode,
      style: {
        ...previewStyle(theme, mode),
        "--spacing": "var(--ts-spacing)",
        "--text-base": "var(--ts-font-size)",
        "--default-transition-duration": "var(--ts-motion)",
      } as CSSProperties,
      motion: settings.motion === "reduced" ? 0 : theme.style.motion,
    }),
    [theme, mode, settings.motion],
  );
  return (
    <PreviewThemeContext.Provider value={value}>
      <div
        className={`shadcn-preview-scope ${mode}`}
        data-theme={mode}
        data-motion={value.motion === 0 ? "off" : "on"}
        style={value.style}
      >
        {children}
      </div>
    </PreviewThemeContext.Provider>
  );
}

/** React context crosses Radix portals; DOM/CSS inheritance does not. */
export function PreviewPortalScope({ children }: { children: ReactNode }) {
  const theme = useContext(PreviewThemeContext);
  if (!theme) return children;
  return (
    <div
      className={`shadcn-preview-scope shadcn-preview-portal ${theme.mode}`}
      data-theme={theme.mode}
      data-motion={theme.motion === 0 ? "off" : "on"}
      style={{ ...theme.style, display: "contents" }}
    >
      {children}
    </div>
  );
}
