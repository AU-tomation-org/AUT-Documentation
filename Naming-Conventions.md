# Naming Conventions

These conventions apply to all AUT libraries written in IEC 61131-3 Structured Text.

## POUs and DUTs

- No prefix. First letter uppercase (PascalCase).
- Examples: `LogClient`, `MetricBuffer`, `TraceEntry`

## Interfaces

- Prefix `I` (uppercase, no underscore, no space) followed by PascalCase.
- Examples: `ILogger`, `IMetricWriter`

## Local Variables

- All variables declared between `VAR` / `END_VAR` are prefixed with a single underscore.
- No Hungarian notation (no type prefix such as `fb`, `b`, `n`, `s`).
- Examples: `_buffer`, `_state`, `_sendTimer`

## Structs

- No prefix. First letter uppercase (PascalCase).
- Members use no Hungarian notation.
- Examples: `LogEntry { timestamp, level, source, message }`

## Enums and Other Types

- No prefix. First letter uppercase (PascalCase).
- Members use no Hungarian notation.
- Examples: `LogLevel { Debug, Info, Warning, Error, Fatal }`
