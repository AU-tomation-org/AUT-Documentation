# Register-TcTasks.ps1
# Creates two scheduled tasks under \AU-tomation\:
#   TC3-UmRT-Autostart   — starts UmRT at user logon
#   TC3-UmRT-LicenseCheck — checks license expiry every hour

$taskFolder = '\AU-tomation'

# ── Task 1: UmRT autostart at logon ─────────────────────────────────────────
$action1 = New-ScheduledTaskAction `
    -Execute 'C:\ProgramData\Beckhoff\TwinCAT\3.1\Runtimes\UmRT_Default\Start.bat' `
    -WorkingDirectory 'C:\ProgramData\Beckhoff\TwinCAT\3.1\Runtimes\UmRT_Default'

$trigger1 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings1 = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName    'TC3-UmRT-Autostart' `
    -TaskPath    $taskFolder `
    -Action      $action1 `
    -Trigger     $trigger1 `
    -Settings    $settings1 `
    -Description 'Starts TwinCAT UmRT (UmRT_Default) automatically at user logon.' `
    -RunLevel    Highest `
    -Force | Out-Null

Write-Host "Registered: $taskFolder\TC3-UmRT-Autostart"

# ── Task 2: License check every hour ────────────────────────────────────────
$psExe   = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$script  = 'C:\Users\alber\Scripts\Check-TcUmRtLicense.ps1'

$action2 = New-ScheduledTaskAction `
    -Execute  $psExe `
    -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""

# First run: at logon (so it checks immediately on each session start)
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Recurring: every hour, starting 1 hour from now, no end
$triggerHourly = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 1) `
    -Once -At (Get-Date).AddHours(1)

$settings2 = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName    'TC3-UmRT-LicenseCheck' `
    -TaskPath    $taskFolder `
    -Action      $action2 `
    -Trigger     @($triggerLogon, $triggerHourly) `
    -Settings    $settings2 `
    -Description 'Checks TwinCAT UmRT trial license expiry every hour and shows a toast notification when within 5 days.' `
    -RunLevel    Limited `
    -Force | Out-Null

Write-Host "Registered: $taskFolder\TC3-UmRT-LicenseCheck"
Write-Host ""
Write-Host "Done. Tasks are visible in Task Scheduler under \AU-tomation\"
