#!/usr/bin/env python3
"""Smoke-test only the newly built local backend, then stop the owned process."""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import shutil
import zipfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT / 'imports/ai-github'
REPORT = ROOT / 'release/ryuuworl-github-validation.json'


def main():
    if not (REPO / '.next/standalone/server.js').exists():
        raise ValueError('Chưa có server.js của production build.')
    archive_mode = sys.argv[1:] == ['--archive']
    bundle_mode = archive_mode or sys.argv[1:] == ['--bundle']
    extracted = ROOT / '.build-tools/backend-package-check'
    if archive_mode:
        if extracted.exists():
            raise ValueError('Thư mục kiểm tra ZIP đã tồn tại; dừng để tránh ghi đè.')
        extracted.mkdir()
        with zipfile.ZipFile(ROOT / 'release/ryuuworl-backend-linux-arm64.zip') as archive:
            archive.extractall(extracted)
    launcher = '/workspace/.build-tools/backend-package-check/start-ryuuworl.mjs' if archive_mode else '.next/standalone/start-ryuuworl.mjs'
    command = ['sh', 'scripts/run-linux.sh', 'env', 'HOSTNAME_OVERRIDE=127.0.0.1', 'PORT=3130'] + (['node', launcher] if bundle_mode else ['npm', 'start'])
    process = subprocess.Popen(command, cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
    checks = []
    try:
        base = 'http://127.0.0.1:3130'
        for attempt in range(55):
            if process.poll() is not None:
                raise ValueError('Backend dừng trước khi sẵn sàng; cần kiểm tra bản production.')
            try:
                with urllib.request.urlopen(base + '/api/health', timeout=2) as response:
                    if response.status == 200:
                        break
            except (urllib.error.URLError, TimeoutError, OSError):
                time.sleep(1)
        else:
            raise ValueError('Backend chưa sẵn sàng trong khoảng kiểm tra cục bộ.')
        for route, expected in [('/', 200), ('/news', 200), ('/admin/login', 200), ('/api/health', 200), ('/api/admin/news', 401)]:
            try:
                with urllib.request.urlopen(base + route, timeout=15) as response:
                    status, body = response.status, response.read()
            except urllib.error.HTTPError as error:
                status, body = error.code, error.read()
            if status != expected:
                raise ValueError('HTTP backend không khớp trạng thái mong đợi.')
            if route == '/' and (b'Ryuuworl' not in body or b'ryuuworl.id.vn' not in body):
                raise ValueError('Backend chưa nhận cấu hình Ryuuworl.')
            checks.append({'path': route, 'httpStatus': status, 'expectedStatus': expected})
            print(f'Backend {route}: HTTP {status} PASS', flush=True)
        report = json.loads(REPORT.read_text())
        report['backendArchiveHttpSmoke' if archive_mode else 'backendBundleHttpSmoke' if bundle_mode else 'backendHttpSmoke'] = {'status': 'passed', 'checks': checks, 'listenedOn': '127.0.0.1:3130'}
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            process.communicate(timeout=4)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.communicate(timeout=5)
        if archive_mode:
            shutil.rmtree(extracted)
        print('Owned backend QA process stopped.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
