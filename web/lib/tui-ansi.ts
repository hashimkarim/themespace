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

export function tuiAnsi(target: string, theme: Theme, mode: Appearance): string {
  const r = integrationTheme(theme, mode, target).roles;
  const B = r.background;
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
    return [
      `${fg(A)}┌─${BOLD}¹ cpu${RST}${fg(A)}─────────────────────────────────────────────────────────── 38% 54°C ─┐${RST}`,
      `${fg(A)}│${RST} ${fg(C1)}⣀⣤⣶${fg(C2)}⣿⣷⣤${fg(ERR)}⣿⣿⣷${fg(C2)}⣶⣤${fg(C1)}⣀⣤⣶${fg(C2)}⣿⣿${fg(C1)}⣤⣀  ${fg(M)}C0 ${fg(C1)}█████${fg(S)}░░░░░ ${fg(F)}44%   ${fg(M)}Load  ${fg(F)}1.42 1.18 0.96 ${fg(A)}│${RST}`,
      `${fg(A)}│${RST} ${fg(C1)}⣿⣿⣿⣿${fg(C2)}⣿⣿⣿${fg(ERR)}⣿⣿⣿${fg(C2)}⣿⣿${fg(C1)}⣿⣿⣿⣿${fg(C2)}⣿⣿${fg(C1)}⣿⣿  ${fg(M)}C1 ${fg(C2)}███████${fg(S)}░░░ ${fg(F)}68%   ${fg(M)}Up    ${fg(F)}6d 14:22:08    ${fg(A)}│${RST}`,
      `${fg(A)}└────────────────────────────────────────────────────────────────────────────┘${RST}`,
      `${fg(OK)}┌─${BOLD}² mem${RST}${fg(OK)}──────────────────────────────┐${RST} ${fg(ERR)}┌─${BOLD}³ net${RST}${fg(ERR)}───────────────────────────────┐${RST}`,
      `${fg(OK)}│${RST} ${fg(M)}Used ${fg(C3)}████████${fg(S)}░░░░░░░░░░ ${fg(F)}12.4 GiB   ${fg(OK)}│${RST} ${fg(ERR)}│${RST} ${fg(INFO)}▼ DL 42.8 Mbps  ${fg(C1)}⣀▄▆█▇▅▃▂          ${fg(ERR)}│${RST}`,
      `${fg(OK)}│${RST} ${fg(M)}Free ${fg(OK)}███████████${fg(S)}░░░░░░░ ${fg(F)}19.6 GiB   ${fg(OK)}│${RST} ${fg(ERR)}│${RST} ${fg(OK)}▲ UL  9.4 Mbps  ${fg(WARN)}⣀▂▃▄▃▂▁           ${fg(ERR)}│${RST}`,
      `${fg(OK)}└────────────────────────────────────┘${RST} ${fg(ERR)}└─────────────────────────────────────┘${RST}`,
      `${fg(INFO)}┌─${BOLD}⁴ proc${RST}${fg(INFO)}──────────────────────────────────────────────────────── filter: / ─┐${RST}`,
      `${fg(INFO)}│${RST} ${fg(M)}PID    Program                 Threads     Mem%      CPU%                  ${fg(INFO)}│${RST}`,
      `${fg(INFO)}│${RST}${bg(SEL)}${fg(SELFG)}${BOLD} 4102   themespace-web               12      1.8%     14.2%                 ${RST}${fg(INFO)}│${RST}`,
      `${fg(INFO)}│${RST} ${fg(F)}3891   ghostty                       8      0.9%      4.8%                 ${fg(INFO)}│${RST}`,
      `${fg(INFO)}│${RST} ${fg(F)}2910   rust-analyzer                16      5.1%     21.6%                 ${fg(INFO)}│${RST}`,
      `${fg(INFO)}│${RST} ${fg(M)}1420   waybar                        3      0.2%      0.7%                 ${fg(INFO)}│${RST}`,
      `${fg(INFO)}└────────────────────────────────────────────────────────────────────────────┘${RST}`,
    ].join("\r\n");
  }

  if (target === "lazygit") {
    return [
      `${fg(A)}${BOLD}┌─[2] Files ───────────────────────┐${RST} ${fg(BRD)}┌─ Diff: web/lib/exporters.ts ──────────┐${RST}`,
      `${fg(A)}│${RST}${bg(SEL)}${fg(SELFG)}${BOLD} ${fg(ERR)}M${fg(SELFG)} web/lib/exporters.ts           ${RST}${fg(A)}│${RST} ${fg(BRD)}│${RST} ${fg(INFO)}@@ -680,4 +680,6 @@ case "gitcomet":    ${fg(BRD)}│${RST}`,
      `${fg(A)}│${RST} ${fg(OK)}A${fg(F)} web/lib/color-tools.ts         ${fg(A)}│${RST} ${fg(BRD)}│${RST} ${fg(M)}   schema_version: 2,                   ${fg(BRD)}│${RST}`,
      `${fg(A)}│${RST} ${fg(ERR)}M${fg(F)} extension/src/background.ts    ${fg(A)}│${RST} ${fg(BRD)}│${RST} ${fg(ERR)}-  colors: { background: c.background } ${fg(BRD)}│${RST}`,
      `${fg(A)}│${RST} ${fg(WARN)}?${fg(F)} web/tests/importers.test.ts    ${fg(A)}│${RST} ${fg(BRD)}│${RST} ${fg(OK)}+  colors: { surface: { canvas } }      ${fg(BRD)}│${RST}`,
      `${fg(A)}└──────────────────────────────────┘${RST} ${fg(BRD)}│${RST} ${fg(OK)}+  radii: { panel, pill, row }          ${fg(BRD)}│${RST}`,
      `${fg(BRD)}┌─[3] Local Branches ──────────────┐${RST} ${fg(BRD)}│${RST} ${fg(F)}   themes: modes.map(entryFor)          ${fg(BRD)}│${RST}`,
      `${fg(BRD)}│${RST} ${fg(OK)}* main${fg(M)}      ↑2  ${theme.name.slice(0, 14).padEnd(14)} ${fg(BRD)}│${RST} ${fg(BRD)}│${RST}                                         ${fg(BRD)}│${RST}`,
      `${fg(BRD)}│${RST} ${fg(F)}  feat/tui  ${fg(M)}12m ago            ${fg(BRD)}│${RST} ${fg(BRD)}│${RST} ${bg(AF)}${fg(AFG)} cherry-pick ${RST} ${fg(M)}commit ready              ${fg(BRD)}│${RST}`,
      `${fg(BRD)}└──────────────────────────────────┘${RST} ${fg(BRD)}└───────────────────────────────────────┘${RST}`,
      `${fg(A)}space${fg(M)}: stage  ${fg(A)}c${fg(M)}: commit  ${fg(A)}P${fg(M)}: push  ${fg(A)}/${fg(M)}: search  ${fg(A)}?${fg(M)}: keybindings${RST}`,
    ].join("\r\n");
  }

  if (target === "starship") {
    return [
      `${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(WARN)}[+4 ~2]${RST} ${fg(INFO)}via ⬢ v22.14${RST}`,
      `${fg(A)}${BOLD}❯${RST} ${fg(F)}npm test && npm run build${RST}`,
      `${fg(OK)}✓${RST} ${fg(F)}47 exporters validated · ${theme.name} (${mode})${RST}`,
      ``,
      `${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST} ${fg(ERR)}${BOLD}✘ 1${RST}`,
      `${fg(ERR)}${BOLD}❯${RST} ${fg(F)}git push --force${RST}`,
      `${fg(M)}hint: Starship palette colors read directly from [palettes.*] in your TOML.${RST}`,
      ``,
      `${fg(A)}${BOLD}~/git/themespace${RST} ${fg(M)}on${RST} ${fg(OK)}${BOLD}⎇ main${RST}`,
      `${fg(A)}${BOLD}❯${RST} ${bg(AF)}${fg(AFG)} ${RST}`,
    ].join("\r\n");
  }

  if (target === "zellij") {
    return [
      `${bg(S)}${fg(F)} Zellij ${RST}${bg(AF)}${fg(AFG)}${BOLD} Tab #1 ${RST}${bg(S)}${fg(M)} Tab #2  Tab #3 ${" ".repeat(44)}${RST}`,
      `${fg(A)}╭─ nvim ──────────────────────────────╮${RST} ${fg(BRD)}╭─ dev server ───────────────────────╮${RST}`,
      `${fg(A)}│${RST} ${fg(A)}export const${fg(F)} theme = {              ${fg(A)}│${RST} ${fg(BRD)}│${RST} ${fg(OK)}✓${fg(F)} ready in 210ms                   ${fg(BRD)}│${RST}`,
      `${fg(A)}│${RST}   ${fg(F)}name: ${fg(WARN)}"${theme.name.slice(0, 18)}"${fg(F)},`.padEnd(65) + `${fg(A)}│${RST} ${fg(BRD)}│${RST} ${fg(INFO)}➜${fg(F)} http://127.0.0.1:5173/           ${fg(BRD)}│${RST}`,
      `${fg(A)}│${RST} ${bg(SEL)}${fg(SELFG)}  mode: "${mode}",  // selected     ${RST} ${fg(A)}│${RST} ${fg(BRD)}│${RST} ${fg(OK)}200${fg(M)} GET /api/themes 4ms            ${fg(BRD)}│${RST}`,
      `${fg(A)}│${RST} ${fg(F)}};                                  ${fg(A)}│${RST} ${fg(BRD)}│${RST} ${fg(ERR)}ERR${fg(M)} exit_code_error preview        ${fg(BRD)}│${RST}`,
      `${fg(A)}╰─────────────────────────────────────╯${RST} ${fg(BRD)}╰────────────────────────────────────╯${RST}`,
      `${bg(AF)}${fg(AFG)}${BOLD} NORMAL ${RST}${bg(S)}${fg(F)}  ^p Pane  ^t Tab  ^n Resize  ^s Search  ^q Quit ${" ".repeat(22)}${RST}`,
    ].join("\r\n");
  }

  // tmux
  return [
    `${fg(A)}┌─ pane 0: nvim ──────────────────────┐${RST}${fg(BRD)}┌─ pane 1: server ────────────────────┐${RST}`,
    `${fg(A)}│${RST} ${fg(M)}1 ${fg(A)}export const${fg(F)} name = "${theme.name.slice(0, 10)}";`.padEnd(60) + `${fg(A)}│${RST}${fg(BRD)}│${RST} ${fg(OK)}●${fg(F)} listening on :5173                 ${fg(BRD)}│${RST}`,
    `${fg(A)}│${RST} ${fg(M)}2 ${bg(SEL)}${fg(SELFG)} -- COPY MODE (mode-style) --   ${RST} ${fg(A)}│${RST}${fg(BRD)}│${RST} ${fg(INFO)}GET${fg(F)} /integrations 200 (8ms)          ${fg(BRD)}│${RST}`,
    `${fg(A)}│${RST} ${fg(M)}3 ${fg(F)}return resolve(theme, "${mode}");`.padEnd(57) + `${fg(A)}│${RST}${fg(BRD)}│${RST} ${fg(M)}watching 47 integration targets…     ${fg(BRD)}│${RST}`,
    `${fg(A)}│${RST} ${fg(M)}~                                   ${fg(A)}│${RST}${fg(BRD)}│${RST} ${fg(M)}                                     ${fg(BRD)}│${RST}`,
    `${fg(A)}└─────────────────────────────────────┘${RST}${fg(BRD)}└─────────────────────────────────────┘${RST}`,
    `${bg(S)}${fg(F)} ${bg(AF)}${fg(AFG)}${BOLD} main ${RST}${bg(S)}${fg(F)} ${bg(AF)}${fg(AFG)}${BOLD} 1:code* ${RST}${bg(S)}${fg(M)} 2:server  3:git${" ".repeat(25)}${fg(M)}14:20 ${fg(OK)}● ${fg(F)}host ${RST}`,
    `${bg(B)}${RST}`,
  ].join("\r\n");
}
