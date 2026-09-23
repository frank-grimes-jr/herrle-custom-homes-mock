@echo off
setlocal enabledelayedexpansion
rem Herrle Dashboard - one-time installer for Windows.
rem RIGHT-CLICK this file and choose "Run as administrator".
rem Uses a batch file (not .ps1) so a disabled PowerShell ExecutionPolicy can't
rem block it, then hands off to Node for the actual setup.

rem --- must be elevated (hosts + portproxy need admin) ---
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   Please RIGHT-CLICK install.cmd and choose "Run as administrator".
  echo.
  pause
  exit /b 1
)

set "REPO_URL=https://github.com/frank-grimes-jr/herrle-custom-homes-mock.git"
rem User-writable path (the self-update task runs unprivileged), still Dave's
rem profile because he elevates his own admin account.
set "INSTALL=%USERPROFILE%\HerrleDashboard"

echo Installing Node LTS and Git if needed (skips if already present)...
where node >nul 2>&1 || winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
where git  >nul 2>&1 || winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements

rem Make just-installed tools visible in THIS window (best effort).
for /f "skip=2 tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "MPATH=%%B"
set "PATH=%MPATH%;%PATH%"

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   Node was just installed but isn't on PATH yet. Close this window and
  echo   run install.cmd again ^(as administrator^) to finish.
  echo.
  pause
  exit /b 1
)

echo.
echo Getting the app into %INSTALL% ...
echo (A GitHub sign-in window may open the first time for a private repo.)
if exist "%INSTALL%\.git" (
  git -C "%INSTALL%" pull
) else (
  git clone %REPO_URL% "%INSTALL%"
)
if %errorlevel% neq 0 (
  echo.
  echo   Could not get the repository. Check the GitHub sign-in and try again.
  echo.
  pause
  exit /b 1
)

echo.
node "%INSTALL%\scripts\setup-local.mjs"

echo.
echo All set. Open http://herrle.internal
pause
