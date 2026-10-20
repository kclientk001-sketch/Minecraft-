#!/usr/bin/env python3
"""Promote the approved Ryuuworl deployment to the bound www Production host."""
from datetime import datetime, timezone
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
import uuid
from oneshield_config import ROOT, load_preview_config, unwrap


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def main():
    if sys.argv[1:] != ['--confirmed-www']:
        raise ValueError('Chỉ chạy sau khi người dùng yêu cầu chuyển website sang www.ryuuworl.id.vn.')
    cfg = load_preview_config()  # Keep .env on Preview; the release channel below is explicit.
    manifest = json.loads((ROOT / 'release/preview-manifest.json').read_text())
    preview_receipt = json.loads((ROOT / 'release/preview-deployment.json').read_text())
    deployment_id = preview_receipt['deploymentId']
    if (cfg['project_id'] != manifest['projectId'] or cfg['endpoint'] != manifest['endpoint']
            or manifest.get('deploymentId') != deployment_id
            or preview_receipt.get('publicVerification') != 'passed'):
        raise ValueError('Đích triển khai hoặc bản Preview đã duyệt không khớp.')
    if hashlib.sha256((ROOT / manifest['archive']).read_bytes()).hexdigest() != manifest['archiveSha256']:
        raise ValueError('ZIP đã thay đổi; dừng trước khi phát hành.')
    for name, digest in manifest['files'].items():
        file = ROOT / 'dist' / name
        if file.is_symlink() or hashlib.sha256(file.read_bytes()).hexdigest() != digest:
            raise ValueError('Build đã thay đổi so với bản được duyệt.')
    receipt_path = ROOT / 'release/production-deployment.json'
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text())
        if receipt.get('deploymentId') != deployment_id or receipt.get('projectId') != cfg['project_id']:
            raise ValueError('Biên nhận Production thuộc bản khác; dừng để tránh thao tác trùng.')
    else:
        receipt = {
            'confirmedAt': datetime.now(timezone.utc).isoformat(),
            'authorization': 'User requested moving the reviewed website to www.ryuuworl.id.vn.',
            'projectId': cfg['project_id'], 'channel': 'production',
            'hostname': 'www.ryuuworl.id.vn', 'deploymentId': deployment_id,
            'archiveSha256': manifest['archiveSha256'],
            'idempotencyKeys': {phase: str(uuid.uuid4()) for phase in ('prepare', 'activate')},
            'reusedUploadedDeployment': True,
        }
    def save():
        receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    def safe(message):
        value = str(message).replace(cfg['token'], '[hidden]')
        value = re.sub(r'https?://[^\s\"<>]+', '[URL hidden]', value)
        return re.sub(r'(?i)authorization[^\n]*', '[header hidden]', value)[:1200]
    opener = urllib.request.build_opener(NoRedirect)
    base = cfg['endpoint'] + '/api/v1/one-shield/pages/projects/' + cfg['project_id']
    def call(method, route, phase=None, body=None):
        if (method, route) not in {('GET', '/state'), ('POST', '/releases/prepare'), ('POST', '/releases/activate')}:
            raise ValueError('Endpoint ngoài phạm vi phát hành Production.')
        headers = {'Authorization': 'Bearer ' + cfg['token'], 'Accept': 'application/json'}
        data = None
        if phase:
            headers['Idempotency-Key'] = receipt['idempotencyKeys'][phase]
            headers['Content-Type'] = 'application/json'
            data = json.dumps(body).encode()
            receipt['lastRequestedPhase'] = phase
            save()
        try:
            with opener.open(urllib.request.Request(base + route, data=data, headers=headers, method=method), timeout=30) as response:
                payload = unwrap(json.load(response))
                print(f'{method} {route}: HTTP {response.status}', flush=True)
                if not isinstance(payload, dict):
                    raise ValueError('Phản hồi không có cấu trúc hợp lệ.')
                return payload
        except urllib.error.HTTPError as error:
            message = f'{method} {route}: HTTP {error.code}'
            try:
                detail = json.load(error)
                for value in [detail, detail.get('error'), detail.get('data')] if isinstance(detail, dict) else []:
                    if isinstance(value, dict):
                        for key in ('code', 'message'):
                            if isinstance(value.get(key), str):
                                message += '\n' + safe(value[key])
                    elif isinstance(value, str):
                        message += '\n' + safe(value)
            except (ValueError, OSError):
                pass
            receipt['status'] = 'request_failed'
            receipt['lastError'] = safe(message)
            save()
            raise ValueError(message) from None
        except (urllib.error.URLError, TimeoutError, OSError):
            receipt['status'] = 'network_result_uncertain'
            save()
            raise ValueError('Kết quả mạng chưa rõ; đã giữ Idempotency-Key để tiếp tục an toàn.') from None
    def snapshot(state):
        return {channel: {key: state.get(channel, {}).get(key) for key in ('desired', 'effective')}
                for channel in ('production', 'preview')}
    before = call('GET', '/state')
    binding = next((item for item in before.get('dns_bindings', []) if item.get('hostname') == receipt['hostname']), None)
    if not binding or binding.get('channel') != 'production' or not binding.get('is_active') or not binding.get('tls_ready'):
        raise ValueError('www chưa có binding Production hoạt động và TLS sẵn sàng. Không thay đổi DNS/domain.')
    if 'baseline' not in receipt:
        receipt['baseline'] = snapshot(before)
        receipt['revisionBefore'] = before.get('revision')
        save()
    if before.get('production', {}).get('effective') != deployment_id:
        if not receipt.get('manifestDigest'):
            prepared = call('POST', '/releases/prepare', 'prepare', {'deployment_id': deployment_id, 'channel': 'production'})
            if prepared.get('target_channel', 'production') != 'production':
                raise ValueError('Release trả về sai kênh; dừng kích hoạt.')
            digest = prepared.get('manifest_digest')
            if not isinstance(digest, str) or not re.fullmatch(r'[A-Za-z0-9_:.=-]{1,512}', digest):
                raise ValueError('Prepare không trả manifest_digest hợp lệ.')
            receipt['manifestDigest'] = digest
            receipt['status'] = 'prepared'
            save()
        if not receipt.get('activationAccepted'):
            call('POST', '/releases/activate', 'activate', {'manifest_digest': receipt['manifestDigest']})
            receipt['activationAccepted'] = True
            receipt['status'] = 'activation_accepted'
            save()
    for attempt in range(6):
        state = call('GET', '/state')
        if state.get('production', {}).get('effective') == deployment_id:
            break
        if attempt < 5:
            time.sleep(3)
    receipt['stateAfter'] = snapshot(state)
    receipt['revisionAfter'] = state.get('revision')
    receipt['productionEffectiveConfirmed'] = state.get('production', {}).get('effective') == deployment_id
    receipt['previewUnchanged'] = state.get('preview', {}).get('effective') == receipt['baseline']['preview']['effective']
    receipt['verifiedAt'] = datetime.now(timezone.utc).isoformat()
    receipt['status'] = 'production_active_awaiting_live_verification' if receipt['productionEffectiveConfirmed'] else 'production_not_effective'
    save()
    if not receipt['productionEffectiveConfirmed']:
        raise ValueError('Production chưa phục vụ deployment đã chọn theo state.')
    print('Production effective deployment: VERIFIED.', flush=True)
    print('Preview unchanged: ' + str(receipt['previewUnchanged']), flush=True)
    print('No DNS/domain mutations performed. Uploaded deployment reused.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
