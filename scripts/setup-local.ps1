#Requires -RunAsAdministrator
# One-time setup on Dave's Windows laptop. Run once, elevated, from anywhere:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-local.ps1
# It (1) maps a real hostname to loopback, (2) forwards port 80 → the app so the
# URL has no port, (3) builds once, and (4) registers the auto-update/auto-start
# task. Dave's integration credentials are NEVER touched here (he sets those in
# the admin menu); an optional -AnthropicKey is seeded into the OS vault.
param([string]$AnthropicKey = "")

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot   # repo root (this file lives in scripts/)
$HostName = "herrle.internal"              # change if you prefer another name (avoid .local)
$Port = 3000

Write-Host "Setting up Herrle Dashboard in $Repo`n"

# 1. Hostname → loopback, so the URL isn't "localhost".
$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
if (-not (Select-String -Path $hostsFile -Pattern "\s$([regex]::Escape($HostName))\s*$" -Quiet)) {
  Add-Content -Path $hostsFile -Value "`n127.0.0.1`t$HostName"
  Write-Host "  + hosts: $HostName -> 127.0.0.1"
} else {
  Write-Host "  = hosts entry already present"
}

# 2. Port 80 -> app on $Port (loopback only). Lets the app run UNPRIVILEGED while
#    the URL drops the port. Re-added idempotently.
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=127.0.0.1 2>$null | Out-Null
netsh interface portproxy add v4tov4 listenport=80 listenaddress=127.0.0.1 connectport=$Port connectaddress=127.0.0.1 | Out-Null
Write-Host "  + portproxy: 127.0.0.1:80 -> 127.0.0.1:$Port"

# 3. First build.
Push-Location $Repo
try {
  Write-Host "`nInstalling and building (first run)..."
  npm ci
  npm run build
  if ($AnthropicKey) {
    $env:__HERRLE_AK = $AnthropicKey
    node -e "new (require('@napi-rs/keyring').Entry)('herrle-dashboard','anthropic_api_key').setPassword(process.env.__HERRLE_AK)"
    Remove-Item Env:__HERRLE_AK
    Write-Host "  + Anthropic API key stored in the OS vault"
  }
} finally {
  Pop-Location
}

# 4. Auto-update + auto-start task, running as the logged-in user (UNELEVATED).
$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $node -Argument "scripts\update.mjs" -WorkingDirectory $Repo
$atLogon = New-ScheduledTaskTrigger -AtLogOn
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "Herrle Dashboard" -Action $action -Trigger @($atLogon, $repeat) `
  -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "  + scheduled task 'Herrle Dashboard' (at logon + every 5 min)"

Write-Host "`nDone."
Write-Host "  Open:  http://$HostName"
Write-Host "  Google OAuth redirect URI to register in Google Cloud:"
Write-Host "         http://localhost:$Port/api/integrations/google/callback"
Write-Host "`nStarting the server now..."
Push-Location $Repo
try { node scripts\update.mjs } finally { Pop-Location }
