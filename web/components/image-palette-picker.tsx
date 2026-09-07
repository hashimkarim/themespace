"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Moon,
  Sun,
  Upload,
} from "lucide-react";
import {
  extractImagePalette,
  IMAGE_PALETTE_ACCEPT,
  type ImagePalette,
} from "@/lib/image-palette";
import {
  palettesFromColors,
  suggestedAccent,
  type GeneratedPalettes,
} from "@/lib/palette-tools";
import { readableOn, type Appearance } from "@/lib/theme";

export function ImagePalettePicker({
  appearance,
  onApply,
  onCancel,
}: {
  appearance: Appearance;
  onApply: (palettes: GeneratedPalettes, both: boolean) => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const dragDepth = useRef(0);
  const [image, setImage] = useState<ImagePalette | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [accent, setAccent] = useState(0);
  const [previewMode, setPreviewMode] = useState(appearance);
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
      setAccent(suggestedAccent(result.colors));
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
  const palettes = image
    ? palettesFromColors(
        image.colors.map((c) => c.hex),
        accent,
      )
    : null;
  const palette = palettes?.[previewMode];

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
              ? "Try another image, or choose an accent below."
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
            ? `${image.colors.length} colors found. Choose your accent and preview the palette.`
            : ""}
      </div>
      {error && (
        <p className="image-palette-error" role="alert">
          {error}
        </p>
      )}
      {image && palettes && palette && (
        <>
          <div className="image-palette-section-heading">
            <h3>Pick your accent</h3>
            <span>
              {image.colors.length}{" "}
              {image.colors.length === 1 ? "color" : "colors"} found
            </span>
          </div>
          <div
            className="image-palette-swatches"
            role="group"
            aria-label="Extracted colors"
          >
            {image.colors.map((color, i) => (
              <button
                key={color.hex}
                type="button"
                aria-label={`Use ${color.hex} as accent`}
                aria-pressed={accent === i}
                onClick={() => setAccent(i)}
              >
                <span
                  style={{
                    background: color.hex,
                    color: readableOn(color.hex),
                  }}
                >
                  {accent === i && <Check size={18} />}
                </span>
                <code>{color.hex}</code>
              </button>
            ))}
          </div>
          <div className="image-palette-section-heading">
            <h3>A little preview</h3>
            <div
              className="image-palette-modes"
              role="group"
              aria-label="Image palette preview appearance"
            >
              {(["light", "dark"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  aria-label={`Preview ${mode} palette`}
                  aria-pressed={previewMode === mode}
                  onClick={() => setPreviewMode(mode)}
                >
                  {mode === "light" ? <Sun size={13} /> : <Moon size={13} />}
                  {mode}
                </button>
              ))}
            </div>
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
                  background: palette.accent,
                  color: readableOn(palette.accent),
                }}
              >
                Your accent <Check size={13} />
              </span>
            </div>
          </div>
          <p className="image-palette-hint">
            Colors are adapted for readable text in light and dark themes. You
            can fine-tune every color in the Studio.
          </p>
          <label className="image-palette-both">
            <input
              type="checkbox"
              checked={both}
              onChange={(e) => setBoth(e.target.checked)}
            />
            <span>
              Update light and dark
              <small>
                {both
                  ? "Replaces both palettes. You can undo after applying."
                  : `Only replaces your ${appearance} palette. You can undo after applying.`}
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
            if (palettes) onApply(palettes, both);
          }}
        >
          <Check size={14} />
          Apply palette
        </button>
      </div>
    </div>
  );
}
