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

**Apply in two tiers.** If the site uses design tokens ThemeSpace knows,
meaning its own `--ts-*` export or shadcn names, the extension rewrites those
tokens. That's exact and keeps hover states. Otherwise it recolors computed
styles with recorded inline overrides, follows new content with a
`MutationObserver`, never touches images, and reverts exactly.

**The server API stays same-origin.** The extension reads public themes, your
session, and your saved draft. Everything that writes goes through the
ThemeSpace page itself: a bridge script, running only on themespace.app and
local dev, relays the editor's live draft to the extension and hands
picked-up themes to the editor. You publish with the site's own signed-in UI.
Bridge messages are accepted only from the ThemeSpace window itself.

**Least privilege.** One-off previews and scans use `activeTab`. Access to a
site is requested only when you pin a theme to it, and only for that site.
Scans stay on your device until you choose to open them in ThemeSpace.

## Develop

```bash
npm ci
npm run build        # dist/chrome and dist/firefox
npm test             # scan/apply core
npm run e2e          # real Chromium with the extension loaded (needs Chromium)
npm run e2e:studio -- http://localhost:5173   # against a running ThemeSpace dev server
```

- **Chromium:** go to `chrome://extensions`, turn on Developer mode, and use
  Load unpacked on `dist/chrome`.
- **Firefox:** go to `about:debugging`, This Firefox, and use Load Temporary
  Add-on on `dist/firefox/manifest.json`. Firefox treats host access as
  optional, so grant it for themespace.app in the add-on's permissions for
  sync to work.

To use a local ThemeSpace, choose Change in the popup footer and enter the
dev server address. The shared theme model and palette code are bundled from
`../web/lib`, not copied.

## Limits

- Hover and focus states on sites without known tokens keep their original
  colors, because inline overrides replace the resting state only.
- Colors inside images, canvases, and cross-origin frames are left alone.
- Closed shadow roots can't be recolored.
