"use client";
import { useState, type CSSProperties, type FormEvent } from "react";
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
  Hash,
  Headphones,
  Heart,
  Home,
  LayoutGrid,
  Lock,
  MessageSquare,
  Mic,
  Minus,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Terminal,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { type Theme, type Appearance, resolve } from "@/lib/theme";
import { getTarget } from "@/lib/targets";
import {
  previewProfiles,
  previewStyle,
  nativePreviewColors,
} from "@/lib/preview-targets";
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
function TerminalBody({
  theme,
  mode,
  windows = false,
  blocks = false,
}: {
  theme: Theme;
  mode: Appearance;
  windows?: boolean;
  blocks?: boolean;
}) {
  const c = resolve(theme, mode),
    [input, setInput] = useState(""),
    [history, setHistory] = useState<string[]>([]);
  function submit(e: FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    if (v === "clear" || v === "cls") setHistory([]);
    else
      setHistory((old) =>
        [
          ...old,
          `${windows ? "PS>" : "❯"} ${v}`,
          v.startsWith("echo ")
            ? v.slice(5)
            : v === "pwd"
              ? windows
                ? "C:\\Users\\You\\themes"
                : "/home/you/themes"
              : v === "help"
                ? "Preview commands: echo <text>, pwd, clear."
                : "This is a terminal preview. Try echo hello.",
        ].slice(-30),
      );
    setInput("");
  }
  return (
    <div
      className={`native-terminal-body ${blocks ? "terminal-command-blocks" : ""}`}
    >
      <div className="terminal-welcome">
        <span className="native-accent">
          {windows ? "PowerShell 7" : "you@workspace"}
        </span>
        <span className="native-muted">
          {windows ? "Your personal command line." : "  ~/themes on main"}
        </span>
      </div>
      <div className="terminal-command">
        <p>
          <span className="native-accent">
            {windows ? "PS C:\\Users\\You>" : "❯"}
          </span>{" "}
          npm run build
        </p>
        <p className="native-muted">Generating {theme.name.toLowerCase()}…</p>
        <p className="native-success">✓ Theme bundle ready</p>
        <p>26 tools. One familiar palette.</p>
      </div>
      <div className="native-ansi" aria-label="16 ANSI terminal colors">
        {Array.from({ length: 16 }, (_, i) => (
          <i
            key={i}
            title={`ANSI ${i}: ${c[`ansi${i}`]}`}
            style={{ background: `var(--ts-ansi${i})` }}
          />
        ))}
      </div>
      <div className="native-terminal-history" aria-live="polite">
        {history.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <form onSubmit={submit}>
        <label>
          <span className="native-accent">{windows ? "PS>" : "❯"}</span>
          <input
            aria-label="Preview terminal command"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try echo hello"
            autoComplete="off"
            spellCheck={false}
          />
          <button aria-label="Run example command" type="submit">
            <ChevronRight size={14} />
          </button>
        </label>
      </form>
    </div>
  );
}
function CodePane({ theme, file }: { theme: Theme; file: string }) {
  const lines =
    file === "README.md"
      ? [
          <span key="1" className="native-accent">
            # {theme.name}
          </span>,
          <span key="2">A shared palette for your everyday tools.</span>,
          <span key="3" />,
          <span key="4" className="native-accent">
            ## Getting started
          </span>,
          <span key="5">1. Find your colors.</span>,
          <span key="6">2. Make yourself at home.</span>,
          <span key="7">3. Export your world.</span>,
        ]
      : file === "tokens.css"
        ? [
            <span key="1" className="syntax-comment">
              {"/* Your foundations, everywhere. */"}
            </span>,
            <span key="2">
              <b className="syntax-keyword">:root</b> {"{"}
            </span>,
            <span key="3">
              {" "}
              <b className="syntax-function">--background</b>:{" "}
              <b className="syntax-string">var(--ts-background)</b>;
            </span>,
            <span key="4">
              {" "}
              <b className="syntax-function">--accent</b>:{" "}
              <b className="syntax-string">var(--ts-accent)</b>;
            </span>,
            <span key="5">
              {" "}
              <b className="syntax-function">--radius</b>:{" "}
              <b className="syntax-number">{theme.style.radius}px</b>;
            </span>,
            <span key="6">{"}"}</span>,
          ]
        : [
            <span key="1" className="syntax-comment">
              {"// Your theme, your point of view."}
            </span>,
            <span key="2">
              <b className="syntax-keyword">import</b> {"{ palette }"}{" "}
              <b className="syntax-keyword">from</b>{" "}
              <b className="syntax-string">&apos;./tokens&apos;</b>;
            </span>,
            <span key="3" />,
            <span key="4">
              <b className="syntax-keyword">type</b>{" "}
              <b className="syntax-type">Theme</b> = {"{"} name:{" "}
              <b className="syntax-type">string</b> {"}"};
            </span>,
            <span key="5" />,
            <span key="6">
              <b className="syntax-keyword">export const</b> yourTheme:{" "}
              <b className="syntax-type">Theme</b> = {"{"}
            </span>,
            <span key="7">
              {" "}
              name:{" "}
              <b className="syntax-string">{JSON.stringify(theme.name)}</b>,
            </span>,
            <span key="8">
              {" "}
              radius: <b className="syntax-number">{theme.style.radius}</b>,
            </span>,
            <span key="9">
              {" "}
              colors: <b className="syntax-function">makePalette</b>(palette),
            </span>,
            <span key="10">{"};"}</span>,
            <span key="11" />,
            <span key="12" className="syntax-comment">
              {"// A little more you, everywhere."}
            </span>,
          ];
  return (
    <div className="native-code" aria-label={`${file} example code`}>
      {lines.map((line, i) => (
        <div key={i}>
          <span className="native-line-number">{i + 1}</span>
          <code>{line}</code>
        </div>
      ))}
    </div>
  );
}
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
    [terminal, setTerminal] = useState(true),
    [search, setSearch] = useState("");
  const files = ["theme.ts", "tokens.css", "README.md"],
    modal = profile.variant === "modal";
  return (
    <div
      className={`native-window native-editor ${modal ? "modal-editor" : ""}`}
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
        {!modal && (
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
        {(!modal || target === "neovim") && (
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
          <CodePane theme={theme} file={file} />
          {terminal && (
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
              <TerminalBody theme={theme} mode={mode} />
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
        <button onClick={() => setTerminal(!terminal)}>
          {modal ? "NORMAL" : "Terminal"}
        </button>
        <span>Ln 8, Col 4</span>
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
  const profile = previewProfiles[target],
    windows = profile.variant === "windows",
    [tab, setTab] = useState(windows ? "PowerShell" : "zsh"),
    [split, setSplit] = useState(false);
  return (
    <div
      className={`native-window native-terminal-window ${profile.variant === "mobile" ? "native-phone-terminal" : ""}`}
    >
      <div className={`native-titlebar ${windows ? "windows-titlebar" : ""}`}>
        {!windows && <Dots />}
        <div
          className="native-terminal-tabs"
          role="tablist"
          aria-label="Terminal profiles"
        >
          {(windows ? ["PowerShell", "Ubuntu"] : ["zsh", "bash"]).map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              key={t}
            >
              <Terminal size={13} />
              {t}
              <X size={10} />
            </button>
          ))}
        </div>
        <button
          className="native-icon"
          aria-label="Toggle split pane"
          aria-pressed={split}
          title="Toggle split pane"
          onClick={() => setSplit(!split)}
        >
          <Plus size={15} />
        </button>
        <span className="native-window-label">{profile.label}</span>
        {windows && (
          <span className="native-window-controls">
            <Minus size={12} />
            <Square size={10} />
            <X size={12} />
          </span>
        )}
      </div>
      <div className={`native-terminal-panes ${split ? "split" : ""}`}>
        <TerminalBody
          key={tab}
          theme={theme}
          mode={mode}
          windows={tab === "PowerShell"}
          blocks={profile.variant === "blocks"}
        />
        {split && <TerminalBody theme={theme} mode={mode} />}
      </div>
      {profile.variant === "mobile" && (
        <div className="termux-keys">
          {["ESC", "CTRL", "ALT", "TAB", "←", "↓", "↑", "→"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
      <div className="native-terminal-footer">
        <span>
          {theme.name} · {mode}
        </span>
        <span>80 × 24 · {tab}</span>
      </div>
    </div>
  );
}
function Music({ theme }: { theme: Theme }) {
  const [playing, setPlaying] = useState(false),
    [track, setTrack] = useState(0),
    [liked, setLiked] = useState(false),
    [tab, setTab] = useState("Made for you"),
    [volume, setVolume] = useState(65);
  const tracks = [
    ["A little more you", "Sunday Company", "3:42"],
    ["Slow mornings", "The Soft Hours", "4:08"],
    ["Somewhere familiar", "Paper Planes", "2:56"],
    ["Room to breathe", "Late Bloomer", "3:18"],
  ];
  return (
    <div className="native-window native-music">
      <div className="native-music-layout">
        <aside>
          <div className="native-music-brand">
            <Music2 size={21} />
            Your music
          </div>
          {["Made for you", "Search", "Your library"].map((t, i) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {i === 0 ? (
                <Home size={16} />
              ) : i === 1 ? (
                <Search size={16} />
              ) : (
                <LayoutGrid size={16} />
              )}{" "}
              {t}
            </button>
          ))}
          <hr />
          <small>YOUR PLAYLISTS</small>
          <button onClick={() => setTab("Made for you")}>
            Everyday favorites
          </button>
          <button onClick={() => setTab("Quiet focus")}>Quiet focus</button>
          <button onClick={() => setTab("Late nights")}>Late nights</button>
        </aside>
        <article>
          <div className="native-music-toolbar">
            <ArrowLeft size={17} />
            <ArrowRight size={17} />
            <span>Spicetify</span>
            <span className="native-user-avatar">YO</span>
          </div>
          {tab === "Search" ? (
            <label className="native-search-field">
              <Search size={14} />
              <input
                placeholder="Search this example…"
                onChange={(e) => {
                  const index = tracks.findIndex((t) =>
                    t[0].toLowerCase().includes(e.target.value.toLowerCase()),
                  );
                  if (index >= 0) setTrack(index);
                }}
              />
            </label>
          ) : null}
          <div className="native-playlist-hero">
            <div className="native-album-art">
              <i />
              <i />
              <i />
              <span>{theme.name}</span>
            </div>
            <div>
              <small>YOUR DAILY MIX</small>
              <h2>{tab === "Made for you" ? "Feels like home." : tab}</h2>
              <p>Your colors. Your kind of soundtrack.</p>
              <span>Made for you · 4 songs, 14 min</span>
            </div>
          </div>
          <div className="native-playlist-actions">
            <button
              className="native-round-play"
              onClick={() => setPlaying(!playing)}
              aria-label={
                playing ? "Pause demo playback" : "Play demo playback"
              }
            >
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button
              className="native-icon"
              aria-label="Like playlist"
              aria-pressed={liked}
              onClick={() => setLiked(!liked)}
            >
              <Heart fill={liked ? "currentColor" : "none"} size={21} />
            </button>
            <MoreHorizontal size={22} />
            <span className="native-muted">Offline preview</span>
          </div>
          <div className="native-track-list">
            {tracks.map(([title, artist, time], i) => (
              <button
                key={title}
                className={track === i ? "selected" : ""}
                onClick={() => {
                  setTrack(i);
                  setPlaying(true);
                }}
              >
                <span>{track === i && playing ? "♫" : i + 1}</span>
                <div>
                  <b>{title}</b>
                  <small>{artist}</small>
                </div>
                <span>{time}</span>
              </button>
            ))}
          </div>
        </article>
      </div>
      <div className="native-player">
        <span className="native-mini-album">✳</span>
        <div>
          <b>{tracks[track][0]}</b>
          <small>{tracks[track][1]}</small>
        </div>
        <div className="native-player-center">
          <div>
            <Shuffle size={13} />
            <button
              onClick={() => setTrack((track + 3) % 4)}
              aria-label="Previous demo track"
            >
              <SkipBack size={16} />
            </button>
            <button
              className="native-play-small"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? "Pause demo track" : "Play demo track"}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button
              onClick={() => setTrack((track + 1) % 4)}
              aria-label="Next demo track"
            >
              <SkipForward size={16} />
            </button>
          </div>
          <div className="native-track-progress">
            <small>1:24</small>
            <span>
              <i />
            </span>
            <small>{tracks[track][2]}</small>
          </div>
        </div>
        <label className="native-volume">
          <Volume2 size={14} />
          <input
            aria-label="Example playback volume"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(+e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
function Chat({ target }: { target: string }) {
  const [channel, setChannel] = useState("general"),
    [message, setMessage] = useState(""),
    [messages, setMessages] = useState<Record<string, string[]>>({}),
    [muted, setMuted] = useState(false);
  return (
    <div className="native-window native-discord">
      <aside className="native-servers">
        <button aria-label="Home server" className="selected">
          <MessageSquare size={20} />
        </button>
        <hr />
        <span>✳</span>
        <span>TS</span>
        <span>＋</span>
      </aside>
      <aside className="native-channels">
        <div className="native-server-title">
          Your kind of place <ChevronDown size={12} />
        </div>
        <span className="native-section-label">TEXT CHANNELS</span>
        {["welcome", "general", "show-and-tell", "inspiration"].map((t) => (
          <button
            key={t}
            className={channel === t ? "selected" : ""}
            onClick={() => setChannel(t)}
          >
            <Hash size={15} />
            {t}
          </button>
        ))}
        <span className="native-section-label">VOICE CHANNELS</span>
        <span className="native-voice-channel">
          <Volume2 size={15} />
          The lounge
        </span>
        <div className="native-chat-user">
          <span className="native-user-avatar">YO</span>
          <span>
            You<small>Online</small>
          </span>
          <button
            aria-label="Toggle demo microphone"
            aria-pressed={muted}
            onClick={() => setMuted(!muted)}
          >
            <Mic size={14} className={muted ? "native-error" : ""} />
          </button>
          <Headphones size={14} />
        </div>
      </aside>
      <section className="native-conversation">
        <header>
          <Hash size={19} />
          <b>{channel}</b>
          <span>Your people, your colors.</span>
          <Users size={17} />
        </header>
        <div className="native-messages">
          <div className="native-channel-welcome">
            <span>
              <Hash size={29} />
            </span>
            <h2>Welcome to #{channel}!</h2>
            <p className="native-muted">
              This is the beginning of your little corner.
            </p>
          </div>
          <div className="native-date-divider">TODAY</div>
          {[
            ["JK", "Jamie", "Okay, this feels like home."],
            ["AL", "Alex", "A little color goes a long way."],
            ...(messages[channel] || []).map((text) => ["YO", "You", text]),
          ].map(([avatar, name, text], i) => (
            <div className="native-message" key={i}>
              <span className={`native-user-avatar avatar-${i % 3}`}>
                {avatar}
              </span>
              <div>
                <b>
                  {name}
                  <small>Today at 10:24</small>
                </b>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) {
              setMessages((old) => ({
                ...old,
                [channel]: [...(old[channel] || []).slice(-19), message.trim()],
              }));
              setMessage("");
            }
          }}
        >
          <label className="native-message-input">
            <Plus size={17} />
            <input
              aria-label={`Message ${channel} in preview`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message #${channel}`}
              maxLength={500}
            />
            <button aria-label="Send demo message">
              <Send size={16} />
            </button>
          </label>
          <small className="native-muted">
            {previewProfiles[target].label} · messages stay in this preview
          </small>
        </form>
      </section>
    </div>
  );
}
function Browser({ theme, target }: { theme: Theme; target: string }) {
  const [tab, setTab] = useState(0),
    [url, setUrl] = useState("start.example"),
    [search, setSearch] = useState(""),
    [result, setResult] = useState("");
  return (
    <div className={`native-window native-browser ${target}`}>
      <div className="native-browser-tabs">
        <Dots />
        {["A familiar start", "Your workspace"].map((t, i) => (
          <button
            className={tab === i ? "selected" : ""}
            key={t}
            onClick={() => {
              setTab(i);
              setUrl(i ? "workspace.example" : "start.example");
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
            aria-label="Illustrative address bar"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <MoreHorizontal size={17} />
      </div>
      <div className="native-bookmarks">
        <span>◇ Your projects</span>
        <span>◇ Reading list</span>
        <span>◇ Design inspiration</span>
      </div>
      <div className="native-browser-page">
        <small>EXAMPLE WEBSITE</small>
        <h2>{tab ? "A place to create." : "A fresh perspective."}</h2>
        <p>The browser wears {theme.name}. Websites keep their own styles.</p>
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
function Notes({ theme }: { theme: Theme }) {
  const [note, setNote] = useState("Welcome home"),
    [editing, setEditing] = useState(false),
    [text, setText] = useState(
      "A familiar place for your thoughts.\n\n- Find your colors\n- Connect your ideas\n- Make something good",
    );
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
              <textarea
                aria-label="Example markdown note"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            ) : (
              <>
                <p>{text.split("\n")[0]}</p>
                <blockquote>
                  There is a little comfort in the things you make your own.
                </blockquote>
                <h3>A few things to explore</h3>
                <ul>
                  {text
                    .split("\n")
                    .filter((t) => t.startsWith("- "))
                    .map((t) => (
                      <li key={t}>{t.slice(2)}</li>
                    ))}
                </ul>
                <p>
                  Connected to{" "}
                  <span className="native-wikilink">[[Your next idea]]</span>
                </p>
                <div className="native-note-callout">
                  <b>✳ A gentle reminder</b>
                  <p>Good ideas need a little room to grow.</p>
                </div>
              </>
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
        <span>42 words</span>
        <span>All changes saved</span>
      </div>
    </div>
  );
}
function Tokens({ theme, mode }: { theme: Theme; mode: Appearance }) {
  const c = resolve(theme, mode),
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
  const c = nativePreviewColors(theme, mode, target),
    style = {
      ...previewStyle(theme, mode),
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
    <div
      className="native-preview theme-scope"
      data-preview-target={target}
      style={style}
    >
      {profile.kind === "editor" ? (
        <Editor theme={theme} mode={mode} target={target} />
      ) : profile.kind === "terminal" ? (
        <TerminalWindow theme={theme} mode={mode} target={target} />
      ) : profile.kind === "music" ? (
        <Music theme={theme} />
      ) : profile.kind === "chat" ? (
        <Chat target={target} />
      ) : profile.kind === "browser" ? (
        <Browser theme={theme} target={target} />
      ) : profile.kind === "notes" ? (
        <Notes theme={theme} />
      ) : (
        <Tokens theme={theme} mode={mode} />
      )}
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
