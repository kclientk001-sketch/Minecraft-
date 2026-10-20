#!/usr/bin/env python3
"""Manage the workspace-local Playit agent; never print credentials or claim links."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
TOOLS = ROOT.parent / '.build-tools/playit'
RUNTIME = ROOT / '.runtime/playit'
SOCKET = RUNTIME / 'agent.sock'
SECRET = RUNTIME / 'agent.secret'
CLAIM = RUNTIME / 'claim-url'
BINARIES = {
    'daemon': ('playit-linux-aarch64', '4c0db3e7b3a8158e249441c2f0b73f54e83429395890c7b1ca45fd7a6303d763'),
    'setup': ('playit-cli-linux-aarch64', 'b126b4164c03838598c8f33f209d76f6acf1c257d07900c0af2d461b9647099f'),
}


def binary(kind):
    name, digest = BINARIES[kind]
    path = TOOLS / name
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise SystemExit('Playit executable is missing or its SHA-256 does not match version 1.0.10.')
    return path


def owned_pid(kind):
    try:
        pid = int((RUNTIME / (kind + '.pid')).read_text().strip())
        args = Path('/proc', str(pid), 'cmdline').read_bytes().split(b'\0')
        status = Path('/proc', str(pid), 'status').read_text()
        if '\nState:\tZ' in status:
            return None
        if kind == 'setup' and str(ROOT / 'link-playit.py').encode() in args:
            return pid
        if kind == 'daemon' and b'proot' in Path(os.fsdecode(args[0])).name.encode() and \
                b'/opt/playit/playit-linux-aarch64' in args and \
                (str(RUNTIME) + ':/run/playit').encode() in args:
            return pid
    except (OSError, ValueError, IndexError):
        pass
    return None


def run_foreground(kind):
    if owned_pid(kind):
        raise SystemExit('This tunnel process is already running.')
    if kind == 'daemon':
        binary(kind)
        args = ['sh', str(ROOT / 'run-playit.sh'), '/opt/playit/playit-linux-aarch64',
                '--secret-path', '/run/playit/agent.secret', '--socket-path', '/run/playit/agent.sock',
                '--log-path', '/run/playit/daemon.log']
    else:
        if SECRET.is_file() and SECRET.stat().st_size > 0:
            raise SystemExit('Agent credentials are already stored; a new claim is unnecessary.')
        if not owned_pid('daemon'):
            raise SystemExit('Start run-agent in a persistent session first.')
        args = [sys.executable, str(ROOT / 'link-playit.py')]
    (RUNTIME / (kind + '.pid')).write_text(str(os.getpid()) + '\n')
    log = RUNTIME / (kind + '-console.log')
    fd = os.open(log, os.O_WRONLY | os.O_CREAT | (os.O_TRUNC if kind == 'setup' else os.O_APPEND), 0o600)
    os.dup2(fd, 1)
    os.dup2(fd, 2)
    if fd > 2:
        os.close(fd)
    os.chdir(RUNTIME)
    os.execvp(args[0], args)


def claim_url():
    # Accept only the official claim page, never an arbitrary URL from a log.
    try:
        if CLAIM.is_file():
            value = CLAIM.read_text().strip()
            if re.fullmatch(r'https://playit\.gg/claim/[0-9a-f]{10}', value):
                return value
    except OSError:
        pass
    try:
        raw = (RUNTIME / 'setup-console.log').read_text(errors='replace')[-128000:]
        found = re.findall(r'https://playit\.gg/claim/[0-9a-f]{10}(?![0-9a-f])', raw)
        if found:
            CLAIM.write_text(found[-1] + '\n')
            CLAIM.chmod(0o600)
            return found[-1]
    except OSError:
        pass
    return None


def status():
    credential = SECRET.is_file() and SECRET.stat().st_size > 0
    if credential:
        SECRET.chmod(0o600)
    verification = {}
    try:
        verification = json.loads((ROOT.parent / 'release/ryuuworl-public-java-verification.json').read_text())
    except (OSError, ValueError):
        pass
    return {
        'agentVersion': '1.0.10',
        'daemonRunning': bool(owned_pid('daemon')),
        'setupWaiting': bool(owned_pid('setup')) and not credential,
        'credentialStored': credential,
        'claimLinkReady': False if credential else bool(claim_url()),
        'publicEndpointVerified': bool(verification.get('passed')),
        'lastPublicVerificationAt': verification.get('checkedAt'),
        'note': ('Agent linked. Verify the allocated game tunnel endpoints separately before declaring public readiness.' if credential else 'The account must claim the agent before game tunnels can be allocated.'),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['run-agent', 'run-setup', 'open', 'status', 'stop'])
    args = parser.parse_args()
    os.umask(0o077)
    RUNTIME.mkdir(parents=True, exist_ok=True, mode=0o700)
    RUNTIME.chmod(0o700)
    with (RUNTIME / 'control.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.action in ['run-agent', 'run-setup']:
            run_foreground('daemon' if args.action == 'run-agent' else 'setup')
        elif args.action == 'open':
            if not owned_pid('daemon'):
                raise SystemExit('Start run-agent in a persistent session first.')
            if args.action == 'open':
                if SECRET.is_file():
                    url = 'https://playit.gg/account/tunnels'
                else:
                    url = claim_url()
                if not url:
                    raise SystemExit('The browser link is not ready; no credential was printed.')
                opener = shutil.which('termux-open-url')
                if not opener:
                    raise SystemExit('termux-open-url is unavailable; the claim link remains private on this device.')
                result = subprocess.run([opener, url], stdin=subprocess.DEVNULL,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
                if result.returncode:
                    raise SystemExit('Unable to open the Android browser. No credential was printed.')
                print('Opened the official Playit page in the device browser; claim link not printed.')
        elif args.action == 'stop':
            for kind in ['setup', 'daemon']:
                pid = owned_pid(kind)
                if pid:
                    os.kill(pid, signal.SIGTERM)
            print('Stop requested for the workspace-local tunnel processes.')
        print(json.dumps(status(), ensure_ascii=False))


if __name__ == '__main__':
    main()
