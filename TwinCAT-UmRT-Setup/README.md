# TwinCAT UmRT - Autostart and License Check

Automation setup for the TwinCAT 3 User-Mode Runtime (UmRT) on the development VM.
Two scheduled tasks are registered under `\AU-tomation\` in Windows Task Scheduler.

---

## Background

The VM runs TwinCAT in **UmRT mode** (TwinCAT OS x64 target, `UmRT_Default` instance).
UmRT does not start automatically with Windows - it must be launched manually via
`C:\ProgramData\Beckhoff\TwinCAT\3.1\Runtimes\UmRT_Default\Start.bat`.

UmRT uses its own **trial license**, stored separately from the main TwinCAT runtime license:

| License | File |
|---------|------|
| Main runtime | `C:\ProgramData\Beckhoff\TwinCAT\3.1\License\TrialLicense.tclrs` |
| UmRT | `C:\ProgramData\Beckhoff\TwinCAT\3.1\Runtimes\UmRT_Default\3.1\Target\License\TrialLicense.tclrs` |

Trial licenses last **7 days** and must be renewed manually in TwinCAT XAE
(right-click the target > License > Activate 7-day trial).

---

## Scheduled Tasks

| Task | Trigger | Action |
|------|---------|--------|
| `TC3-UmRT-Autostart` | At user logon | Runs `UmRT_Default\Start.bat` |
| `TC3-UmRT-LicenseCheck` | At logon + every hour | Runs `Check-TcUmRtLicense.ps1` |

Both tasks live under the `\AU-tomation\` folder in Task Scheduler.

---

## Scripts

### `Register-TcTasks.ps1`

One-time setup script. Creates both scheduled tasks. Run it once per machine
(or re-run to update/overwrite).

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\alber\Scripts\Register-TcTasks.ps1"
```

> **Note:** `TC3-UmRT-Autostart` is registered with `RunLevel Limited`. If UmRT
> needs elevated privileges on a specific machine, open Task Scheduler, edit the
> task, and enable "Run with highest privileges".

### `Run-Hidden.vbs`

Thin VBScript wrapper used by the `TC3-UmRT-LicenseCheck` task.
`wscript.exe //B` launches the process with `SW_HIDE` (style = 0), which
prevents any console window from appearing. Using `powershell.exe -WindowStyle Hidden`
directly in a scheduled task still flashes a blue window briefly on each run;
this wrapper eliminates that flash entirely.

### `Check-TcUmRtLicense.ps1`

Reads the UmRT `TrialLicense.tclrs` XML file, calculates days to expiry, and
shows a Windows 10 toast notification when the license is within the warning
threshold (default: **2 days**).

Notification severity levels:

| Days left | Title |
|-----------|-------|
| > 2 | Silent (no notification) |
| 1-2 | "License expiring soon" |
| 0 | "License expires TODAY" |
| < 0 | "LICENSE EXPIRED" |

To change the threshold, edit `$warnDays` at the top of the script.

---

## First-time setup on a new machine

1. Copy all three scripts (`Register-TcTasks.ps1`, `Check-TcUmRtLicense.ps1`, `Run-Hidden.vbs`) to `C:\Users\<username>\Scripts\`
2. Edit `Register-TcTasks.ps1` and `Run-Hidden.vbs`: update the username/paths if they differ
3. Run `Register-TcTasks.ps1` once in an elevated PowerShell session
4. Verify tasks appear in Task Scheduler under `\AU-tomation\`
