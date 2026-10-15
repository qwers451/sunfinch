# Starts tools/first-build.sh as an independent process (through WMI), so the
# build survives the terminal or agent session that started it.
# Usage: powershell -File tools\start-build.ps1 [steps...]   (default: mach)
# Progress: .surfer\logs\chain.log (steps) and .surfer\logs\<step>.log.
$repo = Split-Path -Parent $PSScriptRoot
$steps = if ($args.Count) { $args -join ' ' } else { 'mach' }
$log = Join-Path $repo '.surfer\logs\chain.log'
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
$cmd = "cmd.exe /c $repo\tools\mozshell.cmd `"bash tools/first-build.sh $steps`" > $log 2>&1"
$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = $cmd
  CurrentDirectory = $repo
}
if ($r.ReturnValue -ne 0) { Write-Error "Could not start the build: $($r.ReturnValue)" }
"Build started (pid $($r.ProcessId)): $steps. Log: $log"
