#!/usr/bin/env python3
"""Validate and package a local Preview artifact. Performs zero HTTP requests."""
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import PurePosixPath
from urllib.parse import urlsplit
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from oneshield_config import ROOT, load_preview_config

EXPECTED = {
    'index.html', 'styles.css', 'app.js', 'site.config.json', 'robots.txt',
    'assets/favicon.svg', 'assets/world.svg', 'assets/survival.svg',
    'assets/creative.svg', 'assets/adventure.svg',
}


class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.anchors, self.assets = [], [], []
        self.headings, self.preview_block = 0, False

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if data.get('id'):
            self.ids.append(data['id'])
        if tag == 'h1':
            self.headings += 1
        if tag == 'meta' and data.get('name') == 'robots':
            self.preview_block = 'noindex' in data.get('content', '')
        if tag == 'img' and ('alt' not in data or not data.get('width') or not data.get('height')):
            raise ValueError('Ảnh phải có alt và kích thước tường minh.')
        href = data.get('href', '')
        if href.startswith('#') and len(href) > 1:
            self.anchors.append(href[1:])
        for value in (data.get('src', ''), href if tag == 'link' else ''):
            if value:
                self.assets.append(value)
        for attr in ('aria-controls', 'aria-labelledby'):
            if data.get(attr):
                self.anchors.extend(data[attr].split())


def main():
    cfg = load_preview_config()
    dist = ROOT / 'dist'
    if not (dist / 'index.html').is_file():
        raise ValueError('Thiếu dist/index.html. Chạy npm run build trước.')
    entries = list(dist.rglob('*'))
    if any(p.is_symlink() for p in entries):
        raise ValueError('Không đóng gói symbolic link.')
    files = {p.relative_to(dist).as_posix(): p for p in entries if p.is_file()}
    if set(files) != EXPECTED:
        raise ValueError('Danh sách tệp build không khớp danh sách tệp công khai cho phép.')
    for name, file in files.items():
        content = file.read_bytes()
        if cfg['token'].encode() in content:
            raise ValueError('Phát hiện thông tin xác thực trong build. Dừng đóng gói; không hiển thị giá trị.')
        if b'ONESHIELD_AGENT_TOKEN' in content or b'Authorization: Bearer' in content:
            raise ValueError('Build chứa thông tin cấu hình riêng tư. Dừng đóng gói.')
        if name.endswith('.svg'):
            ET.fromstring(content)
    config = json.loads(files['site.config.json'].read_text())
    if not set(config).issubset({'name', 'serverAddress', 'edition', 'gameVersion', 'discordUrl'}):
        raise ValueError('Cấu hình công khai chứa trường ngoài danh sách cho phép.')
    parser = SiteParser()
    parser.feed(files['index.html'].read_text())
    if len(set(parser.ids)) != len(parser.ids) or parser.headings != 1:
        raise ValueError('Cấu trúc HTML cần một h1 và các ID không trùng.')
    if not parser.preview_block or files['robots.txt'].read_text() != 'User-agent: *\nDisallow: /\n':
        raise ValueError('Bản Preview cần chỉ thị không lập chỉ mục.')
    if any(anchor not in parser.ids for anchor in parser.anchors):
        raise ValueError('Phát hiện liên kết hoặc tham chiếu ARIA không có đích.')
    for asset in parser.assets:
        if not asset.startswith('./') or str(PurePosixPath(urlsplit(asset).path)) not in files:
            raise ValueError('Tài nguyên phải tồn tại trong build và không dùng CDN ngoài.')
    for asset in re.findall(r'url\([\"\']?([^\)\"\']+)', files['styles.css'].read_text()):
        if not asset.startswith('data:'):
            raise ValueError('Phát hiện tài nguyên CSS ngoài danh sách cho phép.')
    release = ROOT / 'release'
    release.mkdir(exist_ok=True)
    archive = release / 'ryuuworl-preview.zip'
    # Fixed timestamps and stable order make repeated packages reproducible.
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for name in sorted(files):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, files[name].read_bytes(), compresslevel=9)
    with zipfile.ZipFile(archive) as package:
        if package.testzip() is not None or set(package.namelist()) != EXPECTED:
            raise ValueError('Kiểm tra ZIP thất bại.')
    manifest = {
        'site': 'Minecraft Ryuuworl', 'status': 'awaiting_user_confirmation',
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'projectId': cfg['project_id'], 'endpoint': cfg['endpoint'],
        'channel': 'preview', 'spaFallback': False, 'smartRenameIndex': False,
        'directory': 'dist', 'archive': 'release/ryuuworl-preview.zip',
        'archiveBytes': archive.stat().st_size,
        'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
        'fileCount': len(files), 'extractedBytes': sum(p.stat().st_size for p in files.values()),
        'files': {name: hashlib.sha256(file.read_bytes()).hexdigest() for name, file in sorted(files.items())},
        'missingPublicInformation': [key for key in ('serverAddress', 'edition', 'gameVersion', 'discordUrl') if not config.get(key)],
        'remoteActionsPerformed': [],
    }
    preflight = release / 'preflight.json'
    if preflight.exists():
        report = json.loads(preflight.read_text())
        if report.get('projectId') == cfg['project_id'] and report.get('endpoint') == cfg['endpoint']:
            manifest['preflightCheckedAt'] = report.get('checkedAt')
            manifest['projectReadChecksPassed'] = report.get('projectReadChecksPassed', False)
            manifest['packageLimitsVerified'] = report.get('packageLimitsVerified', False)
            manifest['baseline'] = report.get('baseline', {})
    (release / 'preview-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Kiểm tra đạt: {len(files)} tệp; HTML, ARIA, SVG, tài nguyên và ZIP hợp lệ; token không có trong build.')
    print(f'Đã chuẩn bị {archive.relative_to(ROOT)} ({archive.stat().st_size:,} byte), index.html ở gốc ZIP.')
    print('Kênh: preview | SPA fallback: false | Chờ xác nhận của người dùng. Chưa upload / prepare / activate.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, ET.ParseError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
