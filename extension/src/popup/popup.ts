import { resolve, slugify, type Theme } from "../../../web/lib/theme";
import type {
  AppearanceChoice,
  BackgroundMessage,
  Library,
  TabState,
  ThemeEntry,
  ThemeRef,
} from "../shared/messages";
import { sitePattern } from "../shared/messages";

declare const __DEV__: boolean;
if (!__DEV__) document.getElementById("server-change")?.remove();

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
type Tab = "studio" | "picked" | "community" | "sites";

let tabId = -1;
let library: Library | null = null;
let state: TabState | null = null;
let current: ThemeEntry | null = null;
let appearance: AppearanceChoice = "auto";
let picked: Theme | null = null;
let tab: Tab = "studio";
let filterQuery = "";

async function call<T>(message: BackgroundMessage): Promise<T> {
  const reply = await chrome.runtime.sendMessage(message);
  if (!reply?.ok) throw new Error(reply?.error ?? "Something went wrong.");
  return reply.value as T;
}
function toast(text: string, error = false) {
  const el = $("toast");
  el.textContent = text;
  el.classList.toggle("error", error);
  el.hidden = false;
  clearTimeout((toast as { timer?: number }).timer);
  (toast as { timer?: number }).timer = window.setTimeout(
    () => (el.hidden = true),
    2600,
  );
}
const guard =
  <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
  (...args: A) =>
    fn(...args).catch((error: Error) => toast(error.message, true));

function swatches(theme: Theme, large = false) {
  const c = resolve(theme, theme.defaultAppearance);
  const el = document.createElement("div");
  el.className = large ? "swatches large" : "swatches";
  for (const color of [
    c.background,
    c.surface,
    c.foreground,
    c.accent,
    c.accentFill,
  ]) {
    const i = document.createElement("i");
    i.style.background = color;
    el.append(i);
  }
  return el;
}
const sameRef = (a?: ThemeRef, b?: ThemeRef) =>
  !!a &&
  !!b &&
  a.kind === b.kind &&
  (a.kind === "studio" ||
    (a as { id: string }).id === (b as { id: string }).id);

function entries(): ThemeEntry[] {
  if (!library) return [];
  if (tab === "studio")
    return library.studio
      ? [
          {
            ref: { kind: "studio" },
            theme: library.studio.theme,
            detail: library.studio.live
              ? "Live from the ThemeSpace editor"
              : "Your saved draft",
          },
        ]
      : [];
  if (tab === "picked")
    return library.picked.map((theme) => ({
      ref: { kind: "picked", id: theme.id },
      theme,
      detail: theme.description.replace(/ with ThemeSpace Companion\.$/, ""),
    }));
  return library.community.map((row) => ({
    ref: { kind: "public", id: row.id },
    theme: row.theme,
    detail: row.preset
      ? "Starter palette"
      : `${row.theme.author} · v${row.version}`,
  }));
}

function themeCssVariables(theme: Theme) {
  const mode = theme.defaultAppearance;
  const c = resolve(theme, mode);
  const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  return (
    `/* ${theme.name} (${mode}) · ThemeSpace Companion */\n:root {\n` +
    Object.entries(c)
      .map(([k, v]) => `  --ts-${kebab(k)}: ${v};`)
      .join("\n") +
    `\n}\n`
  );
}
function downloadJson(theme: Theme) {
  const blob = new Blob([JSON.stringify(theme, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(theme.name)}.theme.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderList() {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-tab]",
  ))
    button.setAttribute("aria-selected", String(button.dataset.tab === tab));
  const list = $("list");
  list.replaceChildren();
  const q = filterQuery.trim().toLowerCase();
  if (tab === "sites") {
    const pinnedSites = Object.entries(library?.sites ?? {}).filter(
      ([origin, assignment]) =>
        !q ||
        origin.toLowerCase().includes(q) ||
        assignment.theme.name.toLowerCase().includes(q),
    );
    if (!pinnedSites.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = q
        ? "No pinned sites match your filter."
        : "Sites where you enable 'Always use this theme here' appear here.";
      list.append(li);
      return;
    }
    for (const [origin, assignment] of pinnedSites) {
      const li = document.createElement("li");
      const host = new URL(origin).host;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "entry";
      button.setAttribute("aria-current", String(state?.origin === origin));
      const text = document.createElement("span");
      const name = document.createElement("b");
      name.textContent = host;
      const detail = document.createElement("small");
      detail.textContent = `${assignment.theme.name} · ${assignment.appearance}`;
      text.append(name, detail);
      button.append(swatches(assignment.theme), text);
      button.addEventListener(
        "click",
        guard(async () => {
          await chrome.tabs.create({ url: origin });
        }),
      );
      const unpin = iconButton("×", `Unpin ${host}`, async () => {
        await call({ type: "assign", origin, assignment: null });
        await Promise.all([refresh(), refreshTab()]);
        toast(`Unpinned ${host}.`);
      });
      li.append(button, unpin);
      list.append(li);
    }
    return;
  }
  const items = entries().filter(
    (e) =>
      !q ||
      e.theme.name.toLowerCase().includes(q) ||
      (e.detail ?? "").toLowerCase().includes(q),
  );
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = q
      ? "No themes match your filter."
      : tab === "studio"
        ? library?.user
          ? "Open the ThemeSpace editor to preview your draft here."
          : "Sign in or open the ThemeSpace editor to preview your work here."
        : tab === "picked"
          ? "Themes you pick up from websites appear here."
          : (library?.communityError ?? "No published themes yet.");
    list.append(li);
    return;
  }
  for (const entry of items) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "entry";
    button.disabled = !state?.supported;
    button.setAttribute(
      "aria-current",
      String(sameRef(current?.ref, entry.ref)),
    );
    const text = document.createElement("span");
    const name = document.createElement("b");
    if (entry.ref.kind === "studio" && library?.studio?.live) {
      const dot = document.createElement("i");
      dot.className = "live-badge";
      name.append(dot);
    }
    name.append(entry.theme.name);
    const detail = document.createElement("small");
    detail.textContent = entry.detail ?? "";
    text.append(name, detail);
    button.append(swatches(entry.theme), text);
    button.addEventListener(
      "click",
      guard(() => preview(entry)),
    );
    li.append(button);
    if (entry.ref.kind === "picked") {
      const dl = iconButton("↓", `Download ${entry.theme.name} JSON`, async () => {
        downloadJson(entry.theme);
        toast(`Downloaded ${entry.theme.name} JSON.`);
      });
      const open = iconButton(
        "↗",
        `Open ${entry.theme.name} in ThemeSpace`,
        () => call({ type: "publish", theme: entry.theme }),
      );
      const remove = iconButton("×", `Delete ${entry.theme.name}`, async () => {
        await call({ type: "delete-picked", id: entry.theme.id });
        await refresh();
      });
      li.append(dl, open, remove);
    }
    list.append(li);
  }
}
function iconButton(text: string, label: string, run: () => Promise<unknown>) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = text;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.addEventListener(
    "click",
    guard(async () => void (await run())),
  );
  return button;
}

function renderSite() {
  const supported = !!state?.supported;
  $("unsupported").hidden = supported;
  $("controls").hidden = !supported;
  $("pin-row").hidden = !supported;
  $("pickup").hidden = !supported;
  $("host").textContent = state?.origin
    ? new URL(state.origin).host
    : "This page";
  const status = state?.status;
  const stateEl = $("state");
  stateEl.textContent = status?.applied
    ? (status.label ?? "Themed")
    : "Original colors";
  stateEl.classList.toggle("on", !!status?.applied);
  $<HTMLButtonElement>("revert").disabled = !status?.applied;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-appearance]",
  ))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.appearance === appearance),
    );
  const pin = $<HTMLInputElement>("pin");
  pin.checked = !!state?.assignment;
  pin.disabled = !current && !state?.assignment;
  $("pin-detail").textContent = state?.assignment
    ? `${state.assignment.theme.name} loads every time you visit.`
    : current
      ? `Keep ${current.theme.name} on this site.`
      : "Pick a theme below first.";
}
function renderAccount() {
  const account = $<HTMLAnchorElement>("account");
  const base = library?.server ?? "https://themespace.app";
  account.href = library?.user ? `${base}/account` : `${base}/account/sign-in`;
  account.textContent = library?.user
    ? library.user.displayName ||
      library.user.name ||
      library.user.email ||
      "Signed in"
    : "Sign in";
  $("server-label").textContent = `Synced with ${new URL(base).host}`;
  $<HTMLAnchorElement>("open-studio").href = base;
  void chrome.permissions
    .contains({ origins: [sitePattern(base)] })
    .then((granted) => {
      $("sync-grant").hidden = granted;
    })
    .catch(() => {
      $("sync-grant").hidden = true;
    });
}
function renderPicked() {
  $("picked-result").hidden = !picked;
  if (!picked) return;
  $("picked-swatches").replaceWith(
    Object.assign(swatches(picked, true), { id: "picked-swatches" }),
  );
  $<HTMLInputElement>("picked-name").value = picked.name;
  $("picked-detail").textContent =
    `${picked.defaultAppearance} theme · ready to save or publish`;
}

async function preview(entry: ThemeEntry) {
  await call({ type: "preview", tabId, entry, appearance });
  current = entry;
  // Keep a pinned site's choice in step with what's showing.
  if (state?.origin && state.assignment)
    await call({
      type: "assign",
      origin: state.origin,
      assignment: { ref: entry.ref, theme: entry.theme, appearance },
    });
  await refreshTab();
}

async function refreshTab() {
  state = await call<TabState>({ type: "tab-state", tabId });
  if (!current) {
    if (state.preview)
      current = { ref: state.preview.ref, theme: state.preview.theme };
    else if (state.assignment)
      current = { ref: state.assignment.ref, theme: state.assignment.theme };
  }
  if (state.preview) appearance = state.preview.appearance;
  else if (state.assignment) appearance = state.assignment.appearance;
  renderSite();
  renderList();
}
async function refresh() {
  library = await call<Library>({ type: "library" });
  if (current?.ref.kind === "studio" && library.studio)
    current = { ...current, theme: library.studio.theme };
  renderAccount();
  renderList();
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-tab]"))
  button.addEventListener("click", () => {
    tab = button.dataset.tab as Tab;
    renderList();
  });
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-appearance]",
))
  button.addEventListener(
    "click",
    guard(async () => {
      appearance = button.dataset.appearance as AppearanceChoice;
      renderSite();
      if (current && state?.status?.applied) await preview(current);
    }),
  );
$("revert").addEventListener(
  "click",
  guard(async () => {
    await call({ type: "revert", tabId });
    current = null;
    await refreshTab();
  }),
);
$("pin").addEventListener(
  "change",
  guard(async () => {
    const pin = $<HTMLInputElement>("pin");
    if (!state?.origin) return;
    if (pin.checked && current) {
      // Ask for this one site only. The request must start inside the click
      // (Firefox rejects it after an await), and the assignment is saved
      // alongside it: the popup can close during the prompt, and the
      // background finishes pinning once access is granted.
      const request = chrome.permissions.request({
        origins: [sitePattern(state.origin)],
      });
      const saved = call({
        type: "assign",
        origin: state.origin,
        assignment: { ref: current.ref, theme: current.theme, appearance },
      });
      const [granted] = await Promise.all([request, saved]);
      if (!granted) {
        await call({ type: "assign", origin: state.origin, assignment: null });
        pin.checked = false;
        return toast(
          "ThemeSpace needs access to this site to theme it on every visit.",
          true,
        );
      }
      // Re-run assign now that permission is granted so the pinned script registers immediately.
      await call({
        type: "assign",
        origin: state.origin,
        assignment: { ref: current.ref, theme: current.theme, appearance },
      });
      if (!state.status?.applied) await preview(current);
      toast(
        `${current.theme.name} will load on ${new URL(state.origin).host}.`,
      );
    } else {
      await call({ type: "assign", origin: state.origin, assignment: null });
      toast("This site will load with its own colors.");
    }
    await Promise.all([refresh(), refreshTab()]);
  }),
);
$("scan").addEventListener(
  "click",
  guard(async () => {
    const button = $<HTMLButtonElement>("scan");
    button.disabled = true;
    button.textContent = "Reading this site's colors…";
    try {
      picked = await call<Theme>({ type: "scan", tabId });
      renderPicked();
    } finally {
      button.disabled = false;
      button.textContent = "Pick up this site's theme";
    }
  }),
);
$("picked-name").addEventListener("input", () => {
  if (!picked) return;
  const next = $<HTMLInputElement>("picked-name").value.trim();
  if (next) picked = { ...picked, name: next.slice(0, 80) };
});
$("search").addEventListener("input", () => {
  filterQuery = $<HTMLInputElement>("search").value;
  renderList();
});
$("copy-css").addEventListener(
  "click",
  guard(async () => {
    if (!picked) return;
    await navigator.clipboard.writeText(themeCssVariables(picked));
    toast(`Copied ${picked.name} CSS variables.`);
  }),
);
$("save-picked").addEventListener(
  "click",
  guard(async () => {
    if (!picked) return;
    await call({ type: "save-picked", theme: picked });
    tab = "picked";
    await refresh();
    toast(`Saved ${picked.name}. Preview it on any site.`);
  }),
);
$("publish-picked").addEventListener(
  "click",
  guard(async () => {
    if (!picked) return;
    await call({ type: "save-picked", theme: picked });
    await call({ type: "publish", theme: picked });
  }),
);
$("grant-sync").addEventListener(
  "click",
  guard(async () => {
    const base = library?.server ?? "https://themespace.app";
    const granted = await chrome.permissions.request({
      origins: [sitePattern(base)],
    });
    if (!granted) {
      return toast("ThemeSpace needs permission to sync your account and draft.", true);
    }
    $("sync-grant").hidden = true;
    await refresh();
    toast("ThemeSpace sync enabled.");
  }),
);
$("server-change")?.addEventListener(
  "click",
  guard(async () => {
    const next = prompt(
      "ThemeSpace address (for local development, e.g. http://localhost:5173):",
      library?.server,
    );
    if (!next) return;
    await call({ type: "set-server", server: next });
    await refresh();
  }),
);

function pickInitialTab() {
  if (current) {
    tab =
      current.ref.kind === "public"
        ? "community"
        : current.ref.kind;
  } else if (library?.studio) {
    tab = "studio";
  } else if (library?.picked.length) {
    tab = "picked";
  } else {
    tab = "community";
  }
  renderList();
}

guard(async () => {
  const [active] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  // Development builds let tests point the popup at a specific tab.
  const forced = __DEV__
    ? Number(new URLSearchParams(location.search).get("tab"))
    : 0;
  if (forced) {
    tabId = forced;
    await refreshTab();
    await refresh();
    pickInitialTab();
    return;
  }
  tabId = active?.id ?? -1;
  await refreshTab();
  await refresh();
  pickInitialTab();
})();
