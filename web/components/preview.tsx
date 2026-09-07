"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Code2,
  FileText,
  Globe2,
  LayoutDashboard,
  ListMusic,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Terminal,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./ui/button";
import { cssVariables, semanticVariables } from "@/lib/exporters";
import { resolve, type Theme, type Appearance } from "@/lib/theme";

export const scenes = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "components", name: "Components", icon: Code2 },
  { id: "terminal", name: "Terminal", icon: Terminal },
  { id: "chat", name: "Chat", icon: MessageCircle },
  { id: "browser", name: "Browser", icon: Globe2 },
  { id: "music", name: "Music", icon: ListMusic },
];
const Dots = () => (
  <span className="window-dots">
    <i />
    <i />
    <i />
  </span>
);
export function ThemePreview({
  theme,
  mode,
  scene = "overview",
  compact = false,
}: {
  theme: Theme;
  mode: Appearance;
  scene?: string;
  compact?: boolean;
}) {
  const preview = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = preview.current;
    const card = element?.parentElement;
    if (!compact || !element || !card) return;
    const fit = () => {
      const padding = getComputedStyle(card);
      const width =
        card.clientWidth -
        parseFloat(padding.paddingLeft) -
        parseFloat(padding.paddingRight);
      element.style.setProperty("--compact-scale", String(width / 580));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(card);
    return () => observer.disconnect();
  }, [compact]);
  const c = resolve(theme, mode);
  const [checked, setChecked] = useState(true);
  const fontVariables: Record<string, string> = {
    Geist: "--font-geist-sans",
    "Geist Mono": "--font-geist-mono",
    Inter: "--preview-inter",
    "IBM Plex Sans": "--preview-plex",
    "Space Grotesk": "--preview-space",
    "JetBrains Mono": "--preview-jetbrains",
    "IBM Plex Mono": "--preview-plex-mono",
  };
  const style = {
    ...cssVariables(theme, mode),
    ...semanticVariables(theme, mode),
    "--preview-accent": c.accent,
    "--radius": `${theme.style.radius}px`,
    ...(fontVariables[theme.fonts.sans]
      ? {
          "--ts-font-sans": `var(${fontVariables[theme.fonts.sans]}), system-ui, sans-serif`,
        }
      : {}),
    ...(fontVariables[theme.fonts.mono]
      ? {
          "--ts-font-mono": `var(${fontVariables[theme.fonts.mono]}), ui-monospace, monospace`,
        }
      : {}),
  } as CSSProperties;
  const terminal = (
    <div className="mini-terminal">
      <div className="mini-label">
        <Terminal size={12} />
        TERMINAL <span>zsh</span>
      </div>
      <p>
        <span className="syntax-keyword">~/your-world</span> on{" "}
        <span className="syntax-string">main</span>
      </p>
      <p>
        <span className="syntax-keyword">❯</span> echo &quot;hello, world&quot;
      </p>
      <p className="preview-muted">hello, world</p>
      <p className="terminal-comment">
        A little more you, one prompt at a time.
      </p>
      <div className="terminal-blocks">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} style={{ background: c[`ansi${i}`] }} />
        ))}
      </div>
    </div>
  );
  const chat = (
    <div className="mini-chat">
      <div className="mini-label">
        <MessageCircle size={12} />
        CHAT <span># general</span>
      </div>
      <div className="chat-message">
        <div className="chat-avatar">J</div>
        <div>
          <b>
            Jamie <small>just now</small>
          </b>
          <p>Okay, this feels like me.</p>
        </div>
      </div>
      <div className="chat-message second">
        <div className="chat-avatar alternate">A</div>
        <div>
          <b>
            Alex <small>just now</small>
          </b>
          <p>A little color goes a long way.</p>
        </div>
      </div>
      <div className="chat-input">
        <Plus size={11} /> Message your people…
      </div>
    </div>
  );
  const dashboard = (
    <div className="mock-window">
      <div className="mock-title">
        <Dots />
        <span>{theme.name.toLowerCase()} / workspace</span>
        <MoreHorizontal size={12} />
      </div>
      <div className="mock-workspace">
        <aside>
          <b>
            <span className="tiny-mark" />
            Workspace
            <ChevronDown size={9} />
          </b>
          <span>
            <LayoutDashboard />
            Overview
          </span>
          <span className="mock-selected">
            <FileText />
            Getting started
          </span>
          <span>
            <Code2 />
            Components
          </span>
          <span>
            <Settings2 />
            Settings
          </span>
          <div className="mock-sidebar-bottom">Make something good.</div>
        </aside>
        <article>
          <p className="mock-label">A SPACE THAT FEELS LIKE YOU</p>
          <h2>Welcome home.</h2>
          <p>A familiar workspace, with your own point of view.</p>
          <div className="mock-stats">
            <div>
              <small>YOUR PALETTE</small>
              <strong>Perfectly personal</strong>
              <div className="mock-swatches">
                {[
                  "background",
                  "surface",
                  "accentFill",
                  "accent2",
                  "accent3",
                ].map((key) => (
                  <i key={key} style={{ background: c[key] }} />
                ))}
              </div>
            </div>
            <div>
              <small>LOOKING GOOD</small>
              <strong>Ready for anything</strong>
              <span className="preview-cta">
                Create something <Plus size={9} />
              </span>
            </div>
          </div>
          <div className="mock-code">
            <span className="code-comment">
              {"// a little consistency goes a long way"}
            </span>
            <br />
            <span className="syntax-keyword">const</span> yourTheme = {"{"}
            <br />
            &nbsp; name:{" "}
            <span className="code-string">{JSON.stringify(theme.name)}</span>,
            <br />
            &nbsp; accent:{" "}
            <span className="code-string">{JSON.stringify(c.accent)}</span>,
            <br />
            &nbsp; everywhere: <span className="syntax-keyword">true</span>
            <br />
            {"}"};
          </div>
        </article>
      </div>
    </div>
  );
  return (
    <div
      ref={preview}
      className={`theme-scope ${mode === "dark" ? "dark" : ""} ${compact ? "compact-preview" : ""}`}
      style={style}
    >
      {(scene === "overview" || compact) && (
        <>
          {dashboard}
          {!compact && (
            <div className="mini-previews">
              {terminal}
              {chat}
            </div>
          )}
        </>
      )}
      {scene === "terminal" && !compact && (
        <div className="full-terminal">
          <div className="mock-title">
            <Dots />
            <span>Terminal preview</span>
            <Terminal size={12} />
          </div>
          {terminal}
          <div className="terminal-detail">
            <p>
              <span className="syntax-keyword">❯</span> git status
            </p>
            <p>
              On branch <span className="syntax-string">main</span>
            </p>
            <p className="terminal-success">
              Your workspace looks a little more like you.
            </p>
            <p>All 16 ANSI colors are mapped in your export.</p>
            <p className="terminal-comment">
              Preview sample · commands are illustrative
            </p>
          </div>
        </div>
      )}
      {scene === "chat" && !compact && (
        <div className="full-chat">
          <div className="mock-title">
            <Dots />
            <span>Your community</span>
            <Search size={12} />
          </div>
          <div className="chat-layout">
            <aside>
              <b>Good company</b>
              <span># general</span>
              <span># inspiration</span>
              <span># show-and-tell</span>
              <span># off-topic</span>
            </aside>
            <article>
              {chat}
              <div className="chat-feature-card">
                <small>PINNED MESSAGE</small>
                <h3>Make yourself at home.</h3>
                <p>
                  A shared space for your favorite people, in your favorite
                  colors.
                </p>
              </div>
            </article>
          </div>
        </div>
      )}
      {scene === "browser" && !compact && (
        <div className="browser-preview">
          <div className="mock-title">
            <Dots />
            <span className="browser-tab">
              Your little corner of the web <X size={10} />
            </span>
            <Plus size={11} />
          </div>
          <div className="browser-address">
            <ArrowLeft />
            <ArrowRight />
            <span>
              <LockKeyhole size={10} /> your-world.example
            </span>
            <MoreHorizontal />
          </div>
          <div className="browser-content">
            <span className="browser-site-name">PERSONAL SPACE</span>
            <h2>A fresh perspective.</h2>
            <p>The tools you know, with a little more of you.</p>
            <div className="browser-tiles">
              {["Your ideas", "Your projects", "Your people"].map(
                (label, i) => (
                  <div key={label}>
                    <span
                      style={{
                        background: [c.accentFill, c.accent2, c.accent3][i],
                      }}
                    />
                    <b>{label}</b>
                    <small>Room for what matters.</small>
                  </div>
                ),
              )}
            </div>
            <p className="browser-disclaimer">
              Browser exports theme the chrome. This sample page demonstrates
              your separate web theme.
            </p>
          </div>
        </div>
      )}
      {scene === "music" && !compact && (
        <div className="music-preview">
          <div className="mock-title">
            <Dots />
            <span>Music preview</span>
            <MoreHorizontal size={12} />
          </div>
          <div className="music-body">
            <div className="album-art">
              <span />
              <i />
            </div>
            <small>YOUR DAILY MIX</small>
            <h2>Evening notes</h2>
            <p>Slow moments. Familiar sounds.</p>
            <div className="track-list">
              {[
                "A place to begin",
                "Somewhere familiar",
                "The long way home",
              ].map((name, i) => (
                <div key={name}>
                  <span>0{i + 1}</span>
                  <b>{name}</b>
                  <small>{i + 2}:42</small>
                </div>
              ))}
            </div>
            <div className="music-progress">
              <i />
            </div>
            <div className="music-time">
              <span>1:24</span>
              <span>3:42</span>
            </div>
          </div>
        </div>
      )}
      {scene === "components" && !compact && (
        <div className="component-preview">
          <div className="component-heading">
            <small>THE COMPONENT LIBRARY</small>
            <h2>Your theme, in action.</h2>
            <p>
              Real shadcn/ui buttons, with the semantic tokens in your export.
            </p>
          </div>
          <div className="component-buttons">
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="component-card">
            <div className="component-card-head">
              <div>
                <h3>A good place to start</h3>
                <p>The foundations of your next project.</p>
              </div>
              <span className="status-tag">Active</span>
            </div>
            <label className="preview-field">
              Project name
              <input placeholder="My next great idea" />
            </label>
            <label className="preview-checkbox">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              Keep things consistent
            </label>
            <div className="sample-chart" aria-label="Five chart colors">
              {[40, 68, 53, 86, 65].map((height, i) => (
                <div
                  key={i}
                  style={{
                    height: height + "%",
                    background: c[`chart${i + 1}`],
                  }}
                />
              ))}
            </div>
            <div className="component-card-footer">
              <span>Made with your palette</span>
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <Button size="sm">Preview dialog</Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="modal-overlay" />
                  <Dialog.Content
                    className={`modal-content preview-dialog theme-scope ${mode === "dark" ? "dark" : ""}`}
                    style={style}
                  >
                    <Dialog.Title>Your theme, one layer deeper.</Dialog.Title>
                    <Dialog.Description>
                      Overlays, focus rings, and actions use the same exported
                      values.
                    </Dialog.Description>
                    <Dialog.Close asChild>
                      <Button>Looks good</Button>
                    </Dialog.Close>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
