#!/usr/bin/env python3
"""Publish the reviewed Preview ZIP using the OneShield Pages skill contract."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import runpy
import sys
import time
import urllib.error
import urllib.request
import uuid
import zipfile
from oneshield_config import ROOT, SKILL, load_preview_config, unwrap


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def match_public_build(name, content, expected_hash):
    """Account only for identified same-origin OneShield script injection."""
    raw_match = hashlib.sha256(content).hexdigest() == expected_hash
    result = {'hashMatched': raw_match, 'buildContentMatched': raw_match}
    if name != 'index.html' or raw_match:
        return result
    injected = []
    known = {'/_rum/beacon.js': 'data-osh-rum', '/_osh-cs/widget.js': 'data-osh-cs'}
    def remove_known(match):
        tag = match.group()
        for src, marker in known.items():
            source_pattern = r"\bsrc=[\"']" + re.escape(src) + r"[\"']"
            if (re.search(source_pattern, tag) and re.search(r'\b' + marker + r'\b', tag)
                    and re.search(r'>\s*</script>$', tag, re.I)):
                injected.append(src)
                return ''
        return tag
    try:
        normalized = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', remove_known, content.decode('utf-8'), flags=re.I)
    except UnicodeDecodeError:
        return result
    result['normalizedHashMatched'] = hashlib.sha256(normalized.encode()).hexdigest() == expected_hash
    result['platformInjectedScripts'] = injected
    result['buildContentMatched'] = result['normalizedHashMatched']
    return result


def main():
    if sys.argv[1:] != ['--confirmed-preview']:
        raise ValueError('Chỉ chạy với --confirmed-preview sau khi người dùng xác nhận trong hội thoại.')
    cfg = load_preview_config()
    manifest_path = ROOT / 'release/preview-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    if (manifest['projectId'] != cfg['project_id'] or manifest['endpoint'] != cfg['endpoint']
            or manifest['channel'] != 'preview'):
        raise ValueError('Cấu hình đích không khớp bản được duyệt.')
    dist = ROOT / 'dist'
    entries = list(dist.rglob('*'))
    if any(p.is_symlink() for p in entries):
        raise ValueError('Build có symbolic link; dừng triển khai.')
    files = {p.relative_to(dist).as_posix(): p for p in entries if p.is_file()}
    if set(files) != set(manifest['files']):
        raise ValueError('Danh sách tệp đã thay đổi so với bản được duyệt.')
    for name, file in files.items():
        content = file.read_bytes()
        if hashlib.sha256(content).hexdigest() != manifest['files'][name]:
            raise ValueError('Nội dung build đã thay đổi so với bản được duyệt.')
        if cfg['token'].encode() in content:
            raise ValueError('Phát hiện thông tin xác thực trong build; dừng triển khai.')
    archive = ROOT / manifest['archive']
    zip_bytes = archive.read_bytes()
    if hashlib.sha256(zip_bytes).hexdigest() != manifest['archiveSha256']:
        raise ValueError('ZIP đã thay đổi so với bản được duyệt.')
    with zipfile.ZipFile(archive) as package:
        if set(package.namelist()) != set(files) or package.testzip() is not None:
            raise ValueError('Nội dung ZIP không hợp lệ.')
        for name in package.namelist():
            if hashlib.sha256(package.read(name)).hexdigest() != manifest['files'][name]:
                raise ValueError('Tệp trong ZIP không khớp build được duyệt.')
    receipt_path = ROOT / 'release/preview-deployment.json'
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text())
        if receipt.get('archiveSha256') != manifest['archiveSha256'] or receipt.get('projectId') != cfg['project_id']:
            raise ValueError('Đã có biên nhận cho bản khác; dừng để tránh triển khai trùng.')
    else:
        receipt = {
            'confirmedAt': datetime.now(timezone.utc).isoformat(),
            'authorization': 'User confirmed Preview deployment in conversation.',
            'projectId': cfg['project_id'], 'channel': 'preview',
            'archiveSha256': manifest['archiveSha256'], 'archiveBytes': len(zip_bytes),
            'idempotencyKeys': {name: str(uuid.uuid4()) for name in ('upload', 'prepare', 'activate')},
        }
    def save():
        receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    save()
    opener = urllib.request.build_opener(NoRedirect)
    base = cfg['endpoint'] + '/api/v1/one-shield/pages/projects/' + cfg['project_id']
    skill = runpy.run_path(str(SKILL))
    def redact(text):
        text = str(text).replace(cfg['token'], '[hidden]')
        text = re.sub(r'https?://[^\s\"<>]+', '[URL hidden]', text)
        return re.sub(r'(?i)authorization[^\n]*', '[header hidden]', text)[:1200]
    def call(method, route, phase=None, body=None, multipart=None):
        allowed = {('GET', ''), ('GET', '/state'), ('GET', '/usage'),
                   ('POST', '/deployments'), ('POST', '/releases/prepare'), ('POST', '/releases/activate')}
        if (method, route) not in allowed:
            raise ValueError('Endpoint ngoài phạm vi triển khai Preview.')
        headers = {'Authorization': 'Bearer ' + cfg['token'], 'Accept': 'application/json'}
        data = None
        if phase:
            headers['Idempotency-Key'] = receipt['idempotencyKeys'][phase]
            receipt['lastRequestedPhase'] = phase
            save()
        if multipart:
            boundary, data = multipart
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
        elif body is not None:
            data = json.dumps(body).encode()
            headers['Content-Type'] = 'application/json'
        request = urllib.request.Request(base + route, data=data, headers=headers, method=method)
        try:
            with opener.open(request, timeout=30) as response:
                result = unwrap(json.load(response))
                print(f'{method} {route or "/project"}: HTTP {response.status}', flush=True)
                if not isinstance(result, dict):
                    raise ValueError('Phản hồi API không có cấu trúc hợp lệ.')
                return result
        except urllib.error.HTTPError as error:
            message = f'{method} {route}: HTTP {error.code}'
            try:
                detail = json.load(error)
                for value in [detail, detail.get('error'), detail.get('data')] if isinstance(detail, dict) else []:
                    if isinstance(value, dict):
                        for key in ('code', 'message'):
                            if isinstance(value.get(key), str):
                                message += '\n' + redact(value[key])
                    elif isinstance(value, str):
                        message += '\n' + redact(value)
            except (ValueError, OSError):
                pass
            receipt['status'] = 'request_failed'
            receipt['lastError'] = redact(message)
            save()
            raise ValueError(message) from None
        except (urllib.error.URLError, TimeoutError, OSError):
            receipt['status'] = 'network_result_uncertain'
            save()
            raise ValueError('Lỗi mạng. Đã giữ nguyên Idempotency-Key để tránh thao tác trùng khi tiếp tục.') from None
    def channel_snapshot(state):
        return {channel: {key: state.get(channel, {}).get(key) for key in ('desired', 'effective')}
                for channel in ('production', 'preview')}
    before = call('GET', '/state')
    if 'baseline' not in receipt:
        receipt['baseline'] = channel_snapshot(before)
        receipt['revisionBefore'] = before.get('revision')
        save()
    if not receipt.get('deploymentId'):
        fields = {'spa_fallback': 'false', 'smart_rename_index': 'false',
                  'description': 'Minecraft Ryuuworl Preview — approved by user'}
        uploaded = call('POST', '/deployments', 'upload', multipart=skill['build_multipart'](zip_bytes, fields))
        deployment_id = uploaded.get('deployment_id')
        if not isinstance(deployment_id, str) or not re.fullmatch(r'dep_[A-Za-z0-9_-]+', deployment_id):
            raise ValueError('Upload không trả deployment_id hợp lệ; dừng trước khi phát hành.')
        receipt['deploymentId'] = deployment_id
        receipt['status'] = 'uploaded'
        if uploaded.get('renamed_index_from'):
            receipt['renamedIndexFrom'] = redact(uploaded['renamed_index_from'])
            print('OneShield renamed index from: ' + receipt['renamedIndexFrom'], flush=True)
        save()
    deployment_id = receipt['deploymentId']
    print('Deployment: ' + deployment_id, flush=True)
    if not receipt.get('manifestDigest'):
        prepared = call('POST', '/releases/prepare', 'prepare', body={'deployment_id': deployment_id, 'channel': 'preview'})
        if prepared.get('target_channel', 'preview') != 'preview':
            raise ValueError('Release không nhắm kênh Preview; dừng kích hoạt.')
        digest = prepared.get('manifest_digest')
        if not isinstance(digest, str) or not re.fullmatch(r'[A-Za-z0-9_:.=-]{1,512}', digest):
            raise ValueError('Prepare không trả manifest_digest hợp lệ.')
        receipt['manifestDigest'] = digest
        receipt['status'] = 'prepared'
        save()
    if not receipt.get('activationAccepted'):
        call('POST', '/releases/activate', 'activate', body={'manifest_digest': receipt['manifestDigest']})
        receipt['activationAccepted'] = True
        receipt['status'] = 'activation_accepted'
        save()
    for attempt in range(6):
        state = call('GET', '/state')
        if state.get('preview', {}).get('effective') == deployment_id:
            break
        if attempt < 5:
            time.sleep(3)
    receipt['stateAfter'] = channel_snapshot(state)
    receipt['revisionAfter'] = state.get('revision')
    receipt['previewEffectiveConfirmed'] = state.get('preview', {}).get('effective') == deployment_id
    receipt['productionUnchanged'] = state.get('production', {}).get('effective') == receipt['baseline']['production']['effective']
    save()
    if not receipt['previewEffectiveConfirmed']:
        raise ValueError('Preview chưa phục vụ deployment mới theo state. Chưa thể xác nhận phát hành thành công.')
    if not receipt['productionUnchanged']:
        raise ValueError('Production hiện khác baseline; cần kiểm tra thay đổi đồng thời trước khi kết luận.')
    bindings = []
    for item in state.get('dns_bindings', []):
        if isinstance(item, dict) and isinstance(item.get('hostname'), str) and re.fullmatch(r'(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}', item['hostname']):
            bindings.append({k: item.get(k) for k in ('hostname', 'channel', 'status', 'is_active', 'tls_ready')})
    receipt['publicBindings'] = bindings
    preview_hosts = [item['hostname'] for item in bindings if item.get('channel') == 'preview' and item.get('is_active')]
    receipt['liveChecks'] = []
    for host in preview_hosts:
        checks = []
        for name in ('index.html', 'styles.css', 'site.config.json'):
            url = 'https://' + host + ('/' if name == 'index.html' else '/' + name)
            request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache'})
            try:
                with opener.open(request, timeout=20) as response:
                    content_check = match_public_build(name, response.read(), manifest['files'][name])
                    content_check['buildContentMatched'] = response.status == 200 and content_check['buildContentMatched']
                    checks.append({'path': name, 'httpStatus': response.status, **content_check})
            except urllib.error.HTTPError as error:
                checks.append({'path': name, 'httpStatus': error.code, 'hashMatched': False})
            except (urllib.error.URLError, TimeoutError, OSError):
                checks.append({'path': name, 'status': 'network_unavailable', 'hashMatched': False})
        receipt['liveChecks'].append({'url': 'https://' + host + '/', 'files': checks})
    receipt['publicVerification'] = ('passed' if all(check.get('buildContentMatched', False) for site in receipt['liveChecks'] for check in site['files'])
                                     else 'failed') if preview_hosts else 'no_active_preview_hostname'
    receipt['status'] = 'published_preview'
    receipt['verifiedAt'] = datetime.now(timezone.utc).isoformat()
    save()
    manifest['status'] = 'published_preview'
    manifest['deploymentId'] = deployment_id
    manifest['remoteActionsPerformed'] = ['upload', 'prepare_preview', 'activate', 'verify_state']
    manifest['deploymentReceipt'] = 'release/preview-deployment.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print('Preview effective deployment: VERIFIED. Production unchanged: VERIFIED.', flush=True)
    print('Public verification: ' + receipt['publicVerification'], flush=True)
    for item in bindings:
        print('Public binding: ' + item['hostname'] + ' | channel=' + str(item.get('channel')) + ' | active=' + str(item.get('is_active')), flush=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
