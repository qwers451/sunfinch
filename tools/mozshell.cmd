@echo off
rem Runs a command in the MozillaBuild shell without opening a mintty window.
rem Usage: tools\mozshell.cmd "npx surfer build"
rem Without arguments, opens an interactive MozillaBuild shell in the repo.
rem The repo path must not contain spaces (MozillaBuild requirement anyway).
setlocal
set USE_MINTTY=0
if not defined MOZBUILD_STATE_PATH set MOZBUILD_STATE_PATH=E:\mozbuild
if not defined CARGO_HOME set CARGO_HOME=E:\mozbuild\cargo
if not defined RUSTUP_HOME set RUSTUP_HOME=E:\mozbuild\rustup
if not defined MOZILLABUILD_DIR set MOZILLABUILD_DIR=E:\MozillaBuild
for %%I in ("%~dp0..") do set REPO=%%~fI
set "CMDLINE=%~1"
if "%CMDLINE%"=="" set "CMDLINE=exec bash -i"
call "%MOZILLABUILD_DIR%\start-shell.bat" -c "cd $(cygpath -u '%REPO%') && %CMDLINE%"
