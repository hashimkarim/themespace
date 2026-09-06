import { type IntegrationTheme } from "./integration-theme";
import { type Appearance, type Theme } from "./theme";

export function exampleCode(theme: Theme, file: string) {
  if (file.endsWith(".md"))
    return `# ${theme.name}\n\nA familiar space for your ideas.\n\n## Make it yours\n\n- Pick a palette\n- Preview your favorite apps\n- Export your theme\n\n> Good ideas need a little room to grow.\n\n\`\`\`ts\nconst greeting = "Welcome home";\n\`\`\`\n`;
  if (file.endsWith(".css"))
    return `:root {\n  --background: ${theme.modes[theme.defaultAppearance]!.background};\n  --accent: ${theme.modes[theme.defaultAppearance]!.accent};\n}\n\n.workspace {\n  display: grid;\n  gap: 1rem;\n  color: var(--accent);\n  background: var(--background);\n}\n`;
  return `// A theme for the places you create.\nimport { createTheme } from "@themespace/core";\n\ninterface Workspace {\n  name: string;\n  isHome: boolean;\n}\n\nexport const theme = createTheme({\n  name: ${JSON.stringify(theme.name)},\n  appearance: ${JSON.stringify(theme.defaultAppearance)},\n  radius: ${theme.style.radius},\n});\n\nexport function welcome(workspace: Workspace) {\n  const message = \`Hello, \${workspace.name}!\`;\n  return workspace.isHome ? message : "Make yourself at home.";\n}\n\nconsole.log(welcome({ name: "you", isHome: true }));\n`;
}

export function monacoTheme(contract: IntegrationTheme, mode: Appearance) {
  const c = contract.roles;
  const syntax = contract.syntax;
  const tokenMap: Record<string, string[]> = {
    comment: ["comment"],
    string: ["string", "string.escape"],
    number: ["number", "number.hex"],
    keyword: ["keyword", "keyword.flow"],
    function: ["identifier.function"],
    type: ["type", "type.identifier"],
  };
  return {
    base: mode === "dark" ? ("vs-dark" as const) : ("vs" as const),
    inherit: true,
    rules: [
      {
        token: "",
        foreground: c.foreground.replace("#", ""),
        background: c.background.replace("#", ""),
      },
      ...Object.entries(tokenMap).flatMap(([key, tokens]) =>
        syntax[key]
          ? tokens.map((token) => ({
              token,
              foreground: syntax[key].replace("#", ""),
            }))
          : [],
      ),
    ],
    colors: {
      "editor.background": c.background,
      "editor.foreground": c.foreground,
      "editorCursor.foreground": c.cursor,
      "editor.selectionBackground": c.selection,
      "editorLineNumber.foreground": c.muted,
      "editorLineNumber.activeForeground": c.foreground,
      "editor.lineHighlightBackground": c.hover,
      "editorGutter.background": c.gutter || c.background,
      "editorWidget.background": c.elevated,
      "editorWidget.border": c.border,
      ...contract.editorColors,
    },
  };
}

export const EDITOR_MESSAGE = "themespace-editor-config";
export const EDITOR_READY = "themespace-editor-ready";
export type EditorFrameConfig = {
  type: typeof EDITOR_MESSAGE;
  theme: Theme;
  mode: Appearance;
  target: string;
  file: string;
  value: string;
  diff: boolean;
};
