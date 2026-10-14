# Runs the prototype self-test headless and prints the results.
# Usage: powershell -File tools\proto-selftest.ps1 [-Headed]
param([switch]$Headed)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$ff = if ($env:SUNFINCH_PROTO_FF) { $env:SUNFINCH_PROTO_FF } else { 'E:\tools\firefox-esr-153\firefox.exe' }
$profile = if ($env:SUNFINCH_PROTO_PROFILE) { $env:SUNFINCH_PROTO_PROFILE } else { 'E:\tools\sunfinch-proto\profile' }
$downloads = Join-Path (Split-Path -Parent $profile) 'selftest-downloads'

foreach ($dir in 'JS', 'CSS') {
  $link = Join-Path $profile "chrome\$dir"
  if (-not (Test-Path $link)) {
    New-Item -ItemType Junction -Path $link -Target (Join-Path $repo "prototypes\$dir") | Out-Null
  }
}
New-Item -ItemType Directory -Force $downloads | Out-Null
Remove-Item (Join-Path $profile 'selftest.json') -ErrorAction SilentlyContinue

$userJs = Get-Content (Join-Path $repo 'prototypes\user.js') -Raw
$userJs += @"

user_pref("sunfinch.proto.selftest", true);
user_pref("browser.download.useDownloadDir", true);
user_pref("browser.download.folderList", 2);
user_pref("browser.download.dir", "$($downloads -replace '\\', '\\')");
"@
Set-Content -Path (Join-Path $profile 'user.js') -Value $userJs -Encoding utf8

$ffArgs = @('-profile', $profile, '-no-remote', '-purgecaches')
if (-not $Headed) { $ffArgs = @('-headless') + $ffArgs }
$p = Start-Process -FilePath $ff -ArgumentList $ffArgs -PassThru
if (-not $p.WaitForExit(120000)) {
  Get-Process firefox -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $ff } | Stop-Process -Force
  Write-Error 'Self-test timed out'
}

# Restore the normal prefs for interactive runs.
Copy-Item (Join-Path $repo 'prototypes\user.js') (Join-Path $profile 'user.js') -Force
& {
  # user.js only adds prefs; drop the self-test ones that stuck in prefs.js.
  $prefs = Join-Path $profile 'prefs.js'
  if (Test-Path $prefs) {
    (Get-Content $prefs) | Where-Object { $_ -notmatch 'sunfinch\.proto\.selftest|browser\.download\.(dir|folderList|useDownloadDir)' } |
      Set-Content $prefs -Encoding utf8
  }
}

$report = Join-Path $profile 'selftest.json'
if (-not (Test-Path $report)) { Write-Error 'No selftest.json: the self-test did not run' }
$data = Get-Content $report -Raw | ConvertFrom-Json
$failed = 0
foreach ($r in $data.results) {
  $mark = if ($r.ok) { 'PASS' } else { 'FAIL' }
  if (-not $r.ok) { $failed++ }
  "{0}  {1}  {2}" -f $mark, $r.name, $r.detail
}
if ($failed) { exit 1 }
