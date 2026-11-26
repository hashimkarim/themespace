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
  const maxInner = Math.max(0, width - 3);
  const useRight =
    right && visLen(title) + visLen(right) + 1 <= maxInner ? right : "";
  const titleBudget = Math.max(0, maxInner - (useRight ? visLen(useRight) + 1 : 0));
  const safeTitle =
    visLen(title) > titleBudget ? fit(title, titleBudget) : title;
  const left = `${fg(borderColor)}${tl}─${RST}${safeTitle}`;
  const tail = useRight
    ? `${useRight}${fg(borderColor)}─${tr}${RST}`
    : `${fg(borderColor)}${tr}${RST}`;
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

function boxBottom(
  borderColor: string,
  width: number,
  rounded = false,
): string {
  const bl = rounded ? "╰" : "└";
  const br = rounded ? "╯" : "┘";
  return `${fg(borderColor)}${bl}${"─".repeat(Math.max(0, width - 2))}${br}${RST}`;
}

function meter(
  filled: number,
  total: number,
  fillColor: string,
  trackColor: string,
): string {
  const f = Math.max(0, Math.min(total, filled));
  return `${fg(fillColor)}${"█".repeat(f)}${fg(trackColor)}${"░".repeat(total - f)}${RST}`;
}

export function tuiAnsi(
  target: string,
  theme: Theme,
  mode: Appearance,
  cols = 80,
  rows = 20,
): string {
  const W = Math.max(50, Math.min(110, cols - 1));
  const H = Math.max(10, Math.min(30, rows));
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
    const g1 = `${fg(C1)}⠀⠀⠀⠀⣀⣤${fg(C2)}⣶⣿⣿${fg(ERR)}⣿⣷⣤${fg(C2)}⠀⠀⠀${fg(C1)}⠀⣀⣤${fg(C2)}⣶⣿${fg(C1)}⣤⠀`;
    const g2 = `${fg(C1)}⠀⣀⣤⣶⣿⣿${fg(C2)}⣿⣿⣿${fg(ERR)}⣿⣿⣿${fg(C2)}⣶⣤⣀${fg(C1)}⣶⣿⣿${fg(C2)}⣿⣿${fg(C1)}⣿⣶`;
    const g3 = `${fg(C1)}⣿⣿⣿⣿⣿⣿${fg(C2)}⣿⣿⣿${fg(ERR)}⣿⣿⣿${fg(C2)}⣿⣿⣿${fg(C1)}⣿⣿⣿${fg(C2)}⣿⣿${fg(C1)}⣿⣿`;
    const procs = [
      { pid: "4102", name: "themespace-web", cmd: "next-server --port 3000", thr: "12", mem: "342M", cpu: "14.2%", sel: true },
      { pid: "3891", name: "ghostty", cmd: "ghostty --gtk-single", thr: " 8", mem: "184M", cpu: " 4.8%", sel: false },
      { pid: "2910", name: "rust-analyzer", cmd: "rust-analyzer --stdio", thr: "16", mem: "1.2G", cpu: "21.6%", sel: false },
      { pid: "2488", name: "chromium", cmd: "--type=renderer --site", thr: "24", mem: "890M", cpu: " 7.4%", sel: false },
      { pid: "1420", name: "waybar", cmd: "waybar -c config.jsonc", thr: " 3", mem: " 48M", cpu: " 0.7%", sel: false },
      { pid: "1108", name: "hyprland", cmd: "Hyprland --config", thr: " 6", mem: "162M", cpu: " 2.1%", sel: false },
      { pid: " 944", name: "pipewire", cmd: "/usr/bin/pipewire", thr: " 4", mem: " 22M", cpu: " 0.4%", sel: false },
      { pid: " 612", name: "systemd-journal", cmd: "systemd-journald", thr: " 1", mem: " 64M", cpu: " 0.1%", sel: false },
    ];
    const cpuBodyRows = H >= 17 ? 4 : H >= 14 ? 3 : 2;
    const memBodyRows = H >= 16 ? 3 : 2;
    const fixedRows = (cpuBodyRows + 2) + (memBodyRows + 2) + 3;
    const procCount = Math.max(1, Math.min(procs.length, H - fixedRows));
    const cpuLines = [
      boxTop(A, `${fg(A)}${BOLD}¹ cpu${RST}${fg(M)} 14:20:08${RST}`, `${fg(F)} 38% ${fg(WARN)}54°C `, W),
      boxRow(A, ` ${g1}  ${fg(M)}C0 ${meter(5, 10, C1, S)} ${fg(F)}44%  ${fg(M)}Load ${fg(F)}1.42`, W),
      boxRow(A, ` ${g2}  ${fg(M)}C1 ${meter(7, 10, C2, S)} ${fg(F)}68%  ${fg(M)}Temp ${fg(WARN)}54°C`, W),
      ...(cpuBodyRows >= 3 ? [boxRow(A, ` ${g3}  ${fg(M)}C2 ${meter(4, 10, OK, S)} ${fg(F)}36%  ${fg(M)}Freq ${fg(F)}4.2G`, W)] : []),
      ...(cpuBodyRows >= 4 ? [boxRow(A, ` ${fg(M)}user ${fg(C1)}24.1%  ${fg(M)}sys ${fg(C2)}8.4%  ${fg(M)}iowait ${fg(WARN)}1.2%  ${fg(M)}idle ${fg(OK)}66.3%  ${fg(M)}up ${fg(F)}6d 14h`, W)] : []),
      boxBottom(A, W),
    ];
    const memNetLines = [
      `${boxTop(OK, `${fg(OK)}${BOLD}² mem${RST}`, `${fg(M)} 32.0 GiB `, leftW)} ${boxTop(ERR, `${fg(ERR)}${BOLD}³ net${RST}`, `${fg(M)} eth0 1Gbps `, rightW)}`,
      `${boxRow(OK, ` ${fg(M)}Used  ${meter(6, 12, C3, S)} ${fg(F)}12.4G`, leftW)} ${boxRow(ERR, ` ${fg(INFO)}▼ 42.8 Mbps ${fg(C1)}⣀▄▆█▇▅▃▂▁`, rightW)}`,
      `${boxRow(OK, ` ${fg(M)}Avail ${meter(8, 12, OK, S)} ${fg(F)}19.6G`, leftW)} ${boxRow(ERR, ` ${fg(OK)}▲  9.4 Mbps ${fg(WARN)}⣀▂▃▄▃▂▁⣀`, rightW)}`,
      ...(memBodyRows >= 3 ? [`${boxRow(OK, ` ${fg(M)}Disk/ ${meter(5, 12, A, S)} ${fg(F)}248G`, leftW)} ${boxRow(ERR, ` ${fg(M)}Tot ▼ ${fg(F)}18.4G  ${fg(M)}▲ ${fg(F)}4.1G`, rightW)}`] : []),
      `${boxBottom(OK, leftW)} ${boxBottom(ERR, rightW)}`,
    ];
    const lines = [
      ...cpuLines,
      ...memNetLines,
      boxTop(INFO, `${fg(INFO)}${BOLD}⁴ proc${RST}`, `${fg(M)} filter: / · tree: e · sort: cpu `, W),
      boxRow(INFO, ` ${fg(M)}Pid    Program          Command                  Thr   Mem    Cpu%`, W),
    ];
    for (let i = 0; i < procCount; i++) {
      const p = procs[i];
      const nameCol = p.name.padEnd(16);
      const cmdCol = p.cmd.slice(0, 22).padEnd(23);
      if (p.sel) {
        lines.push(
          boxRow(
            INFO,
            `${bg(SEL)}${fg(SELFG)}${BOLD} ${p.pid}   ${nameCol} ${cmdCol}  ${p.thr}  ${p.mem}  ${p.cpu}`,
            W,
            SEL,
          ),
        );
      } else {
        const cpuColor = parseFloat(p.cpu) > 15 ? WARN : F;
        lines.push(
          boxRow(
            INFO,
            ` ${fg(M)}${p.pid}   ${fg(F)}${nameCol} ${fg(M)}${cmdCol}  ${fg(M)}${p.thr}  ${fg(INFO)}${p.mem}  ${fg(cpuColor)}${p.cpu}`,
            W,
          ),
        );
      }
    }
    lines.push(boxBottom(INFO, W));
    return lines.join("\r\n");
  }

  if (target === "lazygit") {
    const leftW = Math.min(32, Math.floor(W * 0.4));
    const rightW = W - 1 - leftW;
    const leftLines: string[] = [
      boxTop(BRD, `${fg(M)}[1] Status`, "", leftW),
      boxRow(BRD, ` ${fg(OK)}✓ ${fg(F)}themespace ${fg(A)}→ main ${fg(M)}↑2`, leftW),
      boxBottom(BRD, leftW),
      boxTop(A, `${fg(A)}${BOLD}[2] Files`, `${fg(M)} 5 `, leftW),
      boxRow(A, `${bg(SEL)}${fg(ERR)} M ${fg(SELFG)}${BOLD}web/lib/exporters.ts`, leftW, SEL),
      boxRow(A, ` ${fg(OK)}A ${fg(F)}web/lib/color-tools.ts`, leftW),
      boxRow(A, ` ${fg(ERR)}M ${fg(F)}web/lib/tui-ansi.ts`, leftW),
      boxRow(A, ` ${fg(ERR)}M ${fg(F)}extension/background.ts`, leftW),
      boxRow(A, ` ${fg(WARN)}? ${fg(M)}web/tests/importers.ts`, leftW),
      boxBottom(A, leftW),
      boxTop(BRD, `${fg(F)}[3] Branches`, "", leftW),
      boxRow(BRD, ` ${fg(OK)}* main ${fg(M)}↑2`, leftW),
      boxRow(BRD, ` ${fg(F)}  feat/previews ${fg(M)}12m`, leftW),
      boxRow(BRD, ` ${fg(M)}  release/v0.2`, leftW),
      boxBottom(BRD, leftW),
      ...(H >= 20
        ? [
            boxTop(BRD, `${fg(F)}[4] Commits`, "", leftW),
            boxRow(BRD, ` ${fg(WARN)}64b0589 ${fg(F)}Real upstream specs`, leftW),
            boxRow(BRD, ` ${fg(WARN)}4df4d4a ${fg(M)}Studio contrast fix`, leftW),
            boxBottom(BRD, leftW),
          ]
        : []),
    ];
    const diffBody: string[] = [
      ` ${fg(M)}diff --git a/web/lib/exporters.ts b/web/lib/exporters.ts`,
      ` ${fg(M)}index 8a31f0c..64b0589 100644`,
      ` ${fg(INFO)}@@ -680,10 +680,14 @@ export function gitcometTheme(`,
      ` ${fg(F)}   schema_version: 2,`,
      ` ${fg(F)}   name: ${fg(WARN)}"${theme.name.slice(0, 18)}"${fg(F)},`,
      ` ${fg(ERR)}-  colors: { bg: c.background, fg: c.foreground },`,
      ` ${fg(ERR)}-  graph: [c.accent, c.success, c.warning],`,
      ` ${fg(OK)}+  colors: {`,
      ` ${fg(OK)}+    surface: { canvas: rgba(c.background), panel: rgba(c.surface) },`,
      ` ${fg(OK)}+    text: { primary: rgba(c.foreground), muted: rgba(c.muted) },`,
      ` ${fg(OK)}+    diff: { added: rgba(c.success), removed: rgba(c.error) },`,
      ` ${fg(OK)}+  },`,
      ` ${fg(OK)}+  radii: { panel: 10, pill: 999, row: 7 },`,
      ` ${fg(F)}   themes: modes.map((mode) => buildEntry(theme, mode)),`,
      ` `,
      ` ${bg(AF)}${fg(AFG)}${BOLD} STAGED ${RST} ${fg(M)}1 of 5 files · ${fg(OK)}+64 ${fg(ERR)}-12`,
      ` ${fg(M)}Author: ${fg(r.chart5)}${theme.author}  ${fg(M)}Mode: ${fg(F)}${mode}`,
    ];
    const totalBoxRows = Math.min(leftLines.length, H - 1);
    const out: string[] = [];
    for (let i = 0; i < totalBoxRows; i++) {
      let rightLine: string;
      if (i === 0) {
        rightLine = boxTop(BRD, `${fg(F)}Patch: web/lib/exporters.ts`, `${fg(M)} unified `, rightW);
      } else if (i === totalBoxRows - 1) {
        rightLine = boxBottom(BRD, rightW);
      } else {
        rightLine = boxRow(BRD, diffBody[i - 1] ?? "", rightW);
      }
      out.push(`${leftLines[i]} ${rightLine}`);
    }
    out.push(
      fit(
        `${bg(S)}${fg(A)} space${fg(M)}:stage ${fg(A)}a${fg(M)}:all ${fg(A)}c${fg(M)}:commit ${fg(A)}P${fg(M)}:push ${fg(A)}p${fg(M)}:pull ${fg(A)}/${fg(M)}:filter ${fg(A)}?${fg(M)}:help`,
        W,
        S,
      ),
    );
    return out.join("\r\n");
  }

  if (target === "starship") {
    const lines = [
      fit(`${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(WARN)}[+4 ~2]${RST} ${fg(INFO)}via ⬢ v22.14.0${RST}`, W),
      fit(`${fg(A)}${BOLD}❯${RST} ${fg(F)}npm test${RST}`, W),
      fit(`${fg(OK)}✔${RST} ${fg(F)}exporters: all 47 integrations match upstream specs ${fg(M)}(38ms)${RST}`, W),
      fit(`${fg(OK)}✔${RST} ${fg(F)}importers: 11 formats round-trip cleanly ${fg(M)}(14ms)${RST}`, W),
      fit(`${fg(OK)}✔${RST} ${fg(F)}integration-theme: ${theme.name} (${mode}) verified ${fg(M)}(22ms)${RST}`, W),
      fit(`${fg(M)}ℹ tests 50 · pass 50 · fail 0 · duration 1.4s${RST}`, W),
      ``,
      fit(`${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(WARN)}[!]${RST} ${fg(INFO)}took 1s${RST}`, W),
      fit(`${fg(A)}${BOLD}❯${RST} ${fg(F)}git status -sb${RST}`, W),
      fit(`${fg(OK)}## main...origin/main${RST} ${fg(M)}[ahead 1]${RST}`, W),
      fit(` ${fg(WARN)}M${RST} ${fg(F)}web/components/integration-preview.tsx${RST}`, W),
      fit(` ${fg(OK)}A${RST} ${fg(F)}web/lib/tui-ansi.ts${RST}`, W),
      ``,
      fit(`${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(ERR)}${BOLD}✘ 1${RST}`, W),
      fit(`${fg(ERR)}${BOLD}❯${RST} ${fg(F)}git push --force origin main${RST}`, W),
      fit(`${fg(ERR)}! [rejected]${RST} ${fg(M)}main -> main (protected branch hook declined)${RST}`, W),
      ``,
      fit(`${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(INFO)}via ⬢ v22.14.0${RST}`, W),
      fit(`${fg(A)}${BOLD}❯${RST} ${fg(F)}themespace export ${theme.name.toLowerCase().replace(/\s+/g, "-")}${bg(AF)}${fg(AFG)} ${RST}`, W),
    ];
    return lines.slice(0, H).join("\r\n");
  }

  if (target === "zellij") {
    const leftW = Math.floor((W - 1) * 0.56);
    const rightW = W - 1 - leftW;
    const bodyRows = Math.max(8, H - 2);
    const topRightRows = Math.floor(bodyRows / 2);
    const botRightRows = bodyRows - topRightRows;
    const topBar = fit(
      `${bg(S)}${fg(F)}${BOLD} Zellij ${RST}${bg(S)}${fg(M)}(themespace) ${bg(AF)}${fg(AFG)}${BOLD} Tab #1 ${RST}${bg(S)}${fg(M)}  Tab #2   Tab #3`,
      W,
      S,
    );
    const botBar = fit(
      `${bg(AF)}${fg(AFG)}${BOLD} NORMAL ${RST}${bg(S)}${fg(A)} ^p${fg(M)} Pane ${fg(A)}^t${fg(M)} Tab ${fg(A)}^n${fg(M)} Resize ${fg(A)}^h${fg(M)} Move ${fg(A)}^s${fg(M)} Search ${fg(A)}^q${fg(M)} Quit`,
      W,
      S,
    );
    const codeLines = [
      ` ${fg(M)} 1 ${fg(A)}import${fg(F)} { resolve } ${fg(A)}from${fg(F)} ${fg(OK)}"./theme"${fg(F)};`,
      ` ${fg(M)} 2`,
      ` ${fg(M)} 3 ${fg(A)}export function${fg(F)} ${fg(INFO)}zellijTheme${fg(F)}(t, mode) {`,
      ` ${fg(M)} 4   ${fg(A)}const${fg(F)} c = resolve(t, mode);`,
      `${bg(SEL)}${fg(SELFG)} 5   const frame = rgb(c.accent);`,
      ` ${fg(M)} 6   ${fg(A)}return${fg(F)} {`,
      ` ${fg(M)} 7     name: ${fg(WARN)}"${theme.name.slice(0, 16)}"${fg(F)},`,
      ` ${fg(M)} 8     appearance: ${fg(WARN)}"${mode}"${fg(F)},`,
      ` ${fg(M)} 9     ribbon_selected: rgb(c.accent),`,
      ` ${fg(M)}10     frame_unselected: rgb(c.border),`,
      ` ${fg(M)}11   };`,
      ` ${fg(M)}12 }`,
    ];
    const nvimStatus = `${bg(AF)}${fg(AFG)} NORMAL ${bg(S)}${fg(F)} web/lib/exporters.ts ${fg(M)}5:24`;
    const topRightBody = [
      ` ${fg(OK)}▲${fg(F)} Next.js 16.2.4 · local`,
      ` ${fg(INFO)}➜${fg(F)} http://127.0.0.1:3000`,
      ` ${fg(OK)}✓${fg(F)} Ready in 210ms`,
      ` ${fg(OK)}200${fg(M)} GET /integrations  6ms`,
      ` ${fg(OK)}200${fg(M)} GET /api/themes   4ms`,
      ` ${fg(WARN)}304${fg(M)} GET /studio       2ms`,
      ` ${fg(ERR)}ERR${fg(M)} ECONNREFUSED retry`,
    ];
    const botRightBody = [
      ` ${fg(A)}❯${fg(F)} npm test -- --grep zellij`,
      ` ${fg(OK)}✔${fg(F)} zellij 0.40+ RGB KDL`,
      ` ${fg(OK)}✔${fg(F)} ribbon & frame colors`,
      ` ${fg(OK)}✔${fg(F)} dark + light modes`,
      ` ${fg(M)}pass 50 · fail 0 · 84ms`,
    ];
    const leftPane: string[] = [
      boxTop(A, `${fg(A)}${BOLD} nvim · web/lib/exporters.ts `, "", leftW, true),
    ];
    for (let i = 0; i < bodyRows - 2; i++) {
      if (i === bodyRows - 3) {
        leftPane.push(boxRow(A, nvimStatus, leftW, S));
      } else {
        const line = codeLines[i] ?? ` ${fg(M)}~`;
        leftPane.push(
          i === 4 ? boxRow(A, line, leftW, SEL) : boxRow(A, line, leftW),
        );
      }
    }
    leftPane.push(boxBottom(A, leftW, true));

    const rightPane: string[] = [
      boxTop(BRD, `${fg(M)} dev server `, "", rightW, true),
    ];
    for (let i = 0; i < topRightRows - 2; i++) {
      rightPane.push(boxRow(BRD, topRightBody[i] ?? "", rightW));
    }
    rightPane.push(boxBottom(BRD, rightW, true));
    rightPane.push(boxTop(BRD, `${fg(M)} test runner `, "", rightW, true));
    for (let i = 0; i < botRightRows - 2; i++) {
      rightPane.push(boxRow(BRD, botRightBody[i] ?? "", rightW));
    }
    rightPane.push(boxBottom(BRD, rightW, true));

    const out = [topBar];
    for (let i = 0; i < bodyRows; i++) {
      out.push(`${leftPane[i]} ${rightPane[i]}`);
    }
    out.push(botBar);
    return out.join("\r\n");
  }

  // tmux
  const leftW = Math.floor(W * 0.56);
  const rightW = W - leftW;
  const bodyRows = Math.max(8, H - 1);
  const topRightRows = Math.floor(bodyRows / 2);
  const botRightRows = bodyRows - topRightRows;
  const statusLeft = `${bg(AF)}${fg(AFG)}${BOLD} main ${RST}${bg(S)}${fg(F)} ${bg(AF)}${fg(AFG)}${BOLD} 0:nvim* ${RST}${bg(S)}${fg(M)} 1:server  2:git  3:logs`;
  const statusRight = `${bg(S)}${fg(M)}14:20 ${fg(OK)}● ${fg(F)}themespace ${RST}`;
  const statusLine =
    visLen(statusLeft) + visLen(statusRight) + 1 <= W
      ? `${statusLeft}${bg(S)}${" ".repeat(W - visLen(statusLeft) - visLen(statusRight))}${RST}${statusRight}`
      : fit(statusLeft, W, S);

  const nvimLines = [
    ` ${fg(M)} 1 ${fg(A)}export const${fg(F)} palette = {`,
    ` ${fg(M)} 2   name: ${fg(WARN)}"${theme.name.slice(0, 16)}"${fg(F)},`,
    ` ${fg(M)} 3   mode: ${fg(WARN)}"${mode}"${fg(F)},`,
    `${bg(SEL)}${fg(SELFG)} 4   -- COPY MODE [12/84] --`,
    ` ${fg(M)} 5   background: ${fg(OK)}"${r.background}"${fg(F)},`,
    ` ${fg(M)} 6   surface:    ${fg(OK)}"${r.surface}"${fg(F)},`,
    ` ${fg(M)} 7   accent:     ${fg(OK)}"${r.accent}"${fg(F)},`,
    ` ${fg(M)} 8   success:    ${fg(OK)}"${r.success}"${fg(F)},`,
    ` ${fg(M)} 9   warning:    ${fg(WARN)}"${r.warning}"${fg(F)},`,
    ` ${fg(M)}10   error:      ${fg(ERR)}"${r.error}"${fg(F)},`,
    ` ${fg(M)}11 };`,
    ` ${fg(M)}~`,
    ` ${fg(M)}~`,
    ` ${fg(M)}~`,
  ];
  const srvLines = [
    ` ${fg(OK)}●${fg(F)} listening on http://127.0.0.1:3000`,
    ` ${fg(INFO)}GET${fg(F)} /integrations ${fg(OK)}200${fg(M)} 9ms`,
    ` ${fg(INFO)}GET${fg(F)} /studio       ${fg(OK)}200${fg(M)} 14ms`,
    ` ${fg(INFO)}GET${fg(F)} /api/health   ${fg(OK)}200${fg(M)} 2ms`,
    ` ${fg(M)}47 exporters · 11 importers loaded`,
  ];
  const gitLines = [
    ` ${fg(A)}❯${fg(F)} git log --oneline -n 4`,
    ` ${fg(WARN)}3d8c57c${fg(F)} Real preview renderers`,
    ` ${fg(WARN)}64b0589${fg(M)} Audit upstream specs`,
    ` ${fg(WARN)}4df4d4a${fg(M)} Contrast fix + Companion`,
    ` ${fg(OK)}✓${fg(M)} working tree clean`,
  ];

  const leftPane: string[] = [
    boxTop(A, `${fg(A)}${BOLD} 0: nvim — theme.ts `, "", leftW),
  ];
  for (let i = 0; i < bodyRows - 2; i++) {
    const line = nvimLines[i] ?? ` ${fg(M)}~`;
    leftPane.push(
      i === 3 ? boxRow(A, line, leftW, SEL) : boxRow(A, line, leftW),
    );
  }
  leftPane.push(boxBottom(A, leftW));

  const rightPane: string[] = [
    boxTop(BRD, `${fg(M)} 1: server `, "", rightW),
  ];
  for (let i = 0; i < topRightRows - 2; i++) {
    rightPane.push(boxRow(BRD, srvLines[i] ?? "", rightW));
  }
  rightPane.push(boxBottom(BRD, rightW));
  rightPane.push(boxTop(BRD, `${fg(M)} 2: git `, "", rightW));
  for (let i = 0; i < botRightRows - 2; i++) {
    rightPane.push(boxRow(BRD, gitLines[i] ?? "", rightW));
  }
  rightPane.push(boxBottom(BRD, rightW));

  const out: string[] = [];
  for (let i = 0; i < bodyRows; i++) {
    out.push(`${leftPane[i]}${rightPane[i]}`);
  }
  out.push(statusLine);
  return out.join("\r\n");
}
