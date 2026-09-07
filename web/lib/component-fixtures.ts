import { resolve, readableOn, type Theme, type Appearance } from "./theme.js";
export type ComponentFixture = {
  id: string;
  name: string;
  category: "Foundations" | "Controls" | "Patterns" | "App surfaces";
  description: string;
  html: string;
};
export const escapeHTML = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
export function componentFixtures(
  theme: Theme,
  mode: Appearance,
): ComponentFixture[] {
  const c = resolve(theme, mode),
    name = escapeHTML(theme.name),
    description = escapeHTML(theme.description),
    sans = escapeHTML(theme.fonts.sans),
    mono = escapeHTML(theme.fonts.mono);
  const swatches = (roles: string[]) =>
    `<div class="swatches">${roles.map((role) => `<div data-color-role="${kebab(role)}"><i style="background:var(--ts-${kebab(role)})"></i><b>${role}</b><code>${c[role]}</code></div>`).join("")}</div>`;
  const button = (text: string, variant = "") =>
    `<button class="${variant}" data-notify="${text} selected">${text}</button>`;
  const code = `<pre class="code"><span class="comment">// A little consistency goes a long way.</span>\n<span class="keyword">import</span> { theme } <span class="keyword">from</span> <span class="string">'./theme'</span>;\n\n<span class="keyword">export function</span> <span class="function">makeItYours</span>(name: <span class="type">string</span>) {\n  <span class="keyword">return</span> { name, radius: <span class="number">${theme.style.radius}</span>,\n    accent: <span class="string">'${c.accent}'</span> };\n}</pre>`;
  const terminal = `<div class="terminal"><div><span class="string">you@workspace</span> <span class="keyword">~/themes</span> <span class="muted">on main</span></div><p>❯ npm run build</p><p class="muted">Generating your everyday palette…</p><p class="string">✓ Theme files ready</p><div class="ansi">${Array.from({ length: 16 }, (_, i) => `<i style="background:var(--ts-ansi${i})"></i>`).join("")}</div><form class="terminal-form"><label><span class="keyword">❯</span><input aria-label="Example terminal command" placeholder="Try echo hello" autocomplete="off"/></label></form><output class="terminal-output" aria-live="polite"></output></div>`;
  const tree = `<div class="tree"><details open><summary>▾ your-theme</summary><details open><summary>▾ src</summary><button class="listrow selected" data-row>◇ theme.ts <small>●</small></button><button class="listrow" data-row>◇ components.tsx</button><button class="listrow" data-row>◇ tokens.css</button></details><button class="listrow" data-row>◈ package.json</button><button class="listrow" data-row>▤ README.md</button></details></div>`;
  const tabs = `<div class="demo-tabs"><div role="tablist" aria-label="Example workspace tabs"><button role="tab" aria-selected="true" data-tab="Overview">Overview</button><button role="tab" aria-selected="false" data-tab="Activity">Activity</button><button role="tab" aria-selected="false" data-tab="Settings">Settings</button></div><div role="tabpanel"><b>Overview</b><p>Your workspace, at a glance.</p></div></div>`;
  const f = (
    id: string,
    name: string,
    category: ComponentFixture["category"],
    description: string,
    html: string,
  ): ComponentFixture => ({ id, name, category, description, html });
  return [
    f(
      "brand-wordmark",
      "Brand & wordmark",
      "Foundations",
      "An identity built from your own name and accent.",
      `<div class="wordmark"><span>✳</span><strong>${name}</strong></div><p class="muted">${description || "Make yourself at home."}</p><div class="row">${button("Get started")}${button("Explore the system", "secondary")}</div>`,
    ),
    f(
      "color-backgrounds",
      "Background palette",
      "Foundations",
      "The base, surface, and raised layers.",
      swatches(["background", "surface", "elevated", "input"]),
    ),
    f(
      "color-accents",
      "Accent palette",
      "Foundations",
      "Action, focus, selection, and information.",
      swatches(["accent", "focus", "selection", "info"]),
    ),
    f(
      "color-text",
      "Text hierarchy",
      "Foundations",
      "Primary, secondary, and paired text colors.",
      swatches([
        "foreground",
        "muted",
        "accentForeground",
        "selectionForeground",
      ]),
    ),
    f(
      "color-semantic",
      "Semantic colors",
      "Foundations",
      "Success, warning, error, and neutral meaning.",
      swatches(["success", "warning", "error", "muted"]),
    ),
    f(
      "color-syntax",
      "Syntax palette",
      "Foundations",
      "Distinct colors for reading and writing code.",
      swatches([
        "syntaxKeyword",
        "syntaxString",
        "syntaxNumber",
        "syntaxFunction",
        "syntaxType",
        "syntaxComment",
      ]),
    ),
    f(
      "color-surfaces",
      "Layer system",
      "Foundations",
      "Surface containment, nested panels, and active content.",
      `<div class="layer">Canvas<div class="layer surface">Surface<div class="layer elevated">Raised surface<div class="layer selected">Selected content</div></div></div></div>`,
    ),
    f(
      "type-families",
      "Type families",
      "Foundations",
      "Interface and code faces with system fallbacks.",
      `<div class="type-sample"><small>${sans}</small><h2>Aa. Find your rhythm.</h2><p>The quick brown fox jumps over the lazy dog.</p></div><div class="type-sample mono"><small>${mono}</small><h3>const hello = "world";</h3><p>0123456789 {} [] / &lt;&gt;</p></div>`,
    ),
    f(
      "type-scale",
      "Display rhythm",
      "Foundations",
      "Headings, body copy, labels, and captions.",
      `<div class="type-scale"><span style="font-size:2.6em">Make it yours.</span><span style="font-size:1.8em">A familiar place.</span><span style="font-size:1.25em">One thoughtful detail.</span><p>Body text creates a comfortable reading rhythm.</p><small>CAPTION · SMALL DETAILS MATTER</small></div>`,
    ),
    f(
      "type-code",
      "Code typography",
      "Foundations",
      "Inline code and syntax-highlighted blocks.",
      `<p>Import <code class="inline-code">theme.css</code> to get started.</p>${code}`,
    ),
    f(
      "spacing-scale",
      "Spacing scale",
      "Foundations",
      "A shared base unit and its useful multiples.",
      `<div class="spacing-scale">${[1, 2, 3, 4, 6, 8, 12].map((n) => `<div><code>${theme.style.spacing * n}px</code><i style="width:${theme.style.spacing * n}px"></i><small>${n}×</small></div>`).join("")}</div>`,
    ),
    f(
      "radii",
      "Corner radii",
      "Foundations",
      "Consistent shapes from subtle to fully rounded.",
      `<div class="shape-row">${[0.6, 0.8, 1, 1.4].map((n) => `<div style="border-radius:${theme.style.radius * n}px">${Math.round(theme.style.radius * n)}px</div>`).join("")}<div style="border-radius:999px">Pill</div></div>`,
    ),
    f(
      "elevation",
      "Elevation",
      "Foundations",
      "Flat, outlined, and raised cards.",
      `<div class="shape-row"><div style="border:0">Flat</div><div>Outlined</div><div style="box-shadow:var(--ts-shadow)">Raised</div></div>`,
    ),
    f(
      "borders",
      "Borders & dividers",
      "Foundations",
      "Quiet boundaries and a visible focus state.",
      `<div class="border-samples"><div>Default border</div><div style="border-style:dashed">Dashed boundary</div><div style="border-color:var(--ts-focus);outline:2px solid var(--ts-focus);outline-offset:3px">Focused element</div></div>`,
    ),
    f(
      "gradients",
      "Gradients",
      "Foundations",
      "Accent and chart colors across a continuous surface.",
      `<div class="gradient"><small>YOUR COLORS, IN MOTION</small><h2>A different point of view.</h2></div>`,
    ),
    f(
      "comp-buttons",
      "Buttons",
      "Controls",
      "Primary, secondary, ghost, destructive, loading, and disabled.",
      `<div class="row">${button("Primary")}${button("Secondary", "secondary")}${button("Ghost", "ghost")}${button("Delete", "danger")}<button disabled>Disabled</button><button disabled class="secondary"><span class="spinner"></span>Working</button></div>`,
    ),
    f(
      "comp-badges",
      "Badges & status",
      "Controls",
      "New, online, idle, do not disturb, and offline states.",
      `<div class="row"><span class="badge accent">New</span><span class="badge success">● Online</span><span class="badge warning">● Idle</span><span class="badge error">● Do not disturb</span><span class="badge">● Offline</span><span class="badge">⌘ K</span></div>`,
    ),
    f(
      "comp-inputs",
      "Inputs",
      "Controls",
      "Search, text, focus, disabled, and error states.",
      `<label>Search<input type="search" placeholder="Search your workspace…"/></label><label>Theme name<input value="${name}"/></label><label class="error">Invalid entry<input aria-invalid="true" placeholder="A name is required"/><small>Give this theme a name.</small></label><label>Read only<input disabled value="Disabled input"/></label>`,
    ),
    f(
      "comp-toggle",
      "Toggles & checkboxes",
      "Controls",
      "On, off, checked, and indeterminate states.",
      `<label class="inline"><input type="checkbox" class="switch" role="switch" checked/>Sync appearance</label><label class="inline"><input type="checkbox" class="switch" role="switch"/>Quiet mode</label><label class="inline"><input type="checkbox" checked/>Include source files</label><label class="inline"><input type="checkbox" data-indeterminate/>Select some integrations</label>`,
    ),
    f(
      "select",
      "Select menus",
      "Controls",
      "A themed option menu with a clear selected value.",
      `<details class="select-demo"><summary>Comfortable <span>⌄</span></summary><div class="floating">${["Comfortable", "Compact", "Spacious"].map((t) => `<button class="ghost" data-select="${t}">${t}</button>`).join("")}</div></details><p class="muted">Choose a density for this example.</p>`,
    ),
    f(
      "radio",
      "Radio groups",
      "Controls",
      "One choice, with descriptive supporting text.",
      `<fieldset><legend>Choose your workspace</legend>${["Personal", "Team", "Organization"].map((t, i) => `<label class="radio-card"><input type="radio" name="demo-workspace" ${i === 0 ? "checked" : ""}/><span><b>${t}</b><small>A little room to make something good.</small></span></label>`).join("")}</fieldset>`,
    ),
    f(
      "slider",
      "Sliders",
      "Controls",
      "Adjustable values with immediate feedback.",
      `<label>Intensity <output>65</output><input type="range" min="0" max="100" value="65" data-range/></label><label>Volume <output>40</output><input type="range" min="0" max="100" value="40" data-range/></label>`,
    ),
    f(
      "segmented",
      "Segmented controls",
      "Controls",
      "Mutually exclusive views and compact selections.",
      `<div class="segmented" role="group" aria-label="Example appearance">${["Light", "Dark", "System"].map((t, i) => `<button class="${i === 1 ? "" : "ghost"}" aria-pressed="${i === 1}" data-segment>${t}</button>`).join("")}</div>`,
    ),
    f(
      "tooltip",
      "Tooltips & shortcuts",
      "Controls",
      "Context available on hover and keyboard focus.",
      `<div class="tooltip-wrap"><button class="secondary" aria-describedby="tip-save">Save changes <kbd>⌘ S</kbd></button><span role="tooltip" id="tip-save">Save a snapshot of your work.</span></div>`,
    ),
    f(
      "dropdown",
      "Dropdown actions",
      "Controls",
      "Grouped actions in a contained menu.",
      `<details class="select-demo"><summary>Project actions <span>···</span></summary><div class="floating">${button("Duplicate", "ghost")}${button("Move to folder", "ghost")}<hr/>${button("Archive", "ghost")}</div></details>`,
    ),
    f(
      "popover",
      "Popovers",
      "Controls",
      "Small contextual editors that stay close to their trigger.",
      `<details class="select-demo"><summary>Adjust dimensions <span>↗</span></summary><div class="floating"><b>Dimensions</b><label>Width<input type="number" value="320" min="80"/></label><label>Height<input type="number" value="180" min="40"/></label></div></details>`,
    ),
    f(
      "dialog",
      "Dialogs",
      "Controls",
      "Modal focus, Escape dismissal, and paired actions.",
      `<button data-open-dialog>Open dialog</button><dialog><h2>Ready to make it yours?</h2><p>This is a component preview. Your draft stays unchanged.</p><form method="dialog" class="row"><button class="secondary">Cancel</button><button>Looks good</button></form></dialog>`,
    ),
    f(
      "accordion",
      "Accordions",
      "Controls",
      "Expandable content with clear hierarchy.",
      `<div class="accordion">${["What is included?", "Can I use my own colors?", "Does it work offline?"].map((q, i) => `<details ${i === 0 ? "open" : ""}><summary>${q}</summary><p>${["Your palette, type, spacing, and matching component examples.", "Every surface and interaction follows your theme tokens.", "The exported component gallery opens locally in your browser."][i]}</p></details>`).join("")}</div>`,
    ),
    f(
      "progress",
      "Progress & loading",
      "Controls",
      "Determinate progress and a loading indicator.",
      `<label>Exporting your world <span class="muted">72%</span><progress max="100" value="72">72%</progress></label><p class="inline"><span class="spinner"></span>Building your package…</p>`,
    ),
    f(
      "skeleton",
      "Skeleton states",
      "Controls",
      "A restrained placeholder while content loads.",
      `<div class="inline"><div class="skeleton avatar"></div><div style="flex:1"><div class="skeleton line"></div><div class="skeleton line short"></div></div></div><div class="skeleton block"></div>`,
    ),
    f(
      "motion",
      "Motion states",
      "Controls",
      "Hover, press, focus, and reduced-motion behavior.",
      `<div class="motion-card" tabindex="0"><span>✳</span><b>A little movement.</b><p>Hover or focus to lift this card.</p></div>`,
    ),
    f(
      "comp-card",
      "Workspace cards",
      "Patterns",
      "An everyday card with metadata, progress, and actions.",
      `<div class="project-card"><span class="badge success">● Active</span><h2>Your personal workspace</h2><p class="muted">Every detail, a little more you.</p><div class="inline"><span class="avatar">JK</span><span><b>Jamie Kim</b><small class="muted">Updated 2 minutes ago</small></span></div><hr/><div class="row">${button("Open workspace")}${button("12 commits", "secondary")}</div></div>`,
    ),
    f(
      "comp-listrows",
      "List rows",
      "Patterns",
      "Default, hovered, selected, and disabled items.",
      `<div class="list">${["Getting started", "Your components", "Project settings", "Archived projects"].map((t, i) => `<button class="listrow ${i === 0 ? "selected" : ""}" data-row ${i === 3 ? "disabled" : ""}><span>◇ ${t}</span><small>${i === 0 ? "Selected" : i === 1 ? "Hover me" : "›"}</small></button>`).join("")}</div>`,
    ),
    f(
      "breadcrumbs",
      "Breadcrumbs",
      "Patterns",
      "A compact trail through nested content.",
      `<nav aria-label="Example breadcrumb" class="breadcrumbs"><button class="ghost" data-notify="Workspace selected">Workspace</button><span>/</span><button class="ghost" data-notify="Themes selected">Themes</button><span>/</span><b>${name}</b></nav>`,
    ),
    f(
      "tabs",
      "Tabs",
      "Patterns",
      "Keyboard-friendly sections with an active indicator.",
      tabs,
    ),
    f(
      "navigation",
      "Navigation & sidebar",
      "Patterns",
      "A familiar home for primary and secondary navigation.",
      `<div class="sidebar-demo"><strong>✳ ${name}</strong><small class="muted">WORKSPACE</small>${["Overview", "Projects", "Activity", "Settings"].map((t, i) => `<button class="listrow ${i === 0 ? "selected" : ""}" data-row>${t}<small>${i === 1 ? "08" : "›"}</small></button>`).join("")}<hr/><span class="inline"><span class="avatar">YO</span>Your workspace</span></div>`,
    ),
    f(
      "table",
      "Data tables",
      "Patterns",
      "Headers, rows, status, and selectable records.",
      `<div class="table-scroll"><table><thead><tr><th><input aria-label="Select all rows" type="checkbox" data-check-all/></th><th>Project</th><th>Status</th><th>Updated</th></tr></thead><tbody>${["Personal theme", "Website refresh", "Terminal palette"].map((t, i) => `<tr><td><input aria-label="Select ${t}" type="checkbox"/></td><td>${t}</td><td><span class="badge ${i === 0 ? "success" : "warning"}">${i === 0 ? "Ready" : "Draft"}</span></td><td class="muted">${i + 1} days ago</td></tr>`).join("")}</tbody></table></div>`,
    ),
    f(
      "charts",
      "Charts & metrics",
      "Patterns",
      "Five chart colors, values, grid lines, and legends.",
      `<div class="metric"><small class="muted">WEEKLY ACTIVITY</small><h2>1,284 <span class="badge success">↗ 12.8%</span></h2></div><div class="chart" role="img" aria-label="Example weekly activity bar chart">${[35, 62, 43, 90, 72, 100, 78].map((h, i) => `<div><i style="height:${h}px;background:var(--ts-chart${(i % 5) + 1})"></i><small>${["M", "T", "W", "T", "F", "S", "S"][i]}</small></div>`).join("")}</div>`,
    ),
    f(
      "calendar",
      "Calendar",
      "Patterns",
      "Date cells, today, and a selected day.",
      `<div class="calendar"><div class="row"><b>September 2026</b><span class="muted">Example month</span></div><div class="calendar-grid">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<small>${d}</small>`).join("")}<span></span>${Array.from({ length: 30 }, (_, i) => `<button class="${i === 5 ? "" : "ghost"}" aria-pressed="${i === 5}" data-day>${i + 1}</button>`).join("")}</div></div>`,
    ),
    f(
      "notifications",
      "Alerts & notifications",
      "Patterns",
      "Informative, successful, cautionary, and error messages.",
      `<div class="alert success"><b>✓ All changes saved</b><p>Your workspace is up to date.</p></div><div class="alert warning"><b>Check your contrast</b><p>This pair may be difficult to read.</p></div><div class="alert error"><b>Could not connect</b><p>Try again when you are back online.</p></div>${button("Show a toast", "secondary")}`,
    ),
    f(
      "empty",
      "Empty states",
      "Patterns",
      "A helpful next step when there is nothing here yet.",
      `<div class="empty-demo"><span>◇</span><h2>A fresh start.</h2><p class="muted">Your next great idea belongs here.</p>${button("Create a project")}</div>`,
    ),
    f(
      "forms",
      "Forms & validation",
      "Patterns",
      "Labels, descriptions, required fields, and feedback.",
      `<form class="demo-form"><label>Project name<input name="project" required placeholder="A new beginning"/></label><label>Email<input type="email" required placeholder="you@example.com"/></label><label>Notes<textarea rows="2" placeholder="A little context…"></textarea></label><label class="inline"><input type="checkbox" required/>I am ready to start</label><button type="submit">Create project</button><output aria-live="polite"></output></form>`,
    ),
    f(
      "hero",
      "Hero & call to action",
      "Patterns",
      "Display typography, supporting copy, and clear actions.",
      `<div class="hero-demo"><span class="badge accent">YOUR NEXT CHAPTER</span><h2>Find your colors.<br/>Make yourself at home.</h2><p class="muted">A familiar space for your biggest ideas and smallest details.</p><div class="row">${button("Get started")}${button("See what is possible", "secondary")}</div></div>`,
    ),
    f(
      "pricing",
      "Pricing cards",
      "Patterns",
      "Plan comparison, a featured option, and benefits.",
      `<div class="pricing-grid">${["Personal", "Together"].map((t, i) => `<div class="project-card ${i ? "featured" : ""}"><small class="muted">${t.toUpperCase()}</small><h2>${i ? "$12" : "Free"}<small>${i ? " / month" : ""}</small></h2><p>A place to build your world.</p><ul><li>✓ Your own workspace</li><li>✓ Reusable components</li><li>✓ ${i ? "Shared projects" : "Personal projects"}</li></ul>${button("Choose " + t, i ? "" : "secondary")}</div>`).join("")}</div>`,
    ),
    f(
      "feature-cards",
      "Feature & listing cards",
      "Patterns",
      "A repeatable grid for collections and product features.",
      `<div class="feature-grid">${[
        ["◇", "Open formats", "Build on what you already know."],
        [
          "◉",
          "Accessible foundations",
          "A visible focus and thoughtful hierarchy.",
        ],
        ["✳", "Yours everywhere", "One palette for your everyday tools."],
      ]
        .map(
          ([icon, title, desc]) =>
            `<div class="project-card"><span class="feature-icon">${icon}</span><h3>${title}</h3><p class="muted">${desc}</p></div>`,
        )
        .join("")}</div>`,
    ),
    f(
      "kanban",
      "Boards & task cards",
      "Patterns",
      "Status columns, tags, and compact task metadata.",
      `<div class="kanban">${["Ideas", "In progress", "Done"].map((t, i) => `<div><small class="muted">${t.toUpperCase()} · 1</small><div class="project-card"><span class="badge">Design</span><h3>${["Explore palettes", "Build components", "Choose type"][i]}</h3><span class="avatar">${["JK", "AL", "YO"][i]}</span></div></div>`).join("")}</div>`,
    ),
    f(
      "composer",
      "Chat & composer",
      "Patterns",
      "Assistant messages, attachments, and multiline input.",
      `<div class="message"><span class="avatar">YOU</span><p>Can we make this space feel more like home?</p></div><div class="message"><span class="avatar assistant">✳</span><p>Let’s start with your favorite colors.</p></div><form class="composer"><label><span class="sr-only">Example chat message</span><textarea placeholder="Make something good…" required rows="2"></textarea></label><div class="row"><span class="badge">＋ Attach</span><button type="submit">Send ↑</button></div></form><output aria-live="polite"></output>`,
    ),
    f(
      "titlebar",
      "Window title bar",
      "App surfaces",
      "Window controls, title, and a command search.",
      `<div class="app-title"><span class="dots"><i></i><i></i><i></i></span><span>${name} — workspace</span><span>− □ ×</span></div><div class="command"><input aria-label="Example command search" placeholder="Search files and commands…"/><kbd>⌘ K</kbd></div>`,
    ),
    f(
      "activityrail",
      "Activity rail",
      "App surfaces",
      "A compact icon strip with a selected tool.",
      `<div class="rail-demo">${["Files", "Search", "Source control", "Extensions", "Settings"].map((t, i) => `<button title="${t}" aria-label="${t}" class="${i ? "ghost" : ""}" data-segment aria-pressed="${i === 0}">${["▤", "⌕", "⑂", "▦", "⚙"][i]}</button>`).join("")}</div>`,
    ),
    f(
      "filetree",
      "File tree",
      "App surfaces",
      "Expandable folders and selected files.",
      tree,
    ),
    f(
      "editor-tabs",
      "Editor tabs",
      "App surfaces",
      "Active, inactive, and modified file tabs.",
      `<div class="demo-tabs editor-tabs"><div role="tablist" aria-label="Example editor files">${["theme.ts", "tokens.css", "README.md"].map((t, i) => `<button role="tab" aria-selected="${i === 0}" data-tab="${t}">${t} <small>${i === 0 ? "●" : "×"}</small></button>`).join("")}</div><div role="tabpanel"><b>theme.ts</b><p>Your active file.</p></div></div>`,
    ),
    f(
      "codeview",
      "Code editor",
      "App surfaces",
      "Breadcrumbs, gutter numbers, syntax, and selected lines.",
      `<small class="muted">src / theme.ts / makeItYours</small><div class="editor-code"><div class="gutter">1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8</div>${code}</div>`,
    ),
    f(
      "terminal",
      "Terminal",
      "App surfaces",
      "Tabs, history, prompt, input, and all 16 ANSI colors.",
      `<div class="app-title"><b>TERMINAL</b><span>zsh · ＋</span></div>${terminal}`,
    ),
    f(
      "statusbar",
      "Status bar",
      "App surfaces",
      "Git branch, diagnostics, cursor position, and language.",
      `<div class="statusbar"><span>⑂ main*</span><span>⊗ 0 ⚠ 0</span><span>Ln 8, Col 4</span><span>UTF-8</span><span>TypeScript</span><span>✓</span></div><p class="muted">Readable paired foregrounds on a compact accent surface.</p>`,
    ),
  ];
}
export const fixtureStyles = `
*{box-sizing:border-box}html{color-scheme:dark}html[data-theme=light]{color-scheme:light}body{margin:0;background:var(--ts-background);color:var(--ts-foreground);font:var(--ts-font-size)/1.55 var(--ts-font-sans)}main{max-width:1300px;margin:auto;padding:40px 28px}body.embedded main{padding:20px}h1,h2,h3,p{margin:0 0 12px}h1{font-size:clamp(30px,4vw,52px);line-height:1.1;letter-spacing:-.04em}h2{font-size:1.45em;line-height:1.25;letter-spacing:-.025em}h3{font-size:1.05em}small,.muted{color:var(--ts-muted)}small{font-size:.8em}code,pre,kbd,.mono{font-family:var(--ts-font-mono)}button,input,textarea,summary{font:inherit}button,summary{cursor:pointer}button{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--ts-accent);color:var(--ts-accent-foreground);border:1px solid transparent;border-radius:var(--ts-radius);padding:9px 14px;transition:background var(--ts-motion),transform var(--ts-motion)}button:hover{filter:brightness(.96)}button:active{transform:translateY(1px)}button:disabled{opacity:.45;cursor:not-allowed}button:focus-visible,summary:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--ts-focus);outline-offset:3px}input,textarea{width:100%;background:var(--ts-input);color:var(--ts-foreground);border:1px solid var(--ts-border);border-radius:var(--ts-radius);padding:9px 12px;accent-color:var(--ts-accent);min-width:0}input::placeholder,textarea::placeholder{color:var(--ts-muted)}input:disabled{opacity:.5}input[type=checkbox],input[type=radio]{width:16px;height:16px;padding:0;flex-shrink:0}input[type=range]{padding:0;display:block;accent-color:var(--ts-accent)}label{display:grid;gap:7px;margin-bottom:14px;font-size:.9em}fieldset{padding:0;border:0;margin:0}legend{margin-bottom:14px}hr{border:0;border-top:1px solid var(--ts-border);margin:18px 0}header{margin-bottom:30px;display:flex;align-items:center;justify-content:space-between;gap:16px}header .theme-modes{display:flex;gap:8px}.fixture-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.fixture{border:1px solid var(--ts-border);background:var(--ts-surface);border-radius:calc(var(--ts-radius)*1.4);min-width:0}.fixture-heading{padding:20px 22px 0}.fixture-heading h2{font-size:1em;margin:5px 0}.fixture-heading p{font-size:.8em;color:var(--ts-muted)}.fixture-heading small{text-transform:uppercase;letter-spacing:.1em;font-size:.65em}.fixture-body{padding:22px;min-height:140px}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.inline{display:flex;align-items:center;gap:12px}.secondary{background:var(--ts-elevated);border-color:var(--ts-border);color:var(--ts-foreground)}.ghost{background:transparent;color:var(--ts-foreground)}.ghost:hover{background:var(--ts-hover)}.danger{background:var(--ts-error);color:var(--demo-error-fg)}.swatches{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:12px}.swatches i{display:block;height:58px;border:1px solid var(--ts-border);border-radius:calc(var(--ts-radius)*.75);margin-bottom:8px}.swatches b,.swatches code{display:block;overflow-wrap:anywhere;font-size:.7em}.swatches code{color:var(--ts-muted)}.layer{border:1px solid var(--ts-border);background:var(--ts-background);padding:14px;border-radius:var(--ts-radius);font-size:.9em}.layer>.layer{margin-top:10px}.surface{background:var(--ts-surface)}.elevated{background:var(--ts-elevated)}.selected{background:var(--ts-selection)!important;color:var(--ts-selection-foreground)!important}.wordmark{display:flex;gap:15px;align-items:center;margin-bottom:15px;font-size:2em;letter-spacing:-.04em;overflow-wrap:anywhere}.wordmark>span{color:var(--ts-accent);font-size:1.5em}.type-sample+.type-sample{margin-top:25px}.type-scale{display:grid;gap:10px}.type-scale>span{line-height:1.2;letter-spacing:-.03em}.code{font-size:.8em;line-height:1.8;background:var(--ts-background);border:1px solid var(--ts-border);border-radius:var(--ts-radius);padding:16px;overflow:auto;max-width:100%;margin:0}.comment{color:var(--ts-syntax-comment)}.keyword{color:var(--ts-syntax-keyword)}.string{color:var(--ts-syntax-string)}.number{color:var(--ts-syntax-number)}.function{color:var(--ts-syntax-function)}.type{color:var(--ts-syntax-type)}.inline-code{background:var(--ts-input);padding:2px 7px;border:1px solid var(--ts-border);border-radius:4px}.spacing-scale{display:grid;gap:9px}.spacing-scale>div{display:flex;align-items:center;gap:16px;font-size:.8em}.spacing-scale code{width:45px}.spacing-scale i{height:18px;background:var(--ts-accent);border-radius:3px}.shape-row{display:flex;gap:15px;flex-wrap:wrap}.shape-row>div{border:1px solid var(--ts-border);background:var(--ts-elevated);display:grid;place-items:center;min-height:72px;min-width:72px;font-size:.8em;border-radius:var(--ts-radius)}.border-samples{display:grid;gap:18px}.border-samples>div{padding:12px;border:1px solid var(--ts-border);border-radius:var(--ts-radius);font-size:.85em}.gradient{padding:32px 25px;border-radius:var(--ts-radius);background:linear-gradient(120deg,var(--ts-background),color-mix(in srgb,var(--ts-accent) 25%,var(--ts-background)),var(--ts-surface));min-height:150px}.gradient small{letter-spacing:.15em}.gradient h2{margin-top:12px}.badge{display:inline-flex;align-items:center;gap:5px;font-size:.72em;white-space:nowrap;padding:4px 8px;background:var(--ts-elevated);border:1px solid var(--ts-border);border-radius:999px}.accent{color:var(--ts-accent)}.success{color:var(--ts-success)}.warning{color:var(--ts-warning)}.error{color:var(--ts-error)}[aria-invalid=true]{border-color:var(--ts-error)}.switch{appearance:none;width:34px!important;height:20px!important;border:1px solid var(--ts-border);background:var(--ts-input);border-radius:999px;position:relative}.switch:before{content:'';position:absolute;width:14px;height:14px;border-radius:50%;top:2px;left:2px;background:var(--ts-muted);transition:transform var(--ts-motion)}.switch:checked{background:var(--ts-accent)}.switch:checked:before{transform:translateX(14px);background:var(--ts-accent-foreground)}.radio-card{display:flex;align-items:center;padding:12px;border:1px solid var(--ts-border);border-radius:var(--ts-radius);gap:12px}.radio-card:has(:checked){border-color:var(--ts-accent);background:var(--ts-hover)}.radio-card small{display:block}.segmented{display:inline-flex;padding:4px;border-radius:calc(var(--ts-radius) + 4px);background:var(--ts-input);gap:4px}.tooltip-wrap{position:relative;display:inline-block;margin:28px 0}.tooltip-wrap>[role=tooltip]{visibility:hidden;position:absolute;bottom:calc(100% + 8px);left:0;background:var(--ts-elevated);border:1px solid var(--ts-border);box-shadow:var(--ts-shadow);padding:8px 10px;border-radius:var(--ts-radius);font-size:.75em;white-space:nowrap;z-index:2}.tooltip-wrap:hover>[role=tooltip],.tooltip-wrap:focus-within>[role=tooltip]{visibility:visible}kbd{font-size:.75em;border:1px solid var(--ts-border);border-radius:4px;padding:2px 4px}.select-demo{position:relative;max-width:280px}.select-demo>summary{border:1px solid var(--ts-border);border-radius:var(--ts-radius);padding:10px 12px;display:flex;justify-content:space-between;background:var(--ts-input)}.floating{position:relative;z-index:2;margin-top:8px;padding:8px;background:var(--ts-elevated);border:1px solid var(--ts-border);border-radius:var(--ts-radius);box-shadow:var(--ts-shadow)}.floating button{display:flex;width:100%;justify-content:flex-start;font-size:.85em}.floating label{padding:8px;margin:0}.floating hr{margin:5px}.floating>b{display:block;margin:8px}.accordion details{border-bottom:1px solid var(--ts-border);padding:13px 0}.accordion summary{font-weight:500}.accordion p{font-size:.85em;color:var(--ts-muted);margin-top:12px}dialog{max-width:440px;width:calc(100% - 40px);background:var(--ts-elevated);border:1px solid var(--ts-border);color:var(--ts-foreground);border-radius:var(--ts-radius);box-shadow:var(--ts-shadow);padding:28px}dialog::backdrop{background:rgb(0 0 0 / .65)}dialog p{color:var(--ts-muted);font-size:.9em}progress{appearance:none;display:block;width:100%;height:7px;border:0;border-radius:999px;overflow:hidden;background:var(--ts-input);accent-color:var(--ts-accent)}progress::-webkit-progress-bar{background:var(--ts-input)}progress::-webkit-progress-value{background:var(--ts-accent)}progress::-moz-progress-bar{background:var(--ts-accent)}.spinner{width:16px;height:16px;border:2px solid var(--ts-border);border-top-color:var(--ts-accent);display:inline-block;border-radius:50%;animation:spin 1.2s linear infinite}.skeleton{background:var(--ts-elevated);animation:pulse 2s ease-in-out infinite}.avatar{display:grid;place-items:center;width:34px;height:34px;background:var(--ts-selection);color:var(--ts-selection-foreground);border:1px solid var(--ts-border);border-radius:calc(var(--ts-radius)*1.2);font-size:.7em;flex-shrink:0}.line{height:12px;width:100%;border-radius:4px;margin-bottom:10px}.line.short{width:60%;margin-bottom:0}.block{height:70px;margin-top:18px;border-radius:var(--ts-radius)}.motion-card{padding:25px;border:1px solid var(--ts-border);border-radius:var(--ts-radius);transition:transform var(--ts-motion),box-shadow var(--ts-motion)}.motion-card:hover,.motion-card:focus{transform:translateY(-4px);box-shadow:var(--ts-shadow)}.motion-card span{display:block;font-size:2em;color:var(--ts-accent)}.motion-card p{font-size:.85em;color:var(--ts-muted);margin:8px 0 0}.project-card{padding:20px;background:var(--ts-background);border:1px solid var(--ts-border);border-radius:var(--ts-radius)}.project-card h2,.project-card h3{margin-top:14px}.project-card p{font-size:.85em}.project-card small{display:block}.project-card .inline b{font-size:.8em}.project-card ul{padding:0;list-style:none;font-size:.8em;line-height:2.5}.listrow{display:flex;width:100%;justify-content:space-between;text-align:left;padding:11px 12px;background:transparent;color:var(--ts-foreground);font-size:.85em;border-radius:calc(var(--ts-radius)*.6)}.listrow:hover{background:var(--ts-hover)}.breadcrumbs{display:flex;align-items:center;gap:8px;font-size:.8em;flex-wrap:wrap}.breadcrumbs button{padding:4px}.demo-tabs>[role=tablist]{display:flex;border-bottom:1px solid var(--ts-border);gap:4px;overflow:auto}.demo-tabs [role=tab]{background:transparent;color:var(--ts-muted);border-radius:0;padding:11px;border-bottom:2px solid transparent;white-space:nowrap;font-size:.85em}.demo-tabs [aria-selected=true]{color:var(--ts-foreground);border-bottom-color:var(--ts-accent)}.demo-tabs [role=tabpanel]{padding:22px 0 0;font-size:.9em}.demo-tabs [role=tabpanel] p{color:var(--ts-muted);margin-top:8px}.sidebar-demo{display:grid;gap:10px;max-width:290px;background:var(--ts-background);padding:20px;border:1px solid var(--ts-border);border-radius:var(--ts-radius)}.sidebar-demo>small{font-size:.65em;letter-spacing:.12em;margin-top:16px}.table-scroll{overflow-x:auto}table{border-collapse:collapse;font-size:.8em;width:100%;text-align:left;white-space:nowrap}td,th{padding:12px 9px;border-bottom:1px solid var(--ts-border)}th{color:var(--ts-muted);font-weight:500}tr:has(:checked){background:var(--ts-selection);color:var(--ts-selection-foreground)}.metric h2{margin-top:10px;font-size:2em}.metric .badge{font-size:.35em}.chart{display:flex;gap:10px;align-items:flex-end;justify-content:space-around;height:135px;border-bottom:1px solid var(--ts-border)}.chart>div{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1}.chart i{width:100%;max-width:35px;border-radius:4px 4px 0 0}.chart small{font-size:.65em}.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:18px}.calendar-grid>*{text-align:center}.calendar-grid button{padding:8px;font-size:.85em}.alert{border:1px solid var(--ts-border);border-left:3px solid currentColor;border-radius:var(--ts-radius);padding:14px;margin-bottom:12px;font-size:.85em}.alert p{color:var(--ts-muted);margin:5px 0 0}.empty-demo{text-align:center;padding:20px}.empty-demo>span{font-size:3em;color:var(--ts-accent)}.empty-demo p{font-size:.85em}.demo-form output{display:block;color:var(--ts-success);margin-top:12px;font-size:.85em}.hero-demo{padding:18px 0}.hero-demo h2{font-size:clamp(25px,4vw,36px);margin-top:20px}.hero-demo p{max-width:36ch}.pricing-grid,.feature-grid,.kanban{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.feature-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.feature-grid .project-card{padding:15px}.feature-grid h3{font-size:.85em}.feature-grid p{font-size:.7em}.feature-icon{font-size:2em;color:var(--ts-accent)}.featured{border-color:var(--ts-accent);box-shadow:0 0 0 1px var(--ts-accent)}.kanban{grid-template-columns:repeat(3,minmax(0,1fr))}.kanban .project-card{padding:12px;margin-top:12px}.kanban h3{font-size:.85em}.kanban>div>small{font-size:.6em}.message{display:flex;gap:12px;margin-bottom:20px;font-size:.9em}.message p{margin:5px 0}.assistant{background:var(--ts-accent);color:var(--ts-accent-foreground)}.composer{border:1px solid var(--ts-border);background:var(--ts-input);padding:10px;border-radius:var(--ts-radius)}.composer textarea{border:0;background:transparent;resize:vertical}.composer .row{justify-content:space-between}.composer label{margin-bottom:4px}.composer+output{display:block;margin-top:10px;font-size:.8em}.app-title{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--ts-elevated);border-bottom:1px solid var(--ts-border);padding:12px;font-size:.7em}.dots{display:flex;gap:6px}.dots i{width:9px;height:9px;border-radius:50%;background:var(--ts-error)}.dots i:nth-child(2){background:var(--ts-warning)}.dots i:nth-child(3){background:var(--ts-success)}.command{position:relative;margin-top:20px}.command kbd{position:absolute;right:10px;top:10px;color:var(--ts-muted)}.rail-demo{display:flex;flex-wrap:wrap;gap:10px}.rail-demo button{font-size:1.5em}.tree{font-family:var(--ts-font-mono);font-size:.85em}.tree details>details{margin-left:16px}.tree summary{padding:8px;color:var(--ts-muted)}.tree button{font-size:1em}.editor-code{display:flex;margin-top:15px;overflow:hidden;font-size:.9em}.editor-code .code{border:0;padding:0;background:transparent}.gutter{font:0.8em/1.8 var(--ts-font-mono);color:var(--ts-muted);text-align:right;padding-right:18px;user-select:none}.terminal{background:var(--ts-background);padding:20px;font: .8em/1.9 var(--ts-font-mono)}.terminal p{margin:7px 0}.ansi{display:flex;margin:20px 0}.ansi i{height:20px;flex:1}.terminal-form label{display:flex;align-items:center;gap:10px}.terminal-form input{border:0;background:transparent;padding:0;border-radius:0}.terminal-output{white-space:pre-wrap;overflow-wrap:anywhere}.statusbar{display:flex;flex-wrap:wrap;gap:16px;background:var(--ts-accent);color:var(--ts-accent-foreground);padding:8px 12px;font: .65em var(--ts-font-mono);margin-bottom:15px}.statusbar span:nth-child(3){margin-left:auto}.fixture-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--ts-elevated);color:var(--ts-foreground);padding:12px 20px;border:1px solid var(--ts-border);box-shadow:var(--ts-shadow);border-radius:var(--ts-radius);z-index:100;font-size:.85em;max-width:90%;text-align:center}.fixture-toast:empty{display:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{opacity:.5}}@media(max-width:680px){main{padding:24px 16px}body.embedded main{padding:14px}.fixture-grid{grid-template-columns:1fr;gap:14px}.fixture-body{padding:18px}.fixture-heading{padding:18px 18px 0}header{align-items:flex-start;flex-direction:column}.feature-grid,.kanban{grid-template-columns:1fr}.pricing-grid{gap:8px}.pricing-grid .project-card{padding:14px}.wordmark{font-size:1.6em}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
export const fixtureScript = `
const toast=document.querySelector('.fixture-toast');let timer;
function notify(text){toast.textContent=text;clearTimeout(timer);timer=setTimeout(()=>toast.textContent='',2400)}
document.querySelectorAll('[data-indeterminate]').forEach(el=>el.indeterminate=true);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const section=b.closest('.fixture');
if(b.dataset.notify)notify(b.dataset.notify);
if(b.hasAttribute('data-open-dialog')){const dialog=section.querySelector('dialog');if(document.body.classList.contains('embedded')){dialog.style.position='fixed';dialog.style.top=(b.getBoundingClientRect().top+40)+'px';dialog.style.bottom='auto';dialog.style.margin='0 auto';}dialog.showModal();}
if(b.closest('form')?.method==='dialog'){e.preventDefault();b.closest('dialog').close();}
if(b.hasAttribute('data-row')){section.querySelectorAll('[data-row]').forEach(el=>el.classList.remove('selected'));b.classList.add('selected')}
if(b.hasAttribute('data-tab')){const tabs=b.closest('.demo-tabs');tabs.querySelectorAll('[role=tab]').forEach(el=>{el.setAttribute('aria-selected',String(el===b));el.tabIndex=el===b?0:-1});const panel=tabs.querySelector('[role=tabpanel]');panel.querySelector('b').textContent=b.dataset.tab;panel.querySelector('p').textContent=b.dataset.tab==='Activity'?'Your latest changes and updates.':b.dataset.tab==='Settings'?'Everything you need to make it yours.':'Your workspace, ready to create.'}
if(b.hasAttribute('data-segment')||b.hasAttribute('data-day')){b.parentElement.querySelectorAll('button').forEach(el=>{el.setAttribute('aria-pressed',String(el===b));el.classList.toggle('ghost',el!==b)})}
if(b.dataset.select){const details=b.closest('details');details.querySelector('summary').firstChild.textContent=b.dataset.select+' ';details.open=false;details.querySelector('summary').focus()}
if(b.dataset.mode){document.documentElement.dataset.theme=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));document.querySelectorAll('[data-color-role]').forEach(el=>{el.querySelector('code').textContent=getComputedStyle(document.documentElement).getPropertyValue('--ts-'+el.dataset.colorRole).trim()})}
});
document.addEventListener('keydown',e=>{const b=e.target.closest('[role=tab]');if(b&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...b.parentElement.querySelectorAll('[role=tab]')];const i=tabs.indexOf(b);const next=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];next.click();next.focus()}if(e.key==='Escape')document.querySelectorAll('.select-demo[open]').forEach(el=>{el.open=false;el.querySelector('summary').focus()})});
document.addEventListener('input',e=>{if(e.target.hasAttribute('data-range'))e.target.closest('label').querySelector('output').value=e.target.value});
document.addEventListener('change',e=>{if(e.target.hasAttribute('data-check-all'))e.target.closest('table').querySelectorAll('tbody input').forEach(el=>el.checked=e.target.checked)});
document.addEventListener('submit',e=>{const f=e.target;if(f.method==='dialog')return;e.preventDefault();if(f.classList.contains('terminal-form')){const input=f.querySelector('input'),out=f.parentElement.querySelector('output'),v=input.value.trim();out.textContent=v.startsWith('echo ')?v.slice(5):v==='clear'?'':v?'Demo terminal: try echo hello.':'';input.value=''}else if(f.classList.contains('composer')){f.nextElementSibling.textContent='Preview message: '+f.querySelector('textarea').value;f.reset()}else {f.querySelector('output').textContent='Project created in this example.'}});
const report=()=>parent.postMessage({type:'themespace-fixture-height',url:location.href,height:Math.ceil(document.body.getBoundingClientRect().height)},'*');new ResizeObserver(report).observe(document.body);report();
`;
export function componentDocument(
  theme: Theme,
  mode: Appearance,
  tokenCSS = "",
  ids?: string[],
  embedded = false,
  extraCSS = "",
) {
  const fixtures = componentFixtures(theme, mode).filter(
    (f) => !ids || ids.includes(f.id),
  );
  return `<!doctype html><html lang="en" data-theme="${mode}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' file: 'unsafe-inline'; script-src 'unsafe-inline'; font-src data: https: http:; img-src data:; base-uri 'none'; form-action 'none'"/><title>${escapeHTML(theme.name)} — Component library</title>${tokenCSS ? `<style>${tokenCSS.replace(/<\/style/gi, "< /style")}</style>` : '<link rel="stylesheet" href="tokens.css"/>'}<style>${fixtureStyles}\n${(
    ["dark", "light"] as const
  )
    .filter((m) => theme.modes[m])
    .map(
      (m) =>
        `[data-theme="${m}"]{--demo-error-fg:${readableOn(resolve(theme, m).error)}}`,
    )
    .join(
      "",
    )}\n${extraCSS.replace(/<\/style/gi, "< /style")}</style></head><body class="${embedded ? "embedded" : ""}"><main>${
    embedded
      ? ""
      : `<header><div><small>YOUR REUSABLE DESIGN SYSTEM</small><h1>${escapeHTML(theme.name)}</h1><p class="muted">${escapeHTML(theme.description)}</p></div><div class="theme-modes">${(
          ["light", "dark"] as const
        )
          .filter((m) => theme.modes[m])
          .map(
            (m) =>
              `<button data-mode="${m}" class="secondary" aria-pressed="${mode === m}">${m}</button>`,
          )
          .join("")}</div></header>`
  }<div class="fixture-grid">${fixtures.map((f) => `<section class="fixture" id="${f.id}"><div class="fixture-heading"><small>${f.category}</small><h2>${f.name}</h2><p>${f.description}</p></div><div class="fixture-body">${f.html}</div></section>`).join("")}</div></main><div class="fixture-toast" role="status" aria-live="polite"></div><script>${fixtureScript}</script></body></html>\n`;
}
