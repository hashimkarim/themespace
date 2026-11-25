# ThemeSpace Companion — Store Submission Kit

Everything needed to publish **ThemeSpace Companion** to both the **Chrome Web Store** and **Firefox Add-ons (AMO)**.

## Build artifacts

Generate all store packages in one command:

```bash
cd extension
npm run pack:store
```

Outputs in `extension/dist/store/`:
- `themespace-companion-chrome.zip` — upload to **Chrome Web Store** (and optionally Microsoft Edge Add-ons)
- `themespace-companion-firefox.zip` — upload to **Firefox Add-ons (AMO)**
- `themespace-companion-source.zip` — upload as the **Source Code** archive on AMO

Visual assets in `extension/store/assets/` (regenerate anytime with `npm run store:assets`):
- `1-recolor-sites.png` (1280×800)
- `2-live-studio-sync.png` (1280×800)
- `3-pick-up-theme.png` (1280×800)
- `4-integrations-connected.png` (1280×800)
- `promo-440x280.png` (440×280 — Chrome Web Store small promo tile)
- Icon: `extension/static/icons/icon-128.png` (128×128)

---

## Shared Listing Copy

- **Name:** `ThemeSpace Companion`
- **Summary / Short description (106 chars, max 132):**
  `See websites in your ThemeSpace themes, pick up a site's colors as a theme, and sync with themespace.app.`
- **Category:** Appearance / Productivity / Developer Tools (`Accessibility` or `Lifestyle` / `Appearance` on AMO)
- **Homepage URL:** `https://themespace.app`
- **Support / Issues URL:** `https://github.com/hashimkarim/themespace/issues`
- **Privacy Policy URL:** `https://themespace.app/privacy`

### Detailed Description

```text
ThemeSpace Companion brings your ThemeSpace palettes to the websites you visit—and lets you pick up colors from any site you love.

What you can do:
• Preview any theme on any website: try community themes, starter palettes, themes you've picked up, or your live ThemeSpace Studio draft on the current tab.
• Live Studio sync: edit a color in themespace.app and watch previewed tabs update in real time.
• Always use here: pin a theme to a specific website so it loads automatically on every visit. Site access is requested only for that site and returned automatically when you unpin.
• Pick up any website's colors: scan a page's palette (backgrounds, surfaces, text, links, buttons, and borders) into a reusable ThemeSpace theme. Save it locally, preview it on other websites, or click "Open in ThemeSpace" to refine and publish it.
• Clean & reversible: rewrites design tokens (--ts-* and shadcn variables) when available, preserves images and contrast, and reverts to the page's exact original colors in one click.

Privacy first:
• No analytics, ads, tracking, or telemetry.
• One-off previews and scans use activeTab only when you click the extension.
• Picked-up palettes stay in local browser storage unless you choose "Open in ThemeSpace".
```

---

## Chrome Web Store — Dashboard Form Answers

Portal: https://chrome.google.com/webstore/devconsole (one-time $5 registration fee)

### Privacy Practices tab

- **Single purpose description:**
  `Recolor websites with ThemeSpace themes, scan a website's color palette into a ThemeSpace theme, and sync drafts and themes with themespace.app.`
- **Permission justifications:**
  - **`activeTab`**: `Required to read the current page's computed colors when the user clicks "Pick up this site's theme" and to apply or revert a theme preview on the active tab on demand.`
  - **`scripting`**: `Required to inject the recoloring/scanning content script into the active tab on click, and to register per-site content scripts only for sites the user explicitly pins.`
  - **`storage`**: `Required to store the user's picked-up themes, pinned site assignments, and cached live Studio draft locally in the browser.`
  - **`host_permissions` (`https://themespace.app/*`)**: `Required to fetch public community themes, check the user's optional signed-in ThemeSpace session and saved draft, and run the window message bridge on themespace.app for live Studio preview and theme import.`
  - **`optional_host_permissions` (`https://*/*`, `http://*/*`)**: `Requested at runtime for a single site's origin only when the user explicitly toggles "Always use this theme here" to pin a theme across reloads. Permission is removed automatically when unpinned.`
- **Remote code:** `No, I am not using remote code.` (All JS/CSS is bundled inside the extension package.)
- **Data usage disclosures:**
  - Check **None** of the data collection boxes (we do not collect/transmit user data to third parties; authentication cookies stay strictly between the user's browser and `themespace.app`).
  - Certify all three Limited Use statements.
- **Privacy Policy URL:** `https://themespace.app/privacy`

---

## Firefox Add-ons (AMO) — Submission Answers

Portal: https://addons.mozilla.org/developers/addon/submit/distribution (Free)

- **Distribution:** Choose **On this site** (listed on AMO with automatic updates) — or **On your own** if you also want a signed `.xpi` for direct download on `themespace.app`.
- **Upload file:** `extension/dist/store/themespace-companion-firefox.zip`
- **Does your add-on require source code submission?** **Yes** — upload `extension/dist/store/themespace-companion-source.zip`.
- **Notes to Reviewer (copy-paste):**

```text
ThemeSpace Companion is bundled from TypeScript with esbuild.

Build environment:
- Node.js 22.13+ (tested on Node 24) and npm
- OS: Linux / macOS / Windows

Exact commands to reproduce dist/firefox/ from the attached source archive:
  cd extension
  npm ci
  npm run build

Output directory to compare:
  extension/dist/firefox/

Notes:
- Shared pure-TypeScript theme schema and palette utilities are imported from web/lib/ (included in the source archive).
- Release builds only communicate with https://themespace.app (no localhost permissions or test hooks).
- Data collection: none (declared via gecko.data_collection_permissions.required = ["none"]).
```
