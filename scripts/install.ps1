# Run once as Administrator from fiverr-alarm\ :  .\scripts\install.ps1
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root ".venv\Scripts\pythonw.exe"
if (-not (Test-Path $py)) { throw "Create the venv first: python -m venv .venv; .venv\Scripts\pip install -r requirements.txt" }

$action = New-ScheduledTaskAction -Execute $py -Argument "-m fiverr_alarm" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "FiverrAlarm" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

New-NetFirewallRule -DisplayName "Fiverr Alarm" -Direction Inbound -Protocol TCP -LocalPort 8765 `
  -Action Allow -Profile Private -ErrorAction SilentlyContinue | Out-Null

powercfg /change standby-timeout-ac 0   # no sleep on AC power

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match "Wi-?Fi|WLAN" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
Write-Host "Installed. Start now: Start-ScheduledTask FiverrAlarm"
Write-Host "Type this laptop address into the iPhone app: $ip"
