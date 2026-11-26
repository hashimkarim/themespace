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
  ArrowUp,
  Battery,
  Bell,
  Bluetooth,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Cpu,
  Download,
  FileCode2,
  FileText,
  Files,
  Folder,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Globe,
  Hash,
  Home,
  Keyboard,
  LayoutGrid,
  Lock,
  MessageSquare,
  Minus,
  Monitor,
  MoreHorizontal,
  Palette,
  Paperclip,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sliders,
  Sparkles,
  Square,
  Tag,
  Terminal,
  Volume2,
  Wifi,
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
    modal = profile.variant === "modal",
    isJetBrains = target === "jetbrains",
    isBat = target === "bat",
    isNeovim = target === "neovim",
    isHelix = target === "helix",
    isZed = target === "zed",
    isSublime = target === "sublime",
    slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (isBat) {
    return (
      <div className="native-window native-editor editor-bat">
        <div className="native-titlebar bat-titlebar">
          <Dots />
          <span>bat — ~/git/themespace</span>
          <div className="bat-file-pills" role="tablist" aria-label="bat sample files">
            {files.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={file === f}
                className={file === f ? "selected" : ""}
                onClick={() => setFile(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="bat-pager-header">
          <div className="bat-cmd">
            <span className="syntax-function">❯</span> bat --theme=&quot;{theme.name} {mode}&quot; src/{file}
          </div>
          <div className="bat-file-banner">
            <span className="bat-gutter-col">File</span>
            <b>src/{file}</b>
            <small>{file === "tokens.css" ? "CSS" : file === "README.md" ? "Markdown" : "TypeScript"} · TextMate .tmTheme</small>
          </div>
        </div>
        <CodeSurface
          theme={theme}
          mode={mode}
          target={target}
          file={file}
          value={edits[file]}
          onChange={(value) =>
            setEdits((previous) => ({ ...previous, [file]: value }))
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`native-window native-editor editor-${target} ${modal ? "modal-editor" : ""}`}
    >
      {isJetBrains ? (
        <div className="native-titlebar jb-titlebar">
          <Dots />
          <span className="jb-proj-pill">
            <i className="jb-proj-badge">TS</i>
            <b>themespace</b>
          </span>
          <span className="jb-vcs-pill">
            <GitBranch size={11} /> main
          </span>
          <div className="jb-run-group">
            <span className="jb-config-pill">{file}</span>
            <span className="jb-run-btn" aria-hidden="true">
              <Play size={11} />
            </span>
          </div>
          <span className="jb-right-icons" aria-hidden="true">
            <Search size={13} />
            <Settings size={13} />
          </span>
        </div>
      ) : (
        <div className="native-titlebar">
          <Dots />
          <span>
            {isNeovim
              ? `nvim — ~/git/themespace/${file}`
              : isHelix
                ? `hx — ~/git/themespace/${file}`
                : isZed
                  ? `Zed — themespace · main`
                  : profile.label}
          </span>
          {target === "vscode" && (
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
          )}
          <MoreHorizontal size={15} />
        </div>
      )}
      <div className="native-editor-body">
        {(target === "vscode" || isJetBrains) && (
          <aside
            className={`native-activity ${isJetBrains ? "jb-tool-stripe" : ""}`}
            aria-label="Editor tools"
          >
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
                <Icon size={isJetBrains ? 17 : 20} />
              </button>
            ))}
            {target === "vscode" && (
              <button
                aria-label="Toggle terminal preview"
                onClick={() => setTerminal(!terminal)}
              >
                <Terminal size={19} />
              </button>
            )}
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
                    : isJetBrains
                      ? "PROJECT"
                      : isZed
                        ? "PROJECT"
                        : isSublime
                          ? "FOLDERS"
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
            {files.map((f, idx) => (
              <button
                key={f}
                role="tab"
                aria-selected={file === f}
                onClick={() => setFile(f)}
              >
                {modal ? (
                  <span className="modal-buf-idx">{idx + 1}</span>
                ) : (
                  <FileCode2 size={12} />
                )}
                {f}
                {modal ? null : f === file ? (
                  <span className="native-modified" />
                ) : (
                  <X size={10} />
                )}
              </button>
            ))}
          </div>
          {!modal && !isSublime && (
            <div className="native-breadcrumb">
              src <ChevronRight size={11} />
              {file} <ChevronRight size={11} />
              {file === "theme.ts" ? "yourTheme" : "preview"}
            </div>
          )}
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
      {isNeovim ? (
        <div className="modal-bottom-stack">
          <div className="modal-statusline nvim-statusline">
            <span className="modal-mode-pill">NORMAL</span>
            <span className="modal-branch">
              <GitBranch size={10} /> main
            </span>
            <span className="modal-path">src/{file}</span>
            <span className="modal-right">
              utf-8 · {file === "tokens.css" ? "css" : file === "README.md" ? "md" : "ts"} · 1:1
            </span>
          </div>
          <div className="modal-cmdline">:colorscheme {slug}-{mode}</div>
        </div>
      ) : isHelix ? (
        <div className="modal-bottom-stack">
          <div className="modal-statusline helix-statusline">
            <span className="modal-mode-pill">NOR</span>
            <span className="modal-path">src/{file}</span>
            <span className="modal-right">
              1 sel · 1:1 · utf-8 · {file === "tokens.css" ? "css" : file === "README.md" ? "md" : "ts"}
            </span>
          </div>
          <div className="modal-cmdline">:theme {slug}-{mode}</div>
        </div>
      ) : (
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
          ) : isJetBrains ? (
            <span>LF · 2 spaces</span>
          ) : isSublime ? (
            <span>Line 1, Col 1 · Spaces: 2</span>
          ) : (
            <span>Editing</span>
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
      )}
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
    mobile = target === "termux",
    konsole = target === "konsole",
    gnomeTerm = target === "gnome-terminal",
    linuxMinimal = target === "foot" || target === "xresources";
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
      ) : gnomeTerm ? (
        <div className="native-titlebar gnome-term-header">
          <span className="gnome-term-btn" aria-hidden="true">
            <Plus size={13} />
          </span>
          <span className="gnome-term-title">~/themes — GNOME Terminal</span>
          <span className="gnome-term-right" aria-hidden="true">
            <Search size={12} />
            <MoreHorizontal size={13} />
            <span className="gnome-term-close">
              <X size={11} />
            </span>
          </span>
        </div>
      ) : (
        <div
          className={`native-titlebar ${windows ? "windows-titlebar" : konsole ? "konsole-titlebar" : ""}`}
        >
          {!windows && !konsole && !linuxMinimal && <Dots />}
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
          {(windows || konsole) && (
            <span className="native-window-controls" aria-hidden="true">
              <Minus size={12} />
              <Square size={10} />
              <X size={12} />
            </span>
          )}
          {linuxMinimal && (
            <span className="native-window-controls" aria-hidden="true">
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
      {konsole && (
        <div className="konsole-tabbar" role="tablist" aria-label="Konsole tabs">
          {["zsh · ~/themes", "git · ~/projects"].map((label, idx) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={tab === idx}
              className={tab === idx ? "active" : ""}
              onClick={() => setTab(idx)}
            >
              <Terminal size={11} /> {label}
            </button>
          ))}
        </div>
      )}
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
      { title: "New Tab", url: "about:newtab", badge: "N" },
      { title: "ThemeSpace Studio", url: "themespace.app", badge: "T" },
      { title: "Zen Mods Docs", url: "docs.zen-browser.app", badge: "Z" },
      { title: "GitHub · themespace", url: "github.com/themespace", badge: "G" },
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
          <div className="zen-pinned" aria-label="Zen Essentials">
            {[
              { label: "Web", Icon: Globe },
              { label: "Code", Icon: Code2 },
              { label: "Docs", Icon: BookOpen },
            ].map(({ label, Icon }) => (
              <button
                key={label}
                type="button"
                className="zen-essential"
                title={label}
                onClick={() => setResult(`Opened ${label} essential tab.`)}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
          <div className="zen-divider" />
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
                <span className="zen-favicon">{item.badge}</span>
                <span className="zen-tab-title">{item.title}</span>
              </button>
            ))}
            <button
              type="button"
              className="zen-new-tab-btn"
              onClick={() => {
                setTab(0);
                setUrl("about:newtab");
              }}
            >
              <Plus size={12} />
              <span>New Tab</span>
            </button>
          </div>
          <div className="zen-rail-foot">
            <span className="zen-ws-dots">
              <i className="active" />
              <i />
              <i />
            </span>
            <span>Zen Browser</span>
            <Settings size={12} />
          </div>
        </aside>
        <div className="zen-viewport-shell">
          <div className="native-browser-page native-new-tab zen-page">
            <small>{tab === 0 ? "ZEN · ABOUT:NEWTAB" : zenTabs[tab]?.url.toUpperCase()}</small>
            <h2>{tab === 0 ? `${theme.name} on Zen` : zenTabs[tab]?.title}</h2>
            <p>
              Vertical sidebar, URL bar, Essentials tiles, and built-in{" "}
              <code>about:</code> pages styled via <code>userChrome.css</code>{" "}
              and <code>userContent.css</code>.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setResult(
                  search
                    ? `Zen search for “${search}”`
                    : "Type to preview Zen search.",
                );
              }}
            >
              <label>
                <Search size={15} />
                <input
                  aria-label="Zen new tab search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search with Zen…"
                />
              </label>
            </form>
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
      <div className={target === "vivaldi" ? "vivaldi-body" : "browser-body-fill"}>
        {target === "vivaldi" && (
          <aside className="vivaldi-panel-rail" aria-label="Vivaldi web panels">
            <span className="vivaldi-rail-btn active" title="Bookmarks">
              <Bookmark size={14} />
            </span>
            <span className="vivaldi-rail-btn" title="Downloads">
              <Download size={14} />
            </span>
            <span className="vivaldi-rail-btn" title="Notes">
              <FileText size={14} />
            </span>
            <span className="vivaldi-rail-btn" title="History">
              <Clock size={14} />
            </span>
            <span className="vivaldi-rail-btn vivaldi-rail-bottom" title="Settings">
              <Settings size={14} />
            </span>
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
      text: `Export ${theme.name} to T3 Code and verify integrated terminal contrast.`,
    },
    {
      role: "work",
      text: "Edited 2 files · +64 -8 · 50 tests passed",
      files: ["web/lib/exporters.ts", "web/tests/exporters.test.ts"],
    },
    {
      role: "assistant",
      text: `Published ${theme.name} (${mode}) with all 65 T3 Code color roles, sidebar tokens, and 16-color integrated terminal palette.`,
    },
  ]);
  const threads = [
    { name: "Export T3 Code theme", time: "2m", status: "done", branch: "main", diff: ["+64", "-8"] },
    { name: "Fix xterm ANSI wrapping", time: "18m", status: "active", branch: "feat/tui", diff: ["+112", "-24"] },
    { name: "Release v0.2 checklist", time: "1h", status: "done", branch: "main", diff: ["+19", "-3"] },
  ];
  const secondaryThreads = [
    { name: "Port T3 Code palette", time: "3h", status: "done" },
    { name: "Audit GTK 4 colors", time: "1d", status: "done" },
  ];
  const slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="native-window native-t3code">
      <div className="t3-layout">
        <aside className="t3-sidebar">
          <div className="t3-sidebar-top">
            <Dots />
            <span className="t3-brand">T3 Code</span>
            <button
              type="button"
              className="t3-icon-btn"
              aria-label="New thread"
              onClick={() => setThread(0)}
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="t3-project-group">
            <div className="t3-project-head">
              <span className="t3-monogram">TS</span>
              <b>themespace</b>
              <small>main</small>
            </div>
            <div className="t3-thread-list">
              {threads.map((item, idx) => (
                <button
                  key={item.name}
                  type="button"
                  className={`t3-thread ${thread === idx ? "selected" : ""}`}
                  onClick={() => setThread(idx)}
                >
                  <i className={`t3-dot t3-dot-${item.status}`} />
                  <span>{item.name}</span>
                  <small>{item.time}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="t3-project-group">
            <div className="t3-project-head">
              <span className="t3-monogram t3-monogram-alt">CT</span>
              <b>comfy-themes</b>
              <small>main</small>
            </div>
            <div className="t3-thread-list">
              {secondaryThreads.map((item) => (
                <div key={item.name} className="t3-thread t3-thread-muted">
                  <i className={`t3-dot t3-dot-${item.status}`} />
                  <span>{item.name}</span>
                  <small>{item.time}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="t3-sidebar-foot">
            <span className="t3-env-pill">
              <i /> Local · Connected
            </span>
            <Settings size={13} />
          </div>
        </aside>
        <section className="t3-main">
          <header className="t3-header">
            <div className="t3-header-title">
              <b>{threads[thread].name}</b>
              <span className="t3-badge">
                <GitBranch size={10} /> {threads[thread].branch}
              </span>
              <span className="t3-diff-pill">
                <em className="t3-add">{threads[thread].diff[0]}</em>{" "}
                <em className="t3-del">{threads[thread].diff[1]}</em>
              </span>
            </div>
            <button
              type="button"
              className={`native-pill-btn ${showTerm ? "active" : ""}`}
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
                  <div className="t3-work-head">
                    <Check size={12} />
                    <b>{m.text}</b>
                  </div>
                  {"files" in m && m.files && (
                    <div className="t3-work-files">
                      {m.files.map((f) => (
                        <span key={f} className="t3-file-chip">
                          <FileCode2 size={10} /> {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div key={i} className={`t3-msg t3-msg-${m.role}`}>
                  <p>{m.text}</p>
                </div>
              ),
            )}
            <div className="t3-code-card">
              <div className="t3-code-head">
                <span>{slug}.t3-theme.json</span>
                <small>JSON</small>
              </div>
              <pre className="t3-code">
                <code>
                  <span className="syntax-comment">{"{"}</span>
                  {"\n  "}
                  <span className="syntax-keyword">&quot;version&quot;</span>:{" "}
                  <span className="syntax-number">1</span>,{"\n  "}
                  <span className="syntax-keyword">&quot;name&quot;</span>:{" "}
                  <span className="syntax-string">&quot;{theme.name}&quot;</span>,{"\n  "}
                  <span className="syntax-keyword">&quot;appearance&quot;</span>:{" "}
                  <span className="syntax-string">&quot;{mode}&quot;</span>,{"\n  "}
                  <span className="syntax-keyword">&quot;canvas&quot;</span>:{" "}
                  <span className="syntax-string">&quot;{r.background}&quot;</span>,{"\n  "}
                  <span className="syntax-keyword">&quot;accent&quot;</span>:{" "}
                  <span className="syntax-string">&quot;{r.accentFill}&quot;</span>,{"\n  "}
                  <span className="syntax-keyword">&quot;colors&quot;</span>: {"{ "}
                  <span className="syntax-keyword">&quot;sidebar&quot;</span>:{" "}
                  <span className="syntax-string">&quot;{r.sidebar}&quot;</span>,{" "}
                  <span className="syntax-keyword">&quot;surface&quot;</span>:{" "}
                  <span className="syntax-string">&quot;{r.surface}&quot;</span>
                  {" }\n"}
                  <span className="syntax-comment">{"}"}</span>
                </code>
              </pre>
            </div>
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
              <div className="t3-composer-pills">
                <span className="t3-tool-icon" aria-hidden="true">
                  <Paperclip size={12} />
                </span>
                <span className="t3-model-pill">
                  <Sparkles size={10} /> Default
                </span>
                <span className="t3-model-pill">Full access</span>
              </div>
              <button
                type="submit"
                className="t3-send-btn"
                aria-label="Send message"
              >
                <ArrowUp size={13} />
              </button>
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
  const [selectedFile, setSelectedFile] = useState(0);
  const isSmartGit = target === "smartgit";
  const commits = [
    {
      hash: "64b0589",
      branch: "main",
      author: theme.author,
      time: "4m ago",
      lane: 0,
      msg: `Export ${theme.name} in ${isSmartGit ? "SmartGit patch" : "GitComet v2"} format`,
      files: [
        { status: "M", path: "web/lib/exporters.ts", stat: "+84 -12" },
        { status: "M", path: "web/tests/exporters.test.ts", stat: "+26 -4" },
        { status: "A", path: "web/lib/tui-ansi.ts", stat: "+215 -0" },
      ],
      hunk: "@@ -742,6 +742,9 @@ generateTarget(",
      lines: [
        { n1: "742", n2: "742", kind: "ctx", text: "  schema_version: 2," },
        { n1: "743", n2: "", kind: "del", text: '  background: "#1c1f26",' },
        { n1: "744", n2: "", kind: "del", text: '  accent: "#3b82f6",' },
        { n1: "", n2: "743", kind: "add", text: `  canvas: "${r.background}ff",` },
        { n1: "", n2: "744", kind: "add", text: `  accent: "${r.accent}ff",` },
        { n1: "", n2: "745", kind: "add", text: `  surface: "${r.surface}ff",` },
        { n1: "745", n2: "746", kind: "ctx", text: "  radii: { panel: 10, pill: 999 }," },
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
    {
      hash: "8c0a12d",
      branch: "main",
      author: theme.author,
      time: "1d ago",
      lane: 0,
      msg: "Release ThemeSpace v0.2.0 presets & docs",
      files: [{ status: "M", path: "README.md", stat: "+42 -11" }],
      hunk: "@@ -1,3 +1,5 @@ # ThemeSpace",
      lines: [
        { n1: "1", n2: "1", kind: "ctx", text: "# ThemeSpace" },
        { n1: "", n2: "2", kind: "add", text: "Design once. Export native themes for 47 apps." },
      ],
    },
  ];
  const active = commits[commit];
  const laneColors = [
    r.chart1 ?? r.accent,
    r.chart2 ?? r.success,
    r.chart3 ?? r.warning,
  ];
  const rowH = 34;
  return (
    <div className={`native-window native-git ${isSmartGit ? "git-smartgit" : "git-gitcomet"}`}>
      <div className="native-titlebar git-titlebar">
        <Dots />
        <div className="git-repo-tabs">
          <span className="git-repo-tab active">
            <GitBranch size={11} /> themespace
          </span>
          <span className="git-repo-tab">comfy-themes</span>
        </div>
        <div className="git-toolbar-actions">
          <span className="git-tool-pill">
            <RefreshCw size={11} /> Fetch
          </span>
          <span className="git-tool-pill">
            <Download size={11} /> Pull
          </span>
          <span className="git-tool-pill">
            <ArrowUp size={11} /> Push ↑2
          </span>
          {isSmartGit && (
            <span className="git-tool-pill">
              <GitCommitHorizontal size={11} /> Commit
            </span>
          )}
        </div>
        <span className="git-branch-pill">
          <GitBranch size={11} /> {branch}
        </span>
      </div>
      <div className="git-workbench">
        <aside className="git-refs">
          <div className="git-ref-section">WORKING TREE</div>
          <div className="git-ref-row git-wt-row">
            <FileCode2 size={11} />
            <span>Uncommitted</span>
            <small className="git-wt-badge">3</small>
          </div>
          <div className="git-ref-section">LOCAL BRANCHES</div>
          {[
            { name: "main", badge: "↑2" },
            { name: "feat/companion", badge: "1" },
            { name: "fix/contrast", badge: "" },
          ].map((b) => (
            <button
              key={b.name}
              type="button"
              className={`git-ref-row ${branch === b.name ? "selected" : ""}`}
              onClick={() => setBranch(b.name)}
            >
              <GitBranch size={11} />
              <span>{b.name}</span>
              {b.badge && <small>{b.badge}</small>}
            </button>
          ))}
          <div className="git-ref-section">REMOTES</div>
          <div className="git-ref-row muted-row">
            <GitPullRequest size={11} />
            <span>origin/main</span>
          </div>
          <div className="git-ref-section">TAGS</div>
          <div className="git-ref-row muted-row">
            <Tag size={11} />
            <span>v0.2.0</span>
          </div>
          <div className="git-ref-row muted-row">
            <Tag size={11} />
            <span>v0.1.0</span>
          </div>
        </aside>
        <div className="git-main">
          <div className="git-graph-head">
            <span>Graph</span>
            <span>Commit Message</span>
            <span>Author</span>
            <span>SHA</span>
            <span>When</span>
          </div>
          <div className="git-graph-table">
            <svg
              className="git-graph-svg"
              width="54"
              height={commits.length * rowH}
              viewBox={`0 0 54 ${commits.length * rowH}`}
              aria-hidden="true"
            >
              <line
                x1="13"
                y1={rowH / 2}
                x2="13"
                y2={commits.length * rowH - rowH / 2}
                stroke={laneColors[0]}
                strokeWidth="2"
              />
              <path
                d={`M 13 ${rowH / 2} C 27 24, 27 40, 27 ${rowH * 1.5} C 27 74, 13 102, 13 ${rowH * 3.5}`}
                fill="none"
                stroke={laneColors[1]}
                strokeWidth="2"
              />
              <path
                d={`M 27 ${rowH * 1.5} C 41 60, 41 72, 41 ${rowH * 2.5} C 41 102, 13 112, 13 ${rowH * 3.5}`}
                fill="none"
                stroke={laneColors[2]}
                strokeWidth="2"
              />
              {commits.map((c, idx) => (
                <circle
                  key={c.hash}
                  cx={13 + c.lane * 14}
                  cy={rowH / 2 + idx * rowH}
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
                  type="button"
                  className={`git-row ${commit === idx ? "selected" : ""}`}
                  onClick={() => {
                    setCommit(idx);
                    setBranch(c.branch);
                    setSelectedFile(0);
                  }}
                >
                  <span className="git-row-msg">
                    {idx < 3 && (
                      <em
                        className="git-ref-tag"
                        style={{
                          borderColor: laneColors[c.lane],
                          color: laneColors[c.lane],
                        }}
                      >
                        {idx === 0 ? `HEAD → ${c.branch}` : c.branch}
                      </em>
                    )}
                    <b>{c.msg}</b>
                  </span>
                  <span className="git-row-author">{c.author}</span>
                  <code className="git-row-sha">{c.hash}</code>
                  <small className="git-row-time">{c.time}</small>
                </button>
              ))}
            </div>
          </div>
          <section className="git-diff-split">
            <div className="git-file-list">
              <div className="git-pane-title">
                Changed files · {active.files.length}
              </div>
              {active.files.map((f, fi) => (
                <button
                  key={f.path}
                  type="button"
                  className={`git-file-row git-status-${f.status} ${selectedFile === fi ? "selected" : ""}`}
                  onClick={() => setSelectedFile(fi)}
                >
                  <b>{f.status}</b>
                  <span>{f.path.split("/").pop()}</span>
                  <small>{f.stat}</small>
                </button>
              ))}
            </div>
            <div className="git-diff-pane">
              <div className="git-pane-title">
                <span>{active.files[selectedFile]?.path ?? active.files[0].path}</span>
                <code>{active.hash}</code>
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
    "✨": 3,
  });
  const [feed, setFeed] = useState([
    {
      initials: "MR",
      author: "Maya Ross",
      time: "10:14 AM",
      accent: 0,
      text: `Imported the ${theme.name} 4-color Slack string — sidebar contrast, hover highlight, and active pill look super crisp.`,
      replies: 2,
    },
    {
      initials: "SK",
      author: "Sam Kim",
      time: "10:16 AM",
      accent: 1,
      text: "Online presence dots and unread mention badges stand out cleanly too. Pushed to #releases for QA.",
      replies: 0,
    },
    {
      initials: "AC",
      author: "Alex Chen",
      time: "10:19 AM",
      accent: 2,
      text: "Confirmed on macOS & Linux Slack desktop — both dark and light strings pass contrast checks.",
      replies: 0,
    },
  ]);
  const channels = [
    { name: "general", unread: 0 },
    { name: "design-systems", unread: 0 },
    { name: "releases", unread: 3 },
    { name: "engineering", unread: 0 },
    { name: "themes", unread: 1 },
  ];
  const dms = [
    { name: "Maya Ross", initials: "MR", online: true },
    { name: "Sam Kim", initials: "SK", online: true },
    { name: "Alex Chen", initials: "AC", online: false },
  ];
  return (
    <div className="native-window native-slack">
      <div className="slack-top-nav">
        <Dots />
        <span className="slack-nav-arrows" aria-hidden="true">
          <ArrowLeft size={13} />
          <ArrowRight size={13} />
          <Clock size={13} />
        </span>
        <div className="slack-search-bar">
          <Search size={11} />
          <span>Search {theme.name}</span>
        </div>
      </div>
      <div className="slack-shell">
        <nav className="slack-rail" aria-label="Slack workspace rail">
          <span className="slack-ws-icon">
            {theme.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="slack-rail-item active">
            <Home size={15} />
            <small>Home</small>
          </span>
          <span className="slack-rail-item">
            <MessageSquare size={15} />
            <small>DMs</small>
          </span>
          <span className="slack-rail-item">
            <Bell size={15} />
            <small>Activity</small>
          </span>
          <span className="slack-rail-item">
            <Bookmark size={15} />
            <small>Later</small>
          </span>
          <span className="slack-rail-user">
            YO<i className="slack-presence online" />
          </span>
        </nav>
        <aside className="slack-sidebar">
          <div className="slack-ws">
            <b>{theme.name}</b>
            <ChevronDown size={13} />
          </div>
          <div className="slack-quick-links">
            <span>
              <MessageSquare size={12} /> Threads
            </span>
            <span>
              <Bell size={12} /> Unreads
            </span>
          </div>
          <div className="slack-section">Channels</div>
          {channels.map((ch) => (
            <button
              key={ch.name}
              type="button"
              className={`slack-channel ${channel === ch.name ? "active" : ""}`}
              onClick={() => setChannel(ch.name)}
            >
              <span className="slack-channel-name">
                <Hash size={12} />
                {ch.name}
              </span>
              {ch.unread > 0 && <em className="slack-badge">{ch.unread}</em>}
            </button>
          ))}
          <div className="slack-section">Direct messages</div>
          {dms.map((dm) => (
            <div key={dm.name} className="slack-dm">
              <span className="slack-dm-avatar">
                {dm.initials}
                <i className={`slack-presence ${dm.online ? "online" : ""}`} />
              </span>
              <span>{dm.name}</span>
            </div>
          ))}
        </aside>
        <section className="slack-main">
          <div className="slack-header">
            <div className="slack-header-left">
              <b># {channel}</b>
              <small>Shared color tokens &amp; native exports</small>
            </div>
            <span className="slack-members-pill">12 members</span>
          </div>
          <div className="slack-messages">
            {feed.map((m, i) => (
              <div key={i} className="slack-msg">
                <span className={`slack-avatar slack-avatar-${m.accent}`}>
                  {m.initials}
                </span>
                <div className="slack-msg-body">
                  <div className="slack-msg-head">
                    <b>{m.author}</b>
                    <small>{m.time}</small>
                  </div>
                  <p>{m.text}</p>
                  {i === 0 && (
                    <>
                      <div className="slack-reactions">
                        {Object.entries(reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            type="button"
                            className="slack-reaction-pill"
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
                      <div className="slack-thread-bar">
                        <span className="slack-thread-avatars">SK</span>
                        <b>{m.replies} replies</b>
                        <small>Last reply 3m ago</small>
                      </div>
                    </>
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
                {
                  initials: "YO",
                  author: "You",
                  time: "Just now",
                  accent: 0,
                  text: draft,
                  replies: 0,
                },
              ]);
              setDraft("");
            }}
          >
            <div className="slack-composer-box">
              <div className="slack-composer-fmt" aria-hidden="true">
                <b>B</b>
                <i>I</i>
                <s>S</s>
                <code>{"</>"}</code>
              </div>
              <input
                aria-label="Preview Slack message"
                placeholder={`Message #${channel}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="slack-composer-foot">
                <span className="slack-composer-tools" aria-hidden="true">
                  <Plus size={13} />
                  <Paperclip size={13} />
                </span>
                <button
                  type="submit"
                  className="slack-send-btn"
                  aria-label="Send Slack message"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
function DesktopScene({
  theme,
  mode,
  target,
}: {
  theme: Theme;
  mode: Appearance;
  target: string;
}) {
  const [workspace, setWorkspace] = useState(1);
  const [focusedTile, setFocusedTile] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState(0);
  const [gtkNav, setGtkNav] = useState("Appearance");
  const [gtkNightLight, setGtkNightLight] = useState(true);
  const [gtkAnimations, setGtkAnimations] = useState(true);
  const [kdeNav, setKdeNav] = useState("Colors");
  const [batLevel, setBatLevel] = useState<"normal" | "warning" | "critical">(
    "normal",
  );

  if (target === "gtk") {
    const navItems = [
      { name: "Wi-Fi", Icon: Wifi },
      { name: "Bluetooth", Icon: Bluetooth },
      { name: "Appearance", Icon: Palette },
      { name: "Displays", Icon: Monitor },
      { name: "Sound", Icon: Volume2 },
      { name: "Keyboard", Icon: Keyboard },
      { name: "Multitasking", Icon: Sliders },
    ];
    return (
      <div className="native-window native-gtk">
        <div className="gtk-split">
          <aside className="gtk-sidebar">
            <div className="gtk-sidebar-top">
              <span className="gtk-tool-circle">
                <Search size={12} />
              </span>
              <b>Settings</b>
              <span className="gtk-tool-circle">
                <MoreHorizontal size={12} />
              </span>
            </div>
            <div className="gtk-nav-list">
              {navItems.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  className={`gtk-nav-row ${gtkNav === name ? "selected" : ""}`}
                  onClick={() => setGtkNav(name)}
                >
                  <Icon size={14} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </aside>
          <section className="gtk-pane">
            <header className="gtk-headerbar">
              <span className="gtk-header-spacer" />
              <b>{gtkNav}</b>
              <span className="gtk-close" aria-hidden="true">
                <X size={12} />
              </span>
            </header>
            <div className="gtk-body">
              <div className="gtk-group-title">Style</div>
              <div className="gtk-style-cards">
                <div className={`gtk-style-card ${mode === "light" ? "active" : ""}`}>
                  <div className="gtk-thumb gtk-thumb-light">
                    <span className="gtk-thumb-win" />
                    <span className="gtk-thumb-win small" />
                  </div>
                  <span>Default</span>
                </div>
                <div className={`gtk-style-card ${mode === "dark" ? "active" : ""}`}>
                  <div className="gtk-thumb gtk-thumb-dark">
                    <span className="gtk-thumb-win" />
                    <span className="gtk-thumb-win small" />
                  </div>
                  <span>Dark</span>
                </div>
              </div>
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
                    <small>Enable libadwaita spring transitions</small>
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
                <div className="gtk-row">
                  <div>
                    <b>Accent Palette</b>
                    <small>Exported via gtk-4.0/gtk.css @define-color</small>
                  </div>
                  <div className="gtk-swatches">
                    <i style={{ background: "var(--gtk-accent-bg-color, var(--ts-accent-fill))" }} />
                    <i style={{ background: "var(--ts-success)" }} />
                    <i style={{ background: "var(--ts-warning)" }} />
                    <i style={{ background: "var(--gtk-destructive-bg-color, var(--ts-error))" }} />
                  </div>
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
    const kdeItems = [
      { name: "Quick Settings", Icon: Sliders },
      { name: "Global Theme", Icon: Monitor },
      { name: "Colors", Icon: Palette },
      { name: "Application Style", Icon: LayoutGrid },
      { name: "Window Decorations", Icon: Square },
    ];
    return (
      <div className="native-window native-kde">
        <div className="kde-stage">
          <div className="kde-window">
            <header className="kde-titlebar">
              <span className="kde-title-left">
                <Settings size={12} />
                <b>{kdeNav} — System Settings</b>
              </span>
              <span className="kde-wm-btns" aria-hidden="true">
                <Minus size={11} />
                <Square size={9} />
                <X size={11} />
              </span>
            </header>
            <div className="kde-body">
              <aside className="kde-sidebar">
                {kdeItems.map(({ name, Icon }) => (
                  <button
                    key={name}
                    type="button"
                    className={`kde-nav ${kdeNav === name ? "selected" : ""}`}
                    onClick={() => setKdeNav(name)}
                  >
                    <Icon size={13} />
                    <span>{name}</span>
                  </button>
                ))}
              </aside>
              <div className="kde-view">
                <div className="kde-scheme-grid">
                  <div className={`kde-scheme-card ${mode === "dark" ? "active" : ""}`}>
                    <div className="kde-scheme-preview kde-scheme-dark">
                      <span className="kde-mini-bar" />
                      <div className="kde-mini-body">
                        <i className="kde-mini-pill" />
                        <i className="kde-mini-line" />
                      </div>
                    </div>
                    <span>{theme.name} Dark</span>
                  </div>
                  <div className={`kde-scheme-card ${mode === "light" ? "active" : ""}`}>
                    <div className="kde-scheme-preview kde-scheme-light">
                      <span className="kde-mini-bar" />
                      <div className="kde-mini-body">
                        <i className="kde-mini-pill" />
                        <i className="kde-mini-line" />
                      </div>
                    </div>
                    <span>{theme.name} Light</span>
                  </div>
                </div>
                <div className="kde-banner kde-banner-ok">
                  <Check size={12} />
                  <span>
                    Installed {theme.name}.colors to ~/.local/share/color-schemes/
                  </span>
                </div>
                <div className="kde-card">
                  <div className="kde-card-head">
                    <b>Breeze Widget Preview</b>
                    <small>Qt 6 / Kirigami live palette</small>
                  </div>
                  <div className="kde-slider-row">
                    <span>Accent strength</span>
                    <div className="kde-slider">
                      <i />
                    </div>
                  </div>
                  <div className="kde-controls">
                    <button type="button" className="kde-btn-primary">
                      Apply
                    </button>
                    <button type="button" className="kde-btn">
                      Defaults
                    </button>
                    <span className="kde-link">Get New Schemes…</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="kde-panel">
          <span className="kde-kickoff" aria-hidden="true">
            <LayoutGrid size={14} />
          </span>
          <span className="kde-task active">
            <Settings size={11} /> System Settings
          </span>
          <span className="kde-task">
            <Terminal size={11} /> Konsole
          </span>
          <span className="kde-task">
            <Folder size={11} /> Dolphin
          </span>
          <span className="kde-tray">
            <Wifi size={11} />
            <Volume2 size={11} />
            <Battery size={11} />
            <b>14:20</b>
          </span>
        </footer>
      </div>
    );
  }

  if (target === "rofi") {
    const allApps = [
      { Icon: Terminal, name: "Ghostty", desc: "GPU-accelerated terminal emulator" },
      { Icon: Code2, name: "Visual Studio Code", desc: "Code editing. Redefined." },
      { Icon: Globe, name: "Firefox", desc: "Web browser" },
      { Icon: BookOpen, name: "Obsidian", desc: "Markdown knowledge base" },
      { Icon: GitBranch, name: "GitComet", desc: "Native Git graph & diff client" },
      { Icon: Sliders, name: "System Settings", desc: "Appearance, displays & themes" },
    ];
    const apps = allApps.filter(
      (a) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.desc.toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <div className="native-window native-rofi-stage">
        <div className="rofi-desktop-bg" aria-hidden="true">
          <div className="rofi-bg-win rofi-bg-left" />
          <div className="rofi-bg-win rofi-bg-right" />
        </div>
        <div className="native-rofi rofi-centered" role="region" aria-label="Rofi launcher preview">
          <div className="rofi-inputbar">
            <span className="rofi-prompt">drun</span>
            <Search size={13} className="rofi-search-icon" />
            <input
              aria-label="Filter launcher apps"
              placeholder="Search applications…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedApp(0);
              }}
            />
            <span className="rofi-count">
              {apps.length}/{allApps.length}
            </span>
          </div>
          <div className="rofi-list-wrap">
            <div className="rofi-list">
              {apps.map(({ Icon, name, desc }, i) => (
                <button
                  key={name}
                  type="button"
                  className={`rofi-row ${selectedApp === i ? "selected" : i % 2 === 1 ? "alt" : ""}`}
                  onClick={() => setSelectedApp(i)}
                >
                  <span className="rofi-app-icon">
                    <Icon size={13} />
                  </span>
                  <span className="rofi-app-text">
                    <b>{name}</b>
                    <small>{desc}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="rofi-scrollbar" aria-hidden="true">
              <i />
            </div>
          </div>
          <div className="rofi-mode-bar">
            <span className="active">drun</span>
            <span>run</span>
            <span>window</span>
            <span>ssh</span>
          </div>
        </div>
      </div>
    );
  }

  if (target === "hyprland") {
    const rVal = Math.min(18, theme.style.radius);
    return (
      <div className="native-window native-hyprland">
        <div className="native-waybar">
          <div className="waybar-workspaces">
            {[1, 2, 3, 4].map((ws) => (
              <button
                key={ws}
                type="button"
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
          <div
            role="button"
            tabIndex={0}
            className={`hypr-tile-frame hypr-tile-0 ${focusedTile === 0 ? "active" : ""}`}
            onClick={() => setFocusedTile(0)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFocusedTile(0);
            }}
          >
            <div className="hypr-tile-inner">
              <div className="hypr-tile-head">
                <span className="hypr-tile-title">
                  <Terminal size={11} /> ghostty — ~/git/themespace
                </span>
                <small>{focusedTile === 0 ? "active_border" : "inactive"}</small>
              </div>
              <div className="hypr-tile-body">
                <p>
                  <span className="syntax-function">~/git/themespace</span>{" "}
                  <span className="syntax-string">main</span>{" "}
                  <span className="syntax-keyword">❯</span> hyprctl reload
                </p>
                <p className="hypr-ok">ok · loaded {theme.name} ({mode})</p>
                <p className="hypr-dim">
                  # ~/.config/hypr/themes/{theme.name.toLowerCase().replace(/\s+/g, "-")}.conf
                </p>
                <p>
                  <span className="syntax-keyword">general</span> {"{"}
                </p>
                <p>
                  {"  "}border_size = <span className="syntax-number">2</span>
                </p>
                <p>
                  {"  "}col.active_border ={" "}
                  <span className="syntax-string">$accent $accent2 45deg</span>
                </p>
                <p>
                  {"  "}col.inactive_border ={" "}
                  <span className="syntax-comment">$ts_border</span>
                </p>
                <p>{"}"}</p>
                <p>
                  <span className="syntax-keyword">decoration</span> {"{"}{" "}
                  rounding = <span className="syntax-number">{rVal}</span> {"}"}
                </p>
              </div>
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className={`hypr-tile-frame hypr-tile-1 ${focusedTile === 1 ? "active" : ""}`}
            onClick={() => setFocusedTile(1)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFocusedTile(1);
            }}
          >
            <div className="hypr-tile-inner">
              <div className="hypr-tile-head">
                <span className="hypr-tile-title">
                  <Code2 size={11} /> nvim — hyprland.conf
                </span>
                <small>{focusedTile === 1 ? "active_border" : "inactive"}</small>
              </div>
              <div className="hypr-tile-body">
                <p>
                  <span className="hypr-ln">1</span>{" "}
                  <span className="syntax-keyword">source</span> ={" "}
                  <span className="syntax-string">~/.config/hypr/theme.conf</span>
                </p>
                <p>
                  <span className="hypr-ln">2</span>{" "}
                  <span className="syntax-keyword">gaps_in</span> ={" "}
                  <span className="syntax-number">6</span>
                </p>
                <p>
                  <span className="hypr-ln">3</span>{" "}
                  <span className="syntax-keyword">gaps_out</span> ={" "}
                  <span className="syntax-number">12</span>
                </p>
                <p>
                  <span className="hypr-ln">4</span>{" "}
                  <span className="syntax-keyword">layout</span> ={" "}
                  <span className="syntax-string">dwindle</span>
                </p>
              </div>
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className={`hypr-tile-frame hypr-tile-2 ${focusedTile === 2 ? "active" : ""}`}
            onClick={() => setFocusedTile(2)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFocusedTile(2);
            }}
          >
            <div className="hypr-tile-inner">
              <div className="hypr-tile-head">
                <span className="hypr-tile-title">
                  <Cpu size={11} /> btop — system
                </span>
                <small>{focusedTile === 2 ? "active_border" : "inactive"}</small>
              </div>
              <div className="hypr-tile-body hypr-bars">
                <div className="hypr-meter-row">
                  <span>CPU 18%</span>
                  <div className="hypr-meter">
                    <i style={{ width: "36%", background: "var(--ts-accent)" }} />
                  </div>
                </div>
                <div className="hypr-meter-row">
                  <span>MEM 12.4G</span>
                  <div className="hypr-meter">
                    <i style={{ width: "48%", background: "var(--ts-success)" }} />
                  </div>
                </div>
                <div className="hypr-meter-row">
                  <span>GPU 54°C</span>
                  <div className="hypr-meter">
                    <i style={{ width: "54%", background: "var(--ts-warning)" }} />
                  </div>
                </div>
                <p className="hypr-dim">Click any window to move Hyprland focus</p>
              </div>
            </div>
          </div>
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
              type="button"
              className={workspace === ws ? "active" : ""}
              onClick={() => setWorkspace(ws)}
            >
              {ws}
            </button>
          ))}
        </div>
        <span className="waybar-clock">Thu 26 Nov · 14:20</span>
        <div className="waybar-modules">
          <span>
            <Cpu size={11} /> 18%
          </span>
          <span>
            <Wifi size={11} /> Wi-Fi
          </span>
          <span>
            <Volume2 size={11} /> 74%
          </span>
          <button
            type="button"
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
            <Battery size={11} />
            {batLevel === "normal"
              ? "92%"
              : batLevel === "warning"
                ? "18%"
                : "6%"}
          </button>
        </div>
      </div>
      <div className="waybar-backdrop">
        <div className="waybar-desktop-grid">
          <div className="waybar-win">
            <div className="waybar-win-title">
              <FileCode2 size={12} /> ~/.config/waybar/style.css — workspace {workspace}
            </div>
            <pre>
              <code>
                <span className="syntax-keyword">@import</span>{" "}
                <span className="syntax-string">
                  &quot;./colors-{mode}.css&quot;
                </span>
                ;{"\n\n"}
                <span className="syntax-function">window#waybar</span> {"{\n"}
                {"  "}background: <span className="syntax-type">@surface</span>;
                {"\n"}
                {"  "}color: <span className="syntax-type">@foreground</span>;
                {"\n"}
                {"  "}border-bottom: 1px solid{" "}
                <span className="syntax-type">@border</span>;{"\n"}
                {"}\n\n"}
                <span className="syntax-function">
                  #workspaces button.active
                </span>{" "}
                {"{\n"}
                {"  "}background:{" "}
                <span className="syntax-type">@accent-fill</span>;{"\n"}
                {"  "}color:{" "}
                <span className="syntax-type">@accent-foreground</span>;{"\n"}
                {"}\n\n"}
                <span className="syntax-function">#battery.warning</span>{" "}
                {"{ color: "}
                <span className="syntax-type">@warning</span>
                {"; }\n"}
                <span className="syntax-function">#battery.critical</span>{" "}
                {"{ color: "}
                <span className="syntax-type">@error</span>
                {"; }"}
              </code>
            </pre>
          </div>
          <div className="waybar-win waybar-win-term">
            <div className="waybar-win-title">
              <Terminal size={12} /> ghostty — waybar status
            </div>
            <pre>
              <code>
                <span className="syntax-function">❯</span> pkill -SIGUSR2 waybar
                {"\n"}
                <span className="syntax-string">✓</span> Reloaded style.css (
                {theme.name}){"\n"}
                <span className="syntax-comment">
                  # Click the BAT module in Waybar above
                </span>
                {"\n"}
                <span className="syntax-comment">
                  # to cycle normal / warn / critical
                </span>
                {"\n\n"}
                active_workspace: <span className="syntax-number">{workspace}</span>
                {"\n"}
                battery_state:{" "}
                <span className="syntax-string">{batLevel}</span>
              </code>
            </pre>
          </div>
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
    (cols: number, rows: number) => tuiAnsi(target, theme, mode, cols, rows),
    [target, theme, mode],
  );
  return (
    <div className={`native-window native-terminal-window cli-tui cli-${target}`}>
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
          <DesktopScene theme={theme} mode={mode} target={target} />
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
