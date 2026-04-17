#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Re-registers the GitHub Actions runner for AU-tomation-org after credential expiry.

.DESCRIPTION
    Use this script when the runner has been removed from the GitHub organization
    (visible as: runner no longer listed in Settings -> Actions -> Runners).

    This happens when the runner is offline for an extended period and its
    authentication credentials expire. GitHub does not remove runners proactively,
    but marks them as invalid. Clicking on the runner in the GitHub UI triggers
    permanent removal.

    This script:
      1. Stops the scheduled task (if running)
      2. Removes the old runner configuration using the new token
      3. Re-registers the runner with the same name and labels
      4. Restarts the scheduled task

    BEFORE RUNNING — generate a new registration token:
      gh api --method POST orgs/AU-tomation-org/actions/runners/registration-token

    The token expires in 1 hour.

.PARAMETER Token
    Runner registration token. Generate with:
      gh api --method POST orgs/AU-tomation-org/actions/runners/registration-token

.PARAMETER RunnerPath
    Path to the actions-runner installation directory.
    Default: C:\actions-runner

.PARAMETER TaskName
    Name of the Windows Scheduled Task managing the runner.
    Default: GitHubActionsRunner

.EXAMPLE
    .\re-register-runner.ps1 -Token "B2W2HJ..."

.EXAMPLE
    .\re-register-runner.ps1 -Token "B2W2HJ..." -RunnerPath "C:\actions-runner"
#>

param(
    [Parameter(Mandatory)]
    [string]$Token,

    [string]$RunnerPath = "C:\actions-runner",
    [string]$TaskName   = "GitHubActionsRunner"
)

$ErrorActionPreference = "Stop"

$OrgUrl = "https://github.com/AU-tomation-org"
$Name   = "win-twincat-01"
$Labels = "self-hosted,Windows,twincat"

Write-Host ""
Write-Host "=== GitHub Actions Runner Re-registration ===" -ForegroundColor Cyan
Write-Host "  Runner path : $RunnerPath"
Write-Host "  Org URL     : $OrgUrl"
Write-Host "  Runner name : $Name"
Write-Host ""

# ── Validate ──────────────────────────────────────────────────────────────────
if (-not (Test-Path "$RunnerPath\config.cmd")) {
    Write-Host "ERROR: config.cmd not found at $RunnerPath" -ForegroundColor Red
    Write-Host "The runner installation directory appears to be missing or incorrect."
    exit 1
}

# ── Step 1: Stop the scheduled task ───────────────────────────────────────────
Write-Host "[1/3] Stopping scheduled task '$TaskName'..." -ForegroundColor Yellow
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Write-Host "      Stopped." -ForegroundColor Green
} else {
    Write-Host "      Task '$TaskName' not found — skipping stop." -ForegroundColor Gray
}

# ── Step 2: Remove old runner configuration ───────────────────────────────────
Write-Host "[2/3] Removing old runner configuration..." -ForegroundColor Yellow
Push-Location $RunnerPath
$result = cmd /c "config.cmd remove --token $Token" 2>&1
$result | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
Pop-Location
Write-Host "      Done." -ForegroundColor Green

# ── Step 3: Re-register ────────────────────────────────────────────────────────
Write-Host "[3/3] Registering runner '$Name'..." -ForegroundColor Yellow
Push-Location $RunnerPath
$result = cmd /c "config.cmd --url $OrgUrl --token $Token --name $Name --labels $Labels --unattended" 2>&1
$result | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
Pop-Location
Write-Host "      Done." -ForegroundColor Green

# ── Restart task ──────────────────────────────────────────────────────────────
if ($task) {
    Write-Host "Starting scheduled task '$TaskName'..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 3
    $taskState = (Get-ScheduledTask -TaskName $TaskName).State
    Write-Host "  Task state: $taskState" -ForegroundColor Green
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Re-registration complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verify runner is online:"
Write-Host "  gh api orgs/AU-tomation-org/actions/runners"
Write-Host ""
if (-not $task) {
    Write-Host "NOTE: The scheduled task '$TaskName' was not found." -ForegroundColor DarkYellow
    Write-Host "Run setup-runner.ps1 to create it, then start it manually:"
    Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
}
