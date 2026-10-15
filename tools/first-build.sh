#!/usr/bin/env bash
# Full build after `surfer download`. Run inside the MozillaBuild shell:
#   tools\mozshell.cmd "bash tools/first-build.sh"            all steps
#   tools\mozshell.cmd "bash tools/first-build.sh build"      only some steps
# Steps: bootstrap brand import build mach. Logs go to .surfer/logs/<step>.log.
set -o pipefail
cd "$(dirname "$0")/.."
mkdir -p .surfer/logs

step() {
  local name=$1; shift
  echo "=== $(date '+%H:%M:%S') $name"
  if ! "$@" 2>&1 | tee ".surfer/logs/$name.log"; then
    echo "=== $(date '+%H:%M:%S') $name FAILED, see .surfer/logs/$name.log"
    exit 1
  fi
}

# The cc crate in Rust build scripts looks for Visual Studio by itself and
# would take the headers of an installed VS, whose STL may need a newer clang
# than the bootstrapped one. With VCINSTALLDIR set and cl.exe on PATH it
# treats the environment as a developer prompt and keeps the INCLUDE/LIB that
# the build sets for the bootstrapped toolchain.
vc_tools=$(ls -d "$MOZBUILD_STATE_PATH"/vs/VC/Tools/MSVC/*/ 2>/dev/null | tail -n 1)
if [ -n "$vc_tools" ]; then
  export VCINSTALLDIR="$(cygpath -w "$MOZBUILD_STATE_PATH/vs/VC")\\"
  export PATH="$(cygpath -u "$vc_tools")bin/Hostx64/x64:$PATH"
fi

steps=("$@")
[ ${#steps[@]} -eq 0 ] && steps=(bootstrap brand import build mach)

for s in "${steps[@]}"; do
  case $s in
    # --no-interactive: bootstrap must not wait for answers.
    bootstrap) step bootstrap bash -c "cd engine && ./mach --no-interactive bootstrap --application-choice browser" ;;
    brand) step brand npx surfer set brand release ;;
    import) step import npx surfer import ;;
    # surfer writes mozconfig and the version files; mach (next step) builds.
    # --skip-patch-check: hooks exported with `surfer export` count as
    # "not imported", and the check then waits for a y/N answer.
    build) step build env SURFER_MOZCONFIG_ONLY=1 npx surfer build --skip-patch-check ;;
    # mach directly, after `surfer build` has written mozconfig and the
    # version files: surfer keeps mach's stdin open and its output buffered,
    # and mach can then sit silently waiting for an answer.
    # Without AI_AGENT/CLAUDECODE: under an AI agent mach hides error details.
    mach) step mach bash -c "cd engine && env -u AI_AGENT -u CLAUDECODE PYTHONUNBUFFERED=1 ./mach --no-interactive build </dev/null" ;;
    *) echo "unknown step: $s"; exit 2 ;;
  esac
done
echo "=== $(date '+%H:%M:%S') done"
