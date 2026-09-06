import {
  designSystemFiles,
  generateTarget,
  generatorVersion,
  type ThemeFile,
} from "./exporters.js";
import { parseTheme, slugify, type Theme } from "./theme.js";
import { getTarget } from "./targets.js";

export function bundleFiles(
  source: Theme,
  selected: string[],
  repository = false,
  sources: Record<string, string> = {},
): ThemeFile[] {
  const theme = parseTheme({ ...source, targets: selected });
  const files: ThemeFile[] = [
    { path: "theme.json", content: JSON.stringify(theme, null, 2) + "\n" },
  ];
  for (const id of theme.targets) {
    const target = getTarget(id);
    const prefix =
      target.category === "Web frameworks" ? "integrations" : "apps";
    files.push(
      ...generateTarget(theme, id).map((file) => ({
        ...file,
        path: `${prefix}/${id}/${file.path}`,
      })),
    );
  }
  files.push(
    ...designSystemFiles(theme).map((file) => ({
      ...file,
      path: `design-system/${slugify(theme.name)}/${file.path}`,
    })),
  );
  const table = theme.targets
    .map((id) => {
      const t = getTarget(id);
      return `- [${t.name}](${t.category === "Web frameworks" ? "integrations" : "apps"}/${id}/README.md)`;
    })
    .join("\n");
  files.push({
    path: "README.md",
    content: `# ${theme.name}\n\n${theme.description}\n\nBy ${theme.author}. Created with ThemeSpace ${generatorVersion}.\n\n## Integrations\n\n${table}\n\n## Design system\n\nOpen design-system/${slugify(theme.name)}/components.html to preview the web foundations. Read design-system/${slugify(theme.name)}/DESIGN.md for design guidance.\n\n## Theme source\n\ntheme.json is the canonical editable source. Import it into ThemeSpace to continue editing.\n${repository ? "\n## Regenerate\n\nRequires Node 22 or later. Run npm ci, then npm run build. The pinned TypeScript compiler builds the bundled generator and regenerates the selected outputs. No ThemeSpace account or remote API is needed. Run git init to turn this folder into a Git repository; no remotes or submodules are preconfigured.\n\nEdit theme.json rather than generated files. Regeneration writes only the selected output paths; it does not delete unrelated files. If you remove a target, remove its old export directory manually.\n" : ""}\n## Compatibility\n\nWeb targets follow their documented formats. Native exports are beta: read each installation guide and verify them in your target app version. Fonts are referenced, not bundled. Install or load them separately as required. The Open Design-shaped package is portable source material; importer compatibility has not been verified.\n\n## Attribution\n\nDeclared theme license: ${theme.license}. ${theme.parent ? `Remixed from ${theme.parent.name} by ${theme.parent.author}.` : ""}\n`,
  });
  files.push({
    path: "theme.lock.json",
    content:
      JSON.stringify(
        {
          schemaVersion: 1,
          generatorVersion,
          exporters: Object.fromEntries(
            theme.targets.map((id) => [id, generatorVersion]),
          ),
          nativeValidation:
            "Not loaded in native apps; see integration README files.",
        },
        null,
        2,
      ) + "\n",
  });
  if (repository) {
    for (const file of [
      "theme.ts",
      "targets.ts",
      "exporters.ts",
      "package.ts",
      "component-fixtures.ts",
    ])
      if (!sources[file])
        throw new Error("Repository generator source is missing.");
    files.push(
      { path: "src/package.ts", content: sources["package.ts"] },
      {
        path: "src/component-fixtures.ts",
        content: sources["component-fixtures.ts"],
      },
      { path: "src/theme.ts", content: sources["theme.ts"] },
      { path: "src/targets.ts", content: sources["targets.ts"] },
      { path: "src/exporters.ts", content: sources["exporters.ts"] },
      {
        path: "package.json",
        content:
          JSON.stringify(
            {
              name: slugify(theme.name),
              version: "1.0.0",
              private: true,
              type: "module",
              engines: { node: ">=22" },
              scripts: { build: "tsc && node scripts/build.mjs" },
              devDependencies: { typescript: "5.9.3" },
            },
            null,
            2,
          ) + "\n",
      },
      {
        path: "package-lock.json",
        content:
          JSON.stringify(
            {
              name: slugify(theme.name),
              version: "1.0.0",
              lockfileVersion: 3,
              requires: true,
              packages: {
                "": {
                  name: slugify(theme.name),
                  version: "1.0.0",
                  devDependencies: { typescript: "5.9.3" },
                  engines: { node: ">=22" },
                },
                "node_modules/typescript": {
                  version: "5.9.3",
                  resolved:
                    "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz",
                  integrity:
                    "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
                  dev: true,
                  license: "Apache-2.0",
                  bin: { tsc: "bin/tsc", tsserver: "bin/tsserver" },
                  engines: { node: ">=14.17" },
                },
              },
            },
            null,
            2,
          ) + "\n",
      },
      {
        path: "tsconfig.json",
        content:
          JSON.stringify(
            {
              compilerOptions: {
                target: "ES2022",
                module: "NodeNext",
                moduleResolution: "NodeNext",
                strict: true,
                skipLibCheck: true,
                outDir: ".generator",
              },
              include: ["src/**/*.ts"],
            },
            null,
            2,
          ) + "\n",
      },
      { path: ".gitignore", content: "node_modules/\n.generator/\n" },
      {
        path: "scripts/build.mjs",
        content: `import {readFile,mkdir,writeFile} from 'node:fs/promises';\nimport {dirname,resolve as pathResolve} from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {bundleFiles} from '../.generator/package.js';\nconst root=fileURLToPath(new URL('../',import.meta.url));\nconst theme=JSON.parse(await readFile(pathResolve(root,'theme.json'),'utf8'));\nconst sources=Object.fromEntries(await Promise.all(['theme.ts','targets.ts','exporters.ts','package.ts','component-fixtures.ts'].map(async name=>[name,await readFile(pathResolve(root,'src',name),'utf8')])));\nconst files=bundleFiles(theme,theme.targets,true,sources);\nfor(const f of files){const destination=pathResolve(root,f.path);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,f.content);}\nconsole.log('Regenerated '+files.length+' files for '+theme.name+'.');\n`,
      },
    );
  }
  return files;
}
