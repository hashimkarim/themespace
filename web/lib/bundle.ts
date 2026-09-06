import { bundleFiles as generatePackage } from "./package";
import { type Theme } from "./theme";
export { zipFiles } from "./archive";
import themeSource from "./theme.ts?raw";
import targetSource from "./targets.ts?raw";
import exporterSource from "./exporters.ts?raw";
import fixtureSource from "./component-fixtures.ts?raw";
import packageSource from "./package.ts?raw";

export function bundleFiles(
  source: Theme,
  selected: string[],
  repository = false,
) {
  return generatePackage(source, selected, repository, {
    "theme.ts": themeSource,
    "targets.ts": targetSource,
    "exporters.ts": exporterSource,
    "package.ts": packageSource,
    "component-fixtures.ts": fixtureSource,
  });
}
export function downloadBlob(
  name: string,
  content: string | Uint8Array,
  type = "text/plain",
) {
  const blob = new Blob(
    [typeof content === "string" ? content : new Uint8Array(content).buffer],
    { type },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
