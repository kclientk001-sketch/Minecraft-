#!/usr/bin/env python3
"""Prepare the user-supplied static export without running code or publishing."""
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import shutil
import stat
import sys
from urllib.parse import unquote, urlsplit
import zipfile
from oneshield_config import ROOT, load_preview_config

SOURCE = Path('/storage/emulated/0/Download/Minecraft-Network-iNET.zip')
DEST = ROOT / 'imports/minecraft-network-inet'


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets, self.links = [], []
        self.in_title = False
        self.title = []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'title':
            self.in_title = True
        if tag in ('script', 'img', 'source', 'video', 'audio', 'iframe') and attrs.get('src'):
            self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('href'):
            self.assets.append(attrs['href'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
    def handle_data(self, value):
        if self.in_title:
            self.title.append(value)


def main():
    cfg = load_preview_config()
    raw = SOURCE.read_bytes()
    source_hash = hashlib.sha256(raw).hexdigest()
    if DEST.is_symlink():
        raise ValueError('Thư mục đích là symlink; dừng chuẩn bị.')
    DEST.mkdir(parents=True, exist_ok=True)
    copied = DEST / SOURCE.name
    if copied.exists() and hashlib.sha256(copied.read_bytes()).hexdigest() != source_hash:
        raise ValueError('Đã có archive khác ở thư mục đích; không ghi đè.')
    # Validate the complete archive before copying or extracting any entries.
    with zipfile.ZipFile(SOURCE) as archive:
        entries = [item for item in archive.infolist() if not item.is_dir()]
        names = [item.filename for item in entries]
        if len(set(names)) != len(names) or 'index.html' not in names:
            raise ValueError('ZIP cần index.html ở gốc và tên tệp không trùng.')
        files = {}
        for item in entries:
            path = PurePosixPath(item.filename)
            if (path.is_absolute() or '..' in path.parts or '\\' in item.filename
                    or re.match(r'^[A-Za-z]:', item.filename)
                    or stat.S_ISLNK(item.external_attr >> 16) or item.flag_bits & 1):
                raise ValueError('Có đường dẫn, liên kết hoặc tệp mã hóa không phù hợp trong ZIP.')
            if any(part.startswith('.env') or part in ('.git', '.aws', '.codex', '.agents') for part in path.parts):
                raise ValueError('Phát hiện tệp cấu hình riêng tư; dừng trước khi trích xuất.')
            content = archive.read(item)
            if cfg['token'].encode() in content:
                raise ValueError('Phát hiện thông tin xác thực; dừng và không hiển thị giá trị.')
            files[item.filename] = content
        if archive.testzip() is not None:
            raise ValueError('ZIP không vượt qua kiểm tra CRC.')
    if not copied.exists():
        shutil.copyfile(SOURCE, copied)
    output = DEST / 'dist'
    if output.exists():
        existing = {p.relative_to(output).as_posix(): p for p in output.rglob('*') if p.is_file()}
        if set(existing) != set(files) or any(p.is_symlink() or p.read_bytes() != files[name] for name, p in existing.items()):
            raise ValueError('Thư mục đã trích xuất có thay đổi; không ghi đè.')
    else:
        output.mkdir()
        for name, content in files.items():
            target = output / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    missing_assets, missing_links = [], []
    external_count = 0
    asset_count = 0
    pages = [name for name in files if name.endswith('.html')]
    def resolve_url(page, value):
        nonlocal external_count
        parsed = urlsplit(value)
        if parsed.scheme or parsed.netloc:
            if parsed.scheme not in ('data', 'mailto', 'tel', 'javascript'):
                external_count += 1
            return None
        if not parsed.path:
            return None
        path = unquote(parsed.path)
        resolved = posixpath.normpath(path.lstrip('/') if path.startswith('/') else posixpath.join(posixpath.dirname(page), path))
        return 'index.html' if resolved in ('', '.') else resolved
    for name in pages:
        parser = References()
        parser.feed(files[name].decode('utf-8'))
        for value in parser.assets:
            local = resolve_url(name, value)
            if local is not None:
                asset_count += 1
                if local not in files:
                    missing_assets.append({'page': name, 'path': local})
        for value in parser.links:
            local = resolve_url(name, value)
            if local is not None and local not in files and local.rstrip('/') + '/index.html' not in files and local + '.html' not in files:
                missing_links.append({'page': name, 'path': local})
    for name, content in files.items():
        if not name.endswith('.css'):
            continue
        for value in re.findall(r'url\(\s*[\"\']?([^\)\"\']+)', content.decode('utf-8')):
            local = resolve_url(name, value)
            if local is not None:
                asset_count += 1
                if local not in files:
                    missing_assets.append({'page': name, 'path': local})
    page = References()
    page.feed(files['index.html'].decode('utf-8'))
    report = {
        'preparedAt': datetime.now(timezone.utc).isoformat(),
        'source': str(SOURCE), 'archive': copied.relative_to(ROOT).as_posix(),
        'archiveSha256': source_hash, 'archiveBytes': len(raw),
        'directory': output.relative_to(ROOT).as_posix(),
        'targetHostname': 'v1.ryuuworl.id.vn', 'projectId': cfg['project_id'],
        'channel': None, 'channelResolution': 'Read from the actual hostname binding before any release.',
        'status': 'prepared_locally_awaiting_hostname_binding',
        'alreadyBuiltStaticExport': True, 'rootIndexPresent': True,
        'fileCount': len(files), 'htmlPageCount': len(pages),
        'extractedBytes': sum(len(content) for content in files.values()),
        'largestFileBytes': max(map(len, files.values())),
        'siteTitle': ' '.join(page.title),
        'sampleBrandingPresent': b'Your Minecraft Network' in files['index.html'],
        'placeholderServerAddressPresent': any(b'play.example.com' in content for content in files.values()),
        'staticModeConfigPresent': 'inet-config.js' in files,
        'localAssetReferenceCount': asset_count,
        'missingLocalAssets': missing_assets, 'unresolvedInternalLinks': missing_links,
        'externalReferenceCount': external_count,
        'credentialScan': 'passed_no_configured_agent_token',
        'archiveIntegrity': 'passed', 'sourceModified': False,
        'remoteMutationsPerformed': [],
        'files': {name: hashlib.sha256(content).hexdigest() for name, content in sorted(files.items())},
    }
    (ROOT / 'release/minecraft-network-inet-v1-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f'Prepared original archive and static export: {len(files)} files, {len(pages)} HTML pages.')
    print(f'Archive: {len(raw):,} bytes | Extracted: {report["extractedBytes"]:,} bytes.')
    print(f'Internal assets checked: {asset_count}; missing assets: {len(missing_assets)}; unresolved navigation links: {len(missing_links)}.')
    print('Original archive preserved. No website code executed. No remote mutation performed.')
    if missing_assets:
        print('Unresolved asset paths:', json.dumps(missing_assets[:12], ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
