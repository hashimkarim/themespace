"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from "lucide-react";
import {
  extractImagePalette,
  IMAGE_PALETTE_ACCEPT,
  type ImagePalette,
} from "@/lib/image-palette";
import {
  palettesFromImage,
  suggestImageRoles,
  type GeneratedPalettes,
  type ImageColorRoles,
  type ImagePaletteRoles,
  type PaletteTarget,
} from "@/lib/palette-tools";
import { readableOn, type Appearance } from "@/lib/theme";

const colorRoles = [
  { id: "surface", label: "Surfaces" },
  { id: "primary", label: "Buttons" },
  { id: "secondary", label: "Accent 2" },
  { id: "tertiary", label: "Accent 3" },
] as const;

export function ImagePalettePicker({
  appearance,
  onApply,
  onCancel,
}: {
  appearance: Appearance;
  onApply: (palettes: GeneratedPalettes, target: PaletteTarget) => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const dragDepth = useRef(0);
  const [image, setImage] = useState<ImagePalette | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [assignments, setAssignments] = useState<ImagePaletteRoles | null>(
    null,
  );
  const [editingRole, setEditingRole] =
    useState<keyof ImageColorRoles>("primary");
  const [editingMode, setEditingMode] = useState(appearance);
  const [both, setBoth] = useState(true);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  const choose = async (file?: File) => {
    if (!file) return;
    const current = ++request.current;
    setBusy(true);
    setError("");
    setImage(null);
    try {
      const result = await extractImagePalette(file);
      if (current !== request.current) return;
      const suggested = suggestImageRoles(result.colors);
      setAssignments({ dark: { ...suggested }, light: { ...suggested } });
      setImage(result);
    } catch (cause) {
      if (current === request.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "This image could not be read. Try another image.",
        );
    } finally {
      if (current === request.current) setBusy(false);
    }
  };
  const palettes =
    image && assignments ? palettesFromImage(image.colors, assignments) : null;
  const palette = palettes?.[editingMode];
  const roles = assignments?.[editingMode];
  const setRoles = (next: ImageColorRoles) =>
    setAssignments((current) =>
      current ? { ...current, [editingMode]: next } : current,
    );

  return (
    <div className="image-palette-picker">
      <input
        ref={input}
        type="file"
        accept={IMAGE_PALETTE_ACCEPT}
        aria-label="Choose an image for your palette"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void choose(file);
        }}
      />
      <div
        className={`image-palette-dropzone ${dragging ? "is-dragging" : ""}`}
        aria-busy={busy}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (!dragDepth.current) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          void choose(e.dataTransfer.files[0]);
        }}
      >
        {image ? (
          // This is a small, local canvas thumbnail; it never goes through an image server.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.thumbnail}
            alt={`Palette source: ${image.name}`}
            className="image-palette-thumbnail"
          />
        ) : busy ? (
          <LoaderCircle size={26} className="animate-spin" aria-hidden="true" />
        ) : (
          <ImagePlus size={28} aria-hidden="true" />
        )}
        <div className="image-palette-upload-copy">
          <strong>
            {busy
              ? "Finding your colors…"
              : image
                ? image.name
                : "Start with a picture you love"}
          </strong>
          <span>
            {image
              ? "A foundation and accents, drawn from your image."
              : "Drop an image here. PNG, JPG, WebP, AVIF or GIF · up to 12 MB"}
          </span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => input.current?.click()}
          >
            <Upload size={14} />
            {image || busy ? "Choose another image" : "Choose image"}
          </button>
        </div>
      </div>
      <p className="image-palette-privacy">Your image stays on this device.</p>
      <div role="status" className="sr-only">
        {busy
          ? "Extracting colors from your image."
          : image
            ? `${image.colors.length} colors found. Editing ${editingMode} colors. Light and dark keep separate assignments.`
            : ""}
      </div>
      {error && (
        <p className="image-palette-error" role="alert">
          {error}
        </p>
      )}
      {image && roles && palettes && palette && (
        <>
          <div className="image-palette-editor-toolbar">
            <div>
              <h3>Your color story</h3>
              <p>Light and dark keep their own color combinations.</p>
            </div>
            <div
              className="image-palette-modes"
              role="group"
              aria-label="Appearance to edit"
            >
              {(["light", "dark"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  aria-label={`Edit ${mode} palette`}
                  aria-pressed={editingMode === mode}
                  onClick={() => setEditingMode(mode)}
                >
                  {mode === "light" ? <Sun size={13} /> : <Moon size={13} />}
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="image-palette-result">
            <div>
              <div className="image-palette-section-heading">
                <h3>
                  {editingMode === "light" ? "Light colors" : "Dark colors"}
                </h3>
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Auto assign ${editingMode} colors`}
                  onClick={() => setRoles(suggestImageRoles(image.colors))}
                >
                  <RotateCcw size={12} />
                  Auto assign
                </button>
              </div>
              <div
                className="image-palette-roles"
                role="group"
                aria-label={`${editingMode} image color roles`}
              >
                {colorRoles.map((role) => (
                  <button
                    type="button"
                    key={role.id}
                    aria-label={`Choose ${role.label.toLowerCase()} color`}
                    aria-pressed={editingRole === role.id}
                    onClick={() => setEditingRole(role.id)}
                  >
                    <i
                      style={{ background: image.colors[roles[role.id]].hex }}
                    />
                    <span>
                      <b>{role.label}</b>
                      <code>{image.colors[roles[role.id]].hex}</code>
                    </span>
                  </button>
                ))}
              </div>
              <p className="image-palette-assignment">
                Choose a color for{" "}
                <strong>
                  {colorRoles.find((role) => role.id === editingRole)!.label}
                </strong>
              </p>
              <div
                className="image-palette-swatches"
                role="group"
                aria-label="Extracted colors"
              >
                {image.colors.map((color, i) => (
                  <button
                    key={color.hex}
                    type="button"
                    aria-label={`Use ${color.hex} for ${colorRoles.find((role) => role.id === editingRole)!.label.toLowerCase()}`}
                    aria-pressed={roles[editingRole] === i}
                    onClick={() => setRoles({ ...roles, [editingRole]: i })}
                  >
                    <span
                      style={{
                        background: color.hex,
                        color: readableOn(color.hex),
                      }}
                    >
                      {roles[editingRole] === i && <Check size={18} />}
                    </span>
                    <code>{color.hex}</code>
                  </button>
                ))}
              </div>
              <p className="image-palette-hint">
                The dominant color shapes the surfaces. Contrasting colors
                become buttons and supporting accents for charts, highlights,
                and code.
              </p>
            </div>
            <div>
              <div className="image-palette-section-heading">
                <h3>
                  {editingMode === "light" ? "Light preview" : "Dark preview"}
                </h3>
              </div>
              <div
                className="image-palette-preview"
                style={{
                  background: palette.background,
                  color: palette.foreground,
                }}
              >
                <div
                  className="image-palette-preview-card"
                  style={{ background: palette.surface }}
                >
                  <span
                    className="image-palette-preview-eyebrow"
                    style={{ color: palette.accent }}
                  >
                    Made from your world
                  </span>
                  <strong>A space of your own.</strong>
                  <p style={{ color: palette.muted }}>
                    Familiar colors. A fresh start.
                  </p>
                  <span
                    className="image-palette-preview-accent"
                    style={{
                      background: palette.overrides.accentFill,
                      color: palette.overrides.accentForeground,
                    }}
                  >
                    Start creating <Check size={13} />
                  </span>
                  <div className="image-palette-preview-supporting">
                    <span style={{ color: palette.overrides.accent2 }}>
                      ● Accent 2
                    </span>
                    <span style={{ color: palette.overrides.accent3 }}>
                      ● Accent 3
                    </span>
                  </div>
                  <div
                    className="image-palette-preview-chart"
                    aria-label="Accent colors in a sample chart"
                  >
                    {[
                      palette.overrides.chart1,
                      palette.overrides.accent2,
                      palette.overrides.accent3,
                      palette.overrides.accent2,
                      palette.overrides.chart1,
                      palette.overrides.accent3,
                    ].map((color, i) => (
                      <i
                        key={i}
                        style={{
                          background: color,
                          height: `${[60, 85, 45, 70, 95, 65][i]}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="image-palette-hint">
                Button fills keep the image color. Text and supporting accents
                adapt for readability in each appearance.
              </p>
            </div>
          </div>
          <label className="image-palette-both">
            <input
              type="checkbox"
              checked={both}
              onChange={(e) => setBoth(e.target.checked)}
            />
            <span>
              Apply both appearances
              <small>
                {both
                  ? "Uses each appearance’s own combination. You can undo after applying."
                  : `Only replaces your ${editingMode} palette. You can undo after applying.`}
              </small>
            </span>
          </label>
        </>
      )}
      <div className="image-palette-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!palettes || busy}
          onClick={() => {
            if (palettes) onApply(palettes, both ? "both" : editingMode);
          }}
        >
          <Check size={14} />
          {both ? "Apply both palettes" : `Apply ${editingMode} palette`}
        </button>
      </div>
    </div>
  );
}
