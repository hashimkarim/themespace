# ThemeSpace

Design a theme once, preview it across your apps, and take the whole theme home.

ThemeSpace now has a working first version in [`web/`](web/). The Studio edits
light and dark palettes, typography, corners, spacing, shadows, semantic roles,
syntax, charts, and all 16 ANSI colors. Every one of the 26 working integrations
has a live preview. Native preview adapters read the actual generated theme files:
Monaco for VS Code, Ghostty's WebAssembly terminal core, xterm.js for the other
nine terminals, and CodeMirror for the remaining editors and Obsidian. Spotify
and Discord use adapted MIT-licensed community frontends with local interactions.
Browser chrome is reconstructed from the generated manifests. Each native preview
lists its renderer, source files and limits under **About this preview**. See the
[renderer research and coverage](docs/preview-renderers.md).

Explore includes six starter palettes plus actual published snapshots. Themes
can be searched, filtered, opened, and remixed. Guest drafts persist in browser
local storage by default; a setting limits them to the current tab. Signing in
enables a private saved draft and publishing to the
instance's collection. Published versions remain immutable.

## Settings and component gallery

`/settings` remembers appearance (light, dark, system), site theme, density,
reduced motion, guest-draft persistence, and preferred export format locally.
No sign-in or account memory is required. Preferences can be backed up, restored,
and reset without resetting the draft. Storage failures keep preferences usable
for the session and show a save warning.

Choose **Draft** under **Theme this site** to follow Studio edits live, including
colors, fonts, and corner radius. The choice and last applied draft are remembered
in local storage. The site's appearance setting selects the light or dark draft
palette; a theme with one appearance falls back to that appearance. Starter
palettes and fixed custom snapshots are also available. “Use Draft live on
ThemeSpace” below the Studio preview enables the same setting.

`/components` provides 54 searchable, interactive examples: all 20 Comfy cards,
its seven editor/terminal surfaces, and the common foundation, control, form,
layout, card, and motion families in Open Design. The same component document
ships in the design-system download, works offline, and includes appearance
switching. See [reference coverage](docs/component-coverage.md) for scope.

Choose **shadcn/ui** in Components, or open `/components?library=shadcn`, for
31 additional examples using 35 actual shadcn React components from the official
Radix-based New York registry. Forms, keyboard controls, dialogs, menus, tables,
calendars, command search, and charts are interactive. The same gallery appears
in shadcn integration previews and the export dialog. Its colors use the exported
shadcn tokens; menus and dialogs retain the draft theme even outside the preview
container. The native previews combine real browser editing/terminal engines with
reconstructed application shells; they do not run complete desktop applications.

## Exports

| Category       | Working exporters                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Web            | CSS custom properties, Sass/SCSS module, Tailwind CSS v4, shadcn/ui with Tailwind v4, DTCG 2025.10 tokens |
| Terminals      | Ghostty, kitty, Alacritty, WezTerm, Windows Terminal, iTerm2, Warp, foot, Termux, Xresources              |
| Editors        | VS Code, Zed, Neovim, Helix, Sublime Text                                                                 |
| Chat and music | Spicetify, BetterDiscord, Vencord                                                                         |
| Browsers       | Firefox, Chrome/Chromium                                                                                  |
| Notes          | Obsidian                                                                                                  |

The large export dialog combines integration selection with Preview, Files,
and Install tabs. Inspect a target or the full package, then download one file,
a complete integration ZIP, just the design system, a theme bundle, or a repository
ZIP. Each bundle includes `theme.json`, installation guides, a version record,
and a reusable design-system package with `DESIGN.md`, CSS/JSON tokens, a
manifest, and the standalone interactive component gallery. Repository exports include the
TypeScript generator and npm lockfile: run `npm ci`, then `npm run build` to
regenerate them without ThemeSpace. Run `git init` to initialize the folder;
GitHub creation and publication are not automated.

Native exports are **beta**. Generated formats have been parsed and Zed's JSON
has been checked against its schema; they have not been installed in their
native apps. Browser exports recolor browser chrome. Brave/Edge compatibility
has not been separately verified. Website-specific userstyles and native app
layout customization require additional adapters. Fonts are referenced in
exports, not bundled.

The catalog also shows 13 explicit roadmap entries: Vivaldi, Zen, Stylus,
Konsole, GNOME Terminal, T3 Code, GitComet, SmartGit, Slack, GTK, KDE Plasma,
Waybar, and Rofi. These cannot be selected for export yet.

## Run locally

Requires Node 22.13 or newer and npm.

```sh
cd web
npm ci
npm run dev -- --port 5173
```

Open `http://localhost:5173`. Local **Sign in to sync** uses the Sites development
identity; it does not require a real account. Drafts and published themes persist
in the project's local D1 database under the ignored `.wrangler/` directory.

## Verify

```sh
cd web
npm test
npm run test:api
npm run typecheck
npm run lint
npm run build
```

The exporter suite compiles Sass and Tailwind, checks native data shapes, parses
Lua syntax, verifies ZIP contents, and installs/builds a generated repository in
a temporary directory. Tests additionally require Python 3 and `luac` (Lua).
The API suite runs an isolated local Worker on port 5180 with separate test
storage; it checks authentication, origin restrictions, size/format validation,
saved drafts, concurrent publication, immutable versions, and social metadata.
Unit tests also exercise preference storage/reload/failure handling, live Draft
updates to the application root, exported component interactions, and rendering
all integration previews in both appearances. Additional tests verify every
terminal palette, native file-to-preview mappings, Ghostty WebAssembly and xterm
ANSI rendering, local command editing, and Spotify/Discord interactions across
theme changes. These DOM and engine tests do not replace real-browser interaction,
screenshot, or native app installation checks; those have not been run.

## Architecture and deployment

React and Vinext provide the app routes, Tailwind and Radix provide the component
foundation, and Cloudflare D1 stores drafts and published versions. The pure
TypeScript theme model and generators live in `web/lib/`; the same source ships
inside repository downloads. Exporting happens in the browser.

The app retains the Sites build plugin and logical D1 declaration. Set `SITE_URL`
to the trusted deployment origin for absolute social-card URLs. Production
identity expects the Sites authentication gateway; an alternative host needs a
real authentication integration and trusted identity-header handling.

The deployment build is available locally. This session does not expose Sites
hosting tools, so no hosted site has been published. The current Explore
collection is scoped to whoever can access this instance; global public
accounts, moderation, and a public community deployment remain future work.

## References

The [Comfy collection](https://github.com/Hashim-K/comfy-themes) and
[`comfy-theme` skill](/home/hashim/.agents/skills/comfy-theme/SKILL.md) informed the
shared-palette and app-adapter model. Comfy is a preset, with its source recorded.
[Open Design](https://github.com/nexu-io/open-design/blob/main/design-systems/README.md)
and [Claude Design](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design)
informed the reusable design-system package. The separately supplied
[Claude Design project](https://claude.ai/design/p/a1fc1364-78cd-448c-8ccb-8c318dd47679?via=share)
could not be opened in this environment, so matching that project remains pending
access to its exported files or a connected browser. Open Design importer compatibility
has not been certified.

See the [product direction](docs/product-direction.md) for the broader roadmap
and [`web/THIRD_PARTY_NOTICES.md`](web/THIRD_PARTY_NOTICES.md) for attribution.
