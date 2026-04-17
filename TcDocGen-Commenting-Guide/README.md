# TcDocGen Commenting Guide

Guide to writing documentation comments in TwinCAT 3 Structured Text for automatic documentation generation with TE1030 TcDocGen.

For setup, CI/CD integration, and known tool limitations see [TcDocGen.md](../TcDocGen.md).

---

## Delimiters

Two comment delimiters activate markup processing:

| Delimiter | Type | When to use |
|---|---|---|
| `//!` | Single-line | Inline variable comments and one-line markups |
| `(*! ... *)` | Multi-line | Summary, Description, Example blocks with multiple lines |

Regular ST comments (`//` and `(* *)`) are **never** included in the generated documentation.

---

## Markup Reference

All markups are XML-based. Each markup has a **normal form** (XML tags) and an **abbreviated form** (leading `@`).

### Top-level markups

These three markups define the main sections of the generated page. They can appear in any part of the code (declaration or body). Multiple `<description>` and `<example>` blocks are merged in order; only the **first** `<summary>` block is used.

| Markup | Abbreviated | Description |
|---|---|---|
| `<description> </description>` | `@description` | One or more description blocks, all merged into one section |
| `<summary> </summary>` | `@summary` | Summary of the element. Only first occurrence is output |
| `<example> </example>` | `@example` | Usage example. Multiple blocks shown one after the other |

### Structural markups (inside description / summary / example)

These markups must be embedded inside a `<description>`, `<summary>`, or `<example>` block.

| Markup | Abbreviated | Description |
|---|---|---|
| `<h1> </h1>` ... `<h6> </h6>` | - | Headings up to level 6 |
| `<ul> </ul>` | `@ul` | Unordered (bullet) list |
| `<ol> </ol>` | `@ol` | Ordered (numbered) list |
| `<li> </li>` | - | List item (inside `<ul>` or `<ol>`) |
| `<table> </table>` | - | Table |
| `<tr> </tr>` | - | Table row |
| `<th> </th>` | - | Table header cell |
| `<td> </td>` | - | Table data cell |
| `<code> </code>` | `@code` | Block of source code (monospace, formatted) |
| `<literal> </literal>` | `@literal` | Plain text -- XML tags inside are not interpreted |
| `<note type=""> </note>` | - | Callout box. Types: `hazard`, `warning`, `information` |
| `<image uri=""> </image>` | - | Embedded image (see [Images](#images)) |
| `<see uri=""> </see>` | `@see` | Hyperlink inline in the text |
| `<seealso uri=""> </seealso>` | `@seealso` | Hyperlink on a new line (after a line break) |
| `<audience type=""> </audience>` | - | Content shown only for a specific audience (`general` or `internal`) |
| `<preliminary> </preliminary>` | `@preliminary` | Marks a section as provisional / subject to change |

### Inline character formats (inside description / summary / example)

| Markup | Description |
|---|---|
| `<b> </b>` | Bold |
| `<i> </i>` | Italic |
| `<u> </u>` | Underline |
| `<c> </c>` | Inline code -- use for variable names and identifiers referenced in text |

### Cross-references

Use `$ElementName` inside a description, summary, or example to create an automatic hyperlink to another documented element. For elements outside the current code element, use the fully qualified name.

```
//!@description See also $FB_LogClient for the client-side API.
```

### Parameter markup (standalone)

`@param` stands alone -- it does not need to be inside a description block. It describes a specific variable by name and populates the Comment column in the Members table.

Normal form:
```
//!<param name="MyVar">Description of MyVar</param>
```

Abbreviated form:
```
//!@param MyVar Description of MyVar
```

> **Note:** All occurrences of the variable name within the param text are silently removed by TcDocGen. For example, `//!@param Count Count of buffered entries` renders as "of buffered entries". Prefer `//!` inline comments for this reason (see [Variable comments](#variable-comments)).

---

## Variable Comments

The `//!` delimiter on a variable declaration line populates the **Comment** column in the Members table.

```
VAR_INPUT
    Level    : LogLevel;    //! Severity level of the log entry
    Message  : STRING(255); //! Log message text
    Source   : STRING(64);  //! Identifier of the emitting component
END_VAR
```

**Rules:**

- Use `//!` on the same line as the variable declaration.
- Variables without a `//!` comment are **not listed** in the Members table. A plain `//` comment is ignored.
- Keep the comment short -- it appears in a table column.
- Do not use `@param` for variable documentation. Prefer `//!` inline.
- For methods and properties, the `//!` comment goes on the **same line as the return type** in the declaration header (see [Methods](#methods)).

---

## Rules by Element Type

### PRG, FB, FUN, Interface

**Summary** -- place at the very top of the declaration, before the element keyword:

```
(*! <summary>
Buffers log entries produced by the application and sends them to the
Loki endpoint at configurable intervals.
</summary> *)
FUNCTION_BLOCK LogClient
VAR_INPUT
    ...
END_VAR
```

Or one-liner form:

```
//! @summary Accumulates log entries and forwards them to Loki at configurable intervals.
FUNCTION_BLOCK LogClient
```

**Description** -- place in the body, before the implementation code:

```
(*! <description>
LogClient accumulates entries in an internal ring buffer. On each PLC cycle,
if the send interval has elapsed and the buffer is non-empty, it serialises
the entries and writes them to the ADS pipe consumed by the C# bridge service.
<note type="information">Set SendInterval := T#0S to disable automatic sending
and drive sending manually via Send().</note>
</description> *)
```

**Variables** -- comment every public variable (`VAR_INPUT`, `VAR_OUTPUT`, `VAR_IN_OUT`) with `//!`:

```
VAR_INPUT
    SendInterval : TIME := T#10S; //! Interval between automatic send attempts
    AmsNetId     : T_AmsNetIdArr; //! AMS Net ID of the ADS server
    AmsPort      : UINT;          //! ADS port of the bridge service
END_VAR
VAR_OUTPUT
    BufferCount  : UDINT;         //! Number of entries currently in the buffer
    Dropped      : UDINT;         //! Entries dropped due to buffer overflow
    Error        : BOOL;          //! TRUE if the last send attempt failed
END_VAR
```

Local variables (`VAR`) are listed in the documentation. If you do not want internal implementation variables to be visible, do not add `//!` to them.

**Example** -- add an `<example>` block in the declaration when a usage snippet adds value:

```
(*! <example>
Minimal setup -- declare an instance and call it every cycle:
<code>
_LogClient : LogClient := (SendInterval := T#10S, AmsPort := 10000);

// in the task body:
_LogClient();
_LogClient.LogInfo('Cycle started', 'MAIN');
</code>
</example> *)
```

---

### Methods

Methods do not have a Declaration section in the generated page. The return type comment and variable comments are the only structured documentation available.

**Return value comment** -- place `//!` on the same line as the return type:

```
METHOD Send : BOOL   //! Returns TRUE if the send succeeded, FALSE on ADS error
VAR_INPUT
    ...
END_VAR
```

**Input/output variables** -- same `//!` inline rule as for FBs:

```
METHOD Push : BOOL   //! TRUE if the entry was accepted, FALSE if the buffer is full
VAR_INPUT
    LogEntry : LogEntry; //! Entry to add to the buffer
END_VAR
```

**Description** -- add a `<description>` in the method body when the behaviour is not obvious from the name:

```
(*! <description>
Pushes one entry into the ring buffer. If the buffer is full, the oldest
entry is silently dropped and <c>Dropped</c> is incremented.
</description> *)
```

> **Note:** The Comment column in the Methods table on the parent FB page is populated by the `//!` comment on the return type line of the method declaration. Without it, the column is empty.

---

### Properties

Properties follow the same rules as methods for the return type comment:

```
PROPERTY BufferCount : UDINT   //! Number of entries currently queued
```

**Getter and Setter** are documented individually. In the generated HTML they are listed as type *Unknown* -- this is a known tool limitation. Add a `<description>` in the getter body to document read semantics, and in the setter body to document write semantics if they differ.

> **Note:** Private properties are still listed in the Properties table. There is currently no way to hide them via markup.

---

### DUT (Struct, Enum, Alias, Union)

**Summary** -- place before the `TYPE` keyword:

```
(*! <summary>
A single log entry carrying severity, message text, and source identifier.
</summary> *)
TYPE LogEntry :
STRUCT
    Level   : LogLevel;      //! Severity level
    Message : STRING(255);   //! Log message text (truncated if longer)
    Source  : STRING(64);    //! Identifier of the emitting component
END_STRUCT
END_TYPE
```

Comment every field with `//!`. Fields without a comment are not listed in the Members table.

For enums, comment each value:

```
TYPE LogLevel : (
    Verbose := 0, //! Verbose -- lowest severity, high-frequency diagnostic data
    Debug   := 1, //! Debug -- diagnostic information useful during development
    Info    := 2, //! Info -- normal operational events
    Warning := 3, //! Warning -- unexpected condition, operation continues
    Error   := 4, //! Error -- operation failed, intervention may be needed
    Fatal   := 5  //! Fatal -- unrecoverable failure
) DINT;
END_TYPE
```

---

### GVL (Global Variable List)

**Summary** -- place before `VAR_GLOBAL`:

```
(*! <summary>
Global constants shared across the AUT_LGTM library.
</summary> *)
{attribute 'qualified_only'}
VAR_GLOBAL CONSTANT
    MaxMessages : UDINT := 100; //! Maximum number of log entries per buffer
    MaxSpans    : UDINT := 32;  //! Maximum number of trace spans per trace
END_VAR
```

Comment every constant or variable with `//!`. Constants without a comment are not listed.

---

## Formatting Inside Description / Summary / Example

### Headings

```
(*! <description>
<h2>Operating modes</h2>
Normal mode sends entries automatically at each SendInterval.
<h2>Error handling</h2>
On ADS error, Error is set TRUE and the buffer is not cleared.
</description> *)
```

### Lists

```
(*! <description>
Supported severity levels:
<ul>
<li>Verbose -- high-frequency diagnostic data</li>
<li>Debug -- development-time diagnostics</li>
<li>Info -- normal events</li>
<li>Warning -- unexpected but non-fatal condition</li>
<li>Error -- operation failed</li>
<li>Fatal -- unrecoverable failure</li>
</ul>
</description> *)
```

### Tables

```
(*! <description>
<table>
<tr><th>Parameter</th><th>Default</th><th>Description</th></tr>
<tr><td>SendInterval</td><td>T#10S</td><td>Time between automatic sends</td></tr>
<tr><td>AmsPort</td><td>0</td><td>ADS port of the bridge service</td></tr>
</table>
</description> *)
```

### Inline code and variable references

Use `<c>` to refer to a variable or element name inline in running text:

```
//!@description When <c>BufferCount</c> reaches <c>MaxMessages</c>, the oldest entry is dropped.
```

Use `<code>` for a block of ST code:

```
(*! <description>
Increment the counter and log the value:
<code>
_Counter := _Counter + 1;
_LogClient.LogInfo(UDINT_TO_STRING(_Counter), 'MAIN');
</code>
</description> *)
```

### Notes and callouts

```
(*! <description>
Sends all buffered entries in a single ADS write call.
<note type="warning">Do not call Send() faster than every 100 ms. The ADS pipe
has finite capacity; flooding it causes entries to be silently dropped by the OS.</note>
</description> *)
```

Note types: `information` (blue), `warning` (yellow), `hazard` (red).

### Links

Inline link within text:
```
//!@description For protocol details see <see uri="https://opentelemetry.io/docs/specs/otlp/">OTLP specification</see>.
```

Link on a separate line:
```
//!@description Refer to the bridge service documentation.
<seealso uri="https://github.com/AU-tomation-org/AUT_Tc3LGTM">AUT_Tc3LGTM repository</seealso>
```

### Cross-references

```
//!@description Entries are buffered internally; see $LogBuffer for buffer behaviour.
```

The `$` prefix causes TcDocGen to search for the named element in the project and generate a hyperlink. Use the fully qualified name for elements in other namespaces: `$AUT_LGTM.LogBuffer`.

### Audience filtering

Mark content that should only appear in internal builds:

```
(*! <description>
Public description visible to all users.
<audience type="internal">Internal note: the ring buffer uses a fixed-size array.
Changing MaxMessages requires rebuilding and reinstalling the library.</audience>
</description> *)
```

Set the **Audience** dropdown in the TE1030 generation settings accordingly:
- `No audience restriction` -- all content shown
- `general` -- audience-tagged internal content hidden
- `internal` -- audience-tagged internal content shown

### Images

Create a folder named `Images` inside the PLC project folder in the TwinCAT Solution Explorer. Drag image files into it.

Reference the image inside a description, summary, or example:

```
(*! <description>
State machine overview:
<image uri="StateMachine.png">State machine diagram</image>
</description> *)
```

For images in a subfolder:
```
<image uri="Diagrams/StateMachine.png">State machine diagram</image>
```

The replacement text is shown if the image cannot be displayed. Scale with `width` and `height` attributes:

```
<image uri="StateMachine.png" width="50" height="30">State machine diagram</image>
```

---

## Library Project Setup

For documentation to be embedded in a `.library` file and visible in the TwinCAT Library Manager, the project must be configured as follows:

1. Right-click the PLC project node in Solution Explorer and select **Properties**.
2. In the **Common** tab, fill in **Company**, **Title**, and **Version**.
3. Set **Documentation format** to **TcDocGen**.
4. Build, save as library, and install.

Without this setting, the documentation tab in the Library Manager will be empty even if all markup is present.

---

## Non-Documentation Comments

For all code comments that are not intended for the generated documentation:

- Prefer single-line `//` comments (C# style).
- Use multi-line `(* ... *)` only for long explanatory blocks that need line breaks or formatting.
- Never use `//!` or `(*! ... *)` for internal implementation notes -- they will appear in the generated documentation.

---

## Known Limitations

| Issue | Behaviour | Workaround |
|---|---|---|
| `<summary>` used more than once | Only the first occurrence is rendered | Write the summary once at the top of the declaration |
| Getter / Setter type in Overview | Shown as *Unknown* instead of Get/Set | Add a `<description>` in the getter/setter body to clarify |
| Access Modifier sometimes missing | Shown as empty even when `PUBLIC` is explicit | Known tool bug; no workaround |
| `@param` removes variable name from text | All occurrences of the variable name are stripped | Use `//!` inline instead of `@param` |
| Private methods and properties listed | Members table shows private members | No markup to suppress them; use naming convention to signal visibility |
| Line breaks in text | `\n` and blank lines in markup text are ignored | Use `<h1>`-`<h6>` or structural markup to separate content |
| Methods/Properties Comment column | Populated by `//!` on the return type line only | Always add `//!` to the return type in method/property declarations |
| DUT field comments for non-struct types | Alias and union members may not render comments | Verify with preview; add `<description>` as fallback |
