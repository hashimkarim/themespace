# Component and integration preview coverage

The gallery contains 54 reusable examples. `web/lib/component-fixtures.ts` is
the common source for the in-app gallery and exported `components.html`. The
fixture uses generated tokens and runs demonstration interactions locally; it
does not call application services or execute terminal commands.

## shadcn/ui

`/components?library=shadcn` opens a separate gallery of **actual shadcn/ui React
components**, also available under Studio → Components → shadcn/ui and every
shadcn integration preview (including the export dialog). These are not the
generic HTML fixtures restyled to resemble shadcn.

The 31 examples use 35 components from the official Radix-based new-york-v4
registry: button, input, textarea, label, card, badge, separator, avatar, checkbox,
switch, radio group, slider, select, tabs, accordion, progress, alert, skeleton,
table, dialog, alert dialog, popover, dropdown menu, tooltip, sheet, scroll area,
toggle, toggle group, command, calendar, chart, breadcrumb, pagination,
collapsible, and hover card. Date picker composes Calendar and Popover; the table
example adds local filtering, sorting, row selection, and pagination.

Radix handles focus, keyboard navigation, selection, overlays, and menus. The
command example uses cmdk, the calendar uses React DayPicker, and the chart uses
Recharts with shadcn's chart container, legend, and tooltip. Demo state stays in
React; actions do not publish themes, send invitations, or call external services.

Semantic colors come from the same `semanticVariables()` function as the
downloaded `shadcn/theme.css`. Typography, radius, spacing, and transition tokens
follow the draft. Portalled content receives the preview's theme through React
context, including updates while open. Light and dark previews are independent
from the site's appearance. The gallery is loaded on demand.

Source is pinned to shadcn/ui commit
`7c9eaba1c0a6404c990c144a654792e3313c650d`; see
[`THIRD_PARTY_NOTICES.md`](../web/THIRD_PARTY_NOTICES.md) and
[`upstream.json`](../web/components/shadcn/upstream.json). This is the New York
Radix component collection, not a claim to reproduce every shadcn style or block.
The standalone `components.html` export continues to contain the framework-neutral
54-example gallery; the shadcn export provides CSS for a consuming shadcn app.

## Comfy

Reviewed `/mnt/shared/Git/comfy-themes/design-system/preview/` and
`design-system/ui_kits/terminal/components.jsx`.

| Comfy reference                                        | ThemeSpace gallery                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Brand wordmark                                         | Brand & wordmark                                                                  |
| Backgrounds, accents, text, semantic, syntax, surfaces | Six color and layer-system examples                                               |
| Type families, scale, code                             | Type families, Display rhythm, Code typography                                    |
| Spacing, radii, elevation, borders                     | Four matching foundation examples                                                 |
| Buttons                                                | Primary, secondary, ghost, destructive, disabled, loading                         |
| Badges                                                 | New, online, idle, do not disturb, offline, shortcut                              |
| Card                                                   | Workspace, author, update, commit metadata, actions                               |
| Inputs                                                 | Search, text, focused interaction, disabled, error                                |
| Toggle                                                 | On/off switches, checked and indeterminate checkboxes                             |
| List rows                                              | Selected, hover, default, disabled                                                |
| TitleBar, ActivityRail, FileTree, Tabs                 | Four corresponding app-surface fixtures                                           |
| CodeView, Terminal, StatusBar                          | Gutter/breadcrumb/syntax editor, interactive demo prompt/ANSI palette, status bar |

All 20 Comfy cards and seven terminal-kit component families have coverage.
ThemeSpace implements these examples itself rather than copying branded assets.

## Open Design

Reviewed the local `open-design/design-systems` collection (150 `components.html`
fixtures), including the repeated Palette, Control, Display rhythm, Layer system,
Motion states, and input families. The gallery covers those foundations alongside
hero/CTA layouts, feature and listing cards, pricing, forms, navigation, tables,
charts, calendars, alerts, menus, overlays, loading states, and a chat composer.

This is family-level coverage: the 150 branded page variations are not reproduced
individually. The gallery is intended to explore the user's theme rather than
preserve each reference brand's colors or typography. The exported package keeps
the Open Design manifest shape; importer compatibility has not been certified.

## Claude Design shared project

User reference:
https://claude.ai/design/p/a1fc1364-78cd-448c-8ccb-8c318dd47679?via=share

The shared page was not accessible through the web tool and no browser connection
was available. The local Comfy design-system package and Open Design Claude
fixture were reviewed, but they are not treated as a substitute for this separate
project. Exact additional component/layout coverage remains pending that
project's exported files or an accessible browser connection.

## Integration previews

All 26 export targets have a preview. Planned catalog entries remain clearly
unavailable for export and preview.

| Family    | Targets                                                                                      | Preview                                                                                 |
| --------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Web       | CSS, Sass, Tailwind CSS                                                                      | Shared interactive HTML component fixture using exported tokens                         |
| shadcn/ui | shadcn/ui with Tailwind v4                                                                   | Actual shadcn React components, Radix interactions, React DayPicker, cmdk, and Recharts |
| Tokens    | DTCG design tokens                                                                           | Searchable role/value palette                                                           |
| Editors   | VS Code, Zed, Neovim, Helix, Sublime                                                         | File tree, editor tabs, code, integrated terminal, status                               |
| Terminals | Ghostty, kitty, Alacritty, WezTerm, Windows Terminal, iTerm2, Warp, foot, Termux, Xresources | Tabs, prompt, ANSI palette, split panes; Windows, Warp-block, Termux variants           |
| Music     | Spicetify                                                                                    | Library, playlist, tracks, silent playback controls                                     |
| Chat      | BetterDiscord, Vencord                                                                       | Servers, channels, local example messages                                               |
| Browsers  | Firefox, Chromium                                                                            | Themeable browser chrome around a fixed-style example website                           |
| Notes     | Obsidian                                                                                     | Vault, note, editor/reader, callout, links, graph                                       |

VS Code and Windows Terminal read colors from their actual generated JSON.
Other scenes illustrate the shared palette with each application's component
family. Native formats control different subsets of colors, fonts, and surfaces;
these scenes are not embedded native applications or proof of native loading.
