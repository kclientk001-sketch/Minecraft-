#!/bin/sh
set -eu
if [ "$#" -ne 1 ] || [ "$1" != '--agree' ]; then
    echo 'Doc https://www.minecraft.net/en-us/eula truoc khi dong y.' >&2
    echo 'Chi khi ban dong y, chay: sh accept-eula.sh --agree' >&2
    exit 2
fi
mc_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
umask 077
{
    echo '# Minecraft EULA: https://www.minecraft.net/en-us/eula'
    echo '# Accepted explicitly by the operator using accept-eula.sh --agree'
    date -u '+# Accepted at: %Y-%m-%dT%H:%M:%SZ'
    echo 'eula=true'
} > "$mc_dir/eula.txt"
echo 'Da ghi nhan chap nhan EULA. Chay: sh start.sh'
