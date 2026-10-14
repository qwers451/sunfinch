# Runs the prototype self-test headless in a fresh throwaway profile and
# prints the results. Phase 1 exercises the prototypes and quits, phase 2
# starts again with session restore and checks what survived.
# Usage: powershell -File tools\proto-selftest.ps1 [-Headed]
param([switch]$Headed)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$ff = if ($env:SUNFINCH_PROTO_FF) { $env:SUNFINCH_PROTO_FF } else { 'E:\tools\firefox-esr-153\firefox.exe' }
$base = if ($env:SUNFINCH_PROTO_DIR) { $env:SUNFINCH_PROTO_DIR } else { 'E:\tools\sunfinch-proto' }
$autoconfigUtils = Join-Path $base 'profile\chrome\utils'
$profile = Join-Path $base 'selftest-profile'
$downloads = Join-Path $base 'selftest-downloads'

# Fresh profile: fx-autoconfig utils plus junctions to the repo scripts.
if (Test-Path $profile) {
  # Remove junctions first so their targets in the repo stay untouched.
  foreach ($dir in 'JS', 'CSS') {
    $link = Join-Path $profile "chrome\$dir"
    if (Test-Path $link) { [System.IO.Directory]::Delete($link) }
  }
  Remove-Item -Recurse -Force $profile
}
New-Item -ItemType Directory -Force (Join-Path $profile 'chrome') | Out-Null
Copy-Item -Recurse $autoconfigUtils (Join-Path $profile 'chrome\utils')
# Actor modules of the fork for content processes (see sunfinch-dev-loader.uc.js).
# The content sandbox reads only inside the profile, so they are copied there.
Copy-Item -Recurse (Join-Path $repo 'src\browser\components\sunfinch\modules') (Join-Path $profile 'chrome\sunfinch-dev-modules')
Add-Content -Path (Join-Path $profile 'chrome\utils\chrome.manifest') -Value "content sunfinchdev ../sunfinch-dev-modules/" -Encoding ascii
foreach ($dir in 'JS', 'CSS') {
  New-Item -ItemType Junction -Path (Join-Path $profile "chrome\$dir") -Target (Join-Path $repo "prototypes\$dir") | Out-Null
}
if (Test-Path $downloads) { Remove-Item -Recurse -Force $downloads }
New-Item -ItemType Directory -Force $downloads | Out-Null

$baseUserJs = Get-Content (Join-Path $repo 'prototypes\user.js') -Raw
$failed = 0
foreach ($phase in '1', '2') {
  $userJs = $baseUserJs + @"

user_pref("sunfinch.proto.selftest", true);
user_pref("sunfinch.proto.selftest.phase", "$phase");
user_pref("browser.download.useDownloadDir", true);
user_pref("browser.download.folderList", 2);
user_pref("browser.download.dir", "$($downloads -replace '\\', '\\')");
"@
  Set-Content -Path (Join-Path $profile 'user.js') -Value $userJs -Encoding utf8

  $ffArgs = @('-profile', $profile, '-no-remote', '-purgecaches')
  if (-not $Headed) { $ffArgs = @('-headless') + $ffArgs }
  $p = Start-Process -FilePath $ff -ArgumentList $ffArgs -PassThru
  if (-not $p.WaitForExit(180000)) {
    Get-Process firefox -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $ff } | Stop-Process -Force
    Write-Error "Self-test phase $phase timed out"
  }
  # Let child processes exit before the next start.
  for ($i = 0; $i -lt 20 -and (Get-Process firefox -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $ff }); $i++) {
    Start-Sleep -Milliseconds 500
  }

  $report = Join-Path $profile "selftest-$phase.json"
  if (-not (Test-Path $report)) { Write-Error "No selftest-$phase.json: phase $phase did not run" }
  $data = Get-Content $report -Raw | ConvertFrom-Json
  foreach ($r in $data.results) {
    $mark = if ($r.ok) { 'PASS' } else { 'FAIL' }
    if (-not $r.ok) { $failed++ }
    "{0}  [{1}] {2}  {3}" -f $mark, $phase, $r.name, $r.detail
  }
}
if ($failed) { exit 1 }
