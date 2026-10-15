# Screenshots of the SunFinch window on the prototype stand (Firefox ESR +
# fx-autoconfig + code from src/), headless, in a fresh throwaway profile.
# prototypes/JS/zz-sunfinch-shot.uc.js builds a sample window, saves
# <scene>-<theme>.png and quits; this script copies them to -Out.
#
# Usage: powershell -File tools\proto-shot.ps1 -Out <dir> [-Theme dark|light|both]
#        [-Scenes main,notes,glance,claude,menu] [-Headed]
# -Headed: a visible window for a few seconds; pictures come from the screen
# and include popups (notes window, menus), which the headless snapshot misses.
param(
  [Parameter(Mandatory)] [string]$Out,
  [ValidateSet('dark', 'light', 'both')] [string]$Theme = 'both',
  [string]$Scenes = 'main,notes,glance,claude,menu',
  [switch]$Headed
)

Add-Type -AssemblyName System.Drawing
Add-Type -Namespace SunFinch -Name Dpi -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
[SunFinch.Dpi]::SetProcessDPIAware() | Out-Null

# Saves the screen region a request file asks for, then removes the request.
function Save-ScreenRequests($dir) {
  Get-ChildItem $dir -Filter '*.request.json' -ErrorAction SilentlyContinue | ForEach-Object {
    $r = Get-Content $_.FullName -Raw | ConvertFrom-Json
    $bmp = New-Object System.Drawing.Bitmap $r.width, $r.height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($r.x, $r.y, 0, 0, $bmp.Size)
    $bmp.Save($r.file, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Remove-Item $_.FullName
  }
}

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$base = if ($env:SUNFINCH_PROTO_DIR) { $env:SUNFINCH_PROTO_DIR } else { 'E:\tools\sunfinch-proto' }
$ff = if ($env:SUNFINCH_PROTO_FF) { $env:SUNFINCH_PROTO_FF } else { 'E:\tools\firefox-esr-153\firefox.exe' }
$autoconfigUtils = Join-Path $base 'profile\chrome\utils'
$profile = Join-Path $base 'shot-profile'
New-Item -ItemType Directory -Force $Out | Out-Null

$themes = if ($Theme -eq 'both') { @('dark', 'light') } else { @($Theme) }
foreach ($t in $themes) {
  if (Test-Path $profile) {
    foreach ($dir in 'JS', 'CSS') {
      $link = Join-Path $profile "chrome\$dir"
      if ((Test-Path $link) -and (Get-Item $link).LinkType) { [System.IO.Directory]::Delete($link) }
    }
    Remove-Item -Recurse -Force $profile
  }
  New-Item -ItemType Directory -Force (Join-Path $profile 'chrome') | Out-Null
  Copy-Item -Recurse $autoconfigUtils (Join-Path $profile 'chrome\utils')
  Copy-Item -Recurse (Join-Path $repo 'src\browser\components\sunfinch\modules') (Join-Path $profile 'chrome\sunfinch-dev-modules')
  Add-Content -Path (Join-Path $profile 'chrome\utils\chrome.manifest') -Value "content sunfinchdev ../sunfinch-dev-modules/" -Encoding ascii
  foreach ($dir in 'JS', 'CSS') {
    New-Item -ItemType Junction -Path (Join-Path $profile "chrome\$dir") -Target (Join-Path $repo "prototypes\$dir") | Out-Null
  }

  $dark = if ($t -eq 'dark') { 1 } else { 0 }
  $userJs = (Get-Content (Join-Path $repo 'prototypes\user.js') -Raw) + @"

user_pref("sunfinch.proto.shot", "$Scenes");
user_pref("ui.systemUsesDarkTheme", $dark);
user_pref("intl.locale.requested", "ru");
user_pref("sunfinch.proto.shot.screen", $(if ($Headed) { 'true' } else { 'false' }));
"@
  Set-Content -Path (Join-Path $profile 'user.js') -Value $userJs -Encoding utf8

  # -wait-for-browser: the launcher process stays until the browser exits.
  $ffArgs = @('-profile', $profile, '-no-remote', '-purgecaches', '-wait-for-browser')
  if (-not $Headed) { $ffArgs = @('-headless') + $ffArgs }
  $p = Start-Process -FilePath $ff -ArgumentList $ffArgs -PassThru
  $shots = Join-Path $profile 'shots'
  $deadline = (Get-Date).AddSeconds(120)
  while (-not $p.HasExited -and (Get-Date) -lt $deadline) {
    if ($Headed) { Save-ScreenRequests $shots }
    Start-Sleep -Milliseconds 200
  }
  if (-not $p.HasExited) {
    Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $ff } | Stop-Process -Force
    Write-Error "Screenshots ($t) timed out"
  }
  Start-Sleep -Seconds 2
  if (-not (Test-Path $shots)) { Write-Error "No screenshots ($t): see the browser console" }
  Copy-Item (Join-Path $shots '*') $Out -Force -Exclude '*.request.json'
}
Get-ChildItem $Out | ForEach-Object { $_.Name }
