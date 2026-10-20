#!/usr/bin/env python3
"""Resume the existing Playit claim using Android DNS; keep all credentials private."""
import json
import os
from pathlib import Path
import re
import secrets
import socket
import time
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / '.runtime/playit'
SECRET = RUNTIME / 'agent.secret'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def api(path, body, key=None):
    if path not in ['/claim/setup', '/claim/exchange', '/v1/agents/rundata', '/v1/tunnels/create', '/v1/tunnels/list', '/tunnels/create']:
        raise ValueError('Unsupported Playit API operation')
    headers = {'Content-Type': 'application/json', 'User-Agent': 'Ryuuworl-server-setup/1.0'}
    if key:
        headers['Authorization'] = 'Agent-Key ' + key.strip()
    req = urllib.request.Request('https://api.playit.gg' + path,
                                 data=json.dumps(body).encode(), headers=headers)
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=20) as response:
            data = response.read(2 * 1024 * 1024)
    except urllib.error.HTTPError as error:
        data = error.read(2 * 1024 * 1024)
    return json.loads(data)


def ipc(request):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
        s.settimeout(15)
        s.connect(str(RUNTIME / 'agent.sock'))
        with s.makefile('rwb') as stream:
            hello = json.loads(stream.readline(1024 * 1024))
            if hello.get('message_kind') != 'hello' or hello.get('data', {}).get('protocol', {}).get('ipc_version') != 2:
                raise ValueError('Unsupported Playit IPC protocol')
            stream.write(json.dumps({'ipc_version': 2, 'request_id': 1, 'request': request}).encode() + b'\n')
            stream.flush()
            response = json.loads(stream.readline(1024 * 1024))
            if response.get('message_kind') != 'response' or response.get('data', {}).get('request_id') != 1:
                raise ValueError('Unexpected Playit IPC response')
            return response['data']['response']


def stage(value):
    (RUNTIME / 'claim-state.json').write_text(json.dumps({'stage': value}) + '\n')
    print('Playit claim stage:', value, flush=True)


def main():
    os.umask(0o077)
    if SECRET.is_file() and SECRET.stat().st_size:
        stage('already_linked')
        return
    claim = RUNTIME / 'claim-url'
    url = claim.read_text().strip() if claim.is_file() else ''
    if not re.fullmatch(r'https://playit\.gg/claim/[a-f0-9]{10}', url):
        url = 'https://playit.gg/claim/' + secrets.token_hex(5)
        claim.write_text(url + '\n')
    claim.chmod(0o600)
    code = url.rsplit('/', 1)[1]
    previous = None
    pending = RUNTIME / 'pending-secret'
    while True:
        try:
            if pending.is_file():
                key = pending.read_text().strip()
                if not re.fullmatch(r'[a-fA-F0-9]{32,4096}', key) or len(key) % 2:
                    stage('invalid_pending_credential')
                    return
                reply = ipc({'type': 'set_secret', 'secret': key})
                if reply.get('type') != 'set_secret' or not reply.get('data', {}).get('accepted'):
                    stage('local_provisioning_not_ready')
                    time.sleep(3)
                    continue
                SECRET.chmod(0o600)
                pending.unlink(missing_ok=True)
                stage('linked')
                return
            result = api('/claim/setup', {'code': code, 'agent_type': 'assignable', 'version': 'playit 1.0.10'})
            value = result.get('data')
            allowed = ['WaitingForUserVisit', 'WaitingForUser', 'UserAccepted', 'UserRejected']
            if result.get('status') != 'success' or value not in allowed:
                stage('api_rejected_claim')
                return
            if value != previous:
                stage(value)
                previous = value
            if value == 'UserRejected':
                return
            if value == 'UserAccepted':
                exchanged = api('/claim/exchange', {'code': code})
                data = exchanged.get('data')
                key = data.get('secret_key') if exchanged.get('status') == 'success' and isinstance(data, dict) else None
                if not isinstance(key, str) or not re.fullmatch(r'[a-fA-F0-9]{32,4096}', key) or len(key) % 2:
                    stage('exchange_not_ready')
                    time.sleep(3)
                    continue
                temporary = pending.with_suffix('.tmp')
                temporary.write_text(key)
                temporary.chmod(0o600)
                temporary.replace(pending)
                continue
        except Exception as exc:
            # Exception text may contain request details; print only its class.
            stage('retry_' + type(exc).__name__)
        time.sleep(3)


if __name__ == '__main__':
    main()
