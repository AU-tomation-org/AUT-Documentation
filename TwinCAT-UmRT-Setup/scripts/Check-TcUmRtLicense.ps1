<#
.SYNOPSIS
    Checks the TwinCAT UmRT trial license expiry and shows a Windows toast
    notification when expiry is within the warning threshold.

.NOTES
    Intended to run as a scheduled task every hour.
    License: C:\ProgramData\Beckhoff\TwinCAT\3.1\Runtimes\UmRT_Default\3.1\Target\License\TrialLicense.tclrs
#>

$licenseFile = 'C:\ProgramData\Beckhoff\TwinCAT\3.1\Runtimes\UmRT_Default\3.1\Target\License\TrialLicense.tclrs'
$warnDays    = 2
$appId       = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'

if (-not (Test-Path $licenseFile)) {
    Write-Warning "License file not found: $licenseFile"
    exit 1
}

[xml]$xml  = Get-Content $licenseFile
$expireStr = $xml.SelectSingleNode("//*[local-name()='ExpireTime']").InnerText

if (-not $expireStr) {
    Write-Warning "ExpireTime not found in license file."
    exit 1
}

$expireTime = [datetime]::Parse($expireStr)
$daysLeft   = ($expireTime.Date - (Get-Date).Date).Days

Write-Host "TwinCAT UmRT license expires: $($expireTime.ToString('yyyy-MM-dd'))  ($daysLeft days left)"

if ($daysLeft -gt $warnDays) {
    Write-Host "OK - no action needed."
    exit 0
}

if ($daysLeft -lt 0) {
    $title   = "TwinCAT UmRT - LICENSE EXPIRED"
    $message = "The trial license expired $([Math]::Abs($daysLeft)) day(s) ago ($($expireTime.ToString('yyyy-MM-dd'))). TwinCAT will NOT run correctly. Renew the license in TwinCAT XAE."
} elseif ($daysLeft -eq 0) {
    $title   = "TwinCAT UmRT - License expires TODAY"
    $message = "The trial license expires today. Renew it now in TwinCAT XAE before the runtime stops."
} else {
    $title   = "TwinCAT UmRT - License expiring soon"
    $message = "Trial license expires in $daysLeft day(s) ($($expireTime.ToString('yyyy-MM-dd'))). Open TwinCAT XAE and renew the license."
}

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications,   ContentType = WindowsRuntime]
$null = [Windows.Data.Xml.Dom.XmlDocument,                  Windows.Data.Xml.Dom,        ContentType = WindowsRuntime]

$toastXml = @"
<toast duration="long">
  <visual>
    <binding template="ToastGeneric">
      <text>$([System.Security.SecurityElement]::Escape($title))</text>
      <text>$([System.Security.SecurityElement]::Escape($message))</text>
    </binding>
  </visual>
  <audio src="ms-winsoundevent:Notification.Looping.Alarm" loop="false"/>
</toast>
"@

$xmlDoc = [Windows.Data.Xml.Dom.XmlDocument]::new()
$xmlDoc.LoadXml($toastXml)

$toast = [Windows.UI.Notifications.ToastNotification]::new($xmlDoc)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)

Write-Host "Notification shown: $title"
