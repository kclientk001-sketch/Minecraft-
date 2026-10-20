#!/bin/sh
# Termux-only bridge to the existing Debian filesystem and workspace-local Java.
set -eu
mc_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mc_workspace=$(CDPATH= cd -- "$mc_dir/.." && pwd)
mc_rootfs=${MC_LINUX_ROOTFS:-/data/data/com.termux/files/usr/var/lib/proot-distro/containers/debian/rootfs}
mc_jre=${MC_LINUX_JAVA:-$mc_workspace/.build-tools/java21}
if [ ! -x "$mc_jre/bin/java" ] || [ ! -x "$mc_rootfs/usr/bin/env" ]; then
    echo 'Can Debian proot va Linux Java 21 runtime.' >&2
    echo 'Dat MC_LINUX_ROOTFS va MC_LINUX_JAVA, hoac chuyen bo server sang VPS Linux.' >&2
    exit 4
fi
if ! command -v proot >/dev/null 2>&1; then
    echo 'Can proot de chay Linux Java trong Termux.' >&2
    exit 4
fi
mkdir -p "$mc_workspace/.build-tools/minecraft-tmp"
if [ "$#" -eq 0 ]; then
    set -- sh /minecraft-server/start.sh
fi
exec env -u LD_PRELOAD PROOT_NO_SECCOMP=1 proot \
    --kill-on-exit --link2symlink --sysvipc --kernel-release=6.1.0 -L --change-id=0:0 \
    -r "$mc_rootfs" -b /dev -b /proc -b /sys \
    -b /data/data/com.termux/files/usr \
    -b "$mc_dir:/minecraft-server" \
    -b "$mc_jre:/opt/ryuuworl-java" \
    -b "$mc_workspace/.build-tools/minecraft-tmp:/tmp" \
    -w /minecraft-server \
    /usr/bin/env PATH=/opt/ryuuworl-java/bin:/usr/bin:/bin \
    TMPDIR=/tmp XDG_CACHE_HOME=/tmp/cache JAVA_BIN=java \
    MC_MIN_RAM="${MC_MIN_RAM:-256M}" MC_MAX_RAM="${MC_MAX_RAM:-768M}" \
    "$@"
