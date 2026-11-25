import type { Appearance, Theme } from "../../../web/lib/theme";
import type { ScanSample } from "../core/scan";

export type AppearanceChoice = Appearance | "auto";
/** Where a theme came from; "studio" follows the ThemeSpace editor live. */
export type ThemeRef =
  | { kind: "public"; id: string }
  | { kind: "picked"; id: string }
  | { kind: "studio" };
export type ThemeEntry = { ref: ThemeRef; theme: Theme; detail?: string };
export type SiteAssignment = {
  ref: ThemeRef;
  theme: Theme;
  appearance: AppearanceChoice;
};

/** Background ⇄ page engine. */
export type EngineMessage =
  | { type: "ts:scan" }
  | {
      type: "ts:apply";
      theme: Theme;
      appearance: AppearanceChoice;
      label: string;
    }
  | { type: "ts:revert" }
  | { type: "ts:status" };
export type EngineStatus = {
  applied: boolean;
  label?: string;
  appearance?: Appearance;
  tier?: "tokens" | "computed";
};
export type ScanReply = { sample: ScanSample };

/** Popup / engine / bridge → background. */
export type BackgroundMessage =
  | { type: "library" }
  | { type: "tab-state"; tabId: number }
  | {
      type: "preview";
      tabId: number;
      entry: ThemeEntry;
      appearance: AppearanceChoice;
    }
  | { type: "revert"; tabId: number }
  | { type: "scan"; tabId: number }
  | { type: "save-picked"; theme: Theme }
  | { type: "delete-picked"; id: string }
  | { type: "assign"; origin: string; assignment: SiteAssignment | null }
  | { type: "publish"; theme: Theme }
  | { type: "engine-ready" }
  | { type: "studio-draft"; theme: Theme }
  | { type: "take-import" }
  | { type: "set-server"; server: string };

export type Library = {
  server: string;
  user: { name?: string; email?: string } | null;
  studio: { theme: Theme; at: string; live: boolean } | null;
  picked: Theme[];
  community: { id: string; theme: Theme; version: number }[];
  communityError?: string;
};
export type TabState = {
  origin: string | null;
  supported: boolean;
  status: EngineStatus | null;
  assignment: SiteAssignment | null;
  preview: { ref: ThemeRef; appearance: AppearanceChoice } | null;
};

/** window.postMessage protocol between themespace.app and the bridge script. */
export const BRIDGE_APP = "themespace-app";
export const BRIDGE_EXTENSION = "themespace-companion";
export type AppToBridge =
  | { source: typeof BRIDGE_APP; type: "ready" }
  | { source: typeof BRIDGE_APP; type: "draft"; theme: unknown };
export type BridgeToApp =
  | { source: typeof BRIDGE_EXTENSION; type: "hello" }
  | { source: typeof BRIDGE_EXTENSION; type: "import"; theme: Theme };

/**
 * Match pattern for a pinned site. Match patterns can't carry ports in every
 * browser, so this covers the host; the background still checks the exact origin.
 */
export const sitePattern = (origin: string) => {
  const url = new URL(origin);
  return `${url.protocol}//${url.hostname}/*`;
};
