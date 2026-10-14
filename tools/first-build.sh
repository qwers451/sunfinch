#!/usr/bin/env bash
# First full build after `surfer download`. Run inside the MozillaBuild shell:
#   tools\mozshell.cmd "bash tools/first-build.sh"
# Logs go to .surfer/logs/.
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

# --no-interactive: bootstrap must not wait for answers.
step bootstrap bash -c "cd engine && ./mach --no-interactive bootstrap --application-choice browser"
step brand npx surfer set brand release
step import npx surfer import
step build npx surfer build
echo "=== $(date '+%H:%M:%S') done"
