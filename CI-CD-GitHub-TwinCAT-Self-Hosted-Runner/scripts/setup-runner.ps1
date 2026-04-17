#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Sets up the GitHub Actions self-hosted runner environment for AU-tomation-org TwinCAT CI/CD.

.DESCRIPTION
    This script automates the post-registration configuration of the runner environment:

      1. Sets PowerShell execution policy to RemoteSigned (LocalMachine)
         Required because GitHub Actions generates unsigned .ps1 scripts at runtime.

      2. Configures git system-level safe.directory = *
         Required to prevent "dubious ownership" errors when CodeQL or other
         steps run git commands in directories owned by a different Windows user.

      3. Creates a Windows Scheduled Task that launches run.cmd at user logon
         (interactive session). This is the ONLY supported approach for TwinCAT CI/CD.

    WHY NOT A WINDOWS SERVICE?
    Windows services run in Session 0 (non-interactive). TwinCAT's COM automation
    interface requires an interactive desktop session. Running as a service causes:
      - E_ACCESSDENIED (0x80070005) on TwinCAT COM factory instantiation
      - TcCIBuilder hanging indefinitely on "Waiting for TwinCAT to stabilize"

    PREREQUISITES (must be completed before running this script):
      1. Runner registered via config.cmd:
           config.cmd --url https://github.com/AU-tomation-org
                      --token <TOKEN>
                      --name win-twincat-01
                      --labels self-hosted,Windows,twincat
                      --unattended
      2. Git for Windows installed at C:\Program Files\Git\

.PARAMETER RunnerUser
    Windows username that will own the scheduled task and run the runner.
    Must be the interactive user (the one who logs into the desktop).
    Default: current user.

.PARAMETER RunnerPath
    Path to the actions-runner installation directory.
    Default: C:\actions-runner

.PARAMETER TaskName
    Name of the Windows Scheduled Task to create.
    Default: GitHubActionsRunner

.EXAMPLE
    .\setup-runner.ps1

.EXAMPLE
    .\setup-runner.ps1 -RunnerUser "alber" -RunnerPath "C:\actions-runner"
#>

param(
    [string]$RunnerUser = $env:USERNAME,
    [string]$RunnerPath = "C:\actions-runner",
    [string]$TaskName   = "GitHubActionsRunner"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== GitHub Actions Runner Setup for AU-tomation-org ===" -ForegroundColor Cyan
Write-Host "  Runner path : $RunnerPath"
Write-Host "  Runner user : $RunnerUser"
Write-Host "  Task name   : $TaskName"
Write-Host ""

# ── Validate prerequisites ─────────────────────────────────────────────────────
if (-not (Test-Path "$RunnerPath\run.cmd")) {
    Write-Host "ERROR: run.cmd not found at $RunnerPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Complete runner registration first (run as administrator in $RunnerPath):"
    Write-Host "  config.cmd --url https://github.com/AU-tomation-org \`"
    Write-Host "             --token <TOKEN> \`"
    Write-Host "             --name win-twincat-01 \`"
    Write-Host "             --labels self-hosted,Windows,twincat \`"
    Write-Host "             --unattended"
    exit 1
}

# ── Step 1: PowerShell Execution Policy ───────────────────────────────────────
Write-Host "[1/3] Setting PowerShell execution policy (RemoteSigned, LocalMachine)..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
$policy = Get-ExecutionPolicy -Scope LocalMachine
Write-Host "      ExecutionPolicy (LocalMachine) = $policy" -ForegroundColor Green

# ── Step 2: Git safe.directory ────────────────────────────────────────────────
Write-Host "[2/3] Configuring git system safe.directory = * ..." -ForegroundColor Yellow
$gitExe = "C:\Program Files\Git\cmd\git.exe"
if (Test-Path $gitExe) {
    & $gitExe config --system --add safe.directory "*"
    Write-Host "      Done. (git config --system safe.directory = *)" -ForegroundColor Green
} else {
    Write-Host "      WARNING: git.exe not found at $gitExe" -ForegroundColor DarkYellow
    Write-Host "      Install Git for Windows, then run manually:"
    Write-Host "        git config --system --add safe.directory *"
}

# ── Step 3: Scheduled Task ────────────────────────────────────────────────────
Write-Host "[3/3] Creating scheduled task '$TaskName' for user '$RunnerUser'..." -ForegroundColor Yellow

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "      Existing task found — removing..." -ForegroundColor Gray
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action    = New-ScheduledTaskAction -Execute "$RunnerPath\run.cmd" -WorkingDirectory $RunnerPath
$trigger   = New-ScheduledTaskTrigger -AtLogOn -User $RunnerUser
$settings  = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $RunnerUser -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName `
                       -Action $action `
                       -Trigger $trigger `
                       -Settings $settings `
                       -Principal $principal `
                       -Force | Out-Null

Write-Host "      Task registered." -ForegroundColor Green

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Start the runner now:"
Write-Host "       Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "  2. Verify runner is online on GitHub:"
Write-Host "       gh api orgs/AU-tomation-org/actions/runners"
Write-Host ""
Write-Host "The runner will start automatically at every logon of '$RunnerUser'."
