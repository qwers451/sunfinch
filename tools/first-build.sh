#!/usr/bin/env bash
# Full build after `surfer download`. Run inside the MozillaBuild shell:
#   tools\mozshell.cmd "bash tools/first-build.sh"            all steps
#   tools\mozshell.cmd "bash tools/first-build.sh build"      only some steps
# Steps: bootstrap brand import build. Logs go to .surfer/logs/<step>.log.
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

steps=("$@")
[ ${#steps[@]} -eq 0 ] && steps=(bootstrap brand import build)

for s in "${steps[@]}"; do
  case $s in
    # --no-interactive: bootstrap must not wait for answers.
    bootstrap) step bootstrap bash -c "cd engine && ./mach --no-interactive bootstrap --application-choice browser" ;;
    brand) step brand npx surfer set brand release ;;
    import) step import npx surfer import ;;
    build) step build npx surfer build ;;
    *) echo "unknown step: $s"; exit 2 ;;
  esac
done
echo "=== $(date '+%H:%M:%S') done"
