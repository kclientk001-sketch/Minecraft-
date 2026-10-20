#!/usr/bin/env python3
"""Validate and package the locally built GitHub static export; no deployment."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import runpy
import subprocess
import sys
from threading import Thread
from urllib.parse import unquote, urlsplit
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT / 'imports/ai-github'
OUT = REPO / 'inet-site'
sys.path.insert(0, str(ROOT / 'scripts'))
References = runpy.run_path(str(ROOT / 'scripts/prepare-inet-v1.py'))['References']


def main():
    if not (OUT / 'index.html').is_file():
        raise ValueError('Chưa có inet-site/index.html; cần build từ source trước.')
    entries = list(OUT.rglob('*'))
    if any(p.is_symlink() for p in entries):
        raise ValueError('Bản build không được có symlink.')
    files = {p.relative_to(OUT).as_posix(): p.read_bytes() for p in entries if p.is_file()}
    if any(any(part.startswith('.env') or part in ('.git', 'node_modules', 'prisma') for part in PurePosixPath(name).parts) for name in files):
        raise ValueError('Bản build chứa đường dẫn riêng tư.')
    import os
    os.chdir(ROOT)
    cfg = runpy.run_path(str(ROOT / '.agents/skills/oneshield-pages/scripts/deploy.py'))['load_config']()
    if cfg.get('token') and any(cfg['token'].encode() in content for content in files.values()):
        raise ValueError('Phát hiện token trong build; dừng đóng gói, không hiển thị giá trị.')
    html = files['index.html'].decode('utf-8')
    if 'Ryuuworl' not in html or 'ryuuworl.id.vn' not in html or 'Your Minecraft Network' in html:
        raise ValueError('Trang chủ chưa nhận đúng tên hoặc IP đã cấu hình.')
    checked_assets = 0
    for name, content in files.items():
        values = []
        if name.endswith('.html'):
            parser = References()
            parser.feed(content.decode('utf-8'))
            values = parser.assets
        elif name.endswith('.css'):
            values = re.findall(r'url\(\s*[\"\']?([^\)\"\']+)', content.decode('utf-8'))
        for value in values:
            parsed = urlsplit(value)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            clean = unquote(parsed.path)
            local = posixpath.normpath(clean.lstrip('/') if clean.startswith('/') else posixpath.join(posixpath.dirname(name), clean))
            if local not in files:
                raise ValueError('Bản build thiếu tài nguyên nội bộ.')
            checked_assets += 1
    class SilentHandler(SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SilentHandler, directory=str(OUT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = 'http://127.0.0.1:' + str(server.server_port) + '/'
    pages = [name for name in files if name.endswith('.html')]
    def check_page(name):
        route = name[:-len('index.html')] if name.endswith('index.html') else name
        with urllib.request.urlopen(base + route, timeout=10) as response:
            if response.status != 200 or response.read() != files[name]:
                raise ValueError('Kiểm tra HTTP cục bộ không khớp nội dung build.')
    try:
        with ThreadPoolExecutor(max_workers=4) as executor:
            list(executor.map(check_page, pages))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    release = ROOT / 'release'
    release.mkdir(exist_ok=True)
    archive = release / 'ryuuworl-github-inet.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, content, compresslevel=9)
    with zipfile.ZipFile(archive) as package:
        if package.testzip() is not None or 'index.html' not in package.namelist():
            raise ValueError('ZIP đóng gói không hợp lệ.')
    revision = subprocess.check_output(['git', '-C', str(REPO), 'rev-parse', 'HEAD'], text=True).strip()
    report = {
        'builtAt': datetime.now(timezone.utc).isoformat(),
        'sourceRepository': 'https://github.com/kclientk001-sketch/ai.git',
        'sourceCommit': revision, 'localSourceModified': True,
        'siteName': 'Ryuuworl', 'minecraftAddress': 'ryuuworl.id.vn',
        'intendedSiteOrigin': 'https://v1.ryuuworl.id.vn',
        'directory': OUT.relative_to(ROOT).as_posix(),
        'archive': archive.relative_to(ROOT).as_posix(),
        'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
        'archiveBytes': archive.stat().st_size, 'fileCount': len(files),
        'expandedBytes': sum(len(content) for content in files.values()),
        'htmlPageCount': len(pages), 'localAssetReferencesChecked': checked_assets,
        'localHttpPagesVerified': len(pages), 'credentialScan': 'passed',
        'browserQA': 'not_run_browser_unavailable',
        'status': 'built_awaiting_user_approval', 'remoteMutationsPerformed': [],
        'files': {name: hashlib.sha256(content).hexdigest() for name, content in sorted(files.items())},
    }
    (release / 'ryuuworl-github-build.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f'Package ready: {archive.relative_to(ROOT)} | {archive.stat().st_size:,} bytes | {len(files)} files.')
    print(f'Brand/IP, {checked_assets} local assets, {len(pages)} HTTP pages, secret scan and ZIP integrity: PASS.')
    print('No upload, release prepare, activation or DNS changes performed.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
