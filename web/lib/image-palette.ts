import { extractColors, type ExtractedColor } from "./palette-tools";

export const IMAGE_PALETTE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/avif,image/gif";
export const IMAGE_PALETTE_MAX_BYTES = 12 * 1024 * 1024;
export type ImagePalette = {
  name: string;
  thumbnail: string;
  colors: ExtractedColor[];
};

export async function extractImagePalette(file: File): Promise<ImagePalette> {
  if (file.size > IMAGE_PALETTE_MAX_BYTES)
    throw new Error("Choose an image smaller than 12 MB.");
  const supported = file.type
    ? IMAGE_PALETTE_ACCEPT.split(",").includes(file.type.toLowerCase())
    : /\.(png|jpe?g|webp|avif|gif)$/i.test(file.name);
  if (!supported)
    throw new Error("Choose a PNG, JPG, WebP, AVIF, or GIF image.");
  let source: ImageBitmap | HTMLImageElement | undefined;
  let url: string | undefined;
  try {
    try {
      if (typeof createImageBitmap === "function")
        source = await createImageBitmap(file);
      else {
        url = URL.createObjectURL(file);
        source = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Image decode failed"));
          image.src = url!;
        });
      }
    } catch {
      throw new Error(
        "This image could not be read. Try another image or save it as a PNG or JPG.",
      );
    }
    const width =
      source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height =
      source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height) throw new Error("This image has no visible pixels.");
    if (width * height > 64_000_000)
      throw new Error(
        "This image is too large to process. Resize it below 64 megapixels.",
      );
    const scale = Math.min(1, 240 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error("Image palettes are unavailable in this browser.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const colors = extractColors(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
    );
    return {
      name: file.name,
      thumbnail: canvas.toDataURL("image/png"),
      colors,
    };
  } finally {
    if (source && "close" in source) source.close();
    if (url) URL.revokeObjectURL(url);
  }
}
