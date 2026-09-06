"use client";
import { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  Component,
  PanelsTopLeft,
  Maximize2,
  X,
  ExternalLink,
} from "lucide-react";
import { type Theme, type Appearance } from "@/lib/theme";
import { getTarget, exportTargets } from "@/lib/targets";
import { ThemePreview } from "./preview";
import { ComponentGallery } from "./component-gallery";
import { IntegrationPreview, IntegrationPicker } from "./integration-preview";
export function PreviewWorkspace({
  theme,
  mode,
  initialTarget = "vscode",
  initialTab = "overview",
}: {
  theme: Theme;
  mode: Appearance;
  initialTarget?: string;
  initialTab?: string;
}) {
  const expandButton = useRef<HTMLButtonElement | null>(null);
  const [tab, setTab] = useState(initialTab),
    [target, setTarget] = useState(initialTarget),
    [expanded, setExpanded] = useState(false),
    active = getTarget(target);
  const content = (
    <>
      <div className="preview-workspace-toolbar">
        <div className="scene-tabs" aria-label="Preview sections">
          {[
            { id: "overview", label: "Overview", Icon: LayoutDashboard },
            { id: "components", label: "Components", Icon: Component },
            { id: "integrations", label: "Integrations", Icon: PanelsTopLeft },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-label={label}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={tab === id ? "selected" : ""}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          ref={expandButton}
          className="icon-button"
          aria-label={expanded ? "Close expanded preview" : "Expand preview"}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <X size={16} /> : <Maximize2 size={15} />}
        </button>
      </div>
      {tab === "integrations" && (
        <div className="integration-preview-toolbar">
          <IntegrationPicker value={target} onChange={setTarget} />
          <span className="small muted">{exportTargets.length} previews</span>
          <a
            href={active.docs}
            target="_blank"
            rel="noreferrer"
            title={`${active.name} theme documentation`}
            aria-label={`${active.name} theme documentation`}
          >
            <ExternalLink size={13} />
          </a>
        </div>
      )}
      <div className={`workspace-preview-content ${tab}`}>
        {tab === "overview" ? (
          <ThemePreview theme={theme} mode={mode} />
        ) : tab === "components" ? (
          <ComponentGallery theme={theme} mode={mode} compact />
        ) : (
          <IntegrationPreview
            key={target}
            target={target}
            theme={theme}
            mode={mode}
          />
        )}
      </div>
      <p className="preview-caption">
        <span className="live-dot" />
        {tab === "integrations" && active.category !== "Web frameworks"
          ? "Interactive app illustration. Native layouts, fonts, and supported settings vary."
          : "Live theme values. Explore the details and try the controls."}
      </p>
      {tab === "integrations" && active.limitation && (
        <p className="integration-preview-note">{active.limitation}</p>
      )}
    </>
  );
  return (
    <Dialog.Root open={expanded} onOpenChange={setExpanded}>
      <div className="preview-board preview-workspace">
        {!expanded ? (
          content
        ) : (
          <p className="small muted">
            Preview opened in the expanded workspace.
          </p>
        )}
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-content preview-fullscreen"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            expandButton.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">
            {theme.name} expanded preview
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Explore component examples and integration simulations with your
            current palette.
          </Dialog.Description>
          {expanded && content}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
