#!/bin/sh
set -eu
mc_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$mc_dir"
if [ "$#" -ne 0 ]; then
    echo 'Usage: sh start.sh (configure RAM with MC_MIN_RAM and MC_MAX_RAM)' >&2
    exit 2
fi
if ! awk -F= '/^[[:space:]]*eula[[:space:]]*=/ {gsub(/[[:space:]\r]/,"",$2); value=$2} END {exit value != "true"}' eula.txt; then
    echo 'Chua chap nhan Minecraft EULA: https://www.minecraft.net/en-us/eula' >&2
    echo 'Sau khi doc va dong y, chay: sh accept-eula.sh --agree' >&2
    exit 3
fi
mc_java=${JAVA_BIN:-java}
if ! command -v "$mc_java" >/dev/null 2>&1; then
    echo 'Can cai Linux Java 21 tro len; tren Termux dung run-linux.sh.' >&2
    exit 4
fi
mc_java_info=$("$mc_java" -XshowSettings:properties -version 2>&1)
case "$mc_java_info" in
    *"java.vendor = Termux"*)
        echo "NetherNet khong nap duoc thu vien native voi Java Termux (Android/Bionic)." >&2
        echo "Dung sh run-linux.sh hoac chay bo server tren VPS Linux." >&2
        exit 5
        ;;
esac
mc_major=$(printf '%s\n' "$mc_java_info" | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -n 1)
if [ -z "$mc_major" ] || [ "$mc_major" -lt 21 ]; then
    echo 'Paper 1.21.11 can Java 21 tro len.' >&2
    exit 4
fi
mc_min=${MC_MIN_RAM:-256M}
mc_max=${MC_MAX_RAM:-768M}
for mc_heap in "$mc_min" "$mc_max"; do
    if ! printf '%s\n' "$mc_heap" | LC_ALL=C grep -Eq '^[1-9][0-9]*[mMgG]$'; then
        echo 'RAM phai co dang 256M, 1024M hoac 4G.' >&2
        exit 2
    fi
done
if command -v python3 >/dev/null 2>&1; then
    python3 install.py --verify
else
    echo 'Can Python 3.11+ de kiem tra SHA256: python3 install.py --verify' >&2
    exit 4
fi
echo 'Ryuuworl | Java TCP 25565 | Bedrock TCP/UDP 19132 + UDP 19133'
echo 'Go stop trong console de luu world va tat server.'
exec "$mc_java" "-Xms$mc_min" "-Xmx$mc_max" -XX:+UseG1GC -XX:ActiveProcessorCount=2 \
    -Djava.awt.headless=true -Dterminal.jline=false -Dterminal.ansi=false \
    -jar paper.jar --nogui
