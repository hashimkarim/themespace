# UI review — 2026-09-06

Reviewed Studio, Explore, Integrations, both component libraries, Settings,
starter theme details and the missing-page screen in the local browser.
Checked desktop (1440px), tablet (768px) and phone (390px, 375px and 320px)
layouts, default light/dark and the saved Draft appearance. The error boundary
shares the reviewed fallback layout; it was inspected in source rather than
triggered against user data.

Changes:

- Fixed the export dialog's backdrop appearing above its contents.
- Replaced the mobile export target grid with a collapsible, searchable chooser;
  target and tab changes reset the inspector's scroll position.
- Kept mobile sign-in and preview tab labels visible, enlarged cramped controls,
  and added Studio section shortcuts with editing controls first on phones.
- Fixed truncated theme choices, distinguished saved snapshots, and improved
  settings controls, catalog cards and small-screen headings.
- Fit Explore thumbnails to their cards and made overview previews respond to
  the space available inside their panel.
- Prevented cmdk's initial selection from scrolling the gallery to its command
  example. Added a regression assertion and retained keyboard selection coverage.
- Fixed the shadcn chart's intrinsic width overflowing narrow cards.
- Added component/editor loading feedback, matched native preview scrollbars to
  the preview appearance and removed the terminal's black viewport strip.
- Improved narrow Spotify/Discord layouts and the missing/error page layout.

Browser checks included export selection, Files/Install panels, theme controls,
dropdowns, search empty states, nested expanded previews, and the editor,
terminal, browser, music, chat and token preview families. Native application
installation remains outside this visual review.

Validation: existing 31-test suite, TypeScript, ESLint and production build.
