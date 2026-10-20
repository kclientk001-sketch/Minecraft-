#!/usr/bin/env python3
"""Install SHA256-pinned official JARs, with resumable downloads. No EULA acceptance."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import shutil
import sys
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
USER_AGENT = 'RyuuworlServerSetup/1.0 (https://github.com/kclientk001-sketch/ai)'

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def install(item, verify_only):
    target = ROOT / item['file']
    label = item['component']
    if target.is_file() and digest(target) == item['sha256']:
        print(label + ': SHA256 OK', flush=True)
        return
    if verify_only or target.exists():
        raise ValueError(label + ': missing or SHA256 mismatch; existing files are not overwritten')
    if shutil.disk_usage(ROOT).free < 160 * 1024 * 1024:
        raise ValueError('Need at least 160 MiB free before another download')
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(target.suffix + '.part')
    for attempt in range(3):
        offset = partial.stat().st_size if partial.exists() else 0
        headers = {'User-Agent':USER_AGENT}
        if offset:
            headers['Range'] = 'bytes=' + str(offset) + '-'
        try:
            print(label + ': downloading ' + item['version'] + ' (' + str(offset//1024//1024) + ' MiB cached)', flush=True)
            req = urllib.request.Request(item['url'],headers=headers)
            with urllib.request.urlopen(req,timeout=90) as response:
                resume = offset > 0 and response.status == 206
                if resume and not response.headers.get('Content-Range','').startswith('bytes '+str(offset)+'-'):
                    raise ValueError('Invalid resume response')
                count = offset if resume else 0
                last_report = count
                with partial.open('ab' if resume else 'wb') as out:
                    while True:
                        chunk = response.read(256*1024)
                        if not chunk:
                            break
                        out.write(chunk)
                        count += len(chunk)
                        if count-last_report >= 16*1024*1024:
                            print(label + ': ' + str(count//1024//1024) + ' MiB',flush=True)
                            last_report = count
            if digest(partial) != item['sha256']:
                partial.unlink(missing_ok=True)
                raise ValueError('SHA256 mismatch')
            with zipfile.ZipFile(partial) as jar:
                if jar.testzip():
                    raise ValueError('Invalid JAR contents')
            partial.replace(target)
            print(label + ': downloaded and verified',flush=True)
            return
        except Exception as exc:
            if attempt == 2:
                raise ValueError(label + ': ' + type(exc).__name__ + ' (installation failed; rerun to resume)') from None
            print(label + ': retrying download',flush=True)
            time.sleep(2)

def main():
    if sys.argv[1:] not in ([],['--verify']):
        raise SystemExit('Usage: python3 install.py [--verify]')
    verify_only = sys.argv[1:] == ['--verify']
    lock = json.loads((ROOT/'artifacts.lock.json').read_text())
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda item:install(item,verify_only),lock['artifacts']))
    except ValueError as exc:
        raise SystemExit(str(exc)) from None
    print('All official components verified. EULA unchanged.',flush=True)

if __name__ == '__main__':
    main()
