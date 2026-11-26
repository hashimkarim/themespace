"use client";
import { useState, type CSSProperties } from "react";
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
function Browser({ theme, target }: { theme: Theme; target: string }) {
  const [tab, setTab] = useState(target === "stylus" ? 1 : 0),
    [url, setUrl] = useState(
      target === "stylus" ? "workspace.example" : "New Tab",
    ),
    [search, setSearch] = useState(""),
    [result, setResult] = useState(""),
    [menu, setMenu] = useState(false),
    [sidebar, setSidebar] = useState(target === "zen");
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
              setUrl(i ? "workspace.example" : "New Tab");
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
            {(target === "firefox" || target === "zen") && (
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
      {sidebar && (target === "firefox" || target === "zen") && (
        <aside className="native-browser-sidebar">
          <b>{target === "zen" ? "Workspaces" : "Bookmarks"}</b>
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
      <div
        className={`native-browser-page ${tab === 0 || target === "stylus" ? "native-new-tab" : ""}`}
      >
        <small>
          {tab === 0
            ? previewProfiles[target].label.toUpperCase()
            : target === "stylus"
              ? "STYLED WEBSITE (USERCSS)"
              : "EXAMPLE WEBSITE"}
        </small>
        <h2>{tab ? "A place to create." : "A fresh perspective."}</h2>
        <p>
          {tab === 0
            ? `A new tab in ${theme.name}.`
            : target === "stylus"
              ? `Stylus UserCSS applies ${theme.name} tokens directly to website surfaces and links.`
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
  const [thread, setThread] = useState(0);
  const [showTerm, setShowTerm] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "user",
      text: `Apply ${theme.name} across our workspace, sidebar, and terminal.`,
    },
    {
      role: "assistant",
      text: "Updated color roles and verified contrast across messages, code blocks, and terminal surfaces.",
    },
  ]);
  const threads = [
    { name: "Theme workspace tokens", time: "2m" },
    { name: "Fix terminal contrast", time: "18m" },
    { name: "Export native presets", time: "1h" },
  ];
  return (
    <div className="native-window native-t3code">
      <div className="native-titlebar">
        <Dots />
        <span>T3 Code — {theme.name}</span>
        <button
          className="native-pill-btn"
          aria-pressed={showTerm}
          onClick={() => setShowTerm(!showTerm)}
        >
          <Terminal size={12} /> Terminal
        </button>
      </div>
      <div className="t3-layout">
        <aside className="t3-sidebar">
          <div className="native-section-label">THREADS</div>
          {threads.map((item, idx) => (
            <button
              key={item.name}
              className={`t3-thread ${thread === idx ? "selected" : ""}`}
              onClick={() => setThread(idx)}
            >
              <span>{item.name}</span>
              <small>{item.time}</small>
            </button>
          ))}
        </aside>
        <section className="t3-main">
          <div className="t3-header">
            <b>{threads[thread].name}</b>
            <span className="t3-badge">main</span>
          </div>
          <div className="t3-messages">
            {messages.map((m, i) => (
              <div key={i} className={`t3-msg t3-msg-${m.role}`}>
                <p>{m.text}</p>
              </div>
            ))}
            <pre className="t3-code">
              <code>{`{\n  "name": "${theme.name}",\n  "appearance": "${mode}",\n  "canvas": "var(--ts-background)",\n  "accent": "var(--ts-accent-fill)"\n}`}</code>
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
              placeholder="Ask anything about your theme…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit">Send</button>
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
function GitClient({ target, theme }: { target: string; theme: Theme }) {
  const [commit, setCommit] = useState(0);
  const commits = [
    {
      hash: "9f2c1a4",
      branch: "main",
      lane: 0,
      msg: `Add ${theme.name} color tokens`,
      files: [
        { status: "M", path: "theme.json" },
        { status: "A", path: "tokens.css" },
      ],
    },
    {
      hash: "4b8e0d2",
      branch: "feat/companion",
      lane: 1,
      msg: "Sync live Studio draft to Companion",
      files: [
        { status: "M", path: "bridge.ts" },
        { status: "D", path: "legacy-sync.ts" },
      ],
    },
    {
      hash: "1a7d3c9",
      branch: "fix/contrast",
      lane: 2,
      msg: "Keep button foregrounds readable",
      files: [{ status: "M", path: "palette.ts" }],
    },
    {
      hash: "8c5f2e1",
      branch: "release/v1",
      lane: 3,
      msg: "Package native exports",
      files: [{ status: "A", path: "exporters.ts" }],
    },
  ];
  const active = commits[commit];
  return (
    <div className="native-window native-git">
      <div className="native-titlebar">
        <Dots />
        <span>
          {previewProfiles[target].label} — {theme.name.toLowerCase()}
        </span>
        <span className="git-branch-pill">
          <GitBranch size={11} /> {active.branch}
        </span>
      </div>
      <div className="git-layout">
        <aside className="git-commits">
          <div className="native-section-label">COMMIT GRAPH</div>
          {commits.map((c, idx) => (
            <button
              key={c.hash}
              className={`git-row ${commit === idx ? "selected" : ""}`}
              onClick={() => setCommit(idx)}
            >
              <span className="git-lanes" aria-hidden="true">
                {[0, 1, 2, 3].map((lane) => (
                  <i
                    key={lane}
                    className={c.lane === lane ? "dot" : "line"}
                    style={{
                      background: `var(--ts-chart${lane + 1})`,
                      opacity: c.lane === lane ? 1 : 0.35,
                    }}
                  />
                ))}
              </span>
              <span className="git-msg">
                <b>{c.msg}</b>
                <small>
                  {c.hash} · {c.branch}
                </small>
              </span>
            </button>
          ))}
        </aside>
        <section className="git-diff-pane">
          <div className="git-files">
            {active.files.map((f) => (
              <span key={f.path} className={`git-file git-status-${f.status}`}>
                <b>{f.status}</b> {f.path}
              </span>
            ))}
          </div>
          <pre className="git-diff">
            <span className="diff-hunk">@@ -12,5 +12,6 @@ export const palette = &#123;</span>
            <span className="diff-ctx">  surface: &quot;var(--ts-surface)&quot;,</span>
            <span className="diff-del">- accent: &quot;#666666&quot;,</span>
            <span className="diff-add">+ accent: &quot;var(--ts-accent)&quot;,</span>
            <span className="diff-add">+ accentFill: &quot;var(--ts-accent-fill)&quot;,</span>
            <span className="diff-ctx">&#125;;</span>
          </pre>
        </section>
      </div>
    </div>
  );
}
function SlackWorkspace({ theme }: { theme: Theme }) {
  const [channel, setChannel] = useState("design-systems");
  const [draft, setDraft] = useState("");
  const [feed, setFeed] = useState([
    {
      author: "Maya",
      time: "10:14",
      text: `Just switched our workspace to ${theme.name}. Sidebar contrast looks super clean.`,
    },
    {
      author: "Sam",
      time: "10:16",
      text: "Presence dots and mention badges pop nicely too.",
    },
  ]);
  const channels = [
    { name: "general", unread: 0 },
    { name: "design-systems", unread: 0 },
    { name: "releases", unread: 3 },
    { name: "random", unread: 0 },
  ];
  return (
    <div className="native-window native-slack">
      <div className="native-titlebar slack-top">
        <Dots />
        <span>ThemeSpace Workspace — Slack</span>
      </div>
      <div className="slack-layout">
        <aside className="slack-sidebar">
          <div className="slack-ws">
            <b>{theme.name}</b>
            <span className="slack-presence" title="Active" />
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
        </aside>
        <section className="slack-main">
          <div className="slack-header">
            <b># {channel}</b>
            <span>12 members</span>
          </div>
          <div className="slack-messages">
            {feed.map((m, i) => (
              <div key={i} className="slack-msg">
                <b>{m.author}</b> <small>{m.time}</small>
                <p>{m.text}</p>
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
                { author: "You", time: "Now", text: draft },
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
  const [query, setQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState(0);
  const [showRofi, setShowRofi] = useState(target === "rofi");
  const apps = [
    "Ghostty Terminal",
    "Visual Studio Code",
    "Firefox Browser",
    "Obsidian Notes",
    "System Settings",
  ].filter((a) => a.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className={`native-window native-desktop desktop-${target}`}>
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
        <span className="waybar-clock">Thu 14:20</span>
        <div className="waybar-modules">
          <button onClick={() => setShowRofi(!showRofi)}>
            {showRofi ? "Hide launcher" : "Launcher"}
          </button>
          <span>Wi-Fi</span>
          <span>92%</span>
        </div>
      </div>
      <div className="desktop-canvas">
        <div className="desktop-app-window">
          <div className="desktop-headerbar">
            <Dots />
            <b>
              {target === "kde"
                ? "KDE System Settings"
                : target === "gtk"
                  ? "GTK Preferences"
                  : target === "hyprland"
                    ? `Hyprland · Active Window (${theme.name})`
                    : `${previewProfiles[target].label} — ${theme.name}`}
            </b>
            <button className="desktop-primary-btn">Apply</button>
          </div>
          <div className="desktop-app-body">
            <aside className="desktop-sidebar">
              {["Appearance", "Colors", "Typography", "Shortcuts"].map(
                (item, i) => (
                  <div
                    key={item}
                    className={`desktop-nav-item ${i === 1 ? "selected" : ""}`}
                  >
                    {item}
                  </div>
                ),
              )}
            </aside>
            <div className="desktop-content">
              <div className="desktop-card">
                <b>{theme.name}</b>
                <p>
                  Window surfaces, headerbars, cards, and accent buttons read
                  directly from your exported desktop tokens.
                </p>
                <div className="desktop-pills">
                  <span className="pill-success">OK</span>
                  <span className="pill-warning">Beta</span>
                  <span className="pill-error">Alert</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showRofi && (
          <div className="native-rofi" role="region" aria-label="Rofi launcher preview">
            <input
              aria-label="Filter launcher apps"
              placeholder="Search applications…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedApp(0);
              }}
            />
            <div className="rofi-list">
              {apps.map((app, i) => (
                <button
                  key={app}
                  className={selectedApp === i ? "selected" : ""}
                  onClick={() => setSelectedApp(i)}
                >
                  {app}
                </button>
              ))}
            </div>
          </div>
        )}
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
  const ansi = tuiAnsi(target, theme, mode);
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
          staticAnsi={ansi}
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
          <Browser theme={theme} target={target} />
        ) : profile.kind === "notes" ? (
          <Notes theme={theme} mode={mode} />
        ) : profile.kind === "workspace" ? (
          <T3CodeWorkspace theme={theme} mode={mode} />
        ) : profile.kind === "git" ? (
          <GitClient target={target} theme={theme} />
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
