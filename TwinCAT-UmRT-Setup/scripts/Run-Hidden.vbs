'' Run-Hidden.vbs
'' Launches Check-TcUmRtLicense.ps1 with SW_HIDE (window handle = 0).
'' Used by the TC3-UmRT-LicenseCheck scheduled task so that no PowerShell
'' console window appears — Task Scheduler's own -WindowStyle Hidden flag
'' still flashes a window briefly; wscript.exe with style=0 does not.
CreateObject("WScript.Shell").Run _
    "powershell.exe -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass" & _
    " -File ""C:\Users\alber\Scripts\Check-TcUmRtLicense.ps1""", _
    0, False
