# Runs the SunFinch self-test headless in a fresh throwaway profile and
# prints the results. Phase 1 exercises the features and quits, phase 2
# starts again with session restore and checks what survived.
#
# Default: the prototype stand (Firefox ESR + fx-autoconfig + code from src/).
# -Build: the built browser (engine/obj-*/dist/bin/sunfinch.exe) with its own
# code; only the test script is loaded through fx-autoconfig.
#
# Usage: powershell -File tools\proto-selftest.ps1 [-Build] [-Headed]
param([switch]$Build, [switch]$Headed)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$base = if ($env:SUNFINCH_PROTO_DIR) { $env:SUNFINCH_PROTO_DIR } else { 'E:\tools\sunfinch-proto' }
$autoconfig = 'E:\tools\dl\fx-autoconfig\src'
$autoconfigUtils = Join-Path $base 'profile\chrome\utils'
if ($Build) {
  $bin = Get-ChildItem (Join-Path $repo 'engine') -Directory -Filter 'obj-*' | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName 'dist\bin' }
  $ff = Join-Path $bin 'sunfinch.exe'
  $profile = Join-Path $base 'selftest-build-profile'
  # fx-autoconfig in the build output, only to run the test script.
  Copy-Item (Join-Path $autoconfig 'program\config.js') $bin -Force
  New-Item -ItemType Directory -Force (Join-Path $bin 'defaults\pref') | Out-Null
  Copy-Item (Join-Path $autoconfig 'program\defaults\pref\config-prefs.js') (Join-Path $bin 'defaults\pref') -Force
} else {
  $ff = if ($env:SUNFINCH_PROTO_FF) { $env:SUNFINCH_PROTO_FF } else { 'E:\tools\firefox-esr-153\firefox.exe' }
  $profile = Join-Path $base 'selftest-profile'
}
$downloads = Join-Path $base 'selftest-downloads'

# Fresh profile with fx-autoconfig utils.
if (Test-Path $profile) {
  # Remove junctions first so their targets in the repo stay untouched.
  foreach ($dir in 'JS', 'CSS') {
    $link = Join-Path $profile "chrome\$dir"
    if ((Test-Path $link) -and (Get-Item $link).LinkType) { [System.IO.Directory]::Delete($link) }
  }
  Remove-Item -Recurse -Force $profile
}
New-Item -ItemType Directory -Force (Join-Path $profile 'chrome') | Out-Null
Copy-Item -Recurse $autoconfigUtils (Join-Path $profile 'chrome\utils')
if ($Build) {
  # The built browser has its own code; load only the test.
  New-Item -ItemType Directory -Force (Join-Path $profile 'chrome\JS'), (Join-Path $profile 'chrome\CSS') | Out-Null
  Copy-Item (Join-Path $repo 'prototypes\JS\zz-sunfinch-selftest.uc.js') (Join-Path $profile 'chrome\JS')
} else {
  # Actor modules of the fork for content processes (see sunfinch-dev-loader.uc.js).
  # The content sandbox reads only inside the profile, so they are copied there.
  Copy-Item -Recurse (Join-Path $repo 'src\browser\components\sunfinch\modules') (Join-Path $profile 'chrome\sunfinch-dev-modules')
  Add-Content -Path (Join-Path $profile 'chrome\utils\chrome.manifest') -Value "content sunfinchdev ../sunfinch-dev-modules/" -Encoding ascii
  foreach ($dir in 'JS', 'CSS') {
    New-Item -ItemType Junction -Path (Join-Path $profile "chrome\$dir") -Target (Join-Path $repo "prototypes\$dir") | Out-Null
  }
}
if (Test-Path $downloads) { Remove-Item -Recurse -Force $downloads }
New-Item -ItemType Directory -Force $downloads | Out-Null

# The Claude check asserts that this variable does not reach the CLI.
$env:SUNFINCH_TEST_SECRET = '1'

$running = { Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $ff } }
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
    & $running | Stop-Process -Force
    Write-Error "Self-test phase $phase timed out"
  }
  # Let child processes exit before the next start.
  for ($i = 0; $i -lt 20 -and (& $running); $i++) {
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
