"use client";
import { useMemo, useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  CheckCheck,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FolderGit2,
  Package,
  PanelsTopLeft,
  Search,
  X,
} from "lucide-react";
import { type Theme, type Appearance, slugify } from "@/lib/theme";
import { exportTargets, categories, getTarget } from "@/lib/targets";
import { bundleFiles, downloadBlob, zipFiles } from "@/lib/bundle";
import {
  designSystemFiles,
  generateTarget,
  type ThemeFile,
} from "@/lib/exporters";
import { useSitePreferences } from "./site-preferences";
import { ThemedSelect } from "./ui/select";
import { IntegrationPreview } from "./integration-preview";
import { ComponentLibrary } from "./component-library";
export function ExportWorkspace({
  open,
  onOpenChange,
  theme,
  notify,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  theme: Theme;
  notify: (text: string) => void;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const { settings } = useSitePreferences(),
    [selected, setSelected] = useState(
      theme.targets.filter((id) => exportTargets.some((t) => t.id === id)),
    ),
    [active, setActive] = useState(
      theme.targets.find((id) => exportTargets.some((t) => t.id === id)) ||
        "design-system",
    ),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState("preview"),
    [format, setFormat] = useState(settings.exportFormat),
    [mode, setMode] = useState<Appearance>(theme.defaultAppearance),
    [filePath, setFilePath] = useState(""),
    [allFiles, setAllFiles] = useState(false),
    [error, setError] = useState("");
  const generated = useMemo(() => {
    try {
      return {
        files: bundleFiles(theme, selected, format === "repository"),
        error: "",
      };
    } catch (e) {
      return {
        files: [] as ThemeFile[],
        error:
          e instanceof Error ? e.message : "Could not generate this package.",
      };
    }
  }, [theme, selected, format]);
  const activeTarget = active === "design-system" ? null : getTarget(active),
    slug = slugify(theme.name),
    prefix = activeTarget
      ? `${activeTarget.category === "Web frameworks" ? "integrations" : "apps"}/${active}/`
      : `design-system/${slug}/`;
  const targetFiles = useMemo(() => {
    try {
      return activeTarget
        ? generateTarget(theme, active)
        : designSystemFiles(theme);
    } catch {
      return [];
    }
  }, [theme, active, activeTarget]);
  const files = allFiles
    ? generated.files
    : targetFiles.map((f) => ({ ...f, path: prefix + f.path }));
  const file = files.find((f) => f.path === filePath) || files[0],
    visibleTargets = exportTargets.filter((t) =>
      `${t.name} ${t.category}`.toLowerCase().includes(query.toLowerCase()),
    );
  const choose = (id: string) => {
    setActive(id);
    setFilePath("");
    setAllFiles(false);
    setError("");
  };
  const toggle = (id: string) =>
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id],
    );
  function runDownload(kind: "package" | "target" | "file") {
    try {
      setError("");
      if (kind === "file") {
        if (!file) throw new Error("Select a file first.");
        downloadBlob(file.path.split("/").at(-1)!, file.content);
        notify("File downloaded.");
        return;
      }
      if (kind === "target") {
        if (!targetFiles.length)
          throw new Error(generated.error || "Could not generate this target.");
        const name = `${slug}-${active}`;
        downloadBlob(
          `${name}.zip`,
          zipFiles(name, targetFiles),
          "application/zip",
        );
        notify(`${activeTarget?.name || "Design system"} downloaded.`);
        return;
      }
      if (generated.error) throw new Error(generated.error);
      downloadBlob(
        `${slug}${format === "repository" ? "-repository" : ""}.zip`,
        zipFiles(slug, generated.files),
        "application/zip",
      );
      notify(
        format === "repository"
          ? "Repository scaffold downloaded."
          : "Your theme bundle is ready.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="export-workspace"
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <header className="export-workspace-header">
            <div className="export-header-icon">
              <Package size={23} />
            </div>
            <div>
              <p className="eyebrow">TAKE YOUR COLORS WITH YOU</p>
              <Dialog.Title>Make it yours, everywhere.</Dialog.Title>
              <Dialog.Description>
                {theme.name} · {selected.length} integrations · source and
                design system included
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="icon-button"
              aria-label="Close export workspace"
            >
              <X size={20} />
            </Dialog.Close>
          </header>
          <div className="export-workspace-body">
            <aside className="export-destinations">
              <div className="export-destination-heading">
                <strong>Build your package</strong>
                <span>{selected.length}</span>
              </div>
              <label className="search-field">
                <Search size={14} />
                <input
                  placeholder="Find an integration…"
                  aria-label="Search export integrations"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <button
                className={`export-design-system ${active === "design-system" ? "selected" : ""}`}
                onClick={() => choose("design-system")}
              >
                <Code2 size={17} />
                <span>
                  <b>Reusable design system</b>
                  <small>Always included</small>
                </span>
                <Check size={14} />
              </button>
              <div className="export-select-actions">
                <button
                  className="text-button"
                  onClick={() => setSelected(exportTargets.map((t) => t.id))}
                >
                  <CheckCheck size={12} />
                  All
                </button>
                <button className="text-button" onClick={() => setSelected([])}>
                  Clear
                </button>
                <span>Preview any target</span>
              </div>
              <div className="export-destination-list">
                {categories.map((category) => {
                  const group = visibleTargets.filter(
                    (t) => t.category === category,
                  );
                  return group.length ? (
                    <section key={category}>
                      <h3>{category}</h3>
                      {group.map((t) => (
                        <div
                          key={t.id}
                          className={`export-destination ${active === t.id ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Include ${t.name} in package`}
                            checked={selected.includes(t.id)}
                            onChange={() => toggle(t.id)}
                          />
                          <button onClick={() => choose(t.id)}>
                            <span
                              className="export-target-dot"
                              style={{ background: t.color }}
                            />
                            <span>{t.name}</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      ))}
                    </section>
                  ) : null;
                })}
                {!visibleTargets.length && (
                  <p className="small muted">No matching integrations.</p>
                )}
              </div>
            </aside>
            <section className="export-inspector">
              <div className="export-inspector-heading">
                <div>
                  <h3>{activeTarget?.name || "Your design system"}</h3>
                  <p>
                    {activeTarget?.format ||
                      "Tokens, design guidance, and 54 interactive examples"}
                  </p>
                </div>
                <div className="appearance-toggle">
                  {(["light", "dark"] as const)
                    .filter((m) => theme.modes[m])
                    .map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        aria-pressed={mode === m}
                      >
                        {m}
                      </button>
                    ))}
                </div>
              </div>
              <div
                className="export-inspector-tabs"
                role="tablist"
                aria-label="Export inspector"
              >
                {[
                  { id: "preview", label: "Preview", Icon: PanelsTopLeft },
                  { id: "files", label: "Files", Icon: FileCode2 },
                  { id: "install", label: "Install", Icon: Download },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                  >
                    <Icon size={14} />
                    {label}
                    {id === "files" && <small>{targetFiles.length}</small>}
                  </button>
                ))}
              </div>
              <div className="export-inspector-content" role="tabpanel">
                {tab === "preview" ? (
                  <>
                    {activeTarget ? (
                      <IntegrationPreview
                        key={active}
                        target={active}
                        theme={theme}
                        mode={mode}
                      />
                    ) : (
                      <ComponentLibrary theme={theme} mode={mode} compact />
                    )}
                    {activeTarget?.category !== "Web frameworks" &&
                      activeTarget && (
                        <p className="integration-preview-note">
                          Illustrative preview using your exported palette.
                          Native app layouts and supported settings vary.
                        </p>
                      )}
                  </>
                ) : tab === "files" ? (
                  <>
                    <div className="export-file-scope">
                      <button
                        aria-pressed={!allFiles}
                        onClick={() => {
                          setAllFiles(false);
                          setFilePath("");
                        }}
                      >
                        This integration
                      </button>
                      <button
                        aria-pressed={allFiles}
                        onClick={() => {
                          setAllFiles(true);
                          setFilePath("");
                        }}
                      >
                        Full package · {generated.files.length} files
                      </button>
                    </div>
                    <div className="export-file-toolbar">
                      <ThemedSelect
                        label="File to inspect"
                        value={file?.path || "empty"}
                        onValueChange={setFilePath}
                        options={
                          files.length
                            ? files.map((f) => ({
                                value: f.path,
                                label: allFiles
                                  ? f.path
                                  : f.path.slice(prefix.length),
                              }))
                            : [{ value: "empty", label: "No files" }]
                        }
                      />
                      <button
                        className="icon-button"
                        aria-label="Copy selected export file"
                        disabled={!file}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              file?.content || "",
                            );
                            notify("Copied to clipboard.");
                          } catch {
                            setError(
                              "Clipboard unavailable. Download the file instead.",
                            );
                          }
                        }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="secondary-button"
                        disabled={!file}
                        onClick={() => runDownload("file")}
                      >
                        <Download size={13} />
                        This file
                      </button>
                    </div>
                    <pre className="export-code">
                      <code>{file?.content || generated.error}</code>
                    </pre>
                  </>
                ) : (
                  <div className="export-install">
                    <span className="eyebrow">YOUR NEXT STEP</span>
                    <h2>
                      {activeTarget
                        ? `Install in ${activeTarget.name}`
                        : "Build something with your theme."}
                    </h2>
                    <p>
                      {activeTarget?.install ||
                        "Open components.html to explore the complete gallery locally. Import tokens.css into your website or app, and use DESIGN.md as guidance for building new components."}
                    </p>
                    {activeTarget?.limitation && (
                      <div className="notice">{activeTarget.limitation}</div>
                    )}
                    {activeTarget && (
                      <a
                        className="secondary-button"
                        href={activeTarget.docs}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official theme guide <ExternalLink size={13} />
                      </a>
                    )}
                    <hr />
                    <h3>Make it a repository</h3>
                    <p>
                      Choose Repository ZIP, extract it, then run these commands
                      in the extracted folder. Edit theme.json and rebuild
                      whenever your palette changes.
                    </p>
                    <pre>
                      <code>
                        git init{"\n"}npm ci{"\n"}npm run build
                      </code>
                    </pre>
                    <p className="small muted">
                      The generator runs locally. Fonts are referenced with
                      fallbacks; load your chosen fonts in the consuming app.
                    </p>
                  </div>
                )}
              </div>
              <div className="export-single-action">
                <span>
                  {activeTarget && !selected.includes(active)
                    ? "Previewing a target outside your bundle."
                    : activeTarget
                      ? "Included in your bundle."
                      : "Included with every package."}
                </span>
                <button
                  className="text-button"
                  onClick={() => runDownload("target")}
                  disabled={!targetFiles.length}
                >
                  <Download size={13} />
                  Download {activeTarget ? "integration" : "design system"} ZIP
                </button>
              </div>
            </section>
          </div>
          {(error || generated.error) && (
            <p role="alert" className="export-error">
              {error || generated.error}
            </p>
          )}
          <footer className="export-workspace-footer">
            <div>
              <ThemedSelect
                label="Package format"
                value={format}
                onValueChange={(v) => setFormat(v as typeof format)}
                options={[
                  { value: "bundle", label: "Theme bundle" },
                  { value: "repository", label: "Repository ZIP" },
                ]}
              />
              <span>
                {generated.files.length} files ·{" "}
                {selected.length
                  ? `${selected.length} integrations`
                  : "Design system only"}
              </span>
            </div>
            <p>
              {format === "repository"
                ? "Includes editable source and a local generator."
                : "Installable themes plus a reusable design system."}
            </p>
            <button
              className="primary-button"
              disabled={!!generated.error}
              onClick={() => runDownload("package")}
            >
              {format === "repository" ? (
                <FolderGit2 size={15} />
              ) : (
                <Download size={15} />
              )}
              Download {format === "repository" ? "repository" : "bundle"}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
