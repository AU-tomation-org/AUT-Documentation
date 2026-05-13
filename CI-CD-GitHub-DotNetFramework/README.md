# CI/CD with GitHub Actions for .NET Framework projects

## When to use this

Use `ci-dotnetframework.yml` when the repository contains a **pure .NET Framework project** with no TwinCAT XAE solution.

| Scenario | Workflow to use |
|---|---|
| TwinCAT 3 library / application (with or without C#) | [`CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/ci.yml`](../CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/ci.yml) |
| Pure .NET Framework project (no TwinCAT) | `ci-dotnetframework.yml` ← this folder |

Typical examples: standalone C# tools, Windows services, console utilities that are part of the AU-tomation infrastructure but have no TwinCAT dependency (e.g. `TcCIBuilder` itself).

---

## What the workflow does

| Step | Name | Description |
|---|---|---|
| 1 | Checkout | `actions/checkout@v4` |
| 2 | Find solution file | Auto-detects the `.sln` filename; exports `SOLUTION_NAME` |
| 3 | Build solution | MSBuild Release\|x64; tees output to `build.log` |
| 4 | Upload build log | Uploads `build.log` as artifact (always) |
| 5 | Upload build output | Uploads compiled binaries as `<SOLUTION_NAME>-bin` artifact |
| 6 | Detect version | Reads `AssemblyFileVersion` from `AssemblyInfo.cs`; falls back to `<Version>` in `.csproj` |
| 7 | Publish release | Zips the build output and creates / updates a GitHub Release tagged `<SOLUTION_NAME>-v<version>` |

---

## Prerequisites

The runner must have:

| Component | Notes |
|---|---|
| Visual Studio 2022 | Enterprise or Professional — provides MSBuild at `C:\Program Files\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe` |
| GitHub CLI (`gh`) | For release creation |

The workflow uses the `[self-hosted, windows]` runner label (does **not** require TwinCAT). It can also run on `windows-latest` (GitHub-hosted) if the MSBuild path is adjusted or replaced with `dotnet build`.

---

## Setup

1. Copy `ci-dotnetframework.yml` to `.github/workflows/` in the target repository.
2. Adjust the `env` block if needed:

```yaml
env:
  BUILD_CONFIG:   Release
  BUILD_PLATFORM: x64          # change to AnyCPU if applicable
  OUTPUT_SUBPATH: bin\x64\Release  # path inside the project folder
```

3. Ensure the project has either `AssemblyFileVersion` in `AssemblyInfo.cs` or a `<Version>` tag in the `.csproj` — the workflow needs one of these to name the release.

---

## File reference

| File | Description |
|---|---|
| `README.md` | This document |
| `ci-dotnetframework.yml` | Workflow template for .NET Framework projects |
