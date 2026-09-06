import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { Buffer } from "node:buffer";
import headless from "@xterm/headless";
import { Ghostty } from "ghostty-web";
import {
  createTerminalSession,
  createTerminalTranscript,
  terminalScene,
  terminalText,
} from "../lib/terminal-session";
import {
  ansiKeys,
  integrationTheme,
  terminalEngine,
} from "../lib/integration-theme";
import { presets } from "../lib/theme";

const require = createRequire(import.meta.url);
const theme = structuredClone(presets[0]);

test("xterm renders real indexed ANSI, styles, cursor editing and bounded local commands", async () => {
  const terminal = new headless.Terminal({
    cols: 80,
    rows: 30,
    allowProposedApi: true,
  });
  const write = (text: string) =>
    new Promise<void>((done) => terminal.write(text, done));
  const contents = () =>
    Array.from({ length: terminal.buffer.active.length }, (_, i) =>
      terminal.buffer.active.getLine(i)?.translateToString(true),
    ).join("\n");
  try {
    await write(terminalScene("ansi", theme.name));
    const line = terminal.buffer.active.getLine(2)!;
    for (let index = 0; index < 8; index++)
      assert.equal(line.getCell(index * 3)!.getBgColor(), index);
    const bright = terminal.buffer.active.getLine(5)!;
    for (let index = 0; index < 8; index++)
      assert.equal(bright.getCell(index * 3)!.getBgColor(), index + 8);
    const styles = terminal.buffer.active.getLine(8)!;
    assert.ok(styles.getCell(0)!.isBold());
    assert.ok(styles.getCell(6)!.isItalic());
    let pending = "";
    const session = createTerminalSession(
      (text) => {
        pending += text;
      },
      { name: theme.name, windows: false },
    );
    const flush = async () => {
      await write(pending);
      pending = "";
    };
    session.start("shell");
    session.input("echo hllo\u001b[D\u001b[D\u001b[De\r");
    await flush();
    assert.match(contents(), /\nhello\n/);
    session.input("\u001b[A\r");
    await flush();
    assert.equal(contents().match(/\nhello\n/g)?.length, 2);
    session.input("cl\t\r");
    await flush();
    assert.doesNotMatch(contents(), /hello/);
    session.input("rm -rf /\r");
    await flush();
    assert.match(contents(), /not a demo command/);
    session.input(`echo ${"a".repeat(5000)}\r`);
    assert.ok(pending.length < 75000, "Input and redraw output are bounded");
    assert.doesNotMatch(
      terminalText("bad\u001b]52;c;payload\u0007\u009b31m"),
      /[\u0000-\u001f\u007f-\u009f]/,
    );
  } finally {
    terminal.dispose();
  }
});

test("the bundled Ghostty WebAssembly core renders the exported ANSI palette and Unicode", async () => {
  const bytes = await readFile(require.resolve("ghostty-web/ghostty-vt.wasm"));
  const core = await Ghostty.load(
    `data:application/wasm;base64,${Buffer.from(bytes).toString("base64")}`,
  );
  const palette = integrationTheme(theme, "dark", "ghostty").terminal;
  const color = (hex: string) => parseInt(hex.slice(1), 16);
  const terminal = core.createTerminal(80, 30, {
    fgColor: color(palette.foreground!),
    bgColor: color(palette.background!),
    palette: ansiKeys.map((key) => color(palette[key]!)),
  });
  try {
    terminal.write(terminalScene("ansi", theme.name));
    terminal.update();
    for (let index = 0; index < 16; index++) {
      const cell = terminal.getLine(index < 8 ? 2 : 5)![(index % 8) * 3];
      assert.equal(
        (cell.bg_r << 16) | (cell.bg_g << 8) | cell.bg_b,
        color(palette[ansiKeys[index]]!),
        `ANSI ${index}`,
      );
    }
    terminal.write("\u001b[2J\u001b[H" + terminalScene("unicode", theme.name));
    terminal.update();
    const text = Array.from({ length: 30 }, (_, row) =>
      terminal
        .getLine(row)!
        .filter((cell) => cell.width !== 0)
        .map((cell) =>
          cell.codepoint ? String.fromCodePoint(cell.codepoint) : " ",
        )
        .join(""),
    ).join("\n");
    assert.match(text, /日本語/);
    terminal.resize(40, 20);
    assert.deepEqual(terminal.getDimensions(), { cols: 40, rows: 20 });
    const transcript = createTerminalTranscript();
    const session = createTerminalSession((text) => transcript.append(text), {
      name: theme.name,
      windows: false,
    });
    session.start("shell");
    session.input("echo preserved\r");
    const replayed = core.createTerminal(80, 30, {
      fgColor: 0x123456,
      bgColor: 0xabcdef,
    });
    try {
      replayed.write(transcript.replay());
      const first = replayed.getLine(0)![0];
      assert.equal(
        (first.fg_r << 16) | (first.fg_g << 8) | first.fg_b,
        0x123456,
      );
      assert.ok(
        replayed
          .getViewport()
          .map((cell) => String.fromCodePoint(cell.codepoint || 32))
          .join("")
          .includes("preserved"),
      );
      assert.equal(terminalEngine("ghostty", palette), "ghostty-web");
      assert.equal(
        terminalEngine("ghostty", { ...palette, foreground: "#000000" }),
        "xterm.js",
      );
      assert.equal(
        terminalEngine("ghostty", { ...palette, background: "#000000" }),
        "xterm.js",
      );
    } finally {
      replayed.free();
    }
  } finally {
    terminal.free();
  }
});
