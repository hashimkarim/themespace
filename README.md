# ThemeSpace

Design a theme once, preview it across your apps, and take the whole theme home.

Production: **[themespace.app](https://themespace.app)**. Deployment and recovery
instructions are in [docs/deployment.md](docs/deployment.md).

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
npm run auth:setup
cd ..
./dev.sh
# Optional port override (./dev is an alias):
./dev 8080
```

The launcher defaults to port `5173`. Non-numeric values and ports outside
`1–65535` fall back to `5173`. Occupied ports are skipped upward until a free
port is found; if none remain through `65535`, the launcher exits with an error.
Open the URL printed by the launcher. Account callbacks and page URLs follow
that port without changing `.env`. The scripts also work from another directory.

The header's **Account** menu opens the Better Auth UI sign-in and registration screens, where you can
create a real email/password account. Better Auth manages credentials and cookie
sessions in the same D1 database as drafts and published themes. Local data
persists under the ignored `.wrangler/` directory. `auth:setup` creates a random
secret in the ignored `.env` file without replacing existing values.

The account screens use [Better Auth UI](https://better-auth-ui.com/docs/shadcn)
components that follow the site's light, dark, and live Draft appearance.
The account page supports updating your display name, changing your password
(revoking other sessions), and signing out. If a browser draft differs from the
account's saved draft, Studio asks which one to use before saving. Browser
appearance preferences remain local. See [account setup](docs/accounts.md).

## Verify

```sh
cd web
npm test
npm run test:api
npm run typecheck
npm run lint
npm run build
# Contabo's standalone Node production runtime:
npm run build:node
npm run test:production
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
screenshot, or native app installation checks. Desktop and mobile browser flows
have also been checked; native app installation checks remain separate.

## Architecture and deployment

React and Vinext provide the app routes, Tailwind and Radix provide the component
foundation. Production uses SQLite on a persistent Contabo volume; local Worker
previews continue using Cloudflare D1. Both store accounts, drafts, and published
versions with the same schema. The pure
TypeScript theme model and generators live in `web/lib/`; the same source ships
inside repository downloads. Exporting happens in the browser.

The Docker build creates a standalone Vinext server and runs lint, typecheck,
unit tests, and API checks for both runtimes before publishing. Contabo's existing
Traefik routes `themespace.app` to the private container and manages HTTPS.
Startup applies checked-in Drizzle migrations before accepting traffic.
Production secrets are supplied at runtime; the image contains no `.env` files.
The GitHub Actions workflow builds images on `main`; deploying is a manual
workflow action. See [deployment operations](docs/deployment.md) for the exact
trigger, health check, persistent storage, backup, and rollback procedure.

Production authentication uses Better Auth's own sessions; Sites identity
headers and its development sign-in cookie do not grant account access. This
app retains the Sites plugin and logical D1 declaration for local previews.
The Explore collection belongs to this instance. A central service for managing
multiple Better Auth instances and community moderation are separate work.

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
