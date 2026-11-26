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
  Eye,
} from "lucide-react";
import { type Theme, type Appearance } from "@/lib/theme";
import { getTarget, exportTargets } from "@/lib/targets";
import { ThemePreview } from "./preview";
import { ComponentGallery } from "./component-gallery";
import { IntegrationPreview, IntegrationPicker } from "./integration-preview";
import { FittedPreview } from "./fitted-preview";

type VisionMode =
  | "normal"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia";

const visionFilters: Record<Exclude<VisionMode, "normal">, { label: string; matrix: string }> = {
  protanopia: {
    label: "Protanopia (no red)",
    matrix: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  },
  deuteranopia: {
    label: "Deuteranopia (no green)",
    matrix: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  },
  tritanopia: {
    label: "Tritanopia (no blue)",
    matrix: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
  },
  achromatopsia: {
    label: "Monochrome",
    matrix: "0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0",
  },
};

export function PreviewWorkspace({
  theme,
  mode,
  initialTarget = "vscode",
  initialTab = "overview",
  fit = false,
}: {
  theme: Theme;
  mode: Appearance;
  initialTarget?: string;
  initialTab?: string;
  fit?: boolean;
}) {
  const expandButton = useRef<HTMLButtonElement | null>(null);
  const [tab, setTab] = useState(initialTab),
    [target, setTarget] = useState(initialTarget),
    [expanded, setExpanded] = useState(false),
    [vision, setVision] = useState<VisionMode>("normal"),
    active = getTarget(target);
  const components =
    tab === "components" ||
    (tab === "integrations" && active.category === "Web frameworks");
  const scene =
    tab === "overview" ? (
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
    );
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
        <div className="preview-toolbar-right">
          <label className="vision-select" title="Simulate color vision deficiency">
            <Eye size={13} aria-hidden="true" />
            <select
              aria-label="Color vision simulation"
              value={vision}
              onChange={(e) => setVision(e.target.value as VisionMode)}
            >
              <option value="normal">Normal vision</option>
              <option value="protanopia">Protanopia</option>
              <option value="deuteranopia">Deuteranopia</option>
              <option value="tritanopia">Tritanopia</option>
              <option value="achromatopsia">Monochrome</option>
            </select>
          </label>
          <button
            ref={expandButton}
            className="icon-button"
            aria-label={expanded ? "Close expanded preview" : "Expand preview"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <X size={16} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>
      {vision !== "normal" && (
        <svg className="sr-only" aria-hidden="true" width="0" height="0">
          <defs>
            <filter id={`ts-vision-${vision}`}>
              <feColorMatrix
                type="matrix"
                values={visionFilters[vision].matrix}
              />
            </filter>
          </defs>
        </svg>
      )}
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
      <div
        className={`workspace-preview-content ${tab} ${components ? "component-content" : ""}`}
        style={
          vision !== "normal"
            ? { filter: `url(#ts-vision-${vision})` }
            : undefined
        }
      >
        {fit && !expanded && !components ? (
          <FittedPreview>{scene}</FittedPreview>
        ) : (
          scene
        )}
      </div>
      <p className="preview-caption">
        <span className="live-dot" />
        {tab === "integrations" && active.category !== "Web frameworks"
          ? "Try the preview controls. Open ‘About this preview’ for renderer and export coverage."
          : "Live theme values. Explore the details and try the controls."}
      </p>
      {tab === "integrations" && active.limitation && (
        <p className="integration-preview-note">{active.limitation}</p>
      )}
    </>
  );
  return (
    <Dialog.Root open={expanded} onOpenChange={setExpanded}>
      <div
        className={`preview-board preview-workspace ${fit ? "fit-workspace" : ""}`}
      >
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
