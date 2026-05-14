@echo off
:: ============================================================
:: Black Trucks Co - MongoDB Replica Set Setup
:: DOUBLE-CLICK this file and click YES on the UAC prompt
:: ============================================================

:: Auto-elevate to admin
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting admin rights...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

echo.
echo ============================================================
echo   Black Trucks Co - MongoDB Replica Set Setup
echo ============================================================
echo.

:: Stop MongoDB
echo [1/4] Stopping MongoDB...
net stop MongoDB >nul 2>&1
timeout /t 2 /nobreak >nul
echo       Done.

:: Add replica set to config
echo [2/4] Updating MongoDB config...
set CFG=C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg
findstr /C:"replSetName" "%CFG%" >nul 2>&1
if %errorlevel% equ 0 (
    echo       Already configured.
) else (
    echo. >> "%CFG%"
    echo replication: >> "%CFG%"
    echo   replSetName: "rs0" >> "%CFG%"
    echo       Config updated.
)

:: Start MongoDB
echo [3/4] Starting MongoDB...
net start MongoDB >nul 2>&1
timeout /t 4 /nobreak >nul
echo       Done.

:: Initialize replica set
echo [4/4] Initializing replica set...
node scripts\init-replicaset.js
timeout /t 5 /nobreak >nul

echo.
echo ============================================================
echo   DONE! Now:
echo   1. Close this window
echo   2. Restart your dev server: npm run dev
echo   3. Registration and vehicles will work!
echo ============================================================
echo.
pause
