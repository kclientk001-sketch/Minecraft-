#!/bin/sh
set -eu
# Local Termux adapter. Normal Linux hosts can use npm commands directly.
task_workspace=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
task_rootfs=/data/data/com.termux/files/usr/var/lib/proot-distro/containers/debian/rootfs
if [ ! -x "$task_workspace/.build-tools/node/bin/node" ]; then
  echo 'Linux Node runtime is not prepared in workspace/.build-tools/node.' >&2
  exit 1
fi
exec env -u LD_PRELOAD PROOT_NO_SECCOMP=1 proot \
  --kill-on-exit --link2symlink --sysvipc --kernel-release=6.1.0 -L --change-id=0:0 \
  -r "$task_rootfs" -b /dev -b /proc -b /sys \
  -b /data/data/com.termux/files/usr \
  -b "$task_workspace:/workspace" \
  -b "$task_workspace/.build-tools/tmp:/tmp" \
  -w /workspace/imports/ai-github \
  /usr/bin/env \
  PATH=/workspace/.build-tools/node/bin:/usr/bin:/bin \
  XDG_CACHE_HOME=/workspace/.build-tools/cache \
  TMPDIR=/tmp \
  npm_config_cache=/workspace/.build-tools/npm-cache \
  npm_config_update_notifier=false \
  NEXT_TELEMETRY_DISABLED=1 \
  "$@"
