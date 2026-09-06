"use client";
import {
  Check,
  Monitor,
  Moon,
  Sun,
  Palette,
  HardDrive,
  RotateCcw,
  Download,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { presets, baseRoles, resolve, type Theme } from "@/lib/theme";
import { parsePreferences, appliedSiteTheme } from "@/lib/preferences";
import { downloadBlob } from "@/lib/bundle";
import { useSitePreferences } from "./site-preferences";
import { ThemedSelect } from "./ui/select";
export function SettingsPage({
  draft,
  notify,
}: {
  draft: Theme;
  notify: (text: string) => void;
}) {
  const {
      settings,
      update,
      applyTheme,
      followDraft,
      reset,
      storageError,
      ready,
    } = useSitePreferences(),
    input = useRef<HTMLInputElement>(null),
    [importError, setImportError] = useState("");

  const active = appliedSiteTheme(settings);
  function useDraft() {
    try {
      applyTheme(draft);
      notify(`${draft.name} is now your ThemeSpace theme.`);
    } catch {
      notify("Give your draft a name and creator before applying it.");
    }
  }
  return (
    <>
      <div className="studio-heading">
        <div>
          <p className="eyebrow">MAKE THIS SPACE YOURS</p>
          <h1>Settings, remembered here.</h1>
          <p className="subheading">
            Your preferences stay in this browser. No sign-in needed.
          </p>
        </div>
        <span className="settings-local-badge">
          <HardDrive size={15} />
          {storageError
            ? "Unsaved preferences"
            : ready
              ? "Saved on this device"
              : "Opening preferences"}
        </span>
      </div>
      {storageError && (
        <p role="alert" className="notice warning">
          {storageError}
        </p>
      )}
      <div className="settings-layout">
        <div className="settings-sections">
          <section className="settings-section panel">
            <div className="settings-section-heading">
              <Monitor size={19} />
              <div>
                <h2>Appearance</h2>
                <p>
                  Choose how ThemeSpace looks. Your theme’s export appearances
                  stay separate.
                </p>
              </div>
            </div>
            <div className="appearance-cards">
              {[
                { id: "light", name: "Light", Icon: Sun },
                { id: "dark", name: "Dark", Icon: Moon },
                { id: "system", name: "System", Icon: Monitor },
              ].map(({ id, name, Icon }) => (
                <button
                  key={id}
                  className={`appearance-card ${settings.appearance === id ? "selected" : ""}`}
                  onClick={() =>
                    update({ appearance: id as typeof settings.appearance })
                  }
                  aria-pressed={settings.appearance === id}
                >
                  <span className={`appearance-mini ${id}`}>
                    <i />
                    <b />
                    <em />
                  </span>
                  <span>
                    <Icon size={14} />
                    {name}
                    {settings.appearance === id && <Check size={14} />}
                  </span>
                </button>
              ))}
            </div>
            {active && (!active.modes.light || !active.modes.dark) && (
              <p className="small muted">
                This theme only has a {active.defaultAppearance} appearance, so
                ThemeSpace uses that appearance.
              </p>
            )}
          </section>
          <section className="settings-section panel">
            <div className="settings-section-heading">
              <Palette size={19} />
              <div>
                <h2>Theme this site</h2>
                <p>
                  Follow your live draft, use a starter palette, or apply a
                  saved snapshot across the whole app.
                </p>
              </div>
            </div>
            <div className="site-theme-grid">
              <button
                className={`site-theme-option ${settings.themeId === "default" ? "selected" : ""}`}
                aria-pressed={settings.themeId === "default"}
                onClick={() => update({ themeId: "default" })}
              >
                <span className="site-theme-swatches">
                  <i style={{ background: "#f8f8fa" }} />
                  <i style={{ background: "#7166aa" }} />
                  <i style={{ background: "#292637" }} />
                </span>
                <span>ThemeSpace</span>
                {settings.themeId === "default" && <Check size={14} />}
              </button>
              <button
                className={`site-theme-option ${settings.themeId === "draft" ? "selected" : ""}`}
                aria-pressed={settings.themeId === "draft"}
                onClick={() => {
                  followDraft(draft);
                  notify("ThemeSpace now follows your draft as you edit.");
                }}
                title="Updates live with your Studio draft"
              >
                <span className="site-theme-swatches">
                  {baseRoles.slice(0, 3).map((role) => (
                    <i
                      key={role}
                      style={{
                        background: resolve(draft, draft.defaultAppearance)[
                          role
                        ],
                      }}
                    />
                  ))}
                </span>
                <span>
                  Draft <small className="live-theme-label">LIVE</small>
                </span>
                {settings.themeId === "draft" && <Check size={14} />}
              </button>
              {presets.map((theme) => (
                <button
                  key={theme.id}
                  className={`site-theme-option ${settings.themeId === theme.id ? "selected" : ""}`}
                  aria-pressed={settings.themeId === theme.id}
                  onClick={() => update({ themeId: theme.id })}
                >
                  <span className="site-theme-swatches">
                    {baseRoles.slice(0, 3).map((role) => (
                      <i
                        key={role}
                        style={{
                          background: resolve(
                            theme,
                            settings.appearance === "light" ? "light" : "dark",
                          )[role],
                        }}
                      />
                    ))}
                  </span>
                  <span>{theme.name}</span>
                  {settings.themeId === theme.id && <Check size={14} />}
                </button>
              ))}
              {settings.customTheme && (
                <button
                  className={`site-theme-option ${settings.themeId === "custom" ? "selected" : ""}`}
                  onClick={() => update({ themeId: "custom" })}
                  aria-pressed={settings.themeId === "custom"}
                  aria-label={`${settings.customTheme.name} saved snapshot`}
                >
                  <span className="site-theme-swatches">
                    {baseRoles.slice(0, 3).map((role) => (
                      <i
                        key={role}
                        style={{
                          background: resolve(
                            settings.customTheme!,
                            settings.customTheme!.defaultAppearance,
                          )[role],
                        }}
                      />
                    ))}
                  </span>
                  <span>
                    {settings.customTheme.name}
                    <small className="theme-option-note">Saved snapshot</small>
                  </span>
                  {settings.themeId === "custom" && <Check size={14} />}
                </button>
              )}
            </div>
            <p className="small muted site-theme-hint">
              Draft follows your colors, fonts, and style changes immediately.
              Appearance above controls whether the site uses the light or dark
              palette.
            </p>
            <div className="use-draft-row">
              <div>
                <strong>Your current draft: {draft.name}</strong>
                <p>Keep a fixed copy of this theme as another option.</p>
              </div>
              <button className="secondary-button" onClick={useDraft}>
                <Palette size={14} />
                Apply snapshot
              </button>
            </div>
          </section>
          <section className="settings-section panel">
            <div className="settings-section-heading">
              <HardDrive size={19} />
              <div>
                <h2>Workspace preferences</h2>
                <p>Small details that make each visit feel familiar.</p>
              </div>
            </div>
            <label className="setting-row">
              <span>
                <strong>Interface density</strong>
                <small>Adjust the spacing around controls and panels.</small>
              </span>
              <ThemedSelect
                label="Interface density"
                value={settings.density}
                onValueChange={(density) =>
                  update({ density: density as typeof settings.density })
                }
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>Motion</strong>
                <small>
                  The system option follows reduced-motion preferences.
                </small>
              </span>
              <ThemedSelect
                label="Motion preference"
                value={settings.motion}
                onValueChange={(motion) =>
                  update({ motion: motion as typeof settings.motion })
                }
                options={[
                  { value: "system", label: "Follow system" },
                  { value: "reduced", label: "Reduce motion" },
                ]}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>Default download</strong>
                <small>
                  Start the export workspace with your preferred package.
                </small>
              </span>
              <ThemedSelect
                label="Default download"
                value={settings.exportFormat}
                onValueChange={(exportFormat) =>
                  update({
                    exportFormat: exportFormat as typeof settings.exportFormat,
                  })
                }
                options={[
                  { value: "bundle", label: "Theme bundle" },
                  { value: "repository", label: "Repository ZIP" },
                ]}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>Remember guest draft</strong>
                <small>
                  Restore your theme after closing and reopening the browser.
                </small>
              </span>
              <input
                className="app-switch"
                role="switch"
                aria-label="Remember guest draft"
                type="checkbox"
                checked={settings.rememberDraft}
                onChange={(e) => update({ rememberDraft: e.target.checked })}
              />
            </label>
          </section>
        </div>
        <aside className="settings-sidebar panel">
          <div className="settings-mini-icon">
            <HardDrive size={23} />
          </div>
          <h2>Local means local.</h2>
          <p>
            Appearance, your applied theme, and these preferences are saved in
            this browser’s local storage.
          </p>
          <p>
            They survive refreshes and browser restarts. Clearing site data
            resets them. Account memory has no effect.
          </p>
          <div className="settings-data-actions">
            <button
              className="secondary-button"
              onClick={() =>
                downloadBlob(
                  "themespace-settings.json",
                  JSON.stringify(settings, null, 2),
                  "application/json",
                )
              }
            >
              <Download size={14} />
              Back up settings
            </button>
            <button
              className="secondary-button"
              onClick={() => input.current?.click()}
            >
              <Upload size={14} />
              Restore settings
            </button>
            <input
              type="file"
              hidden
              accept="application/json,.json"
              ref={input}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 65_536)
                    throw new Error("Settings must be under 64 KB.");
                  const raw = JSON.parse(await file.text());
                  if (raw.version !== 1)
                    throw new Error("Choose a ThemeSpace settings file.");
                  update({
                    ...parsePreferences(raw),
                    customTheme: parsePreferences(raw).customTheme,
                    draftTheme: parsePreferences(raw).draftTheme,
                  });
                  setImportError("");
                  notify("Settings restored in this browser.");
                } catch (error) {
                  setImportError(
                    error instanceof Error
                      ? error.message
                      : "Could not restore settings.",
                  );
                }
                e.target.value = "";
              }}
            />
            {importError && (
              <p className="error-text" role="alert">
                {importError}
              </p>
            )}
            <button
              className="text-button"
              onClick={() => {
                reset();
                notify("Site settings reset. Your theme draft is unchanged.");
              }}
            >
              <RotateCcw size={13} />
              Reset site settings
            </button>
          </div>
          <p className="small muted">
            Theme drafts and published versions are separate from site settings.
          </p>
        </aside>
      </div>
    </>
  );
}
