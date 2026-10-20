#!/bin/sh
# Workspace-backed Linux home; shares the phone kernel and network through PRoot.
set -eu
phone_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
phone_workspace=$(CDPATH= cd -- "$phone_dir/.." && pwd)
phone_rootfs=${MC_LINUX_ROOTFS:-/data/data/com.termux/files/usr/var/lib/proot-distro/containers/debian/rootfs}
umask 077
mkdir -p "$phone_dir/home" "$phone_dir/.runtime/shell-tmp"
if [ "$#" -eq 0 ]; then
    set -- /bin/bash --noprofile --norc
fi
exec env -u LD_PRELOAD PROOT_NO_SECCOMP=1 proot \
    --kill-on-exit --link2symlink --sysvipc --kernel-release=6.1.0 -L --change-id=0:0 \
    -r "$phone_rootfs" -b /dev -b /proc -b /sys \
    -b /data/data/com.termux/files/usr \
    -b "$phone_workspace/minecraft-server:/srv/minecraft" \
    -b "$phone_workspace/.build-tools/java21:/opt/ryuuworl-java" \
    -b "$phone_dir/home:/root" -b "$phone_dir/.runtime/shell-tmp:/tmp" \
    -w /root /usr/bin/env HOME=/root USER=root LOGNAME=root HOSTNAME=ryuuworl-phone \
    PATH=/opt/ryuuworl-java/bin:/usr/bin:/bin LANG=C.UTF-8 \
    PS1='\u@ryuuworl-phone:\w\$ ' "$@"
