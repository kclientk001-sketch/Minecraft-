#!/usr/bin/env python3
"""OneShield GET-only preflight. No upload, prepare, activate, or rollback."""
from datetime import datetime, timezone
import json
import re
import sys
import urllib.error
import urllib.request
from oneshield_config import ROOT, load_preview_config, unwrap


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # Never forward the credential to a redirect destination.


def main():
    cfg = load_preview_config()
    opener = urllib.request.build_opener(NoRedirect)
    api = cfg['endpoint'] + '/api/v1/one-shield/pages'
    report = {
        'checkedAt': datetime.now(timezone.utc).isoformat(),
        'endpoint': cfg['endpoint'], 'projectId': cfg['project_id'],
        'channel': 'preview', 'readOnly': True, 'checks': {},
    }
    checks = [
        ('project', '/projects/' + cfg['project_id']),
        ('state', '/projects/' + cfg['project_id'] + '/state'),
        ('usage', '/projects/' + cfg['project_id'] + '/usage'),
        ('tiers', '/tiers'),
    ]
    essential_ok = True
    for name, route in checks:
        request = urllib.request.Request(api + route, headers={
            'Authorization': 'Bearer ' + cfg['token'], 'Accept': 'application/json',
        }, method='GET')
        try:
            with opener.open(request, timeout=15) as response:
                payload = unwrap(json.load(response))
                report['checks'][name] = {'httpStatus': response.status}
                if isinstance(payload, dict):
                    if name == 'project':
                        if payload.get('project_id') != cfg['project_id']:
                            raise ValueError('Project ID phản hồi không khớp cấu hình.')
                        # Keep only non-secret, typed values; never serialize the response.
                        for key in ('name', 'revision'):
                            value = payload.get(key)
                            if isinstance(value, int) or (isinstance(value, str)
                                    and re.fullmatch(r'[A-Za-z0-9 _.-]{1,120}', value)
                                    and cfg['token'] not in value):
                                report['checks'][name][key] = value
                    elif name == 'state':
                        report['baseline'] = {'revision': payload.get('revision')}
                        for channel in ('production', 'preview'):
                            state = payload.get(channel, {})
                            report['baseline'][channel] = {
                                key: state.get(key) for key in ('effective', 'desired')
                                if state.get(key) is None or (isinstance(state.get(key), str)
                                    and re.fullmatch(r'dep_[A-Za-z0-9_-]+', state[key]))
                            } if isinstance(state, dict) else {}
                    elif name == 'usage':
                        for key in ('storage_used_bytes', 'bandwidth_used_bytes', 'bandwidth_blocked'):
                            if isinstance(payload.get(key), (int, bool)):
                                report['checks'][name][key] = payload[key]
                print(f'{name}: HTTP {response.status}')
        except urllib.error.HTTPError as error:
            report['checks'][name] = {'httpStatus': error.code}
            print(f'{name}: HTTP {error.code} (không ghi nội dung phản hồi)')
            if name in ('project', 'state', 'usage'):
                essential_ok = False
        except (urllib.error.URLError, TimeoutError, OSError):
            report['checks'][name] = {'status': 'network_unavailable'}
            print(f'{name}: không thể kiểm tra mạng; không ghi thông tin xác thực.')
            if name in ('project', 'state', 'usage'):
                essential_ok = False
    report['projectReadChecksPassed'] = essential_ok
    report['packageLimitsVerified'] = report['checks'].get('tiers', {}).get('httpStatus') == 200
    release = ROOT / 'release'
    release.mkdir(exist_ok=True)
    (release / 'preflight.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('Đã lưu báo cáo đã lọc tại release/preflight.json. Chưa thực hiện yêu cầu ghi nào.')
    if not report['packageLimitsVerified']:
        print('Chưa xác nhận giới hạn gói; khi triển khai phải tuân theo lỗi giới hạn từ server.')
    return 0 if essential_ok else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
