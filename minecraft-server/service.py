#!/usr/bin/env python3
"""Control the local Minecraft console without opening RCON or an admin network port."""
import argparse
import fcntl
import json
import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import sys

ROOT=Path(__file__).resolve().parent
RUNTIME=ROOT/'.runtime'
PIDFILE=RUNTIME/'server.pid'
FIFO=RUNTIME/'console.fifo'
LOG=ROOT/'logs/console.log'

def owned_process():
    try:
        pid=int(PIDFILE.read_text().strip())
        cmd=Path('/proc',str(pid),'cmdline').read_bytes()
        status=Path('/proc',str(pid),'status').read_text()
        if b'proot' not in cmd or str(ROOT).encode() not in cmd or '\nState:\tZ' in status:
            return None
        return pid
    except (OSError,ValueError):
        return None

def supervised_game_request(wanted):
    path=ROOT.parent/'phone-vps/control.py'
    if not path.is_file():
        return False
    spec=importlib.util.spec_from_file_location('ryuuworl_phone_control',path)
    control=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(control)
    return control.set_game_desired(wanted)

def send_command(command):
    if not owned_process():
        raise SystemExit('Server runner is not active')
    if not command or '\n' in command or '\r' in command or len(command.encode())>3000:
        raise SystemExit('One console command per call is required')
    if command.strip().lower()=='stop':
        supervised_game_request(False)
    fd=os.open(FIFO,os.O_WRONLY|os.O_NONBLOCK)
    try:
        os.write(fd,(command+'\n').encode())
    finally:
        os.close(fd)
    print('Console command delivered (contents not printed).')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['start','status','stop','console'])
    parser.add_argument('command',nargs=argparse.REMAINDER)
    args=parser.parse_args()
    os.umask(0o077)
    RUNTIME.mkdir(mode=0o700,exist_ok=True)
    with (RUNTIME/'control.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        pid=owned_process()
        if args.action=='status':
            print(json.dumps({'runnerActive':bool(pid),'pid':pid,'log':str(LOG),'note':'Use status.py to verify game endpoints'}))
        elif args.action=='stop':
            send_command('stop')
        elif args.action=='console':
            send_command(' '.join(args.command))
        elif supervised_game_request(True):
            print('Minecraft start requested from the phone supervisor. Readiness pending.')
        elif pid:
            print('Server runner is already active; use status.py for readiness.')
        else:
            if 'eula=true' not in (ROOT/'eula.txt').read_text().splitlines():
                raise SystemExit('Minecraft EULA has not been accepted')
            if FIFO.exists():
                if not stat.S_ISFIFO(FIFO.stat().st_mode):
                    raise SystemExit('Console path is not a FIFO')
            else:
                os.mkfifo(FIFO,0o600)
            LOG.parent.mkdir(exist_ok=True)
            fd=os.open(FIFO,os.O_RDWR)
            try:
                with LOG.open('ab',buffering=0) as output:
                    process=subprocess.Popen(['sh',str(ROOT/'run-linux.sh')],cwd=ROOT,
                        stdin=fd,stdout=output,stderr=subprocess.STDOUT,
                        start_new_session=True,close_fds=True)
            finally:
                os.close(fd)
            PIDFILE.write_text(str(process.pid)+'\n')
            print('Server runner started. PID:',process.pid,'Readiness pending; see logs/console.log.')

if __name__=='__main__':
    main()
