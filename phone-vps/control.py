"""Private control files shared by the phone supervisor and Minecraft console."""
import fcntl
import json
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent
RUNTIME = ROOT / '.runtime'
DEFAULT = {'game': True, 'tunnel': True, 'panel': True, 'shutdown': False}


def prepare():
    os.umask(0o077)
    RUNTIME.mkdir(parents=True, exist_ok=True, mode=0o700)
    RUNTIME.chmod(0o700)


def write_json(path, value):
    path = Path(path)
    fd, temporary = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def desired():
    try:
        raw = json.loads((RUNTIME / 'desired.json').read_text())
    except (OSError, ValueError):
        raw = {}
    return {name: raw.get(name) if isinstance(raw.get(name), bool) else value for name, value in DEFAULT.items()}


def update_desired(**changes):
    if any(key not in DEFAULT or not isinstance(value, bool) for key, value in changes.items()):
        raise ValueError('Only known boolean service settings are accepted')
    prepare()
    with (RUNTIME / 'desired.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        data = desired()
        data.update(changes)
        write_json(RUNTIME / 'desired.json', data)
    return data


def supervisor_pid():
    try:
        pid = int((RUNTIME / 'supervisor.pid').read_text().strip())
        args = Path('/proc', str(pid), 'cmdline').read_bytes().split(b'\0')
        state = Path('/proc', str(pid), 'status').read_text()
        if str(ROOT / 'supervisor.py').encode() in args and '\nState:\tZ' not in state:
            return pid
    except (OSError, ValueError):
        pass
    return None


def set_game_desired(value):
    if not supervisor_pid():
        return False
    update_desired(game=value)
    return True
