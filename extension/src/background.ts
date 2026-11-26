import { parseTheme, presets, resolve, type Theme } from "../../web/lib/theme";
import { themeFromScan } from "./core/scan";
import type {
  AppearanceChoice,
  BackgroundMessage,
  EngineMessage,
  EngineStatus,
  Library,
  ScanReply,
  SiteAssignment,
  TabState,
  ThemeRef,
} from "./shared/messages";
import { sitePattern } from "./shared/messages";

const DEFAULT_SERVER = "https://themespace.app";
const ENGINE = "engine.js";
const PINNED_SCRIPT = "themespace-pinned";

type Stored = {
  server?: string;
  picked?: Theme[];
  sites?: Record<string, SiteAssignment>;
  studio?: { theme: Theme; at: string };
};
type Previews = Record<
  string,
  { ref: ThemeRef; theme: Theme; appearance: AppearanceChoice }
>;

const local = <K extends keyof Stored>(key: K) =>
  chrome.storage.local.get(key).then((v) => v[key] as Stored[K]);
const server = async () => (await local("server")) ?? DEFAULT_SERVER;
const previews = async () =>
  ((await chrome.storage.session.get("previews")).previews as
    Previews | undefined) ?? {};
const setPreviews = (value: Previews) =>
  chrome.storage.session.set({ previews: value });

const originOf = (url?: string) => {
  try {
    const u = new URL(url ?? "");
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
};
const label = (ref: ThemeRef, theme: Theme) =>
  ref.kind === "studio" ? `${theme.name} (studio draft)` : theme.name;

async function send<T>(tabId: number, message: EngineMessage): Promise<T> {
  const reply = await chrome.tabs.sendMessage(tabId, message);
  if (reply && typeof reply === "object" && "error" in reply)
    throw new Error(String((reply as { error: string }).error));
  return reply as T;
}
// Tabs where we're injecting the engine ourselves; their "engine-ready" isn't a page load.
const injecting = new Set<number>();
async function ensureEngine(tabId: number) {
  try {
    const status = await send<EngineStatus | undefined>(tabId, {
      type: "ts:status",
    });
    if (status && typeof status.applied === "boolean") return;
  } catch {
    /* engine not injected yet */
  }
  injecting.add(tabId);
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [ENGINE],
    });
  } finally {
    injecting.delete(tabId);
  }
}

function updateBadge(tabId: number, theme?: Theme) {
  try {
    if (!chrome.action?.setBadgeText) return;
    if (!theme) {
      void chrome.action.setBadgeText({ tabId, text: "" });
      return;
    }
    const accent = resolve(theme, theme.defaultAppearance).accentFill;
    void chrome.action.setBadgeBackgroundColor({ tabId, color: accent });
    void chrome.action.setBadgeText({ tabId, text: "●" });
  } catch {
    /* badge updates are best-effort */
  }
}

async function applyTo(
  tabId: number,
  ref: ThemeRef,
  theme: Theme,
  appearance: AppearanceChoice,
) {
  await ensureEngine(tabId);
  const status = await send<EngineStatus>(tabId, {
    type: "ts:apply",
    theme,
    appearance,
    label: label(ref, theme),
  });
  updateBadge(tabId, status.applied ? theme : undefined);
  return status;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(new URL(path, await server()), {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json() as Promise<T>;
}

async function library(): Promise<Library> {
  const [base, picked, stored, sites] = await Promise.all([
    server(),
    local("picked"),
    local("studio"),
    local("sites"),
  ]);
  const [session, draft, community] = await Promise.allSettled([
    fetchJson<{ user: Library["user"] }>("/api/session"),
    fetchJson<{ theme: unknown; updatedAt: string | null }>("/api/draft"),
    fetchJson<{ themes: { id: string; theme: unknown; version: number }[] }>(
      "/api/themes",
    ),
  ]);
  // The editor's live draft (pushed by the bridge) wins over the saved account draft.
  let studio: Library["studio"] = stored ? { ...stored, live: true } : null;
  if (draft.status === "fulfilled" && draft.value.theme) {
    try {
      const saved = parseTheme(draft.value.theme);
      if (!studio || (draft.value.updatedAt ?? "") > studio.at)
        studio = { theme: saved, at: draft.value.updatedAt ?? "", live: false };
    } catch {
      /* ignore an unreadable draft */
    }
  }
  const themes: Library["community"] = [];
  if (community.status === "fulfilled")
    for (const row of community.value.themes)
      try {
        themes.push({
          id: row.id,
          theme: parseTheme(row.theme),
          version: row.version,
        });
      } catch {
        /* skip invalid rows */
      }
  for (const preset of presets)
    themes.push({
      id: `preset-${preset.id}`,
      theme: preset,
      version: 1,
      preset: true,
    });
  return {
    server: base,
    user: session.status === "fulfilled" ? session.value.user : null,
    studio,
    picked: picked ?? [],
    community: themes,
    sites: sites ?? {},
    communityError:
      community.status === "rejected"
        ? "Offline — showing starter palettes."
        : undefined,
  };
}

/**
 * One registered content script per pinned site, so one site the browser
 * rejects can't stop the others. Sites without granted access are skipped.
 */
async function syncPinnedScripts() {
  const sites = (await local("sites")) ?? {};
  const wanted = new Map<string, string>();
  for (const origin of Object.keys(sites)) {
    const pattern = sitePattern(origin);
    if (await chrome.permissions.contains({ origins: [pattern] }))
      wanted.set(
        `${PINNED_SCRIPT}-${pattern.replace(/[^a-z0-9]/gi, "_")}`,
        pattern,
      );
  }
  const existing = await chrome.scripting.getRegisteredContentScripts();
  const stale = existing
    .map((s) => s.id)
    .filter((id) => id.startsWith(PINNED_SCRIPT) && !wanted.has(id));
  if (stale.length)
    await chrome.scripting.unregisterContentScripts({ ids: stale });
  const have = new Set(existing.map((s) => s.id));
  for (const [id, pattern] of wanted)
    if (!have.has(id))
      try {
        await chrome.scripting.registerContentScripts([
          { id, matches: [pattern], js: [ENGINE], runAt: "document_idle" },
        ]);
      } catch (error) {
        console.warn("ThemeSpace couldn't register", pattern, error);
      }
}

async function tabState(tabId: number): Promise<TabState> {
  const tab = await chrome.tabs.get(tabId);
  const origin = originOf(tab.url);
  const sites = (await local("sites")) ?? {};
  const preview = (await previews())[tabId];
  let status: EngineStatus | null = null;
  try {
    const reply = await send<EngineStatus | undefined>(tabId, {
      type: "ts:status",
    });
    if (reply && typeof reply.applied === "boolean") status = reply;
  } catch {
    /* engine not injected yet */
  }
  return {
    origin,
    supported: Boolean(origin),
    status,
    assignment: origin ? (sites[origin] ?? null) : null,
    preview: preview
      ? {
          ref: preview.ref,
          theme: preview.theme,
          appearance: preview.appearance,
        }
      : null,
  };
}

/** Live preview: re-apply the editor's draft wherever it's showing. */
async function studioChanged(theme: Theme) {
  await chrome.storage.local.set({
    studio: { theme, at: new Date().toISOString() },
  });
  const all = await previews();
  const sites = (await local("sites")) ?? {};
  for (const [tabId, preview] of Object.entries(all))
    if (preview.ref.kind === "studio") {
      all[tabId] = { ...preview, theme };
      applyTo(Number(tabId), preview.ref, theme, preview.appearance).catch(
        () => {},
      );
    }
  await setPreviews(all);
  let changed = false;
  for (const site of Object.values(sites))
    if (site.ref.kind === "studio") {
      site.theme = theme;
      changed = true;
    }
  if (changed) {
    await chrome.storage.local.set({ sites });
    for (const tab of await chrome.tabs.query({})) {
      const origin = originOf(tab.url);
      const site = origin && sites[origin];
      if (tab.id && site && site.ref.kind === "studio" && !all[tab.id])
        applyTo(tab.id, site.ref, theme, site.appearance).catch(() => {});
    }
  }
}

async function openForPublish(theme: Theme) {
  await chrome.storage.session.set({ pendingImport: theme });
  const base = await server();
  const [existing] = await chrome.tabs.query({ url: `${base}/*` });
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId)
      await chrome.windows.update(existing.windowId, { focused: true });
    // Deliver directly when the editor is already live, preserving undo history.
    try {
      const reply = (await chrome.tabs.sendMessage(existing.id, {
        type: "ts:import",
        theme,
      })) as { handled?: boolean } | undefined;
      if (reply?.handled) {
        await chrome.storage.session.remove("pendingImport");
        return;
      }
    } catch {
      /* tab hasn't loaded the bridge yet; fall back to navigation */
    }
    await chrome.tabs.update(existing.id, {
      active: true,
      url: `${base}/?companion=import`,
    });
  } else await chrome.tabs.create({ url: `${base}/?companion=import` });
}

/** Only the configured ThemeSpace (not any page on localhost) may sync drafts and imports. */
async function fromServer(sender: chrome.runtime.MessageSender) {
  return (
    !!sender.tab && originOf(sender.url ?? sender.tab.url) === (await server())
  );
}

async function handle(
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
) {
  switch (message.type) {
    case "library":
      return library();
    case "tab-state":
      return tabState(message.tabId);
    case "preview": {
      const { tabId, entry, appearance } = message;
      const status = await applyTo(tabId, entry.ref, entry.theme, appearance);
      const all = await previews();
      all[tabId] = { ref: entry.ref, theme: entry.theme, appearance };
      await setPreviews(all);
      return status;
    }
    case "revert": {
      const all = await previews();
      delete all[message.tabId];
      await setPreviews(all);
      await ensureEngine(message.tabId);
      const res = await send(message.tabId, { type: "ts:revert" });
      updateBadge(message.tabId);
      return res;
    }
    case "peek": {
      const tabId = message.tabId;
      await ensureEngine(tabId);
      if (message.active) {
        return send(tabId, { type: "ts:revert" });
      }
      const all = await previews();
      const prev = all[tabId];
      if (prev)
        return applyTo(tabId, prev.ref, prev.theme, prev.appearance);
      const tab = await chrome.tabs.get(tabId);
      const origin = originOf(tab.url);
      const site = origin ? ((await local("sites")) ?? {})[origin] : null;
      if (site) {
        const theme =
          site.ref.kind === "studio"
            ? ((await local("studio"))?.theme ?? site.theme)
            : site.theme;
        return applyTo(tabId, site.ref, theme, site.appearance);
      }
      return null;
    }
    case "scan": {
      // The engine keeps the site's own colors from before any theme, so scanning never reverts.
      await ensureEngine(message.tabId);
      const { sample } = await send<ScanReply>(message.tabId, {
        type: "ts:scan",
      });
      return themeFromScan(sample).theme;
    }
    case "save-picked": {
      const theme = parseTheme(message.theme);
      const picked = ((await local("picked")) ?? []).filter(
        (t) => t.id !== theme.id,
      );
      await chrome.storage.local.set({
        picked: [theme, ...picked].slice(0, 40),
      });
      return theme;
    }
    case "delete-picked": {
      const picked = ((await local("picked")) ?? []).filter(
        (t) => t.id !== message.id,
      );
      await chrome.storage.local.set({ picked });
      return null;
    }
    case "import-backup": {
      const existingPicked = (await local("picked")) ?? [];
      const mergedPicked = new Map<string, Theme>(
        existingPicked.map((t) => [t.id, t]),
      );
      let pickedCount = 0;
      for (const item of message.picked ?? []) {
        try {
          const valid = parseTheme(item);
          mergedPicked.set(valid.id, valid);
          pickedCount++;
        } catch {
          /* skip invalid entries */
        }
      }
      const existingSites = (await local("sites")) ?? {};
      let siteCount = 0;
      for (const [origin, raw] of Object.entries(message.sites ?? {})) {
        if (!originOf(origin) || !raw || typeof raw !== "object") continue;
        const entry = raw as Partial<SiteAssignment>;
        try {
          const validTheme = parseTheme(entry.theme);
          const appearance: AppearanceChoice =
            entry.appearance === "dark" || entry.appearance === "light"
              ? entry.appearance
              : "auto";
          const ref: ThemeRef =
            entry.ref && typeof entry.ref === "object" && "kind" in entry.ref
              ? (entry.ref as ThemeRef)
              : { kind: "picked", id: validTheme.id };
          existingSites[origin] = { ref, theme: validTheme, appearance };
          siteCount++;
        } catch {
          /* skip invalid site entries */
        }
      }
      await chrome.storage.local.set({
        picked: [...mergedPicked.values()].slice(0, 40),
        sites: existingSites,
      });
      await syncPinnedScripts();
      return { pickedCount, siteCount };
    }
    case "assign": {
      const sites = (await local("sites")) ?? {};
      if (message.assignment) sites[message.origin] = message.assignment;
      else delete sites[message.origin];
      await chrome.storage.local.set({ sites });
      // Give back access to a host once nothing pinned needs it.
      const pattern = sitePattern(message.origin);
      if (
        !message.assignment &&
        !Object.keys(sites).some((o) => sitePattern(o) === pattern) &&
        !(chrome.runtime.getManifest().host_permissions ?? []).includes(pattern)
      )
        await chrome.permissions
          .remove({ origins: [pattern] })
          .catch(() => false);
      await syncPinnedScripts();
      return sites[message.origin] ?? null;
    }
    case "publish":
      await openForPublish(parseTheme(message.theme));
      return null;
    case "save-from-app": {
      if (!(await fromServer(sender))) return null;
      const theme = parseTheme(message.theme);
      const picked = ((await local("picked")) ?? []).filter(
        (t) => t.id !== theme.id,
      );
      await chrome.storage.local.set({
        picked: [theme, ...picked].slice(0, 40),
      });
      return theme.name;
    }
    case "engine-ready": {
      // A page loaded with the engine: show its pinned theme unless a preview overrides it.
      const tabId = sender.tab?.id;
      const origin = originOf(sender.tab?.url ?? sender.url);
      if (tabId === undefined || !origin || injecting.has(tabId)) return null;
      const site = ((await local("sites")) ?? {})[origin];
      if (site && sender.frameId === 0) {
        const theme =
          site.ref.kind === "studio"
            ? ((await local("studio"))?.theme ?? site.theme)
            : site.theme;
        await send(tabId, {
          type: "ts:apply",
          theme,
          appearance: site.appearance,
          label: label(site.ref, theme),
        });
        updateBadge(tabId, theme);
      }
      return null;
    }
    case "studio-draft":
      if (!(await fromServer(sender))) return null;
      await studioChanged(parseTheme(message.theme));
      return null;
    case "take-import": {
      if (!(await fromServer(sender))) return null;
      const { pendingImport } =
        await chrome.storage.session.get("pendingImport");
      await chrome.storage.session.remove("pendingImport");
      return pendingImport ?? null;
    }
    case "set-server": {
      const url = new URL(message.server);
      if (!/^https?:$/.test(url.protocol))
        throw new Error("Use an http(s) address.");
      await chrome.storage.local.set({ server: url.origin });
      return url.origin;
    }
  }
}

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, sender, reply) => {
    // Only the popup and our own scripts talk to the background.
    if (sender.id !== chrome.runtime.id) return false;
    handle(message, sender).then(
      (value) => reply({ ok: true, value }),
      (error) =>
        reply({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
    );
    return true;
  },
);
// Previews last until the tab navigates; pinned sites re-apply on load.
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== "loading") return;
  updateBadge(tabId);
  const all = await previews();
  if (all[tabId]) {
    delete all[tabId];
    await setPreviews(all);
  }
});
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const all = await previews();
  if (all[tabId]) {
    delete all[tabId];
    await setPreviews(all);
  }
});

function setupContextMenus() {
  if (!chrome.contextMenus?.create) return;
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: "themespace-toggle",
      title: "Toggle ThemeSpace on this page",
      contexts: ["page"],
    });
    chrome.contextMenus.create({
      id: "themespace-pickup",
      title: "Pick up this site's theme",
      contexts: ["page"],
    });
    chrome.contextMenus.create({
      id: "themespace-studio",
      title: "Open ThemeSpace Studio",
      contexts: ["page", "action"],
    });
  });
}

async function toggleTab(tabId: number, url?: string) {
  const origin = originOf(url);
  if (!origin) return;
  try {
    const reply = await send<EngineStatus | undefined>(tabId, {
      type: "ts:status",
    });
    if (reply?.applied) {
      const all = await previews();
      delete all[tabId];
      await setPreviews(all);
      await send(tabId, { type: "ts:revert" });
      updateBadge(tabId);
      return;
    }
  } catch {
    /* not applied yet */
  }
  const sites = (await local("sites")) ?? {};
  const site = sites[origin];
  if (site) {
    const theme =
      site.ref.kind === "studio"
        ? ((await local("studio"))?.theme ?? site.theme)
        : site.theme;
    await applyTo(tabId, site.ref, theme, site.appearance).catch(() => {});
    return;
  }
  const studio = await local("studio");
  const picked = (await local("picked")) ?? [];
  const fallback = studio
    ? { ref: { kind: "studio" } as ThemeRef, theme: studio.theme }
    : picked[0]
      ? { ref: { kind: "picked", id: picked[0].id } as ThemeRef, theme: picked[0] }
      : { ref: { kind: "public", id: `preset-${presets[0].id}` } as ThemeRef, theme: presets[0] };
  await applyTo(tabId, fallback.ref, fallback.theme, "auto").catch(() => {});
  const all = await previews();
  all[tabId] = { ref: fallback.ref, theme: fallback.theme, appearance: "auto" };
  await setPreviews(all);
}

async function pickupTab(tabId: number, url?: string) {
  if (!originOf(url)) return;
  await ensureEngine(tabId);
  const { sample } = await send<ScanReply>(tabId, { type: "ts:scan" });
  const theme = parseTheme(themeFromScan(sample).theme);
  const picked = ((await local("picked")) ?? []).filter(
    (t) => t.id !== theme.id,
  );
  await chrome.storage.local.set({
    picked: [theme, ...picked].slice(0, 40),
  });
  await openForPublish(theme);
}

chrome.runtime.onInstalled.addListener(() => {
  void syncPinnedScripts();
  setupContextMenus();
});
chrome.runtime.onStartup.addListener(() => {
  void syncPinnedScripts();
  setupContextMenus();
});
chrome.permissions.onRemoved.addListener(() => void syncPinnedScripts());
// The popup can close while the permission prompt is open; finish pinning here.
chrome.permissions.onAdded.addListener(() => void syncPinnedScripts());

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "themespace-studio") {
    void server().then((base) => chrome.tabs.create({ url: base }));
    return;
  }
  if (!tab?.id) return;
  if (info.menuItemId === "themespace-toggle")
    void toggleTab(tab.id, tab.url);
  else if (info.menuItemId === "themespace-pickup")
    void pickupTab(tab.id, tab.url).catch(() => {});
});

// Keyboard shortcuts: Alt+Shift+T toggles theming, Alt+Shift+P picks up the site.
chrome.commands?.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  if (command === "toggle-theme") await toggleTab(tab.id, tab.url);
  else if (command === "pick-site")
    await pickupTab(tab.id, tab.url).catch(() => {});
});
