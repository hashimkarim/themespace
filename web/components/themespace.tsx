"use client";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  Download,
  Copy,
  FileCode2,
  ExternalLink,
  FileJson2,
  GitFork,
  Globe2,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Moon,
  Paintbrush,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sun,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  baseRoles,
  contrast,
  extraRoles,
  fontOptions,
  hexPattern,
  monoOptions,
  parseTheme,
  presets,
  remixTheme,
  resolve,
  slugify,
  type Appearance,
  type BaseRole,
  type Theme,
} from "@/lib/theme";
import { categories, exportTargets, targets, type Target } from "@/lib/targets";
import { downloadBlob } from "@/lib/bundle";
import { ThemePreview } from "./preview";
import { PreviewWorkspace } from "./preview-workspace";
import {
  ComponentGallery,
  type ComponentGalleryKind,
} from "./component-gallery";
import { ExportWorkspace } from "./export-workspace";
import { SettingsPage } from "./settings";
import { AccountPage } from "./account";
import { AccountProvider } from "./account-provider";
import { AccountButton } from "./account-button";
import { authClient } from "@/lib/auth-client";
import type { AccountUser } from "@/lib/account";
import { useSitePreferences } from "./site-preferences";
import { readPreferences, GUEST_DRAFT_KEY } from "@/lib/preferences";
import { ThemedSelect } from "./ui/select";
import { ImagePalettePicker } from "./image-palette-picker";
import { applyPalettes, randomPalettes } from "@/lib/palette-tools";
import type { PublishedTheme } from "@/lib/store";

type View =
  | "studio"
  | "explore"
  | "integrations"
  | "theme"
  | "settings"
  | "components"
  | "account";
type Entry = {
  id: string;
  theme: Theme;
  version: number;
  publishedAt?: string;
  preset?: boolean;
};
type History = { present: Theme; past: Theme[]; future: Theme[] };
type Action =
  | { type: "edit"; theme: Theme }
  | { type: "load"; theme: Theme }
  | { type: "undo" }
  | { type: "redo" };
function reducer(state: History, action: Action): History {
  if (action.type === "load")
    return { present: action.theme, past: [], future: [] };
  if (action.type === "edit") {
    if (JSON.stringify(state.present) === JSON.stringify(action.theme))
      return state;
    return {
      present: action.theme,
      past: [...state.past.slice(-49), state.present],
      future: [],
    };
  }
  if (action.type === "undo" && state.past.length)
    return {
      present: state.past.at(-1)!,
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future],
    };
  if (action.type === "redo" && state.future.length)
    return {
      present: state.future[0],
      past: [...state.past, state.present],
      future: state.future.slice(1),
    };
  return state;
}
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = (await response.json()) as { error?: string };
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}
const presetEntries: Entry[] = presets.map((theme) => ({
  id: `preset-${theme.id}`,
  theme,
  version: 1,
  preset: true,
}));
const roleLabel = (s: string) =>
  s
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/^Ansi/, "ANSI ");

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [input, setInput] = useState({ original: value, text: value });
  const text = input.original === value ? input.text : value;
  return (
    <label className="color-row">
      <input
        type="color"
        aria-label={`${label} color`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setInput({ original: e.target.value, text: e.target.value });
        }}
      />
      <span>{label}</span>
      <input
        className="hex-input"
        aria-label={`${label} hex`}
        spellCheck={false}
        maxLength={7}
        value={text}
        onBlur={() => setInput({ original: value, text: value })}
        onChange={(e) => {
          const next = e.target.value;
          const valid = hexPattern.test(next);
          setInput({
            original: valid ? next.toLowerCase() : value,
            text: next,
          });
          if (valid) onChange(next.toLowerCase());
        }}
      />
    </label>
  );
}
function TargetMark({ target }: { target: Target }) {
  return (
    <span
      className="target-mark"
      style={{ "--target-color": target.color } as CSSProperties}
    >
      {target.name === "shadcn/ui" ? (
        <span className="shadcn-mark" />
      ) : (
        target.name
          .split(/[ /]+/)
          .filter(Boolean)
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
      )}
    </span>
  );
}
function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal-content ${wide ? "modal-wide" : ""} ${className}`}
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <div className="modal-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={18} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ThemeSpace({
  initialView = "studio",
  initialEntry,
  initialLibrary,
}: {
  initialView?: View;
  initialEntry?: Entry;
  initialLibrary?: ComponentGalleryKind;
}) {
  const { settings, applyTheme, followDraft, syncDraft } = useSitePreferences();
  const [integrationPreview, setIntegrationPreview] = useState<string | null>(
    null,
  );
  const [history, dispatch] = useReducer(reducer, {
    present: structuredClone(presets[0]),
    past: [],
    future: [],
  });
  const theme = history.present,
    appearance = theme.defaultAppearance;
  const [view, setView] = useState<View>(initialView),
    [detail, setDetail] = useState<Entry | undefined>(initialEntry);
  const [studioSection, setStudioSection] = useState("preview");
  const [controlTab, setControlTab] = useState("palette"),
    [advanced, setAdvanced] = useState(false);
  const [loaded, setLoaded] = useState(false),
    [draftReady, setDraftReady] = useState(false),
    [user, setUser] = useState<AccountUser | null>(null),
    [saveState, setSaveState] = useState("Opening workspace");
  const {
    data: liveSession,
    isPending: sessionPending,
    error: sessionError,
  } = authClient.useSession();
  const [draftChoice, setDraftChoice] = useState<{
    browser: Theme;
    saved: Theme;
  } | null>(null);
  const [authTransition, setAuthTransition] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(presetEntries),
    [catalogError, setCatalogError] = useState(""),
    [catalogLoading, setCatalogLoading] = useState(initialView === "explore");
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [modeFilter, setModeFilter] = useState("All appearances"),
    [targetFilter, setTargetFilter] = useState("All integrations");
  const [exportOpen, setExportOpen] = useState(false),
    [publishOpen, setPublishOpen] = useState(false),
    [publishing, setPublishing] = useState(false),
    [publishError, setPublishError] = useState("");
  const [exportTheme, setExportTheme] = useState<Theme>(theme);
  const [imagePaletteOpen, setImagePaletteOpen] = useState(false);
  const [exportSearch, setExportSearch] = useState(""),
    [toast, setToast] = useState(""),
    [showAllTargets, setShowAllTargets] = useState(false);
  const importRef = useRef<HTMLInputElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    latestJSON = useRef(""),
    saveQueue = useRef(Promise.resolve());
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  const change = (next: Theme) => dispatch({ type: "edit", theme: next });
  const refreshCatalog = useCallback(async () => {
    try {
      const data = await request<{ themes: PublishedTheme[] }>("/api/themes");
      setEntries([...presetEntries, ...data.themes]);
      setCatalogError("");
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : "Could not load published themes.",
      );
    } finally {
      setCatalogLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let guest: Theme | undefined,
          continueGuest = false;
        try {
          const local =
            sessionStorage.getItem("themespace:continue-guest") === "1"
              ? sessionStorage.getItem(GUEST_DRAFT_KEY)
              : readPreferences(localStorage).rememberDraft
                ? localStorage.getItem(GUEST_DRAFT_KEY) ||
                  sessionStorage.getItem(GUEST_DRAFT_KEY)
                : sessionStorage.getItem(GUEST_DRAFT_KEY);
          if (local) guest = parseTheme(JSON.parse(local));
          continueGuest =
            sessionStorage.getItem("themespace:continue-guest") === "1";
        } catch {
          /* Storage may be unavailable in private mode. */
        }
        if (guest && active) dispatch({ type: "load", theme: guest });
        const session = await request<{ user: AccountUser | null }>(
          "/api/session",
        );
        if (!active) return;
        setUser(session.user);
        if (session.user) {
          const draft = await request<{ theme: Theme | null }>("/api/draft");
          if (!active) return;
          if (
            continueGuest &&
            guest &&
            draft.theme &&
            JSON.stringify(guest) !== JSON.stringify(draft.theme)
          ) {
            setDraftChoice({ browser: guest, saved: parseTheme(draft.theme) });
            setSaveState("Choose a draft to continue");
            return;
          }
          const next =
            continueGuest && guest
              ? guest
              : draft.theme
                ? parseTheme(draft.theme)
                : undefined;
          if (next) {
            dispatch({ type: "load", theme: next });
          }
          setDraftReady(true);
          setSaveState("Ready to make it yours");
          try {
            sessionStorage.removeItem("themespace:continue-guest");
          } catch {}
        } else {
          if (guest) dispatch({ type: "load", theme: guest });
          setSaveState(
            readPreferences(localStorage).rememberDraft
              ? "Guest draft · saved in this browser"
              : "Guest draft · this tab only",
          );
        }
      } catch {
        if (active)
          setSaveState("Could not load your draft. Export edits as a backup.");
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    // Better Auth broadcasts sign-in/out changes across tabs. Reload the
    // workspace before a different account can inherit this tab's draft.
    if (
      !authTransition &&
      loaded &&
      !sessionPending &&
      !sessionError &&
      (user?.id ?? null) !== (liveSession?.user.id ?? null)
    ) {
      window.location.reload();
    }
  }, [
    authTransition,
    loaded,
    sessionPending,
    sessionError,
    user?.id,
    liveSession?.user.id,
  ]);
  useEffect(() => {
    if (!loaded || user) return;
    try {
      sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(theme));
      if (settings.rememberDraft)
        localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(theme));
      else localStorage.removeItem(GUEST_DRAFT_KEY);
      // Report the result of writing the draft to external browser storage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaveState(
        settings.rememberDraft
          ? "Guest draft · saved in this browser"
          : "Guest draft · this tab only",
      );
    } catch {
      setSaveState("Browser storage unavailable · export a backup");
    }
  }, [theme, loaded, user, settings.rememberDraft]);
  useEffect(() => {
    if (loaded) syncDraft(theme);
  }, [loaded, theme, settings.themeId, syncDraft]);
  function prepareSignIn() {
    if (user) return true;
    try {
      sessionStorage.setItem("themespace:guest-draft", JSON.stringify(theme));
      sessionStorage.setItem("themespace:continue-guest", "1");
      return true;
    } catch {
      notify(
        "Download your source before signing in; browser storage is unavailable.",
      );
      return false;
    }
  }
  function stageSignIn(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!prepareSignIn()) event.preventDefault();
  }
  useEffect(() => {
    if (
      !draftReady ||
      !user ||
      sessionPending ||
      sessionError ||
      liveSession?.user.id !== user.id
    )
      return;
    const serialized = JSON.stringify(theme);
    latestJSON.current = serialized;
    const timer = setTimeout(() => {
      setSaveState("Saving…");
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(async () => {
          try {
            await request("/api/draft", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-ThemeSpace-Owner": user.id,
              },
              body: serialized,
            });
            if (latestJSON.current === serialized)
              setSaveState("All changes saved");
          } catch {
            if (latestJSON.current === serialized)
              setSaveState("Not saved — export a backup");
          }
        });
    }, 650);
    return () => clearTimeout(timer);
  }, [
    theme,
    draftReady,
    user,
    sessionPending,
    sessionError,
    liveSession?.user.id,
  ]);
  function chooseDraft(next: Theme) {
    dispatch({ type: "load", theme: next });
    setDraftChoice(null);
    setDraftReady(true);
    try {
      sessionStorage.removeItem("themespace:continue-guest");
    } catch {}
  }
  async function beforeSignOut() {
    if (!user || !draftReady) return;
    await saveQueue.current.catch(() => {});
    await request("/api/draft", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-ThemeSpace-Owner": user.id,
      },
      body: JSON.stringify(theme),
    });
  }
  useEffect(() => {
    document.title =
      view === "theme" && detail
        ? `${detail.theme.name} — ThemeSpace`
        : view === "studio"
          ? "ThemeSpace — One theme. Yours everywhere."
          : `${view[0].toUpperCase() + view.slice(1)} — ThemeSpace`;
  }, [view, detail]);
  useEffect(() => {
    // This fetch synchronizes external collection data; state updates follow the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === "explore") void refreshCatalog();
  }, [view, refreshCatalog]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        el.matches("input,textarea,select,[role=combobox],[role=switch]") ||
        el.isContentEditable
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      if (path.startsWith("/themes/")) {
        const id = path.split("/")[2],
          preset = presetEntries.find((e) => e.id === id);
        if (preset) {
          setDetail(preset);
          setView("theme");
        } else
          request<PublishedTheme>(`/api/themes/${encodeURIComponent(id)}`)
            .then((entry) => {
              setDetail(entry);
              setView("theme");
            })
            .catch((error) => notify(error.message));
      } else
        setView(
          path === "/explore"
            ? "explore"
            : path === "/integrations"
              ? "integrations"
              : path === "/settings"
                ? "settings"
                : path === "/account" || path.startsWith("/account/")
                  ? "account"
                  : path === "/components"
                    ? "components"
                    : "studio",
        );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [notify]);
  function navigate(next: View, entry?: Entry) {
    setQuery("");
    setCategory("All");
    setModeFilter("All appearances");
    setTargetFilter("All integrations");
    if (entry) setDetail(entry);
    setView(next);
    if (next === "explore") setCatalogLoading(true);
    window.history.pushState(
      {},
      "",
      next === "studio"
        ? "/"
        : next === "theme"
          ? `/themes/${entry?.id ?? detail?.id}`
          : `/${next}`,
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function startRemix(entry: Entry) {
    if (!loaded) {
      notify("Your workspace is still opening. Please try again in a moment.");
      return;
    }
    const next = remixTheme(entry.theme, entry.version);
    next.id = `${slugify(entry.theme.name).slice(0, 48)}-${crypto.randomUUID().slice(0, 8)}`;
    next.parent!.id = entry.id;
    dispatch({ type: "edit", theme: next });
    navigate("studio");
    notify(`Made a personal copy of ${entry.theme.name}.`);
  }
  function updateColor(role: BaseRole, value: string) {
    const p = theme.modes[appearance]!;
    change({
      ...theme,
      modes: { ...theme.modes, [appearance]: { ...p, [role]: value } },
    });
  }
  function setOverride(role: string, value?: string) {
    const p = theme.modes[appearance]!,
      overrides = { ...p.overrides };
    if (value) overrides[role] = value;
    else delete overrides[role];
    change({
      ...theme,
      modes: { ...theme.modes, [appearance]: { ...p, overrides } },
    });
  }
  function toggleTarget(id: string) {
    change({
      ...theme,
      targets: theme.targets.includes(id)
        ? theme.targets.filter((t) => t !== id)
        : [...theme.targets, id],
    });
  }
  function openExport(source = theme) {
    setExportTheme(structuredClone(source));
    setExportOpen(true);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied to clipboard.");
    } catch {
      notify("Clipboard unavailable. Download the file instead.");
    }
  }
  async function importTheme(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 65_536)
        throw new Error("Choose a theme JSON file smaller than 64 KB.");
      const next = parseTheme(JSON.parse(await file.text()));
      const removed = next.targets.filter(
        (id) => !exportTargets.some((t) => t.id === id),
      );
      next.targets = next.targets.filter((id) =>
        exportTargets.some((t) => t.id === id),
      );
      dispatch({ type: "edit", theme: next });
      notify(
        removed.length
          ? "Theme imported; unavailable targets were removed."
          : "Theme imported. Make yourself at home.",
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not import that file.",
      );
    } finally {
      event.target.value = "";
    }
  }
  async function publish() {
    setPublishing(true);
    setPublishError("");
    try {
      const entry = await request<PublishedTheme>("/api/themes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { "X-ThemeSpace-Owner": user.id } : {}),
        },
        body: JSON.stringify(theme),
      });
      setPublishOpen(false);
      navigate("theme", entry);
      notify(`Published ${theme.name} · version ${entry.version}.`);
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Publishing failed.",
      );
    } finally {
      setPublishing(false);
    }
  }
  const c = resolve(theme, appearance),
    availableForExport = exportTargets.filter((t) =>
      `${t.name} ${t.category}`
        .toLowerCase()
        .includes(exportSearch.toLowerCase()),
    );
  const selectedCount = theme.targets.length,
    activeTheme = view === "theme" && detail ? detail.theme : theme;
  const [detailMode, setDetailMode] = useState<Appearance | undefined>();
  const displayMode = activeTheme.modes[
    detailMode ?? activeTheme.defaultAppearance
  ]
    ? (detailMode ?? activeTheme.defaultAppearance)
    : activeTheme.defaultAppearance;
  const filteredEntries = entries.filter(
    (e) =>
      (e.theme.name + " " + e.theme.author + " " + e.theme.description)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (modeFilter === "All appearances" ||
        e.theme.modes[modeFilter.toLowerCase() as Appearance]) &&
      (targetFilter === "All integrations" ||
        e.theme.targets.includes(targetFilter)),
  );
  const filteredTargets = targets.filter(
    (t) =>
      (t.name + " " + t.summary).toLowerCase().includes(query.toLowerCase()) &&
      (category === "All" || t.category === category),
  );
  return (
    <AccountProvider
      beforeSignIn={prepareSignIn}
      beforeSignOut={beforeSignOut}
      onSessionTransition={setAuthTransition}
    >
      <div className={`site-shell ${view === "studio" ? "studio-shell" : ""}`}>
        <header className="site-header">
          <Link
            className="brand"
            href="/"
            prefetch={false}
            onClick={(e) => {
              e.preventDefault();
              navigate("studio");
            }}
          >
            <span className="brand-mark" />
            themespace<span className="beta">BETA</span>
          </Link>
          <nav aria-label="Main navigation">
            {(
              [
                "studio",
                "explore",
                "integrations",
                "components",
                "settings",
              ] as const
            ).map((item) => (
              <a
                key={item}
                href={item === "studio" ? "/" : `/${item}`}
                className={view === item ? "active" : ""}
                aria-current={view === item ? "page" : undefined}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    navigate(item);
                  }
                }}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </a>
            ))}
          </nav>
          <div className="header-right">
            <span className="header-note">A little more you, everywhere.</span>
            {loaded && <AccountButton />}
          </div>
        </header>
        <main className="main-shell">
          {draftChoice && (
            <section
              className="panel draft-choice"
              aria-labelledby="draft-choice-title"
            >
              <div>
                <h2 id="draft-choice-title">
                  Two drafts. Which one should we open?
                </h2>
                <p>
                  Your account already has a saved draft. Your browser copy is
                  safe here.
                </p>
              </div>
              <div className="draft-choice-actions">
                <button
                  className="primary-button"
                  onClick={() => chooseDraft(draftChoice.saved)}
                >
                  Open saved draft · {draftChoice.saved.name}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => chooseDraft(draftChoice.browser)}
                >
                  Replace saved draft with browser copy
                </button>
              </div>
            </section>
          )}
          {view === "account" && (
            <AccountPage user={user} loaded={loaded} onUserChange={setUser} />
          )}
          {view === "settings" && (
            <SettingsPage draft={theme} notify={notify} />
          )}
          {view === "components" && (
            <>
              <div className="studio-heading">
                <div>
                  <p className="eyebrow">THE PARTS OF YOUR DESIGN SYSTEM</p>
                  <h1>A place for every detail.</h1>
                  <p className="subheading">
                    Explore foundations, controls, layouts, and app surfaces in{" "}
                    {theme.name}.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => openExport()}
                >
                  Export design system <Download size={14} />
                </button>
              </div>
              <ComponentGallery
                theme={theme}
                mode={appearance}
                initialLibrary={initialLibrary}
              />
            </>
          )}
          {view === "studio" && (
            <>
              <div className="studio-heading">
                <div>
                  <p className="eyebrow">YOUR PERSONAL THEME STUDIO</p>
                  <h1>One theme. Every corner of your world.</h1>
                  <p className="subheading">
                    Find your colors. Make yourself at home.
                  </p>
                </div>
                <div className="heading-actions">
                  <span
                    className={`save-status ${saveState.startsWith("Not saved") ? "error-text" : ""}`}
                  >
                    {saveState === "Saving…" ? (
                      <LoaderCircle className="spin" size={13} />
                    ) : (
                      <span className="status-dot" />
                    )}
                    {saveState}
                  </span>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setPublishError("");
                      setPublishOpen(true);
                    }}
                    disabled={!loaded}
                  >
                    <Globe2 size={14} />
                    Publish theme
                  </button>
                </div>
              </div>
              <div className="studio-meta" inert={!loaded}>
                <div className="theme-identity">
                  <span
                    className="theme-color-dot"
                    style={{ background: c.accent }}
                  />
                  <input
                    aria-label="Theme name"
                    maxLength={80}
                    value={theme.name}
                    onChange={(e) => change({ ...theme, name: e.target.value })}
                    onBlur={() => {
                      if (!theme.name.trim())
                        change({ ...theme, name: "My theme" });
                    }}
                  />
                  <span className="meta-divider" />
                  <span className="small muted">
                    {theme.parent ? "Your personal remix" : "Starter palette"}
                  </span>
                </div>
                <div className="editor-tools">
                  <button
                    className="icon-button"
                    disabled={!history.past.length}
                    onClick={() => dispatch({ type: "undo" })}
                    aria-label="Undo"
                    title="Undo (Ctrl/⌘ Z)"
                  >
                    <Undo2 size={15} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={!history.future.length}
                    onClick={() => dispatch({ type: "redo" })}
                    aria-label="Redo"
                  >
                    <Redo2 size={15} />
                  </button>
                  <span className="meta-divider" />
                  <input
                    type="file"
                    accept="application/json,.json"
                    hidden
                    ref={importRef}
                    onChange={importTheme}
                  />
                  <button
                    className="text-button"
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={13} />
                    Import
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      downloadBlob(
                        "theme.json",
                        JSON.stringify(theme, null, 2),
                        "application/json",
                      )
                    }
                  >
                    <FileJson2 size={13} />
                    Source
                  </button>
                </div>
              </div>
              <nav className="studio-mobile-nav" aria-label="Studio sections">
                {[
                  { id: "controls", label: "Edit theme" },
                  { id: "preview", label: "Live preview" },
                  { id: "export", label: `Export · ${selectedCount}` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    aria-pressed={studioSection === id}
                    aria-controls={`theme-${id}`}
                    onClick={() => setStudioSection(id)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div
                className="studio-grid"
                data-studio-section={studioSection}
                inert={!loaded || !!draftChoice}
              >
                <aside className="panel controls-panel" id="theme-controls">
                  <div
                    className="control-tabs"
                    role="tablist"
                    aria-label="Theme controls"
                  >
                    {[
                      { id: "palette", icon: Paintbrush, label: "Palette" },
                      { id: "type", icon: SlidersHorizontal, label: "Style" },
                      { id: "details", icon: FileCode2, label: "Details" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={controlTab === tab.id}
                        onClick={() => setControlTab(tab.id)}
                      >
                        <tab.icon size={13} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="studio-controls-scroll">
                    {controlTab === "palette" && (
                      <>
                        <div className="panel-heading">
                          <h2>Your palette</h2>
                          <span className="small muted">{appearance}</span>
                        </div>
                        <p className="small muted">
                          Small changes. A whole different feeling.
                        </p>
                        <div className="palette-tools">
                          <button
                            type="button"
                            className="secondary-button"
                            title="Generate a new light and dark palette"
                            onClick={() => {
                              change(
                                applyPalettes(theme, randomPalettes(), true),
                              );
                              notify(
                                "New light and dark palettes. Undo to go back.",
                              );
                            }}
                          >
                            <Shuffle size={13} />
                            Randomize
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setImagePaletteOpen(true)}
                          >
                            <ImagePlus size={13} />
                            From image
                          </button>
                        </div>
                        {baseRoles.map((role) => (
                          <ColorField
                            key={`${appearance}-${role}`}
                            label={roleLabel(role)}
                            value={c[role]}
                            onChange={(v) => updateColor(role, v)}
                          />
                        ))}
                        <button
                          className="advanced-toggle"
                          onClick={() => setAdvanced(!advanced)}
                          aria-expanded={advanced}
                        >
                          Syntax, charts & ANSI
                          <ChevronDown
                            size={13}
                            className={advanced ? "rotate" : ""}
                          />
                        </button>
                        {advanced && (
                          <div className="advanced-colors">
                            {extraRoles.map((role) => (
                              <div key={role} className="override-row">
                                <ColorField
                                  key={`${appearance}-${role}`}
                                  label={roleLabel(role)}
                                  value={c[role]}
                                  onChange={(v) => setOverride(role, v)}
                                />
                                {theme.modes[appearance]?.overrides[role] && (
                                  <button
                                    className="reset-override"
                                    aria-label={`Reset ${roleLabel(role)}`}
                                    title="Return to derived color"
                                    onClick={() => setOverride(role)}
                                  >
                                    <RotateCcw size={10} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="contrast-summary">
                          <span>Text on background</span>
                          <b
                            className={
                              contrast(c.foreground, c.background) >= 4.5
                                ? "contrast-good"
                                : "contrast-warn"
                            }
                          >
                            {contrast(c.foreground, c.background).toFixed(2)}:1
                          </b>
                          <small>
                            {contrast(c.foreground, c.background) >= 4.5
                              ? "Meets 4.5:1 for this pair"
                              : "Below 4.5:1 for normal text"}
                          </small>
                        </div>
                        <div className="control-footer">
                          <span className="small muted">
                            A starting point for every mood
                          </span>
                          <div className="palette-strip">
                            {presetEntries.map((entry) => (
                              <button
                                key={entry.id}
                                title={`Remix ${entry.theme.name}`}
                                aria-label={`Remix ${entry.theme.name}`}
                                style={{
                                  background:
                                    entry.theme.modes[
                                      entry.theme.defaultAppearance
                                    ]!.accent,
                                }}
                                onClick={() => startRemix(entry)}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {controlTab === "type" && (
                      <div className="style-controls">
                        <h2>Give it some character.</h2>
                        <label>
                          Interface font
                          <ThemedSelect
                            label="Interface font"
                            value={theme.fonts.sans}
                            onValueChange={(value) =>
                              change({
                                ...theme,
                                fonts: { ...theme.fonts, sans: value },
                              })
                            }
                            options={fontOptions}
                          />
                        </label>
                        <label>
                          Code font
                          <ThemedSelect
                            label="Code font"
                            value={theme.fonts.mono}
                            onValueChange={(value) =>
                              change({
                                ...theme,
                                fonts: { ...theme.fonts, mono: value },
                              })
                            }
                            options={monoOptions}
                          />
                        </label>
                        <p className="small muted">
                          Font names are exported with system fallbacks. Load
                          your chosen fonts in the consuming app.
                        </p>
                        {[
                          {
                            key: "size",
                            label: "Base type size",
                            min: 11,
                            max: 22,
                            unit: "px",
                            value: theme.fonts.size,
                          },
                          {
                            key: "radius",
                            label: "Corner radius",
                            min: 0,
                            max: 24,
                            unit: "px",
                            value: theme.style.radius,
                          },
                          {
                            key: "spacing",
                            label: "Spacing unit",
                            min: 2,
                            max: 8,
                            unit: "px",
                            value: theme.style.spacing,
                          },
                          {
                            key: "shadow",
                            label: "Shadow strength",
                            min: 0,
                            max: 1,
                            step: 0.05,
                            unit: "",
                            value: theme.style.shadow,
                          },
                          {
                            key: "motion",
                            label: "Transition duration",
                            min: 0,
                            max: 600,
                            step: 25,
                            unit: "ms",
                            value: theme.style.motion,
                          },
                        ].map((control) => (
                          <label key={control.key} className="range-control">
                            <span>
                              {control.label}
                              <b>
                                {control.value}
                                {control.unit}
                              </b>
                            </span>
                            <input
                              aria-label={control.label}
                              type="range"
                              min={control.min}
                              max={control.max}
                              step={control.step ?? 1}
                              value={control.value}
                              onChange={(e) =>
                                change(
                                  control.key === "size"
                                    ? {
                                        ...theme,
                                        fonts: {
                                          ...theme.fonts,
                                          size: +e.target.value,
                                        },
                                      }
                                    : {
                                        ...theme,
                                        style: {
                                          ...theme.style,
                                          [control.key]: +e.target.value,
                                        },
                                      },
                                )
                              }
                            />
                          </label>
                        ))}
                        <p className="small muted">
                          Native apps keep any font, layout, or motion settings
                          their theme format does not support.
                        </p>
                      </div>
                    )}
                    {controlTab === "details" && (
                      <div className="style-controls">
                        <h2>Make it your own.</h2>
                        <label>
                          Theme name
                          <input
                            maxLength={80}
                            value={theme.name}
                            onChange={(e) =>
                              change({ ...theme, name: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Creator name
                          <input
                            maxLength={80}
                            value={theme.author}
                            onChange={(e) =>
                              change({ ...theme, author: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            maxLength={500}
                            rows={4}
                            value={theme.description}
                            onChange={(e) =>
                              change({ ...theme, description: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Distribution terms
                          <ThemedSelect
                            label="Distribution terms"
                            value={theme.license}
                            onValueChange={(value) =>
                              change({
                                ...theme,
                                license: value as Theme["license"],
                              })
                            }
                            options={[
                              "CC0-1.0",
                              "MIT",
                              "All rights reserved",
                              "Unspecified",
                            ]}
                          />
                        </label>
                        {theme.parent && (
                          <p className="small muted">
                            Remixed from <b>{theme.parent.name}</b> by{" "}
                            {theme.parent.author}. Attribution stays in your
                            export.
                          </p>
                        )}
                        <p className="small muted">
                          Publish an immutable version when you are ready. Your
                          draft stays private to your workspace.
                        </p>
                      </div>
                    )}
                  </div>
                </aside>
                <section className="preview-column" id="theme-preview">
                  <div className="preview-toolbar">
                    <span className="eyebrow">THE BIG PICTURE</span>
                    <div
                      className="appearance-toggle"
                      role="group"
                      aria-label="Appearance"
                    >
                      {(["light", "dark"] as const).map((mode) => (
                        <button
                          key={mode}
                          aria-pressed={appearance === mode}
                          disabled={!theme.modes[mode]}
                          title={
                            !theme.modes[mode]
                              ? `${mode} appearance is not in this theme`
                              : mode
                          }
                          onClick={() =>
                            change({ ...theme, defaultAppearance: mode })
                          }
                        >
                          {mode === "light" ? (
                            <Sun size={13} />
                          ) : (
                            <Moon size={13} />
                          )}
                          <span>{mode}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <PreviewWorkspace theme={theme} mode={appearance} fit />
                  <button
                    className="text-button use-site-theme"
                    aria-pressed={settings.themeId === "draft"}
                    onClick={() => {
                      followDraft(theme);
                      notify("ThemeSpace now follows your draft as you edit.");
                    }}
                  >
                    <Paintbrush size={13} />
                    {settings.themeId === "draft"
                      ? "Draft is live on ThemeSpace"
                      : "Use Draft live on ThemeSpace"}
                  </button>
                  <div className="studio-tip">
                    <Layers3 size={17} />
                    <div>
                      <strong>One source, all your favorite tools.</strong>
                      <span>
                        Colors flow through every export. Fine-tune syntax and
                        ANSI colors when you need to.
                      </span>
                    </div>
                    <button
                      onClick={() => navigate("integrations")}
                      className="icon-button"
                      aria-label="Browse integrations"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
                <aside className="panel export-panel" id="theme-export">
                  <div className="panel-heading">
                    <h2>Take it everywhere</h2>
                    <span className="count-pill">{selectedCount}</span>
                  </div>
                  <p className="small muted">
                    Your favorite tools, speaking the same language.
                  </p>
                  <div className="search-field compact">
                    <Search size={13} />
                    <input
                      aria-label="Search export targets"
                      placeholder="Find your tools…"
                      value={exportSearch}
                      onChange={(e) => setExportSearch(e.target.value)}
                    />
                  </div>
                  <div className="export-options">
                    {(showAllTargets || exportSearch
                      ? availableForExport
                      : availableForExport.filter((t) =>
                          [
                            "css",
                            "tailwind",
                            "shadcn",
                            "scss",
                            "vscode",
                            "ghostty",
                            "spicetify",
                            "betterdiscord",
                            "firefox",
                            "windows-terminal",
                          ].includes(t.id),
                        )
                    ).map((target) => (
                      <label key={target.id}>
                        <input
                          type="checkbox"
                          checked={theme.targets.includes(target.id)}
                          onChange={() => toggleTarget(target.id)}
                        />
                        <TargetMark target={target} />
                        <span>{target.name}</span>
                      </label>
                    ))}
                    {!availableForExport.length && (
                      <p className="small muted">No matching export targets.</p>
                    )}
                  </div>
                  <button
                    className="all-targets"
                    onClick={() => setShowAllTargets(!showAllTargets)}
                  >
                    {showAllTargets
                      ? "Show favorites"
                      : `Browse all ${exportTargets.length} exports`}
                    <ChevronDown size={12} />
                  </button>
                  <button
                    className="primary-button"
                    disabled={
                      !selectedCount ||
                      !theme.name.trim() ||
                      !theme.author.trim()
                    }
                    onClick={() => openExport()}
                  >
                    <ArrowDownToLine size={14} />
                    Export your theme
                  </button>
                  <p className="small muted centered">
                    Individual files or a complete theme repository.
                  </p>
                  <div className="export-note">
                    <Check size={13} />
                    <span>Open formats. Yours to keep.</span>
                  </div>
                </aside>
              </div>
            </>
          )}
          {view === "explore" && (
            <>
              <div className="studio-heading">
                <div>
                  <p className="eyebrow">
                    A LITTLE INSPIRATION GOES A LONG WAY
                  </p>
                  <h1>Find your kind of color.</h1>
                  <p className="subheading">
                    A collection of personal worlds. Pick one and make it yours.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => navigate("studio")}
                >
                  <Plus size={14} />
                  Create a theme
                </button>
              </div>
              <div className="catalog-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Search themes"
                    placeholder="Search themes, moods, creators…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <ThemedSelect
                  label="Filter themes by appearance"
                  value={modeFilter}
                  onValueChange={setModeFilter}
                  options={["All appearances", "Dark", "Light"]}
                />
                <ThemedSelect
                  label="Filter themes by integration"
                  value={targetFilter}
                  onValueChange={setTargetFilter}
                  options={[
                    "All integrations",
                    ...exportTargets.map((t) => ({
                      value: t.id,
                      label: t.name,
                    })),
                  ]}
                />
              </div>
              {catalogError && (
                <div className="notice warning">
                  {catalogError}
                  <button
                    className="text-button"
                    onClick={() => {
                      setCatalogLoading(true);
                      void refreshCatalog();
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              <div className="catalog-section-label">
                <span>{filteredEntries.length} themes to make your own</span>
                {catalogLoading && (
                  <span>
                    <LoaderCircle size={12} className="spin" />
                    Refreshing collection
                  </span>
                )}
              </div>
              <div className="theme-grid">
                {filteredEntries.map((entry) => (
                  <article key={entry.id} className="theme-card">
                    <button
                      className="theme-card-preview"
                      onClick={() => {
                        setDetailMode(undefined);
                        navigate("theme", entry);
                      }}
                      aria-label={`View ${entry.theme.name}`}
                    >
                      <ThemePreview
                        theme={entry.theme}
                        mode={entry.theme.defaultAppearance}
                        compact
                      />
                    </button>
                    <div className="theme-card-info">
                      <div>
                        <button
                          className="theme-title-button"
                          onClick={() => navigate("theme", entry)}
                        >
                          {entry.theme.name}
                        </button>
                        <span>
                          {entry.preset
                            ? "Starter palette"
                            : `By ${entry.theme.author} · v${entry.version}`}
                        </span>
                      </div>
                      <button
                        className="icon-button"
                        title="Remix this theme"
                        aria-label={`Remix ${entry.theme.name}`}
                        onClick={() => startRemix(entry)}
                      >
                        <GitFork size={16} />
                      </button>
                    </div>
                    <div className="theme-card-footer">
                      <div>
                        {baseRoles.slice(0, 5).map((key) => (
                          <i
                            key={key}
                            style={{
                              background: resolve(
                                entry.theme,
                                entry.theme.defaultAppearance,
                              )[key],
                            }}
                          />
                        ))}
                      </div>
                      <span>{entry.theme.targets.length} integrations</span>
                    </div>
                  </article>
                ))}
              </div>
              {!filteredEntries.length && !catalogLoading && (
                <div className="empty-state">
                  <Search />
                  <h2>No themes found.</h2>
                  <p>Try another color, name, or integration.</p>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setQuery("");
                      setTargetFilter("All integrations");
                      setModeFilter("All appearances");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className="collection-note">
                Starter palettes are curated references. Published themes appear
                here as real, versioned snapshots.
              </div>
            </>
          )}
          {view === "integrations" && (
            <>
              <div className="studio-heading">
                <div>
                  <p className="eyebrow">YOUR WORLD, CONNECTED BY COLOR</p>
                  <h1>All the places your theme can go.</h1>
                  <p className="subheading">
                    From your first browser tab to your last terminal command.
                  </p>
                </div>
                <div className="integration-count">
                  <strong>{exportTargets.length}</strong>
                  <span>
                    export targets
                    <br />
                    {targets.length - exportTargets.length} on the roadmap
                  </span>
                </div>
              </div>
              <div className="catalog-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Search integrations"
                    placeholder="Find an app, framework, or terminal…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <span className="small muted">
                  Choose a target to add it to your theme.
                </span>
              </div>
              <div className="category-tabs">
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    className={category === cat ? "selected" : ""}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                    {cat === "All" && <span>{targets.length}</span>}
                  </button>
                ))}
              </div>
              <div className="integration-grid">
                {filteredTargets.map((target) => (
                  <article
                    className={`integration-card ${target.status === "planned" ? "planned" : ""}`}
                    key={target.id}
                  >
                    <div className="integration-card-top">
                      <TargetMark target={target} />
                      <span
                        className={`integration-badge ${target.status === "planned" ? "planned" : target.method === "Client mod" ? "mod" : ""}`}
                      >
                        {target.status === "planned"
                          ? "Planned"
                          : target.category === "Web frameworks"
                            ? "Web export"
                            : "Beta export"}
                      </span>
                    </div>
                    <h2>{target.name}</h2>
                    <p>{target.summary}</p>
                    <div className="integration-tags">
                      <span>{target.format}</span>
                      <span>{target.method}</span>
                    </div>
                    {target.limitation && (
                      <p className="integration-limitation">
                        {target.limitation}
                      </p>
                    )}
                    <div className="integration-card-actions">
                      {target.status === "export" && (
                        <button
                          className="text-button"
                          onClick={() => setIntegrationPreview(target.id)}
                        >
                          Preview
                        </button>
                      )}
                      <a href={target.docs} target="_blank" rel="noreferrer">
                        Theme guide
                        <ExternalLink size={11} />
                      </a>
                      <button
                        className={
                          theme.targets.includes(target.id)
                            ? "added-button"
                            : "add-button"
                        }
                        disabled={target.status === "planned" || !loaded}
                        onClick={() => {
                          toggleTarget(target.id);
                          notify(
                            theme.targets.includes(target.id)
                              ? `${target.name} removed from export.`
                              : `${target.name} added to your theme.`,
                          );
                        }}
                      >
                        {target.status === "planned" ? (
                          "On roadmap"
                        ) : theme.targets.includes(target.id) ? (
                          <>
                            <Check size={12} />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus size={12} />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!filteredTargets.length && (
                <div className="empty-state">
                  <Search />
                  <h2>No matching integrations.</h2>
                  <p>Try a broader search or another category.</p>
                </div>
              )}
              <div className="collection-note">
                Native theme, client mod, extension, or config: each integration
                includes its own installation guide. Browser themes affect
                browser chrome; website content needs its own integration.
              </div>
            </>
          )}
          {view === "theme" && detail && (
            <>
              <button className="back-link" onClick={() => navigate("explore")}>
                ← Back to Explore
              </button>
              <div className="studio-heading">
                <div>
                  <p className="eyebrow">
                    {detail.preset
                      ? "A STARTER FOR YOUR NEXT THEME"
                      : `PUBLISHED THEME · VERSION ${detail.version}`}
                  </p>
                  <h1>{detail.theme.name}</h1>
                  <p className="subheading">
                    By {detail.theme.author} · {detail.theme.license}
                  </p>
                </div>
                <div className="detail-actions">
                  <button
                    className="secondary-button"
                    onClick={() => copy(window.location.href)}
                  >
                    <Copy size={14} />
                    Copy link
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => startRemix(detail)}
                  >
                    <GitFork size={14} />
                    Remix in Studio
                  </button>
                </div>
              </div>
              <div className="detail-grid">
                <div>
                  <div className="preview-toolbar">
                    <span className="eyebrow">A CLOSER LOOK</span>
                    <div className="appearance-toggle">
                      {(["light", "dark"] as const).map((mode) => (
                        <button
                          key={mode}
                          disabled={!detail.theme.modes[mode]}
                          aria-pressed={displayMode === mode}
                          onClick={() => setDetailMode(mode)}
                        >
                          {mode === "dark" ? (
                            <Moon size={12} />
                          ) : (
                            <Sun size={12} />
                          )}{" "}
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PreviewWorkspace theme={detail.theme} mode={displayMode} />
                </div>
                <aside className="panel detail-aside">
                  <h2>About this theme</h2>
                  <button
                    className="secondary-button full-width"
                    onClick={() => {
                      applyTheme(detail.theme);
                      notify(`${detail.theme.name} applied to ThemeSpace.`);
                    }}
                  >
                    <Paintbrush size={14} />
                    Use on ThemeSpace
                  </button>
                  <p>{detail.theme.description}</p>
                  {detail.theme.parent && (
                    <p className="small muted">
                      Remixed from {detail.theme.parent.name} by{" "}
                      {detail.theme.parent.author}.
                    </p>
                  )}
                  <h2>Ready for your tools</h2>
                  <div className="detail-targets">
                    {detail.theme.targets.map((id) => {
                      const target = targets.find((t) => t.id === id);
                      return target ? (
                        <span key={id}>
                          <TargetMark target={target} />
                          {target.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => openExport(detail.theme)}
                  >
                    <Download size={14} />
                    Download theme
                  </button>
                  <button
                    className="secondary-button full-width"
                    onClick={() =>
                      downloadBlob(
                        "theme.json",
                        JSON.stringify(detail.theme, null, 2),
                        "application/json",
                      )
                    }
                  >
                    <FileJson2 size={14} />
                    Download source
                  </button>
                  <p className="small muted">
                    Each download includes its own installation notes and a
                    reusable design system.
                  </p>
                </aside>
              </div>
            </>
          )}
          <footer className="site-footer">
            <span>
              Made by{" "}
              <a
                href="https://hashimkarim.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hashim Karim
              </a>
            </span>
            <span>
              <span className="footer-dot" />
              Built around open formats and a shared palette.
            </span>
          </footer>
        </main>
        {imagePaletteOpen && (
          <Modal
            open={imagePaletteOpen}
            onOpenChange={setImagePaletteOpen}
            title="A palette from your picture."
            description="Find the colors in a photo, artwork, or anything that inspires you."
            className="image-palette-modal"
          >
            <ImagePalettePicker
              appearance={appearance}
              onCancel={() => setImagePaletteOpen(false)}
              onApply={(palettes, both) => {
                change(applyPalettes(theme, palettes, both));
                setImagePaletteOpen(false);
                notify(
                  `Image palette applied to ${both ? "light and dark" : appearance}. Undo to go back.`,
                );
              }}
            />
          </Modal>
        )}
        {exportOpen && (
          <ExportWorkspace
            open={exportOpen}
            onOpenChange={setExportOpen}
            theme={exportTheme}
            notify={notify}
          />
        )}
        <Modal
          open={!!integrationPreview}
          onOpenChange={(open) => {
            if (!open) setIntegrationPreview(null);
          }}
          title={`${targets.find((t) => t.id === integrationPreview)?.name || "App"} preview`}
          description="Explore your theme in app layouts and interactive components. Each preview includes its coverage details."
          wide
        >
          {integrationPreview && (
            <PreviewWorkspace
              theme={theme}
              mode={appearance}
              initialTarget={integrationPreview}
              initialTab="integrations"
            />
          )}
        </Modal>
        <Modal
          open={publishOpen}
          onOpenChange={setPublishOpen}
          title="Share your kind of color."
          description="Publish a snapshot to this ThemeSpace collection. Further edits remain in your draft."
        >
          <div className="publish-summary">
            <div className="publish-colors">
              {baseRoles.map((role) => (
                <span key={role} style={{ background: c[role] }} />
              ))}
            </div>
            <h2>{theme.name}</h2>
            <p>{theme.description}</p>
            <div className="small muted">
              By {theme.author} · {theme.license} · {selectedCount} integrations
            </div>
          </div>
          {publishError && <p className="error-text">{publishError}</p>}
          {user ? (
            <button
              className="primary-button"
              disabled={
                publishing || !theme.name.trim() || !theme.author.trim()
              }
              onClick={() => void publish()}
            >
              {publishing ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <Globe2 size={14} />
              )}
              Publish this version
            </button>
          ) : (
            // Sign-in must start with the draft staged by this publication dialog.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a className="primary-button" href="/account" onClick={stageSignIn}>
              Sign in to publish
            </a>
          )}
          <p className="small muted centered">
            Visible to people who can access this ThemeSpace instance.
          </p>
        </Modal>
        {toast && (
          <div className="toast" role="status">
            <CheckCheck size={15} />
            {toast}
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </AccountProvider>
  );
}
