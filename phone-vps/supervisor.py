#!/usr/bin/env python3
"""Supervise Minecraft, Playit and the local panel in a persistent Termux session."""
from datetime import datetime, timezone
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import stat
import subprocess
import sys
import time

import control

ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent
MC = WORKSPACE / 'minecraft-server'
RUNTIME = control.RUNTIME
LOGS = ROOT / 'logs'


def event(message):
    LOGS.mkdir(exist_ok=True)
    path = LOGS / 'supervisor.log'
    if path.exists() and path.stat().st_size > 2 * 1024 * 1024:
        previous = LOGS / 'supervisor.previous.log'
        path.replace(previous)
    with path.open('a') as stream:
        stream.write(datetime.now(timezone.utc).isoformat() + ' ' + message + '\n')


class Component:
    def __init__(self, name):
        self.name = name
        self.process = None
        self.stopping_at = None
        self.ready_after = 0
        self.started_at = None
        self.failures = []
        self.restarts = 0
        self.last_exit = None
        self.last_error = None

    def launch(self):
        if self.name == 'game':
            if 'eula=true' not in (MC / 'eula.txt').read_text().splitlines():
                raise RuntimeError('Minecraft EULA has not been accepted')
            directory = MC / '.runtime'
            directory.mkdir(mode=0o700, exist_ok=True)
            fifo = directory / 'console.fifo'
            if fifo.exists() and not stat.S_ISFIFO(fifo.stat().st_mode):
                raise RuntimeError('The Minecraft console path is not a FIFO')
            if not fifo.exists():
                os.mkfifo(fifo, 0o600)
            fifo.chmod(0o600)
            fd = os.open(fifo, os.O_RDWR)
            command = ['sh', str(MC / 'run-linux.sh')]
            log = MC / 'logs/console.log'
        else:
            fd = os.open(os.devnull, os.O_RDONLY)
            command = ([sys.executable, str(MC / 'tunnel.py'), 'run-agent'] if self.name == 'tunnel'
                       else [sys.executable, str(MC / 'panel.py')])
            log = LOGS / (self.name + '.log')
        log.parent.mkdir(parents=True, exist_ok=True)
        environment = os.environ.copy()
        environment.update({'MC_MIN_RAM': '256M', 'MC_MAX_RAM': '768M'})
        try:
            with log.open('ab', buffering=0) as output:
                self.process = subprocess.Popen(command, cwd=WORKSPACE, env=environment,
                    stdin=fd, stdout=output, stderr=subprocess.STDOUT,
                    start_new_session=True, close_fds=True)
        finally:
            os.close(fd)
        if self.name == 'game':
            (MC / '.runtime/server.pid').write_text(str(self.process.pid) + '\n')
        (RUNTIME / (self.name + '.pid')).write_text(str(self.process.pid) + '\n')
        self.started_at = time.monotonic()
        self.stopping_at = None
        self.last_error = None
        event(self.name + ' started pid=' + str(self.process.pid))

    def request_stop(self):
        if not self.process or self.process.poll() is not None or self.stopping_at is not None:
            return
        self.stopping_at = time.monotonic()
        if self.name == 'game':
            try:
                fd = os.open(MC / '.runtime/console.fifo', os.O_WRONLY | os.O_NONBLOCK)
                try:
                    os.write(fd, b'stop\n')
                finally:
                    os.close(fd)
            except OSError:
                self.process.terminate()
        else:
            self.process.terminate()
        event(self.name + ' stop requested')

    def tick(self, wanted):
        now = time.monotonic()
        if self.process:
            code = self.process.poll()
            if code is not None:
                intentional = self.stopping_at is not None
                self.last_exit = code
                self.process = None
                self.stopping_at = None
                event(self.name + ' exited code=' + str(code))
                if self.name == 'game' and code == 0 and not intentional:
                    # An operator's clean console stop is not a crash.
                    control.update_desired(game=False)
                    wanted = False
                elif wanted and not intentional:
                    self.failures = [when for when in self.failures if now - when < 600]
                    self.failures.append(now)
                    self.restarts += 1
                    self.ready_after = now + min(60, 3 * 2 ** min(len(self.failures)-1, 5))
                    if len(self.failures) >= 5:
                        self.last_error = 'repeated_exits; use manage.py start after resolving the problem'
                        control.update_desired(**{self.name: False})
                        wanted = False
                        event(self.name + ' paused after repeated exits')
            elif not wanted:
                self.request_stop()
                limit = 120 if self.name == 'game' else 15
                if self.stopping_at is not None and now - self.stopping_at > limit:
                    # Only signal the process group this supervisor created.
                    try:
                        os.killpg(self.process.pid, signal.SIGTERM)
                    except ProcessLookupError:
                        pass
                    if now - self.stopping_at > limit + 15:
                        try:
                            os.killpg(self.process.pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
        if wanted and self.process is None and now >= self.ready_after:
            try:
                self.launch()
            except Exception as exc:
                self.last_error = type(exc).__name__
                self.ready_after = now + 30
                event(self.name + ' launch failed: ' + type(exc).__name__)

    def state(self):
        active = self.process is not None and self.process.poll() is None
        return {'processActive': active, 'pid': self.process.pid if active else None,
                'stopping': self.stopping_at is not None, 'restarts': self.restarts,
                'lastExitCode': self.last_exit, 'lastError': self.last_error}


def snapshot(components, wake_lock):
    memory = {}
    for line in Path('/proc/meminfo').read_text().splitlines():
        key, value = line.split(':', 1)
        if key in ['MemTotal', 'MemAvailable']:
            memory[key] = int(value.split()[0])
    control.write_json(RUNTIME / 'state.json', {
        'updatedAt': datetime.now(timezone.utc).isoformat(), 'supervisorPid': os.getpid(),
        'desired': control.desired(), 'wakeLockRequestSucceeded': wake_lock,
        'memoryKiB': memory, 'freeDiskMiB': shutil.disk_usage(WORKSPACE).free // (1024*1024),
        'services': {name: component.state() for name, component in components.items()}})


def wake(action):
    command = shutil.which('termux-wake-' + action)
    if not command:
        return False
    try:
        return subprocess.run([command], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def main():
    control.prepare()
    LOGS.mkdir(exist_ok=True)
    with (RUNTIME / 'supervisor.lock').open('a') as singleton:
        try:
            fcntl.flock(singleton, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 1
        (RUNTIME / 'supervisor.pid').write_text(str(os.getpid()) + '\n')
        components = {name: Component(name) for name in ['game', 'tunnel', 'panel']}
        def request_shutdown(signum, frame):
            control.update_desired(shutdown=True)
        signal.signal(signal.SIGTERM, request_shutdown)
        signal.signal(signal.SIGINT, request_shutdown)
        wake_lock = wake('lock')
        event('phone Linux service supervisor started')
        try:
            while True:
                desired = control.desired()
                shutdown = desired['shutdown']
                for name, component in components.items():
                    # Keep the relay and control panel until Minecraft finishes saving.
                    wanted = (name != 'game' and desired[name] and components['game'].state()['processActive']) if shutdown else desired[name]
                    if shutdown and name == 'game':
                        wanted = False
                    component.tick(wanted)
                snapshot(components, wake_lock)
                if shutdown and not any(component.state()['processActive'] for component in components.values()):
                    break
                time.sleep(1)
        finally:
            for component in components.values():
                component.request_stop()
            wake('unlock')
            event('phone Linux service supervisor stopped')
        return 0


if __name__ == '__main__':
    raise SystemExit(main())
