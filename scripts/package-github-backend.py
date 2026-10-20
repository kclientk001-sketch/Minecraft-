#!/usr/bin/env python3
"""Package the verified standalone backend with a public, credential-free demo DB."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import runpy
import shutil
import sqlite3
import sys
import zipfile

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT / 'imports/ai-github'
BUNDLE = REPO / '.next/standalone'


def main():
    if not (BUNDLE / 'server.js').is_file():
        raise ValueError('Chưa có backend standalone đã build.')
    source_db = REPO / 'prisma/dev.db'
    connection = sqlite3.connect(source_db.as_uri() + '?mode=ro', uri=True)
    try:
        for table in ('User', 'Session', 'SupportTicket', 'RateLimit'):
            if connection.execute('SELECT COUNT(*) FROM "' + table + '"').fetchone()[0] != 0:
                raise ValueError('Database có dữ liệu riêng tư; không đóng gói.')
        target = BUNDLE / 'data/site.db'
        target.parent.mkdir(exist_ok=True)
        with sqlite3.connect(target) as output:
            connection.backup(output)
    finally:
        connection.close()
    launcher = '''import { fileURLToPath } from 'node:url';
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL ||= 'file:' + fileURLToPath(new URL('./data/site.db', import.meta.url));
process.env.APP_URL ||= 'http://localhost:' + (process.env.PORT || '3000');
process.env.SERVER_NAME ||= 'Ryuuworl';
process.env.SERVER_IP ||= 'ryuuworl.id.vn';
process.env.SERVER_VERSION ||= 'Đang cập nhật';
process.env.DEMO_MODE ||= 'false';
process.env.HOSTNAME = process.env.HOSTNAME_OVERRIDE || '127.0.0.1';
process.env.PORT ||= '3000';
await import('./server.js');
'''
    (BUNDLE / 'start-ryuuworl.mjs').write_text(launcher)
    readme = '''RYUUWORL — BACKEND WEB LINUX ARM64

Yêu cầu: Linux ARM64 và Node.js >=22.13. Không cần npm install trong gói này.
Chạy: node start-ryuuworl.mjs
Mở: http://localhost:3000

Đây là website/backend quản trị Minecraft Network, không phải phần mềm game server Minecraft.
IP Minecraft được cấu hình: ryuuworl.id.vn. Việc cấu hình IP không xác nhận máy chủ game đang chạy.

Gói có database mẫu data/site.db, không có tài khoản quản trị, session hoặc ticket người dùng.
Tạo admin bằng npm run admin:create trong source gốc sau khi trỏ DATABASE_URL đến data/site.db của gói này.
Không ghi mật khẩu vào chat hoặc source. Xem README.md/BUILD-RYUUWORL.md trong source.

Khi chạy qua reverse proxy, cấu hình APP_URL là URL HTTPS thật; có thể đặt HOSTNAME_OVERRIDE và PORT.
DATABASE_URL có thể trỏ tới database SQLite đã khởi tạo, cần storage bền vững và một replica.
Dữ liệu tin tức, sản phẩm, bảng xếp hạng là DEMO có nhãn.
Gói backend cần hosting Node.js; không upload gói này lên OneShield Pages.
Gói website tĩnh cho OneShield được xuất riêng.
'''
    (BUNDLE / 'README-RYUUWORL.txt').write_text(readme)
    import os
    os.chdir(ROOT)
    cfg = runpy.run_path(str(ROOT / '.agents/skills/oneshield-pages/scripts/deploy.py'))['load_config']()
    entries = []
    for file in BUNDLE.rglob('*'):
        if not file.is_file():
            continue
        name = file.relative_to(BUNDLE).as_posix()
        if any(part.startswith('.env') for part in Path(name).parts):
            continue
        if file.is_symlink() and not file.resolve().is_relative_to(BUNDLE.resolve()):
            raise ValueError('Backend có symlink trỏ ra ngoài bundle.')
        content = file.read_bytes()
        if cfg.get('token') and cfg['token'].encode() in content:
            raise ValueError('Phát hiện thông tin xác thực; dừng đóng gói.')
        if file.suffix in ('.db', '.sqlite', '.sqlite3') and name != 'data/site.db':
            raise ValueError('Backend có database ngoài database mẫu được phép.')
        entries.append((name, content))
    archive = ROOT / 'release/ryuuworl-backend-linux-arm64.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as package:
        for name, content in sorted(entries):
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, content, compresslevel=6)
    with zipfile.ZipFile(archive) as package:
        if package.testzip() is not None:
            raise ValueError('ZIP backend không vượt qua CRC.')
    metadata = {
        'builtAt': datetime.now(timezone.utc).isoformat(),
        'platform': 'linux-arm64', 'nodeRequired': '>=22.13',
        'archive': archive.relative_to(ROOT).as_posix(),
        'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
        'archiveBytes': archive.stat().st_size, 'fileCount': len(entries),
        'launcher': 'node start-ryuuworl.mjs', 'demoDatabaseIncluded': True,
        'adminAccountsIncluded': False, 'credentialScan': 'passed',
        'gameServerIncluded': False, 'remoteMutationsPerformed': [],
    }
    (ROOT / 'release/ryuuworl-backend-build.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    print(f'Backend ZIP ready: {archive.relative_to(ROOT)} | {archive.stat().st_size:,} bytes | {len(entries)} files.')
    print('No administrator credentials, sessions, support tickets, .env, or agent token included.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, sqlite3.Error, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
