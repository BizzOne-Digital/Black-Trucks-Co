@echo off
echo ============================================
echo  Black Trucks Co - MongoDB Replica Set Setup
echo ============================================
echo.
echo This script requires Administrator privileges.
echo Right-click this file and select "Run as administrator"
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run this script as Administrator!
    echo Right-click the file and choose "Run as administrator"
    pause
    exit /b 1
)

echo [1/3] Stopping MongoDB service...
net stop MongoDB
if %errorLevel% neq 0 (
    echo WARNING: Could not stop MongoDB service. It may already be stopped.
)

echo.
echo [2/3] Adding replica set config to mongod.cfg...
set CFG_FILE=C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg

:: Check if replication already configured
findstr /C:"replSetName" "%CFG_FILE%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Replica set already configured. Skipping...
) else (
    echo. >> "%CFG_FILE%"
    echo replication: >> "%CFG_FILE%"
    echo   replSetName: "rs0" >> "%CFG_FILE%"
    echo Replica set config added successfully.
)

echo.
echo [3/3] Starting MongoDB service...
net start MongoDB
if %errorLevel% neq 0 (
    echo ERROR: Could not start MongoDB service!
    pause
    exit /b 1
)

echo.
echo MongoDB service started. Waiting 3 seconds for it to be ready...
timeout /t 3 /nobreak >nul

echo.
echo [4/4] Initializing replica set...
cd /d "%~dp0"
node -e "const {MongoClient}=require('mongodb');const c=new MongoClient('mongodb://localhost:27017');c.connect().then(()=>c.db('admin').command({replSetInitiate:{_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]}})).then(r=>console.log('Replica set initialized:',JSON.stringify(r))).catch(e=>{if(e.message.includes('already initialized')){console.log('Replica set already initialized - OK')}else{console.error('Error:',e.message)}}).finally(()=>c.close())"

echo.
echo ============================================
echo  Setup Complete!
echo  MongoDB is now running as a replica set.
echo  You can now run: npm run seed
echo ============================================
echo.
pause
