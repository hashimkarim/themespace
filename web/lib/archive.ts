import { strToU8, zipSync, type Zippable } from "fflate";
import { slugify } from "./theme";
import type { ThemeFile } from "./exporters";
export function zipFiles(name: string, files: ThemeFile[]) {
  const input: Zippable = {};
  const prefix = slugify(name);
  for (const file of files) {
    if (
      file.path.startsWith("/") ||
      file.path.split("/").includes("..") ||
      file.path.includes("\\")
    )
      throw new Error("Unsafe export path.");
    input[`${prefix}/${file.path}`] = [
      strToU8(file.content),
      { mtime: new Date(1980, 0, 1) },
    ];
  }
  return zipSync(input, { level: 6 });
}
