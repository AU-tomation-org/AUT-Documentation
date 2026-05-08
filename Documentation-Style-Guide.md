# Documentation Style Guide

Rules for writing and maintaining documents in this repository.

---

## Language

All documents are written in **English**. No exceptions.

---

## File naming

- PascalCase words separated by hyphens: `Naming-Conventions.md`, `Pragmas-Monitoring-Visibility.md`
- Name describes the topic, not the audience or the date
- No version numbers in file names — use git history for versioning

---

## Document structure

Every document follows this layout:

```
# Title

One-line description of what this document covers.

---

## Section

Content.

---

## Section

Content.
```

- **H1** — document title, one per file
- **H2** — main sections; use a horizontal rule (`---`) before each one
- **H3** — subsections within a section, used sparingly
- No H4 or deeper

---

## Writing style

- Imperative and descriptive, not conversational
- Short sentences; one idea per sentence
- No filler phrases ("please note that", "it is important to", "as mentioned above")
- Prefer tables and bullet lists over prose for rules and comparisons
- Decision logic goes in a fenced code block (text diagram), not in prose

---

## Code blocks

Structured Text (IEC 61131-3) code blocks use triple backticks with **no language tag**:

````
```
{attribute 'monitoring' := 'call'}
PROPERTY InstancePath : STRING(1024)
```
````

Do not use ` ```pascal `, ` ```st `, or any other tag for Structured Text. Other languages (YAML, PowerShell, etc.) use their standard tag.

---

## Tables

Use tables for:
- Rule sets with two or more columns (condition / result, value / meaning)
- Comparisons between options
- Decision matrices

Keep table headers short (one or two words). Align the pipe characters for readability in raw Markdown.

---

## Examples

- Examples must come from actual AUT library code when available
- Reference the source: `Example from AUT_Core: ...`
- Show the minimal code needed to illustrate the point; omit unrelated declarations

---

## Decision guides

Summarise multi-branch rules as a text tree inside a fenced code block:

```
Condition A?
  -> result A

Condition B?
  -> result B1  [qualifier]
  -> result B2  [qualifier]
```

---

## Adding a document

1. Create the file in the repository root (or in a dedicated subfolder for multi-file topics)
2. Follow the file naming convention
3. Add a row to the index table in [README.md](README.md):

```
| [Title](Filename.md) | One-line description |
```

The description in README.md must fit on one line and match the first paragraph of the document.
