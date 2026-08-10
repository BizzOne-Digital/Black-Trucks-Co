# Black Trucks Co — MongoDB Replica Set Setup
# Run this script as Administrator in PowerShell:
# Right-click PowerShell → "Run as Administrator"
# Then run: .\setup-mongodb-replicaset.ps1

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Black Trucks Co - MongoDB Replica Set" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check admin rights
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and choose 'Run as administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$cfgPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"

# Step 1: Stop MongoDB
Write-Host "[1/4] Stopping MongoDB service..." -ForegroundColor Yellow
Stop-Service -Name "MongoDB" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "      Done" -ForegroundColor Green

# Step 2: Update config
Write-Host "[2/4] Updating mongod.cfg..." -ForegroundColor Yellow
$content = Get-Content $cfgPath -Raw

if ($content -match "replSetName") {
    Write-Host "      Replica set already configured" -ForegroundColor Green
} else {
    $newContent = $content.TrimEnd() + "`n`nreplication:`n  replSetName: `"rs0`"`n"
    Set-Content -Path $cfgPath -Value $newContent -Encoding UTF8 -NoNewline
    Write-Host "      Added replication config" -ForegroundColor Green
}

# Step 3: Start MongoDB
Write-Host "[3/4] Starting MongoDB service..." -ForegroundColor Yellow
Start-Service -Name "MongoDB"
Start-Sleep -Seconds 3
Write-Host "      Done" -ForegroundColor Green

# Step 4: Initialize replica set
Write-Host "[4/4] Initializing replica set..." -ForegroundColor Yellow
$initScript = @"
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://127.0.0.1:27017');
client.connect()
  .then(() => client.db('admin').command({
    replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] }
  }))
  .then(r => { console.log('SUCCESS: Replica set initialized'); process.exit(0); })
  .catch(e => {
    if (e.message.includes('already initialized')) {
      console.log('SUCCESS: Already initialized');
      process.exit(0);
    }
    console.error('ERROR:', e.message);
    process.exit(1);
  })
  .finally(() => client.close());
"@

$tempFile = "$env:TEMP\init_rs.js"
Set-Content -Path $tempFile -Value $initScript -Encoding UTF8

Push-Location "E:\BlackTrucksco-main\BlackTrucksco-main"
$result = node $tempFile 2>&1
Write-Host "      $result" -ForegroundColor Green
Pop-Location

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Update .env.local MONGODB_URI to:" -ForegroundColor Yellow
Write-Host "   mongodb://127.0.0.1:27017/blacktrucks?replicaSet=rs0&directConnection=true" -ForegroundColor White
Write-Host "2. Restart your Next.js dev server" -ForegroundColor Yellow
Write-Host "3. The site should now work fully!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
