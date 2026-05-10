"""
generate_manifest.py
────────────────────
Run this script ONCE from the outer Beckhoff documentation folder — the one
that contains index.html, inject.js, Tc3DocGenHtml.css, and script.js.

    python generate_manifest.py

Generates manifest.json, which index.html uses to build the sidebar tree
without needing directory listing (Python's http.server suppresses listings
when an index.html is present in the folder).

Re-run every time TcDocGen regenerates the HTML files.

──────────────────────────────────────────────────────────────────────────────
Expected folder layout (Beckhoff TcDocGen output, double-nested structure)
──────────────────────────────────────────────────────────────────────────────

  <outer>/                      ← run the script from here (this folder)
    <ProjectName>/              ← inner folder produced by TcDocGen (same name)
        PLC/
            <ProjectName>.HTM   ← root anchor page
            <ProjectName>/      ← content folder
                DUTs/
                GVLs/
                POUs/
                    MyFB.HTM
                    MyFB/
                        Method1.HTM
                        Method2.HTM
    Tc3DocGenHtml.css
    script.js
    index.html                  ← viewer (this file's sibling)
    inject.js
    generate_manifest.py        ← this script
    manifest.json               ← output (created/overwritten by this script)

Note on the _PRJ naming: older Beckhoff builds named the inner folder
<ProjectName>_PRJ. Current builds omit the suffix. The script handles both:
it first searches for a folder containing "_PRJ" in its name; if none is
found it falls back to the first non-skipped subfolder.
"""

import os
import re
import json

# Folders to skip entirely (Beckhoff stores image/CSS assets here)
SKIP_FOLDERS = {'files'}

# File extensions treated as documentation pages
DOC_EXTENSIONS = {'.htm', '.html'}

# Ordered so longer prefixes are checked before shorter ones
_TYPE_MAP = [
    ('function block',       'fb'),
    ('global variable list', 'gvl'),
    ('interface',            'interface'),
    ('method',               'method'),
    ('function',             'function'),
    ('program',              'program'),
    ('property',             'property'),
    ('action',               'action'),
]

_ACCESS_MAP = {
    'PRIVATE':   'private',
    'PROTECTED': 'protected',
    'INTERNAL':  'internal',
}

def parse_htm_meta(htm_path):
    """Returns (kind, visibility) by reading the HTM file once."""
    kind = 'unknown'
    visibility = 'public'
    try:
        with open(htm_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read(5000)

        m = re.search(r'<h1[^>]*\bid="([^"]+)"', content, re.IGNORECASE)
        if m:
            raw = m.group(1).lower()
            for prefix, k in _TYPE_MAP:
                if raw.startswith(prefix + ' '):
                    kind = k
                    break

        m2 = re.search(
            r'Access Modifier[^<]*</th>\s*<td[^>]*>\s*<font[^>]*>([^<]*)</font>',
            content, re.IGNORECASE | re.DOTALL
        )
        if m2:
            mod = m2.group(1).strip().upper()
            visibility = _ACCESS_MAP.get(mod, 'public')
    except Exception:
        pass
    return kind, visibility


def scan(folder_path, base_path):
    """
    Recursively scans folder_path and returns a tree node dict.

    Merge rule: if a folder has the same name (case-insensitive) as an HTM
    file in the same directory, the folder's children are attached directly to
    the HTM file node, removing the intermediate folder level.

    Example:
        StringBuilder.HTM  +  StringBuilder/   ->  node "StringBuilder"
                                                      children: Append, Reset, ...
    """
    name = os.path.basename(folder_path)
    node = {"name": name, "path": None, "children": []}

    try:
        entries = sorted(os.scandir(folder_path), key=lambda e: (e.is_dir(), e.name.lower()))
    except PermissionError:
        return node

    htm_files = {}  # stem_lower -> file_node dict
    subdirs   = []  # directory entries for second pass

    for entry in entries:
        if entry.name.startswith('.'):
            continue

        if entry.is_file():
            ext = os.path.splitext(entry.name)[1].lower()
            if ext in DOC_EXTENSIONS:
                rel = os.path.relpath(entry.path, base_path).replace('\\', '/')
                stem = os.path.splitext(entry.name)[0]
                k, vis = parse_htm_meta(entry.path)
                file_node = {"name": stem, "path": rel, "kind": k, "visibility": vis, "children": []}
                htm_files[stem.lower()] = file_node
                node["children"].append(file_node)

        elif entry.is_dir():
            if entry.name not in SKIP_FOLDERS:
                subdirs.append(entry)

    for entry in subdirs:
        child = scan(entry.path, base_path)
        if not (child["children"] or child["path"]):
            continue  # empty folder — skip

        key = entry.name.lower()
        if key in htm_files:
            # Merge: lift the folder's children under the matching HTM node
            htm_files[key]["children"].extend(child["children"])
        else:
            node["children"].append(child)

    return node


def find_inner_folder(base_path):
    """
    Finds the inner solution folder produced by TcDocGen.

    Modern Beckhoff builds create a folder with the same name as the project
    (e.g. AUT_Utilities/).  Older builds appended _PRJ to that name.  Both
    variants are handled: _PRJ match takes priority, then falls back to the
    first non-skipped subfolder.
    """
    # Priority: folder whose name contains _PRJ (legacy Beckhoff naming)
    for entry in os.scandir(base_path):
        if entry.is_dir() and '_PRJ' in entry.name.upper():
            return entry.path

    # Fallback: first non-skipped subfolder (modern Beckhoff naming)
    for entry in sorted(os.scandir(base_path), key=lambda e: e.name.lower()):
        if entry.is_dir() and entry.name not in SKIP_FOLDERS:
            return entry.path

    return None


def build_manifest(base_path):
    """
    Builds the manifest tree starting from base_path (the outer folder).

    Structure traversed:
        base_path/
            <inner>/           ← found by find_inner_folder()
                PLC/
                    <Name>.HTM ← becomes the root node
                    <Name>/    ← content folder whose children become root children
    """
    inner_path = find_inner_folder(base_path)
    if not inner_path:
        raise RuntimeError(f"No inner solution folder found in: {base_path}")

    plc_path = os.path.join(inner_path, 'PLC')
    if not os.path.isdir(plc_path):
        raise RuntimeError(f"PLC folder not found in: {inner_path}")

    # Locate the anchor HTM and the content folder directly under PLC/
    anchor_file    = None
    content_folder = None
    for entry in os.scandir(plc_path):
        if entry.is_file() and entry.name.lower().endswith('.htm'):
            anchor_file = entry
        elif entry.is_dir():
            content_folder = entry.path

    if not anchor_file:
        raise RuntimeError(f"No HTM anchor file found in: {plc_path}")

    anchor_rel  = os.path.relpath(anchor_file.path, base_path).replace('\\', '/')
    anchor_name = os.path.splitext(anchor_file.name)[0]

    root = {
        "name":     anchor_name,
        "path":     anchor_rel,
        "isRoot":   True,
        "children": []
    }

    if content_folder:
        try:
            entries = sorted(os.scandir(content_folder), key=lambda e: (e.is_dir(), e.name.lower()))
        except PermissionError:
            entries = []

        for entry in entries:
            if entry.name.startswith('.'):
                continue
            if entry.is_dir() and entry.name not in SKIP_FOLDERS:
                child = scan(entry.path, base_path)
                if child["children"]:
                    root["children"].append(child)
            elif entry.is_file() and entry.name.lower().endswith('.htm'):
                rel = os.path.relpath(entry.path, base_path).replace('\\', '/')
                k, vis = parse_htm_meta(entry.path)
                root["children"].append({
                    "name":       os.path.splitext(entry.name)[0],
                    "path":       rel,
                    "kind":       k,
                    "visibility": vis,
                    "children":   []
                })

    return root


def find_version(base_path):
    """Walk the tree looking for Global_Version.HTM and extract sVersion."""
    for root, dirs, files in os.walk(base_path):
        dirs[:] = [d for d in dirs if d not in SKIP_FOLDERS]
        for fname in files:
            if fname.lower() == 'global_version.htm':
                try:
                    with open(os.path.join(root, fname), 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    m = re.search(r"sVersion\s*:=\s*'([^']+)'", content)
                    if m:
                        return m.group(1)
                except Exception:
                    pass
    return None


if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    print(f"Scanning from: {base}")

    try:
        manifest = build_manifest(base)
        version = find_version(base)
        if version:
            manifest['version'] = version
        out_path = os.path.join(base, 'manifest.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)

        def count_pages(node):
            n = 1 if node.get('path') else 0
            for c in node.get('children', []):
                n += count_pages(c)
            return n

        total = count_pages(manifest)
        print(f"OK  manifest.json generated — {total} pages indexed.")
        print(f"    Start the server : python -m http.server 8080")
        print(f"    Then open        : http://localhost:8080/index.html")

    except Exception as e:
        print(f"ERROR: {e}")
        raise
