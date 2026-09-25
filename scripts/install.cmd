@echo off
setlocal
rem Herrle Dashboard - one-time installer for Windows.
rem RIGHT-CLICK this file and choose "Run as administrator".
rem
rem Downloads the ready-built app (no Node, Git or npm needed on this PC), maps
rem http://herrle.internal to it, and sets it to start hidden at sign-in. After
rem this it keeps itself up to date in the background: no windows, nothing to run.
rem Batch (not PowerShell) so a disabled PowerShell script policy can't block it.
rem Safe to run again - it repairs/reinstalls in place.

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   Please RIGHT-CLICK install.cmd and choose "Run as administrator".
  echo.
  pause
  exit /b 1
)

rem Per-user app folder (updates run unprivileged). Elevating your own admin
rem account keeps %LOCALAPPDATA% and HKCU pointing at your profile.
set "APP=%LOCALAPPDATA%\HerrleDashboard\app"
set "ASSET=herrle-dashboard-win-x64.zip"
set "URL=https://github.com/frank-grimes-jr/herrle-custom-homes-mock/releases/latest/download/%ASSET%"
set "TAR=%SystemRoot%\System32\tar.exe"
set "CURL=%SystemRoot%\System32\curl.exe"
set "HOSTS=%SystemRoot%\System32\drivers\etc\hosts"

echo Stopping any running copy...
taskkill /f /im HerrleDashboard.exe >nul 2>&1
rem The previous (git + npm) setup's scheduled tasks and server.
schtasks /delete /tn "Herrle Dashboard Start" /f >nul 2>&1
schtasks /delete /tn "Herrle Dashboard Update" /f >nul 2>&1
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:"127\.0\.0\.1:3000 .*LISTENING"') do (
  taskkill /f /pid %%P /fi "imagename eq node.exe" >nul 2>&1
)
ping -n 3 127.0.0.1 >nul

rem A zip next to this file (offline install) wins over downloading.
if exist "%~dp0%ASSET%" (
  set "ZIP=%~dp0%ASSET%"
) else (
  set "ZIP=%TEMP%\%ASSET%"
  echo Downloading the latest version...
  "%CURL%" -fL --retry 3 -o "%TEMP%\%ASSET%" "%URL%" || goto :fail
)

echo Unpacking...
set "STAGE=%APP%\_staging"
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%" || goto :fail
"%TAR%" -xf "%ZIP%" -C "%STAGE%" || goto :fail
set /p VER=<"%STAGE%\version.txt"
if "%VER%"=="" goto :fail
if exist "%APP%\%VER%" rmdir /s /q "%APP%\%VER%"
ren "%STAGE%" "%VER%" || goto :fail
>"%APP%\current.txt" echo %VER%
copy /y "%APP%\%VER%\HerrleDashboard.exe" "%APP%\HerrleDashboard.exe" >nul || goto :fail

echo Setting up http://herrle.internal ...
findstr /i /c:"herrle.internal" "%HOSTS%" >nul 2>&1 || (
  >>"%HOSTS%" echo.
  >>"%HOSTS%" echo 127.0.0.1	herrle.internal
)
rem Port 80 -> the app on 3000 (loopback only), so the address needs no port.
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=127.0.0.1 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=80 listenaddress=127.0.0.1 connectport=3000 connectaddress=127.0.0.1 >nul || goto :fail

rem Start hidden at every sign-in (HKCU Run key: no admin, no power/time limits).
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v HerrleDashboard /t REG_SZ /d "\"%APP%\HerrleDashboard.exe\"" /f >nul || goto :fail

rem The previous setup's git checkout (identified by its old updater) is no longer used.
if exist "%USERPROFILE%\HerrleDashboard\scripts\update.mjs" rmdir /s /q "%USERPROFILE%\HerrleDashboard"
if exist "%TEMP%\%ASSET%" del "%TEMP%\%ASSET%"

rem Claude runs through this PC's Claude Code sign-in (no API key). Install the
rem CLI if missing, then sign in once - it keeps itself signed in after that.
set "CLAUDE=%USERPROFILE%\.local\bin\claude.exe"
if not exist "%CLAUDE%" (
  echo Installing Claude Code...
  "%CURL%" -fsSL -o "%TEMP%\claude-install.cmd" https://claude.ai/install.cmd && call "%TEMP%\claude-install.cmd"
  del "%TEMP%\claude-install.cmd" >nul 2>&1
)
if not exist "%CLAUDE%" (
  echo   Claude Code didn't install. The Inbox shows a plain list until it's installed and signed in.
  goto :start
)
rem ponytail: status only checks a sign-in exists, not that it's still valid; an
rem expired one surfaces in Admin ("Open Claude Code ... and sign in").
"%CLAUDE%" auth status | findstr /r /c:"loggedIn.: true" >nul && goto :start
echo.
echo   One-time step: sign in to Claude in the browser window that opens.
echo.
"%CLAUDE%" auth login

:start
echo Starting...
rem Via Explorer so the app runs as the normal (non-admin) user, same as at sign-in.
explorer.exe "%APP%\HerrleDashboard.exe"
for /l %%i in (1,1,45) do (
  "%CURL%" -fs -o nul http://127.0.0.1:3000/ && goto :ready
  ping -n 2 127.0.0.1 >nul
)
echo.
echo   Installed. It will start the next time you sign in.
echo.
pause
exit /b 0

:ready
echo.
echo   All set - opening http://herrle.internal
start "" http://herrle.internal
ping -n 4 127.0.0.1 >nul
exit /b 0

:fail
echo.
echo   Something went wrong (see above). It's safe to run install.cmd again.
echo.
pause
exit /b 1
