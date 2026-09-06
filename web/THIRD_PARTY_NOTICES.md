# Third-party notices

`components/ui/button.tsx` is adapted from the shadcn/ui new-york-v4 registry, retrieved 2026-09-06. Slot imports and the utility alias were adapted to this app.

Source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx

The 34 component files in `components/shadcn/` are adapted from the same
official new-york-v4 registry, pinned to commit
`7c9eaba1c0a6404c990c144a654792e3313c650d` (retrieved 2026-09-06).
They reuse the existing Button. Local adaptations change import paths and wrap
Radix portal content in a React theme context so that menus and dialogs retain
the preview's palette, fonts, and appearance. Component styles and primitive
behavior come from upstream. `components/shadcn/upstream.json` records each source
file's SHA-256 before adaptation. `preview-theme.tsx` and the gallery demos are
ThemeSpace code.

Source: https://github.com/shadcn-ui/ui/tree/7c9eaba1c0a6404c990c144a654792e3313c650d/apps/v4/registry/new-york-v4/ui

MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Comfy palette

The Comfy preset references the palette in https://github.com/Hashim-K/comfy-themes. Its light appearance is a ThemeSpace interpretation. No application-specific theme code was copied from Comfy repositories. Upstream palette terms are unspecified here; generated exports retain the reference.

## Test schemas

`tests/fixtures/zed-theme-schema.json` comes from https://zed.dev/schema/themes/v0.2.0.json, retrieved 2026-09-06. It is used only to validate exported theme files. Zed is an independent project; ThemeSpace is not endorsed by any target application.
