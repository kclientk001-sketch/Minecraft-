#!/usr/bin/env python3
"""Start, stop and inspect the Ryuuworl Linux server running on this phone."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time

import control

ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent
MC = WORKSPACE / 'minecraft-server'
RUNTIME = control.RUNTIME
SESSION = 'ryuuworl-vps'
SOCKET = RUNTIME / 'tmux.sock'


def tmux(*args):
    return subprocess.run(['tmux', '-S', str(SOCKET), *args], capture_output=True, text=True)


def preflight():
    checks = {'tmux': bool(shutil.which('tmux')), 'proot': bool(shutil.which('proot')),
              'debian': Path('/data/data/com.termux/files/usr/var/lib/proot-distro/containers/debian/rootfs/usr/bin/env').is_file(),
              'java21': (WORKSPACE / '.build-tools/java21/bin/java').is_file(),
              'minecraft': (MC / 'paper.jar').is_file(),
              'playitLinked': (MC / '.runtime/playit/agent.secret').is_file(),
              'eulaAccepted': 'eula=true' in (MC / 'eula.txt').read_text().splitlines(),
              'diskSpace': shutil.disk_usage(WORKSPACE).free > 256 * 1024 * 1024}
    return checks


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def status(public=False):
    active = bool(control.supervisor_pid())
    try:
        state = json.loads((RUNTIME / 'state.json').read_text())
    except (OSError, ValueError):
        state = {}
    try:
        domain_check = json.loads((WORKSPACE / 'release/ryuuworl-minecraft-domain-verification.json').read_text())
    except (OSError, ValueError):
        domain_check = {}
    domain_configured = (domain_check.get('domain') == 'ryuuworl.id.vn'
                         and domain_check.get('dnsVerified') is True)
    result = {'type': 'Debian Linux in Termux/PRoot on this phone', 'supervisorActive': active,
              'state': state if active else None, 'panelUrl': 'http://127.0.0.1:8765',
              'javaPublicAddress': 'ryuuworl.id.vn' if domain_configured else 'traded-disk.tun.ply.gg:9719',
              'javaTunnelAddress': 'traded-disk.tun.ply.gg:9719', 'bedrockPublic': False,
              'customDomainConfigured': domain_configured,
              'customDomainVerifiedAt': domain_check.get('checkedAt') if domain_configured else None}
    endpoints = {}
    for name, port in [('javaTcp', 25565), ('bedrockSignalingTcp', 19132), ('panelTcp', 8765)]:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=1):
                endpoints[name] = True
        except OSError:
            endpoints[name] = False
    result['localPorts'] = endpoints
    if public:
        checker = module('phone_status', MC / 'status.py')
        try:
            result['publicJava'] = checker.java_status('traded-disk.tun.ply.gg', 9719)
        except Exception as exc:
            result['publicJava'] = {'ok': False, 'error': type(exc).__name__}
    return result


def start_detached():
    checks = preflight()
    if not all(checks.values()):
        print(json.dumps({'started': False, 'preflight': checks}, ensure_ascii=False, indent=2))
        return 1
    if control.supervisor_pid():
        control.update_desired(game=True, tunnel=True, panel=True, shutdown=False)
        print('Supervisor already running; all services requested.')
        return 0
    # Avoid taking over processes started in another terminal.
    service = module('phone_minecraft_service', MC / 'service.py')
    tunnel = module('phone_minecraft_tunnel', MC / 'tunnel.py')
    if service.owned_process() or tunnel.owned_pid('daemon'):
        raise SystemExit('Existing Minecraft/Playit runner detected; stop it before starting the phone supervisor.')
    control.update_desired(game=True, tunnel=True, panel=True, shutdown=False)
    if tmux('has-session', '-t', '=' + SESSION).returncode == 0:
        tmux('kill-session', '-t', '=' + SESSION)
    launched = tmux('new-session', '-d', '-s', SESSION, '-c', str(WORKSPACE),
                    sys.executable, str(ROOT / 'supervisor.py'))
    if launched.returncode:
        raise SystemExit('Unable to start the private tmux session.')
    deadline = time.monotonic() + 8
    while not control.supervisor_pid() and time.monotonic() < deadline:
        time.sleep(0.2)
    if not control.supervisor_pid():
        raise SystemExit('Supervisor did not start; inspect the private tmux session.')
    print('Started detached phone Linux supervisor. Minecraft readiness is pending; use status --public.')
    return 0


def run_foreground():
    checks = preflight()
    if not all(checks.values()):
        print(json.dumps({'started': False, 'preflight': checks}, ensure_ascii=False, indent=2))
        return 1
    if control.supervisor_pid():
        control.update_desired(game=True, tunnel=True, panel=True, shutdown=False)
        print('The phone supervisor is already running; all services requested.')
        return 0
    service = module('phone_minecraft_service', MC / 'service.py')
    tunnel = module('phone_minecraft_tunnel', MC / 'tunnel.py')
    if service.owned_process() or tunnel.owned_pid('daemon'):
        raise SystemExit('A separate Minecraft/Playit runner is active; stop it before running this supervisor.')
    control.update_desired(game=True, tunnel=True, panel=True, shutdown=False)
    print('Ryuuworl Phone Linux: starting Minecraft, Playit and local control panel.', flush=True)
    print('Panel: http://127.0.0.1:8765 ; use Ctrl+C to request world-save and shutdown.', flush=True)
    os.execv(sys.executable, [sys.executable, str(ROOT / 'supervisor.py')])

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['start', 'run', 'detach', 'stop', 'status', 'attach', 'shell', 'open', 'preflight'])
    parser.add_argument('--public', action='store_true', help='Also test the Java public endpoint')
    args = parser.parse_args()
    control.prepare()
    if args.action in ['start', 'run']:
        return run_foreground()
    if args.action == 'detach':
        return start_detached()
    if args.action == 'stop':
        control.update_desired(shutdown=True)
        print('Requested shutdown; Minecraft saves its worlds before the relay and panel stop.')
    elif args.action == 'status':
        print(json.dumps(status(args.public), ensure_ascii=False, indent=2))
    elif args.action == 'preflight':
        checks = preflight()
        print(json.dumps(checks, ensure_ascii=False, indent=2))
        return 0 if all(checks.values()) else 1
    elif args.action == 'attach':
        os.execvp('tmux', ['tmux', '-S', str(SOCKET), 'attach-session', '-t', '=' + SESSION])
    elif args.action == 'shell':
        os.execvp('sh', ['sh', str(ROOT / 'shell.sh')])
    elif args.action == 'open':
        subprocess.run(['termux-open-url', 'http://127.0.0.1:8765'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
