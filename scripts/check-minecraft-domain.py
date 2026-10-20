#!/usr/bin/env python3
"""Check the proposed Minecraft Java SRV alias without changing DNS."""
import argparse
import importlib.util
import json
from pathlib import Path
import secrets
import socket
import struct

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = 'ryuuworl.id.vn'
TARGET = 'traded-disk.tun.ply.gg'
PORT = 9719


def dns_name(data, position):
    labels = []
    end = None
    visited = set()
    while True:
        if position in visited or position >= len(data):
            raise ValueError('Invalid compressed DNS name')
        visited.add(position)
        size = data[position]
        if size == 0:
            return '.'.join(labels), end if end is not None else position + 1
        if size & 0xc0 == 0xc0:
            if position + 1 >= len(data):
                raise ValueError('Truncated DNS pointer')
            if end is None:
                end = position + 2
            position = ((size & 0x3f) << 8) | data[position + 1]
        else:
            if size > 63 or position + 1 + size > len(data):
                raise ValueError('Invalid DNS label')
            labels.append(data[position + 1:position + 1 + size].decode('ascii'))
            position += size + 1


def srv_lookup(resolver):
    name = '_minecraft._tcp.' + DOMAIN
    ident = secrets.randbits(16)
    query = struct.pack('>6H', ident, 0x0100, 1, 0, 0, 0)
    query += b''.join(bytes([len(label)]) + label.encode() for label in name.split('.'))
    query += b'\x00' + struct.pack('>HH', 33, 1)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as stream:
        stream.settimeout(4)
        stream.connect((resolver, 53))
        stream.send(query)
        response = stream.recv(65535)
    header = struct.unpack('>6H', response[:12])
    if header[0] != ident or not header[1] & 0x8000 or header[1] & 0x0200:
        raise ValueError('Unexpected or truncated DNS response')
    position = 12
    for _ in range(header[2]):
        _, position = dns_name(response, position)
        position += 4
    records = []
    for _ in range(header[3]):
        owner, position = dns_name(response, position)
        kind, cls, ttl, size = struct.unpack('>HHIH', response[position:position+10])
        position += 10
        if kind == 33 and cls == 1 and owner.lower() == name:
            priority, weight, port = struct.unpack('>HHH', response[position:position+6])
            target, _ = dns_name(response, position+6)
            records.append({'priority': priority, 'weight': weight, 'port': port, 'target': target, 'ttl': ttl})
        position += size
    return {'resolver': resolver, 'rcode': header[1] & 15, 'records': records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resolver', default='8.8.8.8', choices=['8.8.8.8','1.1.1.1'])
    args = parser.parse_args()
    result = {'domain': DOMAIN, 'service': '_minecraft._tcp.' + DOMAIN, 'dnsChangedByThisScript': False}
    try:
        result['dns'] = srv_lookup(args.resolver)
        matches = [r for r in result['dns']['records'] if r['target'].rstrip('.').lower() == TARGET and r['port'] == PORT]
        result['expectedSrvPresent'] = bool(matches)
        if matches:
            spec = importlib.util.spec_from_file_location('minecraft_domain_status', ROOT/'minecraft-server/status.py')
            status = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(status)
            result['resolvedTargetStatus'] = status.java_status(TARGET, PORT, 767)
            result['srvRouteVerified'] = result['resolvedTargetStatus']['ok']
            result['actualMinecraftClientLoginTested'] = False
        else:
            result['srvRouteVerified'] = False
            result['note'] = 'Expected SRV record has not appeared on this resolver.'
    except (OSError, ValueError, struct.error) as exc:
        result['srvRouteVerified'] = False
        result['error'] = type(exc).__name__
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['srvRouteVerified'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
