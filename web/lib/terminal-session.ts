export type TerminalScene = "shell" | "ansi" | "build" | "diff" | "unicode";
export const terminalScenes: { id: TerminalScene; label: string }[] = [
  { id: "shell", label: "Shell" },
  { id: "ansi", label: "ANSI colors" },
  { id: "build", label: "Build output" },
  { id: "diff", label: "Git diff" },
  { id: "unicode", label: "Unicode" },
];
const esc = "\x1b[";
/** Whole ANSI writes let Ghostty restart for a new palette without losing local input. */
export function createTerminalTranscript(limit = 200000) {
  let chunks: string[] = [],
    length = 0;
  return {
    append(text: string) {
      if (text.startsWith(`${esc}2J${esc}H`)) {
        chunks = [];
        length = 0;
      }
      chunks.push(text);
      length += text.length;
      while (length > limit && chunks.length > 1)
        length -= chunks.shift()!.length;
    },
    replay() {
      return chunks.join("");
    },
  };
}
export const terminalText = (text: string) =>
  text.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
export function terminalScene(
  scene: TerminalScene,
  name: string,
  windows = false,
) {
  const theme = terminalText(name);
  const prompt = windows
    ? "PS C:\\Users\\You\\themes>"
    : "you@workspace ~/themes %";
  const heading = `${esc}1m${theme}${esc}0m  ·  ${scene === "shell" ? "local shell demo" : scene}\r\n\r\n`;
  if (scene === "ansi")
    return (
      heading +
      [0, 1]
        .map(
          (bright) =>
            Array.from(
              { length: 8 },
              (_, i) => `${esc}${(bright ? 100 : 40) + i}m   ${esc}0m`,
            ).join("") +
            "\r\n" +
            Array.from(
              { length: 8 },
              (_, i) =>
                `${esc}${(bright ? 90 : 30) + i}m ${String(i + bright * 8).padStart(2)} ${esc}0m`,
            ).join(""),
        )
        .join("\r\n\r\n") +
      `\r\n\r\n${esc}1mBold${esc}0m  ${esc}3mItalic${esc}0m  ${esc}4mUnderline${esc}0m  ${esc}7mInverse${esc}0m\r\n\r\nDrag over text to inspect selection colors.\r\n`
    );
  if (scene === "build")
    return (
      heading +
      `${prompt} npm run build\r\n\r\n${esc}36m> themespace build${esc}0m\r\n${esc}90m  compiling theme adapters…${esc}0m\r\n${esc}32m✓${esc}0m 26 integrations generated\r\n${esc}32m✓${esc}0m theme.css                 4.8 kB\r\n${esc}33m!${esc}0m native fonts use the host configuration\r\n${esc}31m✕${esc}0m example validation error: missing title\r\n\r\n${esc}1;32mBuild complete.${esc}0m\r\n`
    );
  if (scene === "diff")
    return (
      heading +
      `${esc}33mdiff --git a/theme.ts b/theme.ts${esc}0m\r\n${esc}1m--- a/theme.ts\r\n+++ b/theme.ts${esc}0m\r\n${esc}36m@@ -1,4 +1,4 @@${esc}0m\r\n export const theme = {\r\n${esc}31m-  name: "Untitled",${esc}0m\r\n${esc}32m+  name: "${theme}",${esc}0m\r\n   appearance: "dark"\r\n };\r\n`
    );
  if (scene === "unicode")
    return (
      heading +
      `┌──────────────────────────────┐\r\n│ A terminal that feels yours.  │\r\n├──────────────────────────────┤\r\n│ arrows   ← ↑ → ↓             │\r\n│ symbols  ✓ ✕ ◆ ●             │\r\n│ accents  café · naïve · Ångström\r\n│ scripts  日本語 · Ελληνικά     │\r\n└──────────────────────────────┘\r\n\r\n${esc}32m████████${esc}90m░░░░░░░░${esc}0m  50%\r\n`
    );
  return (
    heading +
    `${esc}32m✓${esc}0m Your palette is loaded.\r\nTry ${esc}36mhelp${esc}0m, ${esc}36mcolors${esc}0m, ${esc}36mls${esc}0m, or ${esc}36mecho hello${esc}0m.\r\n\r\n`
  );
}

/** A bounded local demo, connected to terminal input events, with no process or network access. */
export function createTerminalSession(
  write: (text: string) => void,
  context: { name: string; windows: boolean },
) {
  let line = "",
    position = 0,
    historyIndex = 0;
  const history: string[] = [];
  const prompt = () => `${esc}36m${context.windows ? "PS>" : "❯"}${esc}0m `;
  const redraw = () =>
    write(
      `\r${esc}2K${prompt()}${line}${position < line.length ? `${esc}${line.length - position}D` : ""}`,
    );
  const execute = () => {
    const command = line.trim();
    write("\r\n");
    if (command) {
      history.push(command);
      if (history.length > 50) history.shift();
    }
    if (command === "clear" || command === "cls") write(`${esc}2J${esc}H`);
    else if (command === "help")
      write(
        "Local commands: help, colors, build, diff, unicode, ls, pwd, echo <text>, clear\r\n",
      );
    else if (command === "pwd")
      write(
        `${context.windows ? "C:\\Users\\You\\themes" : "/home/you/themes"}\r\n`,
      );
    else if (command === "ls" || command === "dir")
      write(
        `${esc}34mapps/${esc}0m  ${esc}34mdesign-system/${esc}0m  theme.json  README.md\r\n`,
      );
    else if (command.startsWith("echo "))
      write(`${terminalText(command.slice(5))}\r\n`);
    else if (["colors", "build", "diff", "unicode"].includes(command))
      write(
        terminalScene(
          command === "colors" ? "ansi" : (command as TerminalScene),
          context.name,
          context.windows,
        ),
      );
    else if (command)
      write(
        `${esc}33mLocal preview:${esc}0m “${terminalText(command)}” is not a demo command. Type help.\r\n`,
      );
    line = "";
    position = 0;
    historyIndex = history.length;
    write(prompt());
  };
  return {
    start(scene: TerminalScene) {
      line = "";
      position = 0;
      write(
        `${esc}2J${esc}H${terminalScene(scene, context.name, context.windows)}\r\n${prompt()}`,
      );
    },
    input(data: string) {
      // CSI/SS3 keyboard sequences are handled as units, never echoed as control bytes.
      const parts =
        data
          .slice(0, 16384)
          .match(/\x1b\[[0-9;]*[A-Za-z~]|\x1bO[A-Za-z]|[^\x1b]/gu) || [];
      for (const key of parts) {
        const previousLine = line,
          previousPosition = position;
        if (key === "\r" || key === "\n") {
          execute();
          continue;
        }
        if (key === "\x03") {
          write("^C\r\n");
          line = "";
          position = 0;
          write(prompt());
          continue;
        }
        if (key === "\x0c") {
          write(`${esc}2J${esc}H`);
          redraw();
          continue;
        }
        if (key === "\x7f" || key === "\b") {
          if (position) {
            line = line.slice(0, position - 1) + line.slice(position);
            position--;
          }
        } else if (key === "\x1b[D") position = Math.max(0, position - 1);
        else if (key === "\x1b[C")
          position = Math.min(line.length, position + 1);
        else if (key === "\x1b[H" || key === "\x01") position = 0;
        else if (key === "\x1b[F" || key === "\x05") position = line.length;
        else if (key === "\x1b[3~")
          line = line.slice(0, position) + line.slice(position + 1);
        else if (key === "\x1b[A" || key === "\x1b[B") {
          historyIndex = Math.max(
            0,
            Math.min(
              history.length,
              historyIndex + (key.endsWith("A") ? -1 : 1),
            ),
          );
          line = history[historyIndex] || "";
          position = line.length;
        } else if (key === "\t") {
          const matches = [
            "help",
            "colors",
            "build",
            "diff",
            "unicode",
            "ls",
            "pwd",
            "echo",
            "clear",
          ].filter((c) => c.startsWith(line));
          if (matches.length === 1) {
            line = matches[0];
            position = line.length;
          }
        } else if (
          !key.startsWith("\x1b") &&
          terminalText(key) &&
          line.length < 240
        ) {
          line = line.slice(0, position) + key + line.slice(position);
          position += key.length;
        }
        if (line !== previousLine || position !== previousPosition) redraw();
      }
    },
  };
}
