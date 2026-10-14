@echo off
rem Starts the prototype browser: Firefox ESR 153 with fx-autoconfig and a
rem separate profile whose chrome/JS and chrome/CSS point to prototypes/.
rem Usage: tools\proto.cmd [extra firefox args]
setlocal
if not defined SUNFINCH_PROTO_FF set SUNFINCH_PROTO_FF=E:\tools\firefox-esr-153\firefox.exe
if not defined SUNFINCH_PROTO_PROFILE set SUNFINCH_PROTO_PROFILE=E:\tools\sunfinch-proto\profile
for %%I in ("%~dp0..") do set REPO=%%~fI

if not exist "%SUNFINCH_PROTO_PROFILE%\chrome" mkdir "%SUNFINCH_PROTO_PROFILE%\chrome"
if not exist "%SUNFINCH_PROTO_PROFILE%\chrome\JS" mklink /J "%SUNFINCH_PROTO_PROFILE%\chrome\JS" "%REPO%\prototypes\JS" >nul
if not exist "%SUNFINCH_PROTO_PROFILE%\chrome\CSS" mklink /J "%SUNFINCH_PROTO_PROFILE%\chrome\CSS" "%REPO%\prototypes\CSS" >nul
copy /y "%REPO%\prototypes\user.js" "%SUNFINCH_PROTO_PROFILE%\user.js" >nul
rem Actor modules of the fork for content processes (see sunfinch-dev-loader.uc.js).
rem The content sandbox reads only inside the profile, so they are copied there.
robocopy "%REPO%\src\browser\components\sunfinch\modules" "%SUNFINCH_PROTO_PROFILE%\chrome\sunfinch-dev-modules" /MIR /NJH /NJS /NFL /NDL >nul
findstr /c:"content sunfinchdev" "%SUNFINCH_PROTO_PROFILE%\chrome\utils\chrome.manifest" >nul || (echo content sunfinchdev ../sunfinch-dev-modules/)>> "%SUNFINCH_PROTO_PROFILE%\chrome\utils\chrome.manifest"

rem -purgecaches: scripts are cached in the startup cache, edits need a purge.
start "" "%SUNFINCH_PROTO_FF%" -profile "%SUNFINCH_PROTO_PROFILE%" -no-remote -purgecaches %*
