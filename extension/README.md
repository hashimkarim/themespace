# ThemeSpace Companion

A browser extension that shows websites in your ThemeSpace themes, picks up a
website's colors as a theme, and syncs with [themespace.app](https://themespace.app).

- **Preview** any theme on the current tab: community themes, themes you picked
  up, or your **studio draft**, which follows the ThemeSpace editor live as you
  edit.
- **Always use here** pins a theme to a site, so it loads on every visit.
- **Pick up this site's theme** reads the page's own colors into a ThemeSpace
  theme. Save it, preview it elsewhere, or open it in ThemeSpace to refine and
  publish.

## Principles

**Scan and apply share one color map.** A scan assigns site colors to theme
roles (page, surface, text, muted text, link, button fill, border) and records
them as anchors. Applying a theme moves each site color relative to its
nearest anchor, so the anchor lands exactly on the theme's role color and
nearby shades keep their offset. Applying a site's own scan back to it is the
identity: the e2e test checks that the page is pixel-identical.

**Read the site once.** The engine keeps the untouched page's scan and each
element's original colors. Switching themes, scanning while themed, and CSS
transitions never feed themed colors back in as the site's own.

**Unexplained colors keep their hue.** A color far from every anchor, such
as an alert or a brand band, keeps its hue. When the appearance flips, it moves
only if it's on the wrong side: backgrounds go dark in dark themes and text goes
light. Text always keeps the contrast it had on the site, up to 4.5:1, against
its new background.

**Apply in two tiers.** If the site uses design tokens ThemeSpace knows,
meaning its own `--ts-*` export or shadcn names, the extension rewrites those
tokens in the format the site wrote them (hex, oklch, or bare HSL). That's
exact and keeps hover states. Colors the tokens don't cover are recolored
through computed styles with recorded inline overrides. New content is followed
with a `MutationObserver`, images are never touched, and revert is exact.

**The server API stays same-origin.** The extension reads public themes, your
session, and your saved draft. Everything that writes goes through the
ThemeSpace page itself: a bridge script, running only on themespace.app and
local dev, relays the editor's live draft to the extension and hands
picked-up themes to the editor. You publish with the site's own signed-in UI.
Bridge messages are accepted only from the ThemeSpace window itself, and only
when its address is the one the extension is set to sync with.

**Least privilege.** One-off previews and scans use `activeTab`. Access to a
site is requested only when you pin a theme to it, and only for that site.
Scans stay on your device until you choose to open them in ThemeSpace.

## Develop

```bash
npm ci
npm run build        # release builds: dist/chrome and dist/firefox
npm run build:dev    # also syncs with local ThemeSpace servers and enables test hooks
npm test             # scan/apply core
npm run e2e          # real Chromium with the extension loaded (needs Chromium)
npm run e2e:studio -- http://localhost:5173   # against a running ThemeSpace dev server
npm run e2e:real     # apply, revert, and scan on public sites (test-only broad access)
```

- **Chromium:** go to `chrome://extensions`, turn on Developer mode, and use
  Load unpacked on `dist/chrome`.
- **Firefox:** go to `about:debugging`, This Firefox, and use Load Temporary
  Add-on on `dist/firefox/manifest.json`. Firefox treats host access as
  optional, so grant it for themespace.app in the add-on's permissions for
  sync to work.

To use a local ThemeSpace, make a development build, choose Change in the
popup footer, and enter the dev server address. Release builds only talk to
themespace.app. The shared theme model and palette code are bundled from
`../web/lib`, not copied.

## Limits

- Hover and focus states on sites without known tokens keep their original
  colors, because inline overrides replace the resting state only.
- Colors inside images, background images and gradients, canvases, and
  cross-origin frames are left alone, as are backgrounds drawn by
  `::before` and `::after`.
- Closed shadow roots can't be recolored.
- Pinned sites show their own colors for a moment while the page loads,
  because the engine starts once the page is ready.
