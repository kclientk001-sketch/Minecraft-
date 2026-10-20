#!/usr/bin/env python3
"""Probe Java login negotiation without authenticating, registering or joining a world."""
from pathlib import Path
import argparse
from datetime import datetime, timezone
import importlib.util
import json
import socket
import struct
import time
import uuid
import zlib

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('mc_status', ROOT / 'minecraft-server/status.py')
status = importlib.util.module_from_spec(spec)
spec.loader.exec_module(status)
MAX_PACKET = 2 * 1024 * 1024


def take_varint(data, position=0):
    value = 0
    for shift in range(5):
        if position >= len(data):
            raise ValueError('Truncated VarInt')
        byte = data[position]
        position += 1
        value |= (byte & 127) << (7 * shift)
        if not byte & 128:
            return value, position
    raise ValueError('Invalid VarInt')


def probe(protocol, host='127.0.0.1', port=25565, details=None):
    encoded = host.encode('utf-8')
    handshake = b'\x00' + status.varint(protocol) + status.varint(len(encoded)) + encoded + struct.pack('>H', port) + b'\x02'
    username = ('RyuProbe' + uuid.uuid4().hex[:6]).encode('ascii')
    if details is not None:
        details['probeName'] = username.decode('ascii')
    login = b'\x00' + status.varint(len(username)) + username + uuid.uuid4().bytes
    with socket.create_connection((host, port), timeout=10) as stream:
        stream.settimeout(15)
        stream.sendall(status.varint(len(handshake)) + handshake + status.varint(len(login)) + login)
        compression = False
        for _ in range(5):
            size = status.read_varint(stream)
            if not 0 < size <= MAX_PACKET:
                raise ValueError('Oversized or empty server reply')
            if compression:
                data = status.recv_exact(stream, size)
                unpacked_size, position = take_varint(data)
                if unpacked_size > MAX_PACKET:
                    raise ValueError('Oversized decompressed reply')
                body = data[position:]
                if unpacked_size:
                    decoder = zlib.decompressobj()
                    body = decoder.decompress(body, MAX_PACKET + 1)
                    if len(body) != unpacked_size or not decoder.eof or decoder.unused_data:
                        raise ValueError('Invalid compressed reply')
                packet, body_position = take_varint(body)
            else:
                packet = status.read_varint(stream)
                # Do not read or log the encryption public key or verification token.
                if packet == 1:
                    return 'encryption_requested'
                if packet == 3:
                    data = status.recv_exact(stream, size - len(status.varint(packet)))
                    threshold, end = take_varint(data)
                    if end != len(data) or threshold > MAX_PACKET:
                        raise ValueError('Invalid compression threshold')
                    compression = True
                    continue
            if packet == 2:
                if not compression:
                    status.recv_exact(stream, size - len(status.varint(packet)))
                # Close before Login Acknowledged: no configuration, world entry or account creation.
                return 'login_success'
            if packet == 0:
                reason_data = body[body_position:] if compression else status.recv_exact(stream, size - len(status.varint(packet)))
                if details is not None:
                    try:
                        reason_length, reason_position = take_varint(reason_data)
                        details['disconnectReason'] = reason_data[reason_position:reason_position + reason_length].decode('utf-8')[:600]
                    except (ValueError, UnicodeDecodeError):
                        details['disconnectReason'] = 'Non-JSON disconnect component'
                return 'disconnected'
            return 'unexpected_packet_' + str(packet)
        raise ValueError('Too many login packets')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=25565)
    parser.add_argument('--mode', choices=['auto', 'online', 'offline'], default='auto')
    parser.add_argument('--output', type=Path, default=ROOT / 'release/ryuuworl-minecraft-handshakes.json')
    args = parser.parse_args()
    online = args.mode == 'online' if args.mode != 'auto' else 'online-mode=true' in (ROOT / 'minecraft-server/server.properties').read_text().splitlines()
    expected_login = 'encryption_requested' if online else 'login_success'
    result = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'scope': 'Login negotiation only; no authentication, AuthMe registration, world entry or gameplay.',
              'host': args.host, 'port': args.port, 'onlineMode': online, 'cases': []}
    for version, protocol, expected in [('1.21/1.21.1', 767, expected_login), ('1.21.4', 769, expected_login), ('1.21.11', 774, expected_login), ('26.3', 777, expected_login), ('1.20.4 (below minimum)', 765, 'disconnected')]:
        details = {}
        try:
            actual = probe(protocol, args.host, args.port, details)
        except (OSError, ValueError, zlib.error) as exc:
            actual = type(exc).__name__
            details['errorMessage'] = str(exc)[:180]
        result['cases'].append({'client': version, 'protocol': protocol, 'result': actual, 'expected': expected, 'passed': actual == expected, **details})
        time.sleep(4.2)
    result['passed'] = all(case['passed'] for case in result['cases'])
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
