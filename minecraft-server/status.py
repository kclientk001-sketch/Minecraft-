#!/usr/bin/env python3
"""Read-only Java status, Bedrock RakNet ping and NetherNet TCP port check."""
import argparse
import json
import secrets
import socket
import struct
import time

MAGIC = bytes.fromhex('00ffff00fefefefefdfdfdfd12345678')

def varint(value):
    value &= 0xffffffff
    out = bytearray()
    while True:
        byte = value & 127
        value >>= 7
        out.append(byte | (128 if value else 0))
        if not value:
            return bytes(out)

def read_varint(stream):
    result = 0
    for i in range(5):
        b = stream.recv(1)
        if not b:
            raise ConnectionError('Connection closed')
        result |= (b[0] & 127) << (7*i)
        if not b[0] & 128:
            return result
    raise ValueError('Invalid VarInt')

def recv_exact(stream, size):
    if size > 2*1024*1024:
        raise ValueError('Oversized status packet')
    buf = bytearray()
    while len(buf) < size:
        chunk = stream.recv(size-len(buf))
        if not chunk:
            raise ConnectionError('Connection closed')
        buf.extend(chunk)
    return bytes(buf)

def java_status(host, port, protocol=767):
    encoded = host.encode('utf-8')
    handshake = b'\x00' + varint(protocol) + varint(len(encoded)) + encoded + struct.pack('>H',port) + b'\x01'
    with socket.create_connection((host,port),timeout=5) as stream:
        stream.sendall(varint(len(handshake)) + handshake + b'\x01\x00')
        packet_length = read_varint(stream)
        packet_id = read_varint(stream)
        if packet_id != 0 or packet_length < 2:
            raise ValueError('Unexpected Java status packet')
        result = json.loads(recv_exact(stream,read_varint(stream)))
    return {'ok':True,'version':result.get('version'),'players':result.get('players'),'description':result.get('description')}

def bedrock_status(host, port):
    ping = b'\x01' + struct.pack('>q',int(time.time()*1000)) + MAGIC + struct.pack('>Q',secrets.randbits(64))
    with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as stream:
        stream.settimeout(5)
        stream.sendto(ping,(host,port))
        pong,_ = stream.recvfrom(65535)
    if len(pong)<35 or pong[0]!=0x1c or pong[17:33]!=MAGIC:
        raise ValueError('Unexpected Bedrock pong')
    size = struct.unpack('>H',pong[33:35])[0]
    fields = pong[35:35+size].decode('utf-8').split(';')
    if fields[0]!='MCPE':
        raise ValueError('Unexpected Bedrock status')
    return {'ok':True,'motd':fields[1],'protocol':fields[2],'version':fields[3],'players':fields[4],'max_players':fields[5]}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host',default='127.0.0.1')
    parser.add_argument('--java-port',type=int,default=25565)
    parser.add_argument('--bedrock-port',type=int,default=19132)
    parser.add_argument('--java-protocol',type=int,default=767,help='Java client protocol; 767 is Minecraft 1.21')
    args = parser.parse_args()
    report = {'host':args.host}
    for name,fn,port in [('java',java_status,args.java_port),('bedrock_raknet',bedrock_status,args.bedrock_port)]:
        try:
            report[name] = fn(args.host,port,args.java_protocol) if name == 'java' else fn(args.host,port)
        except (OSError,ValueError,KeyError,IndexError) as exc:
            report[name] = {'ok':False,'error':type(exc).__name__}
    try:
        with socket.create_connection((args.host,args.bedrock_port),timeout=5):
            pass
        report['bedrock_nethernet_signaling_tcp'] = {'ok':True,'note':'TCP reachable; not an end-to-end NetherNet login test'}
    except OSError as exc:
        report['bedrock_nethernet_signaling_tcp'] = {'ok':False,'error':type(exc).__name__}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if all(report[k]['ok'] for k in ['java','bedrock_raknet','bedrock_nethernet_signaling_tcp']) else 1

if __name__ == '__main__':
    raise SystemExit(main())
