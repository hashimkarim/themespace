"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  defaultPreferences,
  draftSnapshot,
  createPreferenceStore,
  SETTINGS_KEY,
  GUEST_DRAFT_KEY,
  siteVariables,
  siteAppearance,
  type Preferences,
} from "@/lib/preferences";
import { parseTheme, type Theme } from "@/lib/theme";

const CHANGE_EVENT = "themespace-preferences-change";
const preferenceStore = createPreferenceStore(() => localStorage);
const snapshot = () => preferenceStore.getSnapshot();
function subscribe(callback: () => void) {
  const listener = (event: StorageEvent) => {
    if (event.key === SETTINGS_KEY || event.key === null) {
      preferenceStore.refresh();
      callback();
    }
  };
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
const Context = createContext<{
  settings: Preferences;
  update: (patch: Partial<Preferences>) => void;
  applyTheme: (theme: Theme) => void;
  followDraft: (theme: Theme) => void;
  syncDraft: (theme: Theme) => void;
  reset: () => void;
  storageError: string;
  ready: boolean;
}>({
  settings: defaultPreferences,
  update: () => {},
  applyTheme: () => {},
  followDraft: () => {},
  syncDraft: () => {},
  reset: () => {},
  storageError: "",
  ready: false,
});
export function SitePreferences({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(
      subscribe,
      snapshot,
      () => defaultPreferences,
    ),
    [storageError, setStorageError] = useState("");
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const save = useCallback((next: Preferences) => {
    const saved = preferenceStore.save(next);
    setStorageError(
      saved
        ? ""
        : "Browser storage is unavailable. These settings will last until you close this page.",
    );
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  const update = useCallback(
    (patch: Partial<Preferences>) => save({ ...snapshot(), ...patch }),
    [save],
  );
  const followDraft = useCallback(
    (theme: Theme) =>
      update({ themeId: "draft", draftTheme: draftSnapshot(theme) }),
    [update],
  );
  const syncDraft = useCallback(
    (theme: Theme) => {
      const current = snapshot();
      if (current.themeId !== "draft") return;
      const next = draftSnapshot(theme);
      if (JSON.stringify(next) !== JSON.stringify(current.draftTheme))
        save({ ...current, draftTheme: next });
    },
    [save],
  );
  useEffect(() => {
    if (!ready) return;
    if (!settings.rememberDraft) {
      try {
        localStorage.removeItem(GUEST_DRAFT_KEY);
      } catch {}
    }
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const root = document.documentElement;
      root.dataset.siteMode = siteAppearance(
        settings,
        media.matches ? "dark" : "light",
      );
      root.dataset.siteTheme = settings.themeId;
      root.dataset.density = settings.density;
      root.dataset.motion = settings.motion;
      for (const [key, value] of Object.entries(
        siteVariables(settings, media.matches ? "dark" : "light"),
      ))
        root.style.setProperty(key, value);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings, ready]);
  return (
    <Context.Provider
      value={{
        settings,
        update,
        followDraft,
        syncDraft,
        applyTheme: (theme) =>
          update({ themeId: "custom", customTheme: parseTheme(theme) }),
        reset: () => save({ ...defaultPreferences }),
        storageError,
        ready,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSitePreferences = () => useContext(Context);
