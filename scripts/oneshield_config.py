"""Shared local configuration. Never returns secrets to logs or artifacts."""
import os
from pathlib import Path
import re
import runpy
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / '.agents/skills/oneshield-pages/scripts/deploy.py'


def load_preview_config():
    os.chdir(ROOT)
    if not SKILL.is_file():
        raise ValueError('Không tìm thấy script gốc của skill OneShield Pages.')
    cfg = runpy.run_path(str(SKILL))['load_config']()
    endpoint = urlsplit(cfg['endpoint'])
    if (endpoint.scheme != 'https' or not endpoint.hostname or endpoint.username
            or endpoint.password or endpoint.query or endpoint.fragment
            or endpoint.path not in ('', '/')):
        raise ValueError('ONESHIELD_ENDPOINT phải là HTTPS origin hợp lệ.')
    if not re.fullmatch(r'prj_[A-Za-z0-9_-]+', cfg['project_id']):
        raise ValueError('ONESHIELD_PROJECT_ID thiếu hoặc không đúng định dạng prj_.')
    if not cfg['token']:
        raise ValueError('Chưa có ONESHIELD_AGENT_TOKEN. Không ghi token vào mã nguồn.')
    if cfg['channel'] != 'preview':
        raise ValueError('Kênh cấu hình phải là preview. Dừng để tránh nhầm Production.')
    cfg['endpoint'] = cfg['endpoint'].rstrip('/')
    cfg['spa_fallback'] = 'false'  # This site uses fragment links, no SPA router.
    return cfg


def unwrap(payload):
    if isinstance(payload, dict):
        for key in ('data', 'values'):
            if isinstance(payload.get(key), (dict, list)):
                return payload[key]
    return payload
