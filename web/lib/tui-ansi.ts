import { integrationTheme } from "./integration-theme";
import { rgb, type Appearance, type Theme } from "./theme";

const RST = "\x1b[0m";
const BOLD = "\x1b[1m";
const fg = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return `\x1b[38;2;${r};${g};${b}m`;
};
const bg = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return `\x1b[48;2;${r};${g};${b}m`;
};

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const visLen = (s: string) => s.replace(ANSI_RE, "").length;

function fit(s: string, width: number, fillBg?: string): string {
  const len = visLen(s);
  if (len <= width) {
    const pad = " ".repeat(width - len);
    return fillBg ? `${s}${bg(fillBg)}${pad}${RST}` : `${s}${pad}`;
  }
  let out = "";
  let vis = 0;
  let i = 0;
  while (i < s.length && vis < width) {
    if (s[i] === "\x1b") {
      const m = s.slice(i).match(/^\x1b\[[0-9;]*m/);
      if (m) {
        out += m[0];
        i += m[0].length;
        continue;
      }
    }
    out += s[i++];
    vis++;
  }
  return out + RST;
}

function boxTop(
  borderColor: string,
  title: string,
  right: string,
  width: number,
  rounded = false,
): string {
  const tl = rounded ? "╭" : "┌";
  const tr = rounded ? "╮" : "┐";
  const left = `${fg(borderColor)}${tl}─${RST}${title}`;
  const tail = right ? `${right}${fg(borderColor)}─${tr}${RST}` : `${fg(borderColor)}${tr}${RST}`;
  const fill = Math.max(0, width - visLen(left) - visLen(tail));
  return `${left}${fg(borderColor)}${"─".repeat(fill)}${RST}${tail}`;
}

function boxRow(
  borderColor: string,
  content: string,
  width: number,
  rowBg?: string,
): string {
  const inner = Math.max(1, width - 2);
  const body = fit(content, inner, rowBg);
  return `${fg(borderColor)}│${RST}${body}${fg(borderColor)}│${RST}`;
}

function boxBottom(borderColor: string, width: number, rounded = false): string {
  const bl = rounded ? "╰" : "└";
  const br = rounded ? "╯" : "┘";
  return `${fg(borderColor)}${bl}${"─".repeat(Math.max(0, width - 2))}${br}${RST}`;
}

export function tuiAnsi(
  target: string,
  theme: Theme,
  mode: Appearance,
  cols = 74,
): string {
  const W = Math.max(50, Math.min(96, cols - 1));
  const r = integrationTheme(theme, mode, target).roles;
  const S = r.surface;
  const F = r.foreground;
  const M = r.muted;
  const A = r.accent;
  const AF = r.accentFill;
  const AFG = r.accentForeground;
  const SEL = r.selection;
  const SELFG = r.selectionForeground;
  const BRD = r.border;
  const OK = r.success;
  const WARN = r.warning;
  const ERR = r.error;
  const INFO = r.info;
  const C1 = r.chart1;
  const C2 = r.chart2;
  const C3 = r.chart3;

  if (target === "btop") {
    const leftW = Math.floor((W - 1) / 2);
    const rightW = W - 1 - leftW;
    const spark = `${fg(C1)}⣀⣤⣶${fg(C2)}⣿⣷⣤${fg(ERR)}⣿⣿⣷${fg(C2)}⣶⣤${fg(C1)}⣀⣤⣶${fg(C2)}⣿⣿${fg(C1)}⣤⣀`;
    const spark2 = `${fg(C1)}⣿⣿⣿⣿${fg(C2)}⣿⣿⣿${fg(ERR)}⣿⣿⣿${fg(C2)}⣿⣿${fg(C1)}⣿⣿⣿⣿${fg(C2)}⣿⣿${fg(C1)}⣿⣿`;
    return [
      boxTop(A, `${fg(A)}${BOLD}¹ cpu${RST}`, `${fg(F)} 38% ${fg(WARN)}54°C `, W),
      boxRow(
        A,
        ` ${spark}  ${fg(M)}C0 ${fg(C1)}█████${fg(S)}░░░░░ ${fg(F)}44%  ${fg(M)}Load ${fg(F)}1.42`,
        W,
      ),
      boxRow(
        A,
        ` ${spark2}  ${fg(M)}C1 ${fg(C2)}███████${fg(S)}░░░ ${fg(F)}68%  ${fg(M)}Up   ${fg(F)}6d 14h`,
        W,
      ),
      boxBottom(A, W),
      `${boxTop(OK, `${fg(OK)}${BOLD}² mem${RST}`, `${fg(M)} 32 GiB `, leftW)} ${boxTop(ERR, `${fg(ERR)}${BOLD}³ net${RST}`, `${fg(M)} eth0 `, rightW)}`,
      `${boxRow(OK, ` ${fg(M)}Used ${fg(C3)}██████${fg(S)}░░░░░░ ${fg(F)}12.4G`, leftW)} ${boxRow(ERR, ` ${fg(INFO)}▼ 42.8 Mbps ${fg(C1)}⣀▄▆█▇▅▃`, rightW)}`,
      `${boxRow(OK, ` ${fg(M)}Free ${fg(OK)}████████${fg(S)}░░░░ ${fg(F)}19.6G`, leftW)} ${boxRow(ERR, ` ${fg(OK)}▲  9.4 Mbps ${fg(WARN)}⣀▂▃▄▃▂▁`, rightW)}`,
      `${boxBottom(OK, leftW)} ${boxBottom(ERR, rightW)}`,
      boxTop(INFO, `${fg(INFO)}${BOLD}⁴ proc${RST}`, `${fg(M)} filter: / `, W),
      boxRow(INFO, ` ${fg(M)}PID    Program             Thr    Mem%     CPU%`, W),
      boxRow(
        INFO,
        `${bg(SEL)}${fg(SELFG)}${BOLD} 4102   themespace-web       12    1.8%    14.2%`,
        W,
        SEL,
      ),
      boxRow(INFO, ` ${fg(F)}3891   ghostty               8    0.9%     4.8%`, W),
      boxRow(INFO, ` ${fg(F)}2910   rust-analyzer        16    5.1%    21.6%`, W),
      boxRow(INFO, ` ${fg(M)}1420   waybar                3    0.2%     0.7%`, W),
      boxBottom(INFO, W),
    ].join("\r\n");
  }

  if (target === "lazygit") {
    const leftW = Math.min(30, Math.floor(W * 0.42));
    const rightW = W - 1 - leftW;
    return [
      `${boxTop(A, `${fg(A)}${BOLD}[2] Files${RST}`, "", leftW)} ${boxTop(BRD, `${fg(F)}Patch: exporters.ts`, "", rightW)}`,
      `${boxRow(A, `${bg(SEL)}${fg(ERR)} M ${fg(SELFG)}${BOLD}web/lib/exporters.ts`, leftW, SEL)} ${boxRow(BRD, ` ${fg(INFO)}@@ -680,4 +680,6 @@ gitcomet`, rightW)}`,
      `${boxRow(A, ` ${fg(OK)}A ${fg(F)}web/lib/color-tools.ts`, leftW)} ${boxRow(BRD, ` ${fg(M)}  schema_version: 2,`, rightW)}`,
      `${boxRow(A, ` ${fg(ERR)}M ${fg(F)}extension/background.ts`, leftW)} ${boxRow(BRD, ` ${fg(ERR)}- colors: { bg: c.background }`, rightW)}`,
      `${boxRow(A, ` ${fg(WARN)}? ${fg(F)}web/tests/importers.ts`, leftW)} ${boxRow(BRD, ` ${fg(OK)}+ colors: { surface: { canvas } }`, rightW)}`,
      `${boxBottom(A, leftW)} ${boxRow(BRD, ` ${fg(OK)}+ radii: { panel, pill, row }`, rightW)}`,
      `${boxTop(BRD, `${fg(F)}[3] Branches`, "", leftW)} ${boxRow(BRD, ` ${fg(F)}  themes: modes.map(entryFor)`, rightW)}`,
      `${boxRow(BRD, ` ${fg(OK)}* main ${fg(M)}↑2`, leftW)} ${boxRow(BRD, ` `, rightW)}`,
      `${boxRow(BRD, ` ${fg(F)}  feat/real-tui ${fg(M)}12m`, leftW)} ${boxRow(BRD, ` ${bg(AF)}${fg(AFG)} cherry-pick ${RST} ${fg(M)}ready`, rightW)}`,
      `${boxRow(BRD, ` ${fg(M)}  release/v0.2`, leftW)} ${boxRow(BRD, ` ${fg(M)}Author: ${fg(r.chart5)}${theme.author}`, rightW)}`,
      `${boxBottom(BRD, leftW)} ${boxBottom(BRD, rightW)}`,
      fit(
        `${fg(A)}space${fg(M)}:stage  ${fg(A)}c${fg(M)}:commit  ${fg(A)}P${fg(M)}:push  ${fg(A)}/${fg(M)}:search  ${fg(A)}?${fg(M)}:help`,
        W,
      ),
    ].join("\r\n");
  }

  if (target === "starship") {
    return [
      fit(`${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(WARN)}[+4 ~2]${RST} ${fg(INFO)}via ⬢ v22.14${RST}`, W),
      fit(`${fg(A)}${BOLD}❯${RST} ${fg(F)}npm test && npm run build${RST}`, W),
      fit(`${fg(OK)}✓${RST} ${fg(F)}50 tests passed · 47 exporters (${theme.name} ${mode})${RST}`, W),
      ``,
      fit(`${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(ERR)}${BOLD}✘ 1${RST}`, W),
      fit(`${fg(ERR)}${BOLD}❯${RST} ${fg(F)}git push --force origin main${RST}`, W),
      fit(`${fg(ERR)}! [rejected]${RST} ${fg(M)}main -> main (protected branch)${RST}`, W),
      ``,
      fit(`${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(INFO)}took 2s${RST}`, W),
      fit(`${fg(A)}${BOLD}❯${RST} ${bg(AF)}${fg(AFG)} ${RST}`, W),
    ].join("\r\n");
  }

  if (target === "zellij") {
    const leftW = Math.floor((W - 1) / 2);
    const rightW = W - 1 - leftW;
    const topBar = fit(
      `${bg(S)}${fg(F)} Zellij ${RST}${bg(AF)}${fg(AFG)}${BOLD} Tab #1 ${RST}${bg(S)}${fg(M)} Tab #2  Tab #3`,
      W,
      S,
    );
    const botBar = fit(
      `${bg(AF)}${fg(AFG)}${BOLD} NORMAL ${RST}${bg(S)}${fg(F)}  ^p Pane  ^t Tab  ^n Resize  ^s Search`,
      W,
      S,
    );
    return [
      topBar,
      `${boxTop(A, `${fg(A)}${BOLD} nvim `, "", leftW, true)} ${boxTop(BRD, `${fg(M)} dev server `, "", rightW, true)}`,
      `${boxRow(A, ` ${fg(A)}export const ${fg(F)}theme = {`, leftW)} ${boxRow(BRD, ` ${fg(OK)}✓ ${fg(F)}ready in 210ms`, rightW)}`,
      `${boxRow(A, `   ${fg(F)}name: ${fg(WARN)}"${theme.name.slice(0, 14)}"${fg(F)},`, leftW)} ${boxRow(BRD, ` ${fg(INFO)}➜ ${fg(F)}http://127.0.0.1:5173`, rightW)}`,
      `${boxRow(A, `${bg(SEL)}${fg(SELFG)}   mode: "${mode}",`, leftW, SEL)} ${boxRow(BRD, ` ${fg(OK)}200 ${fg(M)}GET /api/themes 4ms`, rightW)}`,
      `${boxRow(A, ` ${fg(F)}};`, leftW)} ${boxRow(BRD, ` ${fg(ERR)}ERR ${fg(M)}exit code 1`, rightW)}`,
      `${boxRow(A, ` ${fg(M)}~`, leftW)} ${boxRow(BRD, ` `, rightW)}`,
      `${boxBottom(A, leftW, true)} ${boxBottom(BRD, rightW, true)}`,
      botBar,
    ].join("\r\n");
  }

  // tmux
  const leftW = Math.floor(W / 2);
  const rightW = W - leftW;
  const statusLeft = `${bg(AF)}${fg(AFG)}${BOLD} main ${RST}${bg(S)}${fg(F)} ${bg(AF)}${fg(AFG)}${BOLD} 1:code* ${RST}${bg(S)}${fg(M)} 2:server  3:git`;
  const statusRight = `${bg(S)}${fg(M)}14:20 ${fg(OK)}● ${fg(F)}host ${RST}`;
  const gap = Math.max(1, W - visLen(statusLeft) - visLen(statusRight));
  const statusLine = `${statusLeft}${bg(S)}${" ".repeat(gap)}${RST}${statusRight}`;
  return [
    `${boxTop(A, `${fg(A)} 0: nvim `, "", leftW)}${boxTop(BRD, `${fg(M)} 1: server `, "", rightW)}`,
    `${boxRow(A, ` ${fg(M)}1 ${fg(A)}export const ${fg(F)}palette = {`, leftW)}${boxRow(BRD, ` ${fg(OK)}● ${fg(F)}listening on :5173`, rightW)}`,
    `${boxRow(A, `${bg(SEL)}${fg(SELFG)} 2 -- COPY MODE --`, leftW, SEL)}${boxRow(BRD, ` ${fg(INFO)}GET ${fg(F)}/integrations 200`, rightW)}`,
    `${boxRow(A, ` ${fg(M)}3   ${fg(F)}mode: ${fg(WARN)}"${mode}"`, leftW)}${boxRow(BRD, ` ${fg(M)}47 exporters ready`, rightW)}`,
    `${boxRow(A, ` ${fg(M)}4 ${fg(F)}};`, leftW)}${boxRow(BRD, ` `, rightW)}`,
    `${boxRow(A, ` ${fg(M)}~`, leftW)}${boxRow(BRD, ` `, rightW)}`,
    `${boxBottom(A, leftW)}${boxBottom(BRD, rightW)}`,
    statusLine,
  ].join("\r\n");
}
