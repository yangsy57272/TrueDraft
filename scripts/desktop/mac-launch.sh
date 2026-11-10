#!/bin/sh
set -eu
resources="$(cd "$(dirname "$0")/../Resources" && pwd)"
if [ "$#" -gt 0 ]; then
  exec "$resources/node" "$resources/launch.mjs" "$@"
fi
data_dir="${TRUEDRAFT_DESKTOP_DATA_DIR:-$HOME/Library/Application Support/TrueDraft}"
umask 077
mkdir -p "$data_dir"
(
  if ! "$resources/node" "$resources/launch.mjs"; then
    /usr/bin/osascript -e 'display alert "TrueDraft could not start" message "See desktop.log in Library/Application Support/TrueDraft." as critical'
  fi
) </dev/null >>"$data_dir/desktop.log" 2>&1 &
