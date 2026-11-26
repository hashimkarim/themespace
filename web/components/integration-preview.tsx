"use client";
import { useCallback, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import { CodeSurface } from "./renderers/code-surface";
import { TerminalSurface } from "./renderers/terminal-surface";
import { SpotifyPreview } from "./clones/spotify-preview";
import { DiscordPreview } from "./clones/discord-preview";
import { integrationTheme, terminalEngine } from "@/lib/integration-theme";
import { tuiAnsi } from "@/lib/tui-ansi";
import { previewFidelity } from "@/lib/preview-fidelity";
import { exampleCode } from "@/lib/editor-preview";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode2,
  FileText,
  Files,
  Folder,
  GitBranch,
  Globe,
  LayoutGrid,
  Lock,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Square,
  Terminal,
  X,
} from "lucide-react";
import { type Theme, type Appearance } from "@/lib/theme";
import { getTarget } from "@/lib/targets";
import { previewProfiles, previewStyle } from "@/lib/preview-targets";
import { ComponentLibrary } from "./component-library";
import { ShadcnPreviewLoader } from "./shadcn-preview-loader";
import { ThemedSelect } from "./ui/select";
const Dots = () => (
  <span className="native-dots">
    <i />
    <i />
    <i />
  </span>
);
function Editor({
  theme,
  mode,
  target,
}: {
  theme: Theme;
  mode: Appearance;
  target: string;
}) {
  const profile = previewProfiles[target],
    [file, setFile] = useState("theme.ts"),
    [pane, setPane] = useState("files"),
    [folder, setFolder] = useState(true),
    [terminal, setTerminal] = useState(false),
    [edits, setEdits] = useState<Record<string, string>>({}),
    [search, setSearch] = useState("");
  const files = ["theme.ts", "tokens.css", "README.md"],
    modal = profile.variant === "modal";
  return (
    <div
      className={`native-window native-editor editor-${target} ${modal ? "modal-editor" : ""}`}
    >
      <div className="native-titlebar">
        <Dots />
        <span>{profile.label}</span>
        <label className="native-command-search">
          <Search size={12} />
          <input
            aria-label="Search preview files"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPane("search");
            }}
            placeholder={`${theme.name} — workspace`}
          />
          <kbd>⌘ K</kbd>
        </label>
        <MoreHorizontal size={15} />
      </div>
      <div className="native-editor-body">
        {target === "vscode" && (
          <aside className="native-activity" aria-label="Editor tools">
            {[
              { id: "files", Icon: Files },
              { id: "search", Icon: Search },
              { id: "git", Icon: GitBranch },
              { id: "extensions", Icon: LayoutGrid },
            ].map(({ id, Icon }) => (
              <button
                key={id}
                aria-label={`${id} preview`}
                aria-pressed={pane === id}
                onClick={() => setPane(id)}
              >
                <Icon size={20} />
              </button>
            ))}
            <button
              aria-label="Toggle terminal preview"
              onClick={() => setTerminal(!terminal)}
            >
              <Terminal size={19} />
            </button>
          </aside>
        )}
        {!modal && (
          <aside className="native-filetree">
            <div className="native-section-label">
              {pane === "search"
                ? "SEARCH"
                : pane === "git"
                  ? "SOURCE CONTROL"
                  : pane === "extensions"
                    ? "EXTENSIONS"
                    : "EXPLORER"}
              <MoreHorizontal size={13} />
            </div>
            {pane === "extensions" ? (
              <p className="native-muted native-aside-copy">
                {theme.name}
                <br />
                <small>Color theme · local</small>
              </p>
            ) : pane === "git" ? (
              <>
                <span className="native-aside-copy native-muted">
                  Changes · 1
                </span>
                <button
                  className="native-file selected"
                  onClick={() => setFile("theme.ts")}
                >
                  <FileCode2 size={13} />
                  theme.ts <span className="native-success">M</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className="native-folder"
                  onClick={() => setFolder(!folder)}
                  aria-expanded={folder}
                >
                  {folder ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  <Folder size={13} />
                  {theme.name.toLowerCase()}
                </button>
                {folder &&
                  files
                    .filter((f) =>
                      f.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((f) => (
                      <button
                        className={`native-file ${file === f ? "selected" : ""}`}
                        key={f}
                        onClick={() => setFile(f)}
                      >
                        <FileCode2 size={13} />
                        {f}
                        {f === "theme.ts" && (
                          <span className="native-success">M</span>
                        )}
                      </button>
                    ))}
              </>
            )}
          </aside>
        )}
        <section className="native-editor-main">
          <div
            className="native-editor-tabs"
            role="tablist"
            aria-label="Preview editor files"
          >
            {files.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={file === f}
                onClick={() => setFile(f)}
              >
                <FileCode2 size={12} />
                {f}
                {f === file ? (
                  <span className="native-modified" />
                ) : (
                  <X size={10} />
                )}
              </button>
            ))}
          </div>
          <div className="native-breadcrumb">
            src <ChevronRight size={11} />
            {file} <ChevronRight size={11} />
            {file === "theme.ts" ? "yourTheme" : "preview"}
          </div>
          <CodeSurface
            theme={theme}
            mode={mode}
            target={target}
            file={file}
            value={edits[file]}
            diff={target === "vscode" && pane === "git" && file === "theme.ts"}
            onChange={(value) =>
              setEdits((previous) => ({ ...previous, [file]: value }))
            }
          />
          {terminal && ["vscode", "zed"].includes(target) && (
            <div className="native-integrated-terminal">
              <div className="native-panel-tabs">
                <button
                  onClick={() => setTerminal(false)}
                  aria-label="Hide terminal"
                >
                  TERMINAL
                </button>
                <span>
                  PROBLEMS <small>0</small>
                </span>
                <span>OUTPUT</span>
                <Plus size={11} />
                <X size={11} onClick={() => setTerminal(false)} />
              </div>
              <TerminalSurface
                theme={theme}
                mode={mode}
                target={target}
                compact
              />
            </div>
          )}
        </section>
      </div>
      <div className="native-statusbar">
        <span>
          <GitBranch size={11} />
          main*
        </span>
        <span>⊗ 0 △ 0</span>
        {["vscode", "zed"].includes(target) ? (
          <button
            onClick={() => setTerminal(!terminal)}
            aria-pressed={terminal}
          >
            Terminal
          </button>
        ) : (
          <span>{modal ? "EDIT · browser keymap" : "Editing"}</span>
        )}
        <span>UTF-8</span>
        <span>
          {file === "tokens.css"
            ? "CSS"
            : file === "README.md"
              ? "Markdown"
              : "TypeScript"}
        </span>
        <Check size={11} />
      </div>
    </div>
  );
}
function TerminalWindow({
  theme,
  mode,
  target,
}: {
  theme: Theme;
  mode: Appearance;
  target: string;
}) {
  const profile = previewProfiles[target];
  const windows = target === "windows-terminal",
    mobile = target === "termux";
  const tabs = [
    "ghostty",
    "kitty",
    "wezterm",
    "windows-terminal",
    "iterm2",
    "warp",
  ].includes(target);
  const canSplit = tabs && target !== "warp";
  const [tab, setTab] = useState(0),
    [split, setSplit] = useState(false);
  const shell =
    windows && tab === 0 ? "PowerShell" : target === "termux" ? "bash" : "zsh";
  return (
    <div
      className={`native-window native-terminal-window terminal-${target} ${mobile ? "native-phone-terminal" : ""}`}
    >
      {mobile ? (
        <div className="termux-status">
          <span>12:34</span>
          <span>Termux · ▰ 100%</span>
        </div>
      ) : (
        <div className={`native-titlebar ${windows ? "windows-titlebar" : ""}`}>
          {!windows && <Dots />}
          {tabs ? (
            <div
              className="native-terminal-tabs"
              role="tablist"
              aria-label="Terminal sample sessions"
            >
              {[
                windows ? "PowerShell" : "~/themes",
                windows ? "Ubuntu" : "~/projects",
              ].map((label, index) => (
                <button
                  key={label}
                  role="tab"
                  aria-selected={tab === index}
                  onClick={() => setTab(index)}
                >
                  <Terminal size={13} />
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span>{profile.label} — ~/themes</span>
          )}
          {canSplit && (
            <button
              className="native-icon"
              aria-label="Toggle split pane"
              aria-pressed={split}
              onClick={() => setSplit(!split)}
            >
              <Plus size={15} />
            </button>
          )}
          <span className="native-window-label">{profile.label}</span>
          {windows && (
            <span className="native-window-controls" aria-hidden="true">
              <Minus size={12} />
              <Square size={10} />
              <X size={12} />
            </span>
          )}
        </div>
      )}
      {target === "warp" && (
        <div className="warp-block-label">
          <ChevronRight size={13} /> Command block <span>~/themes · main</span>
        </div>
      )}
      <div className={`native-terminal-panes ${split ? "split" : ""}`}>
        <TerminalSurface
          key={`${target}:${tab}`}
          theme={theme}
          mode={mode}
          target={target}
          windows={shell === "PowerShell"}
        />
        {split && (
          <TerminalSurface
            key={`${target}:split`}
            theme={theme}
            mode={mode}
            target={target}
          />
        )}
      </div>
    </div>
  );
}
function Browser({
  theme,
  mode,
  target,
}: {
  theme: Theme;
  mode: Appearance;
  target: string;
}) {
  const [tab, setTab] = useState(target === "stylus" ? 1 : 0),
    [url, setUrl] = useState(
      target === "stylus" ? "docs.themespace.app" : "New Tab",
    ),
    [search, setSearch] = useState(""),
    [result, setResult] = useState(""),
    [menu, setMenu] = useState(false),
    [sidebar, setSidebar] = useState(target === "firefox" ? false : false);
  const c = integrationTheme(theme, mode, target).roles;
  if (target === "zen") {
    const zenTabs = [
      { title: "New Tab", url: "about:newtab" },
      { title: "ThemeSpace Studio", url: "themespace.app" },
      { title: "Zen Mods Docs", url: "docs.zen-browser.app" },
    ];
    return (
      <div className="native-window native-browser zen zen-vertical">
        <aside className="zen-rail">
          <div className="zen-rail-top">
            <Dots />
            <span className="zen-ws-pill">Work</span>
          </div>
          <label className="zen-urlbar">
            <Lock size={11} />
            <input
              aria-label="Preview address bar"
              value={zenTabs[tab]?.url ?? url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <div className="zen-pinned">
            {["G", "M", "D"].map((k) => (
              <span key={k}>{k}</span>
            ))}
          </div>
          <div className="zen-tab-list" role="tablist" aria-label="Zen vertical tabs">
            {zenTabs.map((item, i) => (
              <button
                key={item.title}
                role="tab"
                aria-selected={tab === i}
                className={tab === i ? "selected" : ""}
                onClick={() => {
                  setTab(i);
                  setUrl(item.url);
                }}
              >
                <Globe size={12} />
                <span>{item.title}</span>
              </button>
            ))}
          </div>
          <div className="zen-rail-foot">
            <span>Zen Browser</span>
            <Plus size={13} />
          </div>
        </aside>
        <div className="native-browser-page native-new-tab zen-page">
          <small>{tab === 0 ? "ZEN · ABOUT:NEWTAB" : zenTabs[tab]?.url.toUpperCase()}</small>
          <h2>{tab === 0 ? `${theme.name} on Zen` : zenTabs[tab]?.title}</h2>
          <p>
            Vertical sidebar, URL bar, and built-in <code>about:</code> pages
            styled via <code>userChrome.css</code> and <code>userContent.css</code>.
          </p>
          <div className="native-browser-shortcuts">
            {[
              ["◇", "Projects"],
              ["☷", "Reading list"],
              ["✳", "ThemeSpace"],
            ].map(([icon, label]) => (
              <button
                key={label}
                onClick={() => setResult(`Opened ${label} in Zen preview.`)}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
          {result && <p aria-live="polite">{result}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className={`native-window native-browser ${target}`}>
      <div className="native-browser-tabs">
        <Dots />
        {["New Tab", "Example website"].map((t, i) => (
          <button
            className={tab === i ? "selected" : ""}
            key={t}
            onClick={() => {
              setTab(i);
              setUrl(i ? "docs.themespace.app" : "New Tab");
            }}
          >
            <Globe size={12} />
            {t}
            <X size={10} />
          </button>
        ))}
        <Plus size={14} />
        <span>{previewProfiles[target].label}</span>
      </div>
      <div className="native-browser-toolbar">
        <button aria-label="Previous demo tab" onClick={() => setTab(0)}>
          <ArrowLeft size={15} />
        </button>
        <button aria-label="Next demo tab" onClick={() => setTab(1)}>
          <ArrowRight size={15} />
        </button>
        <label>
          <Lock size={12} />
          <input
            aria-label="Preview address bar"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button
          aria-label="Browser preview menu"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <MoreHorizontal size={17} />
        </button>
        {menu && (
          <div className="native-browser-menu">
            <b>Browser menu</b>
            {["New tab", "History", "Downloads"].map((label) => (
              <button
                key={label}
                onClick={() => {
                  setResult(`${label} selected locally.`);
                  setMenu(false);
                }}
              >
                {label}
              </button>
            ))}
            {target === "firefox" && (
              <button
                onClick={() => {
                  setSidebar(!sidebar);
                  setMenu(false);
                }}
              >
                Bookmarks sidebar
              </button>
            )}
            <small>Preview menu</small>
          </div>
        )}
      </div>
      <div className="native-bookmarks">
        <span>◇ Your projects</span>
        <span>◇ Reading list</span>
        <span>◇ Design inspiration</span>
      </div>
      {sidebar && target === "firefox" && (
        <aside className="native-browser-sidebar">
          <b>Bookmarks</b>
          {["Your projects", "Reading list", "Design inspiration"].map(
            (name) => (
              <button
                key={name}
                onClick={() => setResult(`${name} selected locally.`)}
              >
                {name}
              </button>
            ),
          )}
          <button onClick={() => setSidebar(false)}>Close sidebar</button>
        </aside>
      )}
      <div className={target === "vivaldi" ? "vivaldi-body" : ""}>
        {target === "vivaldi" && (
          <aside className="vivaldi-panel-rail" aria-label="Vivaldi web panels">
            <span>★</span>
            <span>↓</span>
            <span>✎</span>
            <span>⏱</span>
            <span>⚙</span>
          </aside>
        )}
        <div
          className={`native-browser-page ${tab === 0 || target === "stylus" ? "native-new-tab" : ""}`}
        >
          {target === "stylus" && (
            <div className="stylus-popup-strip">
              <b>Stylus UserCSS · {theme.name}</b>
              <div className="stylus-vars">
                {[
                  ["tsBg", c.background],
                  ["tsSurface", c.surface],
                  ["tsFg", c.foreground],
                  ["tsAccent", c.accent],
                  ["tsBorder", c.border],
                ].map(([name, val]) => (
                  <span key={name}>
                    <i style={{ background: val }} />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <small>
            {tab === 0
              ? previewProfiles[target].label.toUpperCase()
              : target === "stylus"
                ? "STYLED PAGE · USERCSS ACTIVE"
                : "EXAMPLE WEBSITE"}
          </small>
          <h2>{tab ? "A place to create." : "A fresh perspective."}</h2>
          <p>
            {tab === 0
              ? `A new tab in ${theme.name}.`
              : target === "stylus"
                ? `Custom properties and @var color pickers from ${theme.name}.user.css style the page.`
                : `The browser wears ${theme.name}. Websites keep their own styles.`}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setResult(
                search
                  ? `Example search for “${search}”`
                  : "Type something to search this example.",
              );
            }}
          >
            <label>
              <Search size={17} />
              <input
                aria-label="Demo website search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Where will today take you?"
              />
            </label>
          </form>
          <div className="native-browser-shortcuts">
            {[
              ["◇", "Your projects"],
              ["☷", "Reading list"],
              ["✳", "Inspiration"],
            ].map(([i, t]) => (
              <button
                key={t}
                onClick={() => setResult(`${t} selected in the example website.`)}
              >
                <span>{i}</span>
                {t}
              </button>
            ))}
          </div>
          <p aria-live="polite">{result}</p>
        </div>
      </div>
      {target === "vivaldi" && (
        <div className="vivaldi-status">
          <span>Vivaldi · {theme.name}</span>
          <span>100% · Page Actions</span>
        </div>
      )}
    </div>
  );
}
function Notes({ theme, mode }: { theme: Theme; mode: Appearance }) {
  const [note, setNote] = useState("Welcome home"),
    [editing, setEditing] = useState(true),
    [notes, setNotes] = useState<Record<string, string>>({});
  const text = notes[note] ?? exampleCode({ ...theme, name: note }, "note.md");
  const setText = (value: string) =>
    setNotes((previous) => ({ ...previous, [note]: value }));
  return (
    <div className="native-window native-notes">
      <div className="native-titlebar">
        <Dots />
        <span>{theme.name} vault — Obsidian</span>
        <MoreHorizontal size={15} />
      </div>
      <div className="native-notes-layout">
        <aside>
          <div className="native-note-tools">
            <Files size={16} />
            <Search size={16} />
            <GitBranch size={16} />
          </div>
          <b className="native-section-label">YOUR VAULT</b>
          {[
            "Welcome home",
            "Daily notes",
            "Ideas in progress",
            "Design resources",
          ].map((t) => (
            <button
              key={t}
              className={`native-file ${note === t ? "selected" : ""}`}
              onClick={() => setNote(t)}
            >
              <FileText size={13} />
              {t}
            </button>
          ))}
          <div className="native-vault-footer">
            <Settings size={14} />
            {theme.name}
          </div>
        </aside>
        <article>
          <div className="native-note-tab">
            <FileText size={13} />
            {note}
            <button
              aria-label={editing ? "Read example note" : "Edit example note"}
              onClick={() => setEditing(!editing)}
            >
              {editing ? <BookOpen size={14} /> : <Code2 size={14} />}
            </button>
          </div>
          <div className="native-note-content">
            <small className="native-muted">PERSONAL / NOTES</small>
            <h2>{note}</h2>
            {editing ? (
              <CodeSurface
                theme={theme}
                mode={mode}
                target="obsidian"
                file={`${note}.md`}
                value={text}
                onChange={setText}
              />
            ) : (
              <div className="obsidian-reading-view">
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            )}
          </div>
        </article>
        <aside className="native-backlinks">
          <span className="native-section-label">LOCAL GRAPH</span>
          <svg
            viewBox="0 0 160 150"
            role="img"
            aria-label="Illustrative network of linked notes"
          >
            <g stroke="var(--ts-border)">
              {[
                [80, 65, 30, 30],
                [80, 65, 130, 45],
                [80, 65, 110, 125],
                [80, 65, 35, 110],
                [30, 30, 130, 45],
              ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
            </g>
            {[
              [80, 65, 7],
              [30, 30, 4],
              [130, 45, 4],
              [110, 125, 4],
              [35, 110, 4],
            ].map(([cx, cy, r], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill={i ? "var(--ts-muted)" : "var(--ts-accent)"}
              />
            ))}
          </svg>
          <span className="native-section-label">BACKLINKS</span>
          <p className="native-muted">
            Daily notes
            <br />
            <br />
            Your next idea
          </p>
        </aside>
      </div>
      <div className="native-statusbar">
        <span>3 backlinks</span>
        <span>{text.trim().split(/\s+/).length} words</span>
        <span>Local preview</span>
      </div>
    </div>
  );
}
function T3CodeWorkspace({
  theme,
  mode,
}: {
  theme: Theme;
  mode: Appearance;
}) {
  const r = integrationTheme(theme, mode, "t3-code").roles;
  const [thread, setThread] = useState(0);
  const [showTerm, setShowTerm] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "user",
      text: `Export ${theme.name} to T3 Code and verify terminal contrast.`,
    },
    {
      role: "work",
      text: "Edited web/lib/exporters.ts · +64 -0 · 50 tests passed",
    },
    {
      role: "assistant",
      text: `Generated ${theme.name} (${mode}) with all 65 T3 Code color roles and integrated terminal palette.`,
    },
  ]);
  const threads = [
    { name: "Export T3 Code theme", time: "2m", status: "done" },
    { name: "Fix xterm ANSI wrapping", time: "18m", status: "active" },
    { name: "Release v0.2 checklist", time: "1h", status: "done" },
  ];
  return (
    <div className="native-window native-t3code">
      <div className="t3-layout">
        <aside className="t3-sidebar">
          <div className="t3-project-head">
            <span className="t3-monogram">TS</span>
            <b>themespace</b>
            <small>main</small>
          </div>
          <div className="t3-thread-list">
            {threads.map((item, idx) => (
              <button
                key={item.name}
                className={`t3-thread ${thread === idx ? "selected" : ""}`}
                onClick={() => setThread(idx)}
              >
                <i className={`t3-dot t3-dot-${item.status}`} />
                <span>{item.name}</span>
                <small>{item.time}</small>
              </button>
            ))}
          </div>
        </aside>
        <section className="t3-main">
          <header className="t3-header">
            <div className="t3-header-title">
              <b>{threads[thread].name}</b>
              <span className="t3-badge">
                <GitBranch size={10} /> main
              </span>
              <span className="t3-diff-pill">
                <em className="t3-add">+64</em> <em className="t3-del">-0</em>
              </span>
            </div>
            <button
              className="native-pill-btn"
              aria-pressed={showTerm}
              onClick={() => setShowTerm(!showTerm)}
            >
              <Terminal size={12} /> Terminal
            </button>
          </header>
          <div className="t3-messages">
            {messages.map((m, i) =>
              m.role === "work" ? (
                <div key={i} className="t3-work-card">
                  <Check size={12} />
                  <span>{m.text}</span>
                </div>
              ) : (
                <div key={i} className={`t3-msg t3-msg-${m.role}`}>
                  <p>{m.text}</p>
                </div>
              ),
            )}
            <pre className="t3-code">
              <code>{`{
  "version": 1,
  "name": "${theme.name}",
  "appearance": "${mode}",
  "canvas": "${r.background}",
  "accent": "${r.accentFill}",
  "colors": { "sidebar": "${r.sidebar}", "surface": "${r.surface}" }
}`}</code>
            </pre>
          </div>
          <form
            className="t3-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              setMessages((prev) => [...prev, { role: "user", text: draft }]);
              setDraft("");
            }}
          >
            <input
              aria-label="Preview T3 Code message"
              placeholder="Ask anything, @ to mention files…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="t3-composer-bar">
              <span className="t3-model-pill">Default · Full access</span>
              <button type="submit">Send</button>
            </div>
          </form>
          {showTerm && (
            <div className="native-integrated-terminal">
              <TerminalSurface
                theme={theme}
                mode={mode}
                target="t3-code"
                compact
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
function GitClient({
  target,
  theme,
  mode,
}: {
  target: string;
  theme: Theme;
  mode: Appearance;
}) {
  const r = integrationTheme(theme, mode, target).roles;
  const [commit, setCommit] = useState(0);
  const [branch, setBranch] = useState("main");
  const commits = [
    {
      hash: "64b0589",
      branch: "main",
      author: theme.author,
      time: "4m ago",
      lane: 0,
      msg: `Export ${theme.name} in GitComet v2 format`,
      files: [
        { status: "M", path: "web/lib/exporters.ts", stat: "+84 -12" },
        { status: "M", path: "web/tests/exporters.test.ts", stat: "+26 -4" },
      ],
      hunk: "@@ -742,6 +742,8 @@ export function generateTarget(",
      lines: [
        { n1: "742", n2: "742", kind: "ctx", text: '  schema_version: 2,' },
        { n1: "743", n2: "", kind: "del", text: `  background: "#1c1f26",` },
        { n1: "", n2: "743", kind: "add", text: `  canvas: "${r.background}ff",` },
        { n1: "", n2: "744", kind: "add", text: `  accent: "${r.accent}ff",` },
        { n1: "744", n2: "745", kind: "ctx", text: "  radii: { panel: 10, pill: 999, row: 7 }," },
      ],
    },
    {
      hash: "4df4d4a",
      branch: "feat/companion",
      author: "Maya",
      time: "28m ago",
      lane: 1,
      msg: "Add hold-to-peek and backup restore in Companion",
      files: [
        { status: "M", path: "extension/src/background.ts", stat: "+68 -9" },
        { status: "A", path: "web/lib/importers.ts", stat: "+295 -0" },
      ],
      hunk: "@@ -80,5 +80,7 @@ async function applyTo(tabId, ref, theme)",
      lines: [
        { n1: "80", n2: "80", kind: "ctx", text: "  await ensureEngine(tabId);" },
        { n1: "81", n2: "", kind: "del", text: "  return send(tabId, { type: 'ts:apply', theme });" },
        { n1: "", n2: "81", kind: "add", text: "  const status = await send(tabId, { type: 'ts:apply', theme });" },
        { n1: "", n2: "82", kind: "add", text: "  updateBadge(tabId, status.applied ? theme : undefined);" },
        { n1: "82", n2: "83", kind: "ctx", text: "  return status;" },
      ],
    },
    {
      hash: "2ba3a70",
      branch: "fix/contrast",
      author: "Sam",
      time: "2h ago",
      lane: 2,
      msg: "Auto-fix WCAG AA contrast pairs in Studio",
      files: [
        { status: "A", path: "web/lib/color-tools.ts", stat: "+240 -0" },
      ],
      hunk: "@@ -104,4 +104,6 @@ export function autoFixContrast(theme, mode)",
      lines: [
        { n1: "104", n2: "104", kind: "ctx", text: "  const dark = luminance(p.background) < 0.25;" },
        { n1: "105", n2: "", kind: "del", text: "  return theme;" },
        { n1: "", n2: "105", kind: "add", text: "  const fg = ensureContrastAgainst(p.foreground, bgs, 7.0, dark);" },
        { n1: "", n2: "106", kind: "add", text: "  return { ...theme, modes: { ...theme.modes, [mode]: { ...p, foreground: fg } } };" },
      ],
    },
    {
      hash: "bc54c4f",
      branch: "main",
      author: theme.author,
      time: "5h ago",
      lane: 0,
      msg: "Link Chrome Web Store and Firefox AMO listings",
      files: [{ status: "M", path: "web/components/themespace.tsx", stat: "+18 -6" }],
      hunk: "@@ -1690,4 +1690,5 @@ const CHROME_STORE_URL =",
      lines: [
        { n1: "1690", n2: "1690", kind: "ctx", text: '  "https://chromewebstore.google.com/detail/themespace-companion";' },
        { n1: "", n2: "1691", kind: "add", text: 'const FIREFOX_AMO_URL = "https://addons.mozilla.org/firefox/addon/themespace-companion/";' },
      ],
    },
  ];
  const active = commits[commit];
  const laneColors = [
    r.chart1 ?? r.accent,
    r.chart2 ?? r.success,
    r.chart3 ?? r.warning,
  ];
  return (
    <div className="native-window native-git">
      <div className="native-titlebar">
        <Dots />
        <span>
          {previewProfiles[target].label} — themespace
        </span>
        <span className="git-branch-pill">
          <GitBranch size={11} /> {branch}
        </span>
      </div>
      <div className="git-workbench">
        <aside className="git-refs">
          <div className="native-section-label">BRANCHES</div>
          {[
            { name: "main", badge: "↑2" },
            { name: "feat/companion", badge: "1" },
            { name: "fix/contrast", badge: "" },
          ].map((b) => (
            <button
              key={b.name}
              className={`git-ref-row ${branch === b.name ? "selected" : ""}`}
              onClick={() => setBranch(b.name)}
            >
              <GitBranch size={11} />
              <span>{b.name}</span>
              {b.badge && <small>{b.badge}</small>}
            </button>
          ))}
          <div className="native-section-label">TAGS</div>
          <div className="git-ref-row muted-row">v0.2.0</div>
          <div className="git-ref-row muted-row">v0.1.0</div>
        </aside>
        <div className="git-main">
          <div className="git-graph-table">
            <svg
              className="git-graph-svg"
              width="52"
              height={commits.length * 36}
              viewBox={`0 0 52 ${commits.length * 36}`}
              aria-hidden="true"
            >
              <line x1="12" y1="18" x2="12" y2={commits.length * 36 - 18} stroke={laneColors[0]} strokeWidth="2" />
              <path d="M 12 18 C 26 24, 26 42, 26 54 C 26 78, 12 108, 12 126" fill="none" stroke={laneColors[1]} strokeWidth="2" />
              <path d="M 26 54 C 40 62, 40 78, 40 90 C 40 108, 12 118, 12 126" fill="none" stroke={laneColors[2]} strokeWidth="2" />
              {commits.map((c, idx) => (
                <circle
                  key={c.hash}
                  cx={12 + c.lane * 14}
                  cy={18 + idx * 36}
                  r={commit === idx ? 5 : 4}
                  fill={laneColors[c.lane]}
                  stroke={r.background}
                  strokeWidth="1.5"
                />
              ))}
            </svg>
            <div className="git-commit-rows">
              {commits.map((c, idx) => (
                <button
                  key={c.hash}
                  className={`git-row ${commit === idx ? "selected" : ""}`}
                  onClick={() => {
                    setCommit(idx);
                    setBranch(c.branch);
                  }}
                >
                  <span className="git-row-msg">
                    <b>{c.msg}</b>
                    {idx < 3 && (
                      <em
                        className="git-ref-tag"
                        style={{ borderColor: laneColors[c.lane], color: laneColors[c.lane] }}
                      >
                        {c.branch}
                      </em>
                    )}
                  </span>
                  <span className="git-row-meta">
                    <code>{c.hash}</code>
                    <small>{c.time}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <section className="git-diff-pane">
            <div className="git-files">
              {active.files.map((f) => (
                <span key={f.path} className={`git-file git-status-${f.status}`}>
                  <b>{f.status}</b> {f.path} <small>{f.stat}</small>
                </span>
              ))}
            </div>
            <div className="git-diff">
              <div className="diff-hunk">{active.hunk}</div>
              {active.lines.map((line, i) => (
                <div key={i} className={`diff-line diff-${line.kind}`}>
                  <span className="diff-ln">{line.n1}</span>
                  <span className="diff-ln">{line.n2}</span>
                  <span className="diff-sig">
                    {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
                  </span>
                  <code>{line.text}</code>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
function SlackWorkspace({ theme }: { theme: Theme }) {
  const [channel, setChannel] = useState("design-systems");
  const [draft, setDraft] = useState("");
  const [reactions, setReactions] = useState<Record<string, number>>({
    "🎨": 4,
    "🚀": 2,
  });
  const [feed, setFeed] = useState([
    {
      initials: "MR",
      author: "Maya Ross",
      time: "10:14 AM",
      text: `Imported the ${theme.name} 4-color Slack string — sidebar contrast and active pill look crisp.`,
    },
    {
      initials: "SK",
      author: "Sam Kim",
      time: "10:16 AM",
      text: "Online presence dots and unread mention badges stand out nicely too.",
    },
  ]);
  const channels = [
    { name: "general", unread: 0 },
    { name: "design-systems", unread: 0 },
    { name: "releases", unread: 3 },
    { name: "engineering", unread: 0 },
  ];
  const dms = [
    { name: "Maya Ross", online: true },
    { name: "Sam Kim", online: true },
    { name: "Alex Chen", online: false },
  ];
  return (
    <div className="native-window native-slack">
      <div className="slack-top-nav">
        <Dots />
        <div className="slack-search-bar">
          <Search size={11} />
          <span>Search {theme.name}</span>
        </div>
      </div>
      <div className="slack-shell">
        <nav className="slack-rail" aria-label="Slack workspace rail">
          <span className="slack-ws-icon">{theme.name.slice(0, 2).toUpperCase()}</span>
          <span className="slack-rail-item active">Home</span>
          <span className="slack-rail-item">DMs</span>
          <span className="slack-rail-item">Activity</span>
        </nav>
        <aside className="slack-sidebar">
          <div className="slack-ws">
            <b>{theme.name}</b>
            <ChevronDown size={13} />
          </div>
          <div className="slack-section">Channels</div>
          {channels.map((ch) => (
            <button
              key={ch.name}
              className={`slack-channel ${channel === ch.name ? "active" : ""}`}
              onClick={() => setChannel(ch.name)}
            >
              <span># {ch.name}</span>
              {ch.unread > 0 && <em className="slack-badge">{ch.unread}</em>}
            </button>
          ))}
          <div className="slack-section">Direct messages</div>
          {dms.map((dm) => (
            <div key={dm.name} className="slack-dm">
              <i className={`slack-presence ${dm.online ? "online" : ""}`} />
              <span>{dm.name}</span>
            </div>
          ))}
        </aside>
        <section className="slack-main">
          <div className="slack-header">
            <b># {channel}</b>
            <span>12 members</span>
          </div>
          <div className="slack-messages">
            {feed.map((m, i) => (
              <div key={i} className="slack-msg">
                <span className="slack-avatar">{m.initials}</span>
                <div>
                  <div className="slack-msg-head">
                    <b>{m.author}</b>
                    <small>{m.time}</small>
                  </div>
                  <p>{m.text}</p>
                  {i === 0 && (
                    <div className="slack-reactions">
                      {Object.entries(reactions).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() =>
                            setReactions((prev) => ({
                              ...prev,
                              [emoji]: prev[emoji] + 1,
                            }))
                          }
                        >
                          {emoji} {count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form
            className="slack-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              setFeed((prev) => [
                ...prev,
                { initials: "YO", author: "You", time: "Just now", text: draft },
              ]);
              setDraft("");
            }}
          >
            <input
              aria-label="Preview Slack message"
              placeholder={`Message #${channel}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </form>
        </section>
      </div>
    </div>
  );
}
function DesktopScene({ theme, target }: { theme: Theme; target: string }) {
  const [workspace, setWorkspace] = useState(1);
  const [focusedTile, setFocusedTile] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState(0);
  const [gtkNav, setGtkNav] = useState("Appearance");
  const [gtkNightLight, setGtkNightLight] = useState(true);
  const [gtkAnimations, setGtkAnimations] = useState(true);
  const [batLevel, setBatLevel] = useState<"normal" | "warning" | "critical">(
    "normal",
  );

  if (target === "gtk") {
    return (
      <div className="native-window native-gtk">
        <div className="gtk-split">
          <aside className="gtk-sidebar">
            <div className="gtk-sidebar-top">
              <Search size={13} />
              <b>Settings</b>
            </div>
            {["Wi-Fi", "Bluetooth", "Appearance", "Displays", "Keyboard"].map(
              (item) => (
                <button
                  key={item}
                  className={`gtk-nav-row ${gtkNav === item ? "selected" : ""}`}
                  onClick={() => setGtkNav(item)}
                >
                  {item}
                </button>
              ),
            )}
          </aside>
          <section className="gtk-pane">
            <header className="gtk-headerbar">
              <b>{gtkNav}</b>
              <span className="gtk-close" aria-hidden="true">×</span>
            </header>
            <div className="gtk-body">
              <div className="gtk-group-title">Preferences · {theme.name}</div>
              <div className="gtk-boxed-list">
                <div className="gtk-row">
                  <div>
                    <b>Night Light</b>
                    <small>Warmer display tone after sunset</small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={gtkNightLight}
                    className={`gtk-switch ${gtkNightLight ? "on" : ""}`}
                    onClick={() => setGtkNightLight(!gtkNightLight)}
                  >
                    <i />
                  </button>
                </div>
                <div className="gtk-row">
                  <div>
                    <b>Smooth Animations</b>
                    <small>Use libadwaita transitions</small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={gtkAnimations}
                    className={`gtk-switch ${gtkAnimations ? "on" : ""}`}
                    onClick={() => setGtkAnimations(!gtkAnimations)}
                  >
                    <i />
                  </button>
                </div>
              </div>
              <div className="gtk-actions">
                <button type="button" className="gtk-btn-suggested">
                  Apply Palette
                </button>
                <button type="button" className="gtk-btn-destructive">
                  Reset Defaults
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (target === "kde") {
    return (
      <div className="native-window native-kde">
        <div className="kde-stage">
          <div className="kde-window">
            <header className="kde-titlebar">
              <span>System Settings — Colors ({theme.name})</span>
              <span className="kde-wm-btns" aria-hidden="true">
                <Minus size={11} />
                <Square size={9} />
                <X size={11} />
              </span>
            </header>
            <div className="kde-body">
              <aside className="kde-sidebar">
                {["Global Theme", "Colors", "Application Style", "Window Decorations"].map(
                  (item, i) => (
                    <div key={item} className={`kde-nav ${i === 1 ? "selected" : ""}`}>
                      {item}
                    </div>
                  ),
                )}
              </aside>
              <div className="kde-view">
                <div className="kde-banner kde-banner-ok">
                  Installed {theme.name}.colors to ~/.local/share/color-schemes/
                </div>
                <div className="kde-banner kde-banner-warn">
                  Logout optional — Qt/Plasma apps update live.
                </div>
                <div className="kde-card">
                  <b>Breeze Widget Preview</b>
                  <div className="kde-controls">
                    <button type="button" className="kde-btn-primary">Apply</button>
                    <button type="button" className="kde-btn">Defaults</button>
                    <span className="kde-link">Get New Schemes…</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="kde-panel">
          <span className="kde-kickoff">❖</span>
          <span className="kde-task active">System Settings</span>
          <span className="kde-task">Konsole</span>
          <span className="kde-task">Dolphin</span>
          <span className="kde-tray">Wi-Fi · 92% · 14:20</span>
        </footer>
      </div>
    );
  }

  if (target === "rofi") {
    const apps = [
      { icon: "▸", name: "Ghostty", desc: "GPU-accelerated terminal" },
      { icon: "▸", name: "Visual Studio Code", desc: "Code editor" },
      { icon: "▸", name: "Firefox", desc: "Web browser" },
      { icon: "▸", name: "Obsidian", desc: "Markdown knowledge base" },
      { icon: "▸", name: "System Settings", desc: "Appearance & display" },
    ].filter(
      (a) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.desc.toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <div className="native-window native-rofi-stage">
        <div className="native-rofi rofi-centered" role="region" aria-label="Rofi launcher preview">
          <div className="rofi-inputbar">
            <span className="rofi-prompt">drun:</span>
            <input
              aria-label="Filter launcher apps"
              placeholder="Type to filter…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedApp(0);
              }}
            />
          </div>
          <div className="rofi-list">
            {apps.map((app, i) => (
              <button
                key={app.name}
                className={`${selectedApp === i ? "selected" : i % 2 === 1 ? "alt" : ""}`}
                onClick={() => setSelectedApp(i)}
              >
                <b>{app.name}</b>
                <small>{app.desc}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (target === "hyprland") {
    const tiles = [
      { title: "ghostty — ~/git/themespace", body: "$ hyprctl reload\nok\n$ echo 'active_border gradient'" },
      { title: "nvim — hyprland.conf", body: `col.active_border = $ts_accent $ts_accent2 45deg\nrounding = ${Math.min(18, theme.style.radius)}` },
      { title: "btop — system", body: "CPU 18%  MEM 12.4G / 32G\nClick any window to move focus" },
    ];
    return (
      <div className="native-window native-hyprland">
        <div className="native-waybar">
          <div className="waybar-workspaces">
            {[1, 2, 3, 4].map((ws) => (
              <button
                key={ws}
                className={workspace === ws ? "active" : ""}
                onClick={() => setWorkspace(ws)}
              >
                {ws}
              </button>
            ))}
          </div>
          <span className="waybar-clock">Hyprland · {theme.name}</span>
          <div className="waybar-modules">
            <span>WS {workspace}</span>
            <span>14:20</span>
          </div>
        </div>
        <div className="hypr-grid">
          {tiles.map((tile, idx) => (
            <button
              key={tile.title}
              type="button"
              className={`hypr-tile hypr-tile-${idx} ${focusedTile === idx ? "active" : ""}`}
              onClick={() => setFocusedTile(idx)}
            >
              <span className="hypr-tile-head">
                <b>{tile.title}</b>
                <small>{focusedTile === idx ? "focused" : "inactive"}</small>
              </span>
              <pre>{tile.body}</pre>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Waybar
  return (
    <div className="native-window native-waybar-stage">
      <div className="native-waybar">
        <div className="waybar-workspaces">
          {[1, 2, 3, 4, 5].map((ws) => (
            <button
              key={ws}
              className={workspace === ws ? "active" : ""}
              onClick={() => setWorkspace(ws)}
            >
              {ws}
            </button>
          ))}
        </div>
        <span className="waybar-clock">Thu 26 Nov · 14:20</span>
        <div className="waybar-modules">
          <span>CPU 18%</span>
          <span>Wi-Fi</span>
          <span>VOL 74%</span>
          <button
            className={`waybar-bat bat-${batLevel}`}
            title="Click to cycle battery warning/critical colors"
            onClick={() =>
              setBatLevel(
                batLevel === "normal"
                  ? "warning"
                  : batLevel === "warning"
                    ? "critical"
                    : "normal",
              )
            }
          >
            BAT {batLevel === "normal" ? "92%" : batLevel === "warning" ? "18%" : "6%"}
          </button>
        </div>
      </div>
      <div className="waybar-backdrop">
        <div className="waybar-win">
          <div className="waybar-win-title">ghostty — workspace {workspace}</div>
          <pre>{`@import "./colors-${theme.defaultAppearance}.css";\nwindow#waybar { background: @surface; color: @foreground; }\n#workspaces button.active { background: @accent-fill; }`}</pre>
        </div>
      </div>
    </div>
  );
}
function CliScene({
  theme,
  mode,
  target,
}: {
  theme: Theme;
  mode: Appearance;
  target: string;
}) {
  const renderAnsi = useCallback(
    (cols: number) => tuiAnsi(target, theme, mode, cols),
    [target, theme, mode],
  );
  return (
    <div className={`native-window native-terminal cli-${target}`}>
      <div className="native-titlebar">
        <Dots />
        <span>
          {previewProfiles[target].label} — {theme.name}
        </span>
      </div>
      <div className="native-terminal-panes">
        <TerminalSurface
          theme={theme}
          mode={mode}
          target={target}
          renderAnsi={renderAnsi}
        />
      </div>
    </div>
  );
}
function Tokens({ theme, mode }: { theme: Theme; mode: Appearance }) {
  const c = integrationTheme(theme, mode, "tokens").variables,
    [search, setSearch] = useState("");
  return (
    <div className="native-token-inspector">
      <div>
        <span className="native-section-label">DTCG · DESIGN TOKENS</span>
        <h2>{theme.name}</h2>
        <label className="native-search-field">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter color roles…"
            aria-label="Filter design tokens"
          />
        </label>
      </div>
      <div className="native-token-grid">
        {Object.entries(c)
          .filter(([key]) => key.toLowerCase().includes(search.toLowerCase()))
          .map(([key, value]) => (
            <div key={key}>
              <i style={{ background: value }} />
              <span>
                <b>{key}</b>
                <code>{value}</code>
              </span>
              <small>color / srgb</small>
            </div>
          ))}
      </div>
    </div>
  );
}
export function IntegrationPreview({
  theme,
  mode,
  target,
}: {
  theme: Theme;
  mode: Appearance;
  target: string;
}) {
  const profile = previewProfiles[target],
    targetInfo = getTarget(target);
  if (!profile) return <p>No preview is available for this target.</p>;
  if (target === "shadcn")
    return (
      <div data-preview-target={target}>
        <ShadcnPreviewLoader theme={theme} mode={mode} compact />
      </div>
    );
  if (profile.kind === "framework")
    return (
      <div data-preview-target={target}>
        <p className="integration-preview-note">
          {targetInfo.name} · Component fixture using your exported tokens.
        </p>
        <ComponentLibrary theme={theme} mode={mode} compact />
      </div>
    );
  const contract = integrationTheme(theme, mode, target),
    c = contract.roles,
    fidelity =
      target === "ghostty" &&
      terminalEngine(target, contract.terminal) === "xterm.js"
        ? {
            ...previewFidelity[target],
            renderer: "xterm.js · Ghostty color preview",
          }
        : previewFidelity[target],
    style = {
      ...previewStyle(theme, mode),
      ...Object.fromEntries(
        Object.entries(contract.variables).filter(([key]) =>
          key.startsWith("--"),
        ),
      ),
      ...Object.fromEntries(
        Object.entries(c).map(([key, value]) => [
          `--ts-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
          value,
        ]),
      ),
      "--ts-background": c.background,
      "--ts-foreground": c.foreground,
      "--ts-selection": c.selection,
      "--native-title": c.title,
      "--native-sidebar": c.sidebar,
      "--native-tabs": c.tabs,
      "--native-status": c.status,
      "--native-status-text": c.statusText,
      "--native-terminal-bg": c.terminalBackground,
      "--native-cursor": c.cursor,
      ...Object.fromEntries(
        Object.entries(c)
          .filter(([key]) => /^ansi\d+$/.test(key))
          .map(([key, value]) => [`--ts-${key}`, value]),
      ),
    } as CSSProperties;
  return (
    <div className="integration-renderer">
      <div
        className={`native-preview theme-scope theme-${mode}`}
        data-preview-target={target}
        style={style}
      >
        {profile.kind === "editor" ? (
          <Editor theme={theme} mode={mode} target={target} />
        ) : profile.kind === "terminal" ? (
          <TerminalWindow theme={theme} mode={mode} target={target} />
        ) : profile.kind === "music" ? (
          <SpotifyPreview theme={theme} />
        ) : profile.kind === "chat" ? (
          <DiscordPreview mode={mode} />
        ) : profile.kind === "browser" ? (
          <Browser theme={theme} mode={mode} target={target} />
        ) : profile.kind === "notes" ? (
          <Notes theme={theme} mode={mode} />
        ) : profile.kind === "workspace" ? (
          <T3CodeWorkspace theme={theme} mode={mode} />
        ) : profile.kind === "git" ? (
          <GitClient target={target} theme={theme} mode={mode} />
        ) : profile.kind === "slack" ? (
          <SlackWorkspace theme={theme} />
        ) : profile.kind === "desktop" ? (
          <DesktopScene theme={theme} target={target} />
        ) : profile.kind === "cli" ? (
          <CliScene theme={theme} mode={mode} target={target} />
        ) : (
          <Tokens theme={theme} mode={mode} />
        )}
      </div>
      <details className="preview-fidelity">
        <summary>
          <span>{fidelity.renderer}</span>
          <span>About this preview</span>
        </summary>
        <p>{fidelity.coverage}</p>
        <p>{fidelity.limitations}</p>
        <div className="preview-source-files">
          {contract.sourceFiles.map((file) => (
            <code key={file}>{file}</code>
          ))}
        </div>
        <a href={fidelity.url} target="_blank" rel="noreferrer">
          Renderer / format reference ↗
        </a>
      </details>
    </div>
  );
}
export function IntegrationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ThemedSelect
      label="Integration to preview"
      value={value}
      onValueChange={onChange}
      options={Object.entries(previewProfiles).map(([value, p]) => ({
        value,
        label: p.label,
      }))}
    />
  );
}
