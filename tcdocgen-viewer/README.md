# TcDocGen Viewer

Enhanced HTML viewer for Beckhoff TcDocGen static documentation.

The source files live in `tcdocgen-viewer/` in this repo and are copied into each
project's `docs/<ProjectName>/` folder as part of the CI pipeline.

---

## Pipeline overview

```
TwinCAT XAE (TcDocGen)
        |
        | generates static HTML
        v
docs/<ProjectName>/            ← Beckhoff output (outer folder)
    <ProjectName>/             ← Beckhoff output (inner folder, same name)
        PLC/
            <ProjectName>.HTM
            <ProjectName>/
                DUTs/  GVLs/  POUs/  ...
    Tc3DocGenHtml.css          ← Beckhoff assets
    script.js
    index.html                 ← our viewer  (copied from tcdocgen-viewer/)
    inject.js                  ← our enhancer (copied from tcdocgen-viewer/)
    generate_manifest.py       ← our script   (copied from tcdocgen-viewer/)
        |
        | python generate_manifest.py
        v
    manifest.json              ← tree index consumed by index.html
        |
        | python -m http.server 8080  (local)
        | or gh-pages deploy (CI)
        v
    browser: index.html        ← interactive sidebar + iframe viewer
```

---

## Beckhoff output structure

When TcDocGen runs on a project named `AUT_Utilities`, it creates a **double-nested**
folder structure:

```
docs/
└── AUT_Utilities/          ← outer folder  (Beckhoff, named after the solution)
    ├── AUT_Utilities/      ← inner folder  (Beckhoff, same name — solution level)
    │   └── PLC/
    │       ├── AUT_Utilities.HTM   ← root page (anchor)
    │       └── AUT_Utilities/      ← content folder
    │           ├── DUTs/
    │           ├── GVLs/
    │           └── POUs/
    │               └── StringBuilder/
    │                   └── Classes/
    │                       └── StringBuilder/
    │                           ├── Append.HTM
    │                           └── ...
    ├── Tc3DocGenHtml.css           ← Beckhoff stylesheet
    └── script.js                   ← Beckhoff script
```

The three viewer files (`index.html`, `inject.js`, `generate_manifest.py`) are placed
**inside the outer folder** (`docs/AUT_Utilities/`), alongside `Tc3DocGenHtml.css`.

The `docs/index.html` at repository root is a one-line meta-refresh redirect:

```html
<meta http-equiv="refresh" content="0; url=AUT_Utilities/" />
```

---

## Setup (first time or after TcDocGen regenerates)

1. Copy `index.html`, `inject.js`, and `generate_manifest.py` from `tcdocgen-viewer/`
   into `docs/<ProjectName>/`.

2. Open a terminal inside `docs/<ProjectName>/` and run:

   ```
   python generate_manifest.py
   ```

   This creates `manifest.json` next to `index.html`.

3. Serve the folder with any static HTTP server (needed because `index.html` uses
   `fetch()` to load `manifest.json`):

   ```
   python -m http.server 8080
   ```

4. Open `http://localhost:8080/index.html` in a browser.

> Re-run `generate_manifest.py` every time TcDocGen regenerates the HTML files.

---

## CI / gh-pages deployment

The GitHub Actions workflow (`ci.yml`) deploys the `docs/` folder to the `gh-pages`
branch after a successful build.  The relevant step copies the entire `docs/` tree,
which already contains `manifest.json` (committed or generated inline).

```yaml
- name: Deploy documentation to gh-pages
  shell: powershell
  run: |
    $docsSource = "${{ github.workspace }}\docs"
    # ... clone gh-pages, copy $docsSource\*, push
```

The live documentation is then accessible at:

```
https://<org>.github.io/<repo>/<ProjectName>/
```

---

## Viewer architecture

### `index.html` — the shell

A single-page application with no build step and no dependencies.

| Component | Description |
|-----------|-------------|
| Sidebar | Collapsible tree built from `manifest.json`. Only the first two depth levels are expanded on load. Supports text search with match highlighting. Width is user-resizable via drag. |
| iframe | Loads each `.HTM` page from disk; sandboxed with `allow-scripts allow-same-origin`. |
| Breadcrumb | Tracks the current path through the tree; each segment is clickable. |
| Theme toggle | Light / dark switch; preference persisted in `localStorage`. Dark mode applies to the sidebar, the iframe content, and canvas class diagrams. |
| `postMessage` bus | The only communication channel between the iframe and the shell (required by the sandbox). |

Symbol colours follow the **VS Code Light+ / Dark+** palette: Function Blocks and Programs
use amber, Interfaces use blue, Functions use brown (light) / blue (dark), Methods use
amber/brown, Properties use blue.  Sidebar icons use the [Codicon](https://microsoft.github.io/vscode-codicons/) font.

Boot sequence:

1. `fetch('./manifest.json')` → parse tree
2. Build sidebar DOM from tree nodes (depth ≥ 2 collapsed by default)
3. Wait for user click → set `iframe.src` → on `load` → call `injectNav(node)`

### `inject.js` — the page enhancer

Injected into every `.HTM` page **after** it loads in the iframe.  It never modifies
files on disk.  Loaded with a `?v=Date.now()` cache-buster so browser updates are
always picked up without a hard refresh.

What it adds:

| Feature | Details |
|---------|---------|
| Sticky nav bar | Shows breadcrumb (⌂ / parent / current) and an "↑ Up" button. Styled to match Beckhoff's colour scheme (`#EF0000`). |
| Type badge | Detects `Function Block`, `Method`, `Interface`, etc. from the `<h1>` and shows a label. |
| Clickable method names | In the "Methods" / "Members" table, names that have their own child page become clickable links (navigates via `postMessage`). |
| Dark mode | Listens for `tc3nav:theme` messages from the shell and applies the `tc3nav-dark` class to the iframe document, overriding all Beckhoff hardcoded colours. Canvas class diagrams are redrawn in dark colours via `window.__tc3nav_redrawAll()`. |
| Banner suppression | Hides Beckhoff's `.header` div ("TwinCAT Documentation Generation"). |

bfcache / back-forward handling: when the browser restores a page from its cache,
`inject.js` sends `tc3nav:reinject` to the parent so the shell can re-inject the nav
info without reloading the page.

### `generate_manifest.py` — the tree builder

Scans the Beckhoff output folders and produces a single `manifest.json` that describes
the documentation tree.  The script must be run from inside the outer Beckhoff folder
(the one that contains `Tc3DocGenHtml.css`).

Key behaviour:

- Locates the inner solution folder (the second nesting level).  Older Beckhoff builds
  named this folder `<Project>_PRJ`; current builds use just `<ProjectName>`.  The
  script handles both via a name-match followed by a fallback to the first subfolder.
- Skips the `files/` folder (Beckhoff image assets).
- **Merges** a folder with an HTM file of the same name: e.g. `StringBuilder.HTM` +
  `StringBuilder/` become one tree node, with the methods as direct children.
- Outputs paths relative to the script location so they work with any HTTP server root.

---

## File reference

| File | Location in project | Purpose |
|------|---------------------|---------|
| `tcdocgen-viewer/index.html` | this repo | Master copy of the viewer shell |
| `tcdocgen-viewer/inject.js` | this repo | Master copy of the page enhancer |
| `tcdocgen-viewer/generate_manifest.py` | this repo | Master copy of the manifest builder |
| `docs/<ProjectName>/index.html` | each library repo | Working copy (deployed to gh-pages) |
| `docs/<ProjectName>/inject.js` | each library repo | Working copy |
| `docs/<ProjectName>/generate_manifest.py` | each library repo | Working copy |
| `docs/<ProjectName>/manifest.json` | each library repo | Generated — do not edit manually |
