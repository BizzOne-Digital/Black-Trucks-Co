# This script uses Windows Task Scheduler to run the MongoDB config update
# with SYSTEM privileges (no UAC prompt needed)
# Run: powershell -ExecutionPolicy Bypass -File scripts\enable-replicaset-task.ps1

$cfgPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"
$taskName = "BlackTrucks-MongoSetup"

# The action script content
$actionScript = @"
`$cfg = Get-Content '$cfgPath' -Raw
if (`$cfg -notmatch 'replSetName') {
    `$newCfg = `$cfg.TrimEnd() + "`n`nreplication:`n  replSetName: ``"rs0``"`n"
    Set-Content -Path '$cfgPath' -Value `$newCfg -Encoding UTF8 -NoNewline
}
net stop MongoDB
Start-Sleep -Seconds 3
net start MongoDB
"@

$scriptFile = "$env:TEMP\mongo_setup_action.ps1"
Set-Content -Path $scriptFile -Value $actionScript -Encoding UTF8

# Create scheduled task to run as SYSTEM
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptFile`""
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Task registered. Running now..."

Start-ScheduledTask -TaskName $taskName
Write-Host "Waiting for task to complete (15s)..."
Start-Sleep -Seconds 15

# Check result
$cfg = Get-Content $cfgPath -Raw
if ($cfg -match "replSetName") {
    Write-Host "SUCCESS: Config updated with replica set"
} else {
    Write-Host "Config update may have failed - check manually"
}

# Cleanup
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
Write-Host "Done. Now initializing replica set..."

# Initialize replica set
node "$PSScriptRoot\init-replicaset.js"
