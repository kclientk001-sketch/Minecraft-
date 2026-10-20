#!/bin/sh
# Give Linux Playit the existing Debian DNS and certificate store.
set -eu
playit_mc_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
playit_workspace=$(CDPATH= cd -- "$playit_mc_dir/.." && pwd)
playit_rootfs=${MC_LINUX_ROOTFS:-/data/data/com.termux/files/usr/var/lib/proot-distro/containers/debian/rootfs}
umask 077
mkdir -p "$playit_mc_dir/.runtime/playit" "$playit_workspace/.build-tools/playit/tmp"
exec env -u LD_PRELOAD PROOT_NO_SECCOMP=1 proot \
    --kill-on-exit --link2symlink --sysvipc --kernel-release=6.1.0 -L \
    -r "$playit_rootfs" -b /dev -b /proc -b /sys \
    -b /data/data/com.termux/files/usr \
    -b "$playit_workspace/.build-tools/playit:/opt/playit" \
    -b "$playit_mc_dir/.runtime/playit:/run/playit" \
    -b "$playit_workspace/.build-tools/playit/tmp:/tmp" \
    -w /run/playit /usr/bin/env PATH=/usr/bin:/bin \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt "$@"
