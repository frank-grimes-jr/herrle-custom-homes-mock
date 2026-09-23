#Requires -RunAsAdministrator
# One-time bootstrap for Dave's Windows laptop. Installs prerequisites, clones the
# repo, stores the pull token + Anthropic key, and hands off to setup-local.ps1.
# After this runs once, the app self-updates from `main` forever — nobody deploys.
#
# Run once, elevated (right-click > Run with PowerShell as admin, or):
#   powershell -ExecutionPolicy Bypass -File bootstrap.ps1
param(
  [string]$RepoUrl     = "https://github.com/frank-grimes-jr/herrle-custom-homes-mock.git",
  [string]$InstallPath = "C:\HerrleDashboard"
)
$ErrorActionPreference = "Stop"

Write-Host "Herrle Dashboard - first-time setup`n"

# 1. Prerequisites via winget (ships with Windows 11). Node LTS + Git.
function Ensure-Tool($id, $cmd) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) {
    Write-Host "  = $cmd already installed"
  } else {
    Write-Host "  + installing $id ..."
    winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements
  }
}
Ensure-Tool "OpenJS.NodeJS.LTS" "node"
Ensure-Tool "Git.Git" "git"
# Refresh PATH so tools just installed are visible in THIS session.
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [Environment]::GetEnvironmentVariable("Path", "User")

# 2. GitHub read-only token so the app can auto-pull the private repo unattended.
#    Leave blank if the repo is public.
Write-Host "`nPaste a fine-grained, READ-ONLY GitHub token for this repo (Contents: Read)."
$patSecure = Read-Host -AsSecureString "GitHub token (blank = public repo)"
$pat = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($patSecure))
if ($pat) {
  git config --global credential.helper manager | Out-Null
  "protocol=https`nhost=github.com`nusername=herrle-dashboard`npassword=$pat`n" | git credential approve
  Write-Host "  + token stored in Windows Credential Manager for auto-pull"
} else {
  Write-Host "  = no token entered (fine for a public repo)"
}

# 3. Anthropic API key (powers the inbox/intelligence). Stored in the OS vault by
#    setup-local.ps1. Blank to skip (the sample inbox still renders).
$akSecure = Read-Host -AsSecureString "Anthropic API key (blank to skip)"
$ak = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($akSecure))

# 4. Clone (or update) the repo.
if (Test-Path (Join-Path $InstallPath ".git")) {
  Write-Host "`nRepo already at $InstallPath - pulling latest"
  git -C $InstallPath pull
} else {
  Write-Host "`nCloning to $InstallPath ..."
  git clone $RepoUrl $InstallPath
}

# 5. Hand off: build, hostname, portproxy, scheduled task, and vault the key.
& (Join-Path $InstallPath "scripts\setup-local.ps1") -AnthropicKey $ak

# Wipe the plaintext copies from this session.
$pat = $null; $ak = $null; [GC]::Collect()
