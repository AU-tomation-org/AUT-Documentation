# New-GitHub-Repository

Interactive PowerShell script that creates a new AU-tomation GitHub repository from a TwinCAT solution directory. It handles the entire setup in one command: `git init`, `.gitignore`, CI workflow, initial commit, `gh repo create`, topics, branch protection, and homepage URL.

---

## Files

| File | Description |
|---|---|
| `New-AuRepo.ps1` | The interactive script |
| `ci.yml` | **Canonical CI/CD workflow template** — source of truth; mirrored to [CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/ci.yml](../CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/ci.yml) |

> **`New-GitHub-Repository/ci.yml` is the single source of truth.** When updating the template, edit this file and copy it to `CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/ci.yml`. A GitHub Actions workflow (`check-ci-template-sync.yml`) enforces that the two files stay identical and fails on any divergence.

---

## Prerequisites

| Tool | Notes |
|---|---|
| PowerShell 7+ | Required (`#Requires -Version 7`) |
| Git | Must be available in PATH |
| GitHub CLI (`gh`) | Must be authenticated: `gh auth login` |

---

## Local setup

Copy both files to a persistent scripts folder on the runner machine:

```powershell
# Example local layout:
# C:\Users\alber\scripts\New-AuRepo.ps1
# C:\Users\alber\scripts\ci.yml
```

The script looks for `ci.yml` in the **same folder** as itself (`$scriptDir\ci.yml`).

---

## Usage

Run from the root of the TwinCAT solution directory (where the `.sln` file is):

```powershell
cd "C:\TwinCAT projects\AUT_MyLib"
C:\Users\alber\scripts\New-AuRepo.ps1
```

The script is interactive and prompts for:

| Prompt | Default | Notes |
|---|---|---|
| Repository name | Guessed from `.sln` file | e.g. `AUT_MyLib` |
| Description | — | Short repo description |
| Visibility | `private` | Type `public` to override |
| Topics | — | Space-separated, e.g. `twincat beckhoff plcopen` |

A confirmation prompt is shown before any action is taken.

---

## What the script does

1. **`git init`** — initialises a new git repository on branch `master` (skipped if already initialised)
2. **`.gitignore`** — creates a TwinCAT-specific ignore file (skipped if already present):
   ```
   _Boot/
   _CompileInfo/
   _Libraries/
   *.~*
   ```
3. **`ci.yml`** — copies the template to `.github/workflows/ci.yml`
4. **Initial commit** — stages and commits all files
5. **`gh repo create`** — creates the repository on `AU-tomation-org` and pushes
6. **Topics** — applies each topic via `gh repo edit --add-topic`
7. **Homepage** — sets the URL to the auto-generated gh-pages address: `https://au-tomation-org.github.io/<repo>/<repo>/`
8. **Branch protection** — requires the CI job `build` to pass before merging to `master`

---

## After the first CI run

Once the first CI run completes successfully and the `gh-pages` branch exists, enable GitHub Pages:

```powershell
gh api repos/AU-tomation-org/<repo>/pages --method POST --field source[branch]=gh-pages --field source[path]=/
```

---

## Options

The script accepts one optional parameter:

```powershell
# Use a different GitHub organization
C:\Users\alber\scripts\New-AuRepo.ps1 -Org "my-other-org"
```

---

## ci.yml template notes

The bundled `ci.yml`:

- **`SOLUTION_NAME`** is auto-detected from the `.sln` file in the repository root — no manual configuration needed
- **SARIF file** is auto-detected after `TcCIBuilder` runs — resolves the library/solution name mismatch (see Issue 14 in [CI/CD README](../CI-CD-GitHub-TwinCAT-Self-Hosted-Runner/README.md))
- **C# project** is auto-detected (step 3 scans for `.csproj`); steps 4, 5, and 19 run automatically only when a C# project is found — no manual configuration needed
