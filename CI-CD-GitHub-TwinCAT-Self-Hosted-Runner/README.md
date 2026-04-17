# CI/CD with GitHub Actions for TwinCAT — Organization Self-Hosted Runner

## Overview

This document describes the complete setup, architecture decisions, known issues, and maintenance procedures for the AU-tomation organization's self-hosted GitHub Actions runner (`win-twincat-01`), used to run CI/CD pipelines for TwinCAT 3 projects.

---

## Why a Self-Hosted Runner?

GitHub-hosted runners cannot be used for TwinCAT CI/CD because:

1. **TwinCAT Automation Interface (COM)** — `TcCIBuilder.exe` uses TwinCAT's COM automation interface to open solutions, build projects, generate documentation, and run static analysis. This requires a Windows machine with TwinCAT XAE installed and licensed.
2. **TwinCAT License** — TwinCAT runtime and XAE licenses are machine-bound and cannot be installed on ephemeral cloud runners.
3. **TwinCAT User Mode Runtime (UmRT)** — Some workflows interact with a running TwinCAT runtime (e.g., for TcUnit test execution), which must be locally available.

---

## Architecture Decision: Task Scheduler vs. Windows Service

> **CRITICAL**: The runner MUST be run via Windows Task Scheduler, NOT as a Windows Service.

### Why not a Windows Service?

Windows services run in **Session 0**, which is a non-interactive, isolated desktop session. TwinCAT's COM Automation Interface (used by `TcCIBuilder.exe`) requires an **interactive desktop session** to:

- Launch the TwinCAT XAE shell (Visual Studio automation)
- Initialize TwinCAT automation COM objects
- Access the TwinCAT runtime

When running as a service — even with a specific user account — the error is:

```
ERROR: CRITICAL: Retrieving the COM class factory for component with
CLSID {33ABD590-0400-4FEF-AF98-5F5A8A99CFC3} failed: 80070005 Access is denied.
```

If the service does start and TcCIBuilder reaches TwinCAT, it will hang indefinitely on:

```
Waiting for TwinCAT to stabilize...
```

### Why Task Scheduler works

A scheduled task configured with `LogonType = Interactive` runs in the user's interactive desktop session (Session 1+), giving full access to the COM automation objects that TwinCAT requires.

### Why not just run manually?

Running `run.cmd` manually each time is impractical:

- The runner must be restarted every time the VM reboots
- If the runner is offline for an extended period, its **authentication credentials expire** and GitHub removes it from the organization's runner list, requiring full re-registration

---

## Prerequisites

On the runner VM (`DESKTOP-GQKMFOA`), the following must be installed and configured:

| Component | Notes |
|---|---|
| Windows 10/11 (x64) | — |
| TwinCAT 3 XAE | With valid licenses (TC1000, TC1300, etc.) |
| TwinCAT 3 UmRT | Active runtime for test execution |
| Git for Windows | Available at `C:\Program Files\Git\` |
| TcCIBuilder.exe | Installed at `C:\actions-runner\_tools\TcCIBuilder\` |
| GitHub CLI (`gh`) | For token generation and runner management |

---

## Initial Setup

### Step 1 — Authenticate GitHub CLI with org admin scope

The `admin:org` scope is required to manage organization runners.

```powershell
gh auth login
gh auth refresh -h github.com -s admin:org
```

### Step 2 — Generate a runner registration token

```powershell
gh api --method POST orgs/AU-tomation-org/actions/runners/registration-token
```

Note the `token` value — it expires in **1 hour**.

### Step 3 — Download and extract the runner

If `C:\actions-runner` does not exist or needs a fresh install:

```powershell
# Check latest version at https://github.com/actions/runner/releases
$version = "2.333.1"
$url = "https://github.com/actions/runner/releases/download/v$version/actions-runner-win-x64-$version.zip"

New-Item -ItemType Directory -Force -Path C:\actions-runner
Invoke-WebRequest -Uri $url -OutFile C:\actions-runner\actions-runner.zip
Expand-Archive -Path C:\actions-runner\actions-runner.zip -DestinationPath C:\actions-runner -Force
Remove-Item C:\actions-runner\actions-runner.zip
```

### Step 4 — Register the runner

Open **cmd as administrator** in `C:\actions-runner`.

> **Do NOT use `--runasservice`** — see Architecture Decision above.

```cmd
config.cmd --url https://github.com/AU-tomation-org ^
           --token <TOKEN_FROM_STEP_2> ^
           --name win-twincat-01 ^
           --labels self-hosted,Windows,twincat ^
           --unattended
```

### Step 5 — Run the automated setup script

Run `scripts\setup-runner.ps1` in **PowerShell as administrator** to configure execution policy, git safe.directory, and the scheduled task in one step:

```powershell
.\scripts\setup-runner.ps1 -RunnerUser "alber"
```

See [scripts/setup-runner.ps1](scripts/setup-runner.ps1) for details.

### Step 6 — Start the runner

```powershell
Start-ScheduledTask -TaskName "GitHubActionsRunner"
```

### Step 7 — Verify

```powershell
gh api orgs/AU-tomation-org/actions/runners
```

The runner should show `"status": "online"`.

---

## Runner Re-registration

If GitHub removes the runner (credentials expired after prolonged VM downtime), use the re-registration script:

```powershell
# Generate a new token first
gh api --method POST orgs/AU-tomation-org/actions/runners/registration-token

# Then run (as administrator)
.\scripts\re-register-runner.ps1 -Token "<NEW_TOKEN>"
```

See [scripts/re-register-runner.ps1](scripts/re-register-runner.ps1) for details.

---

## Maintenance

### After VM reboot

The scheduled task triggers automatically when `alber` logs in interactively. No manual action required.

### Manage the scheduled task manually

```powershell
Start-ScheduledTask      -TaskName "GitHubActionsRunner"
Stop-ScheduledTask       -TaskName "GitHubActionsRunner"
Get-ScheduledTask        -TaskName "GitHubActionsRunner"
Unregister-ScheduledTask -TaskName "GitHubActionsRunner" -Confirm:$false
```

### Check runner status

```powershell
gh api orgs/AU-tomation-org/actions/runners
```

### Clean up old runner version folders

After a runner auto-update, old versioned folders accumulate in `C:\actions-runner`:

```powershell
# Check which version is currently active
(Get-Item C:\actions-runner\bin).Target

# List all versioned folders
Get-ChildItem C:\actions-runner -Directory | Where-Object { $_.Name -match '\.\d+\.\d+\.\d+$' }

# Remove old versions (example: removing 2.322.0 when current is 2.333.1)
Remove-Item C:\actions-runner\bin.2.322.0 -Recurse -Force
Remove-Item C:\actions-runner\externals.2.322.0 -Recurse -Force

# Remove leftover zip files
Remove-Item C:\actions-runner\*.zip
```

---

## Known Issues and Solutions

### Issue 1: Runner disappears from GitHub organization settings

**Cause:** The runner was offline for an extended period. GitHub does not proactively remove offline runners, but when runner credentials expire and you click on the runner in the GitHub UI, GitHub confirms the state as irrecoverable and removes it.

**Solution:** Follow the [Runner Re-registration](#runner-re-registration) procedure.

**Prevention:** Keep the VM online and logged in regularly so the scheduled task keeps the runner connected and credentials are renewed automatically.

---

### Issue 2: `E_ACCESSDENIED` (0x80070005) on TwinCAT COM

```
ERROR: CRITICAL: Retrieving the COM class factory for component with
CLSID {33ABD590-0400-4FEF-AF98-5F5A8A99CFC3} failed: 80070005 Access is denied.
```

**Cause:** The runner is executing in Session 0 (Windows Service). TwinCAT COM automation requires an interactive desktop session.

**Solution:** Use Task Scheduler with `LogonType = Interactive`. See [Architecture Decision](#architecture-decision-task-scheduler-vs-windows-service).

---

### Issue 3: TwinCAT hangs on "Waiting for TwinCAT to stabilize"

**Cause:** Same as Issue 2 — runner executing in a non-interactive session. TwinCAT XAE cannot initialize without a desktop.

**Solution:** Use Task Scheduler.

---

### Issue 4: PowerShell script execution blocked

```
The file .ps1 cannot be loaded. The file is not digitally signed.
You cannot run this script on the current system.
```

**Cause:** The PowerShell execution policy (`AllSigned` or `Restricted`) blocks GitHub Actions' dynamically generated unsigned `.ps1` scripts.

**Solution (PowerShell as administrator):**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
```

---

### Issue 5: git `dubious ownership` error (CodeQL)

```
fatal: detected dubious ownership in repository
  owned by:    BUILTIN\Administrators
  current user: NT AUTHORITY\NETWORK SERVICE
```

**Cause:** The `_work` directory ownership does not match the user running the git command (occurs when CodeQL runs git in its own context).

**Solution (cmd as administrator):**

```cmd
"C:\Program Files\Git\cmd\git.exe" config --system --add safe.directory *
```

---

### Issue 6: `svc.cmd` not found

**Cause:** `svc.cmd` is part of the runner package but may be missing from an incomplete or legacy installation.

**Solution:** Do not use `svc.cmd`. Use Task Scheduler instead. If re-downloading the runner zip, note that `--runasservice` creates a Windows Service which will NOT work with TwinCAT (see Issue 2).

---

### Issue 7: Service fails — `The user has not been granted the requested logon type`

```
The service did not start due to a logon failure.
The user has not been granted the required user right "Log on as a service."
```

**Cause:** Attempting to run the runner as a Windows Service with a user account that lacks the `SeServiceLogonRight` privilege.

**Solution:** Do not use a Windows Service. Use Task Scheduler. If for any reason a service is required, grant the right (PowerShell as administrator):

```powershell
$tempFile = "$env:TEMP\secedit_export.cfg"
secedit /export /cfg $tempFile
$content = Get-Content $tempFile
$sid = (New-Object System.Security.Principal.NTAccount("alber")).Translate([System.Security.Principal.SecurityIdentifier]).Value
$content = $content -replace '(SeServiceLogonRight\s*=\s*)(.*)', "`$1`$2,*$sid"
Set-Content $tempFile $content
secedit /import /cfg $tempFile /db "$env:TEMP\secedit.sdb"
secedit /configure /db "$env:TEMP\secedit.sdb"
gpupdate /force
```

---

### Issue 8: CodeQL SARIF upload fails

```
Warning: Code Security must be enabled for this repository to use code scanning.
```

**Cause:** GitHub Advanced Security / Code Scanning is not enabled for the repository.

**Solution:** Go to the repository → **Settings → Code security → Enable Code scanning**.

This is non-blocking in the workflow (`continue-on-error: true`).

---

### Issue 9: Multiple PowerShell versions on Windows

The runner VM has multiple shell environments:

| Shell | Version | Notes |
|---|---|---|
| Windows PowerShell | 5.x (classic, blue icon) | Includes `Get-EventLog`, `Get-WmiObject` |
| PowerShell Core | 7.x (dark icon) | Cross-platform; missing some Windows-only cmdlets |
| Windows Terminal | — | Container for either of the above |

Use `Get-WinEvent` instead of `Get-EventLog`, and `Get-CimInstance` instead of `Get-WmiObject` for cross-version compatibility.

When invoking `.cmd` scripts from PowerShell, prefix with `cmd /c` or `&`:

```powershell
# Wrong in PowerShell:
config.cmd --url ...

# Correct:
cmd /c "config.cmd --url ..."
# or:
& ".\config.cmd" --url ...
```

---

## File Reference

| File | Description |
|---|---|
| `README.md` | This document |
| `ci-annotated.yml` | Workflow file with detailed inline comments |
| `scripts/setup-runner.ps1` | Automates Steps 5-6 of initial setup |
| `scripts/re-register-runner.ps1` | Re-registers the runner after credential expiry |
