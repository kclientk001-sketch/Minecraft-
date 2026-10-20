#!/usr/bin/env python3
"""Deploy a built static site to OneShield Pages.

An upload does not publish. This runs the whole contract -- archive, upload,
prepare, activate, verify -- and stops at the first failure, printing the
server's own error code, because that code is what says whether to retry.

Standard library only. The token is never printed and never sent anywhere but
ONESHIELD_ENDPOINT.
"""
import io
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
import uuid
import zipfile

DEFAULT_ENDPOINT = "https://portal.inet.vn"


def load_config():
    cfg = {
        "endpoint": os.environ.get("ONESHIELD_ENDPOINT", ""),
        "project_id": os.environ.get("ONESHIELD_PROJECT_ID", ""),
        "token": os.environ.get("ONESHIELD_AGENT_TOKEN", ""),
        "spa_fallback": os.environ.get("ONESHIELD_SPA_FALLBACK", ""),
        "channel": os.environ.get("ONESHIELD_CHANNEL", ""),
    }
    keys = {
        "ONESHIELD_ENDPOINT": "endpoint",
        "ONESHIELD_PROJECT_ID": "project_id",
        "ONESHIELD_AGENT_TOKEN": "token",
        "ONESHIELD_SPA_FALLBACK": "spa_fallback",
        "ONESHIELD_CHANNEL": "channel",
    }
    # .env fills only what the environment did not, so a CI secret cannot be
    # overridden by a file that happens to be in the checkout.
    if os.path.isfile(".env"):
        with open(".env", "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                name, _, value = line.partition("=")
                field = keys.get(name.strip())
                if field and not cfg[field]:
                    cfg[field] = value.strip().strip('"').strip("'")
    cfg["endpoint"] = cfg["endpoint"] or DEFAULT_ENDPOINT
    cfg["spa_fallback"] = cfg["spa_fallback"] or "true"
    cfg["channel"] = cfg["channel"] or "production"
    return cfg


def die(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def request(cfg, method, path, *, body=None, multipart=None):
    url = f"{cfg['endpoint']}/api/v1/one-shield/pages/projects/{cfg['project_id']}{path}"
    headers = {"Authorization": f"Bearer {cfg['token']}"}
    if method != "GET":
        headers["Idempotency-Key"] = str(uuid.uuid4())
    data = None
    if multipart is not None:
        boundary, data = multipart
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")
        die(f"FAILED {method} {path} -> HTTP {err.code}\n{detail}")
    except urllib.error.URLError as err:
        die(f"FAILED {method} {path} -> {err.reason}")


def build_multipart(zip_bytes, fields):
    boundary = uuid.uuid4().hex
    buf = io.BytesIO()

    def write(text):
        buf.write(text.encode("utf-8"))

    for name, value in fields.items():
        write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n")
    ctype = mimetypes.guess_type("site.zip")[0] or "application/zip"
    write(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
        f"filename=\"site.zip\"\r\nContent-Type: {ctype}\r\n\r\n"
    )
    buf.write(zip_bytes)
    write(f"\r\n--{boundary}--\r\n")
    return boundary, buf.getvalue()


def archive(dist_dir):
    # Entries are relative to dist_dir so index.html sits at the archive root.
    # An archive whose entries begin with dist/ deploys a site whose every URL
    # is wrong.
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive_file:
        for root, _dirs, files in os.walk(dist_dir):
            for name in files:
                full = os.path.join(root, name)
                archive_file.write(full, os.path.relpath(full, dist_dir))
    return buf.getvalue()


def value_of(payload, *names):
    for name in names:
        if isinstance(payload, dict):
            if name in payload:
                return payload[name]
            for nested in ("data", "values"):
                inner = payload.get(nested)
                if isinstance(inner, dict) and name in inner:
                    return inner[name]
    return None


def main():
    cfg = load_config()
    if not cfg["project_id"]:
        die("ONESHIELD_PROJECT_ID is not set. It looks like prj_xxxx and is NOT a zone id or a domain.")
    if not cfg["project_id"].startswith("prj_"):
        die("ONESHIELD_PROJECT_ID must start with prj_.")
    if not cfg["token"]:
        die("ONESHIELD_AGENT_TOKEN is not set.")

    args = sys.argv[1:]
    if args and args[0] == "--rollback":
        if len(args) < 2:
            die("usage: deploy.py --rollback <deployment_id>")
        state = request(cfg, "GET", "/state")
        revision = value_of(state, "revision")
        if revision is None:
            die("could not read the project revision; refusing to roll back blind")
        request(cfg, "POST", "/releases/rollback",
                body={"deployment_id": args[1], "expected_revision": revision})
        print(f"Rolled back to {args[1]}")
        return

    dist_dir = args[0] if args else "./dist"
    if not os.path.isdir(dist_dir):
        die(f"build directory not found: {dist_dir}")
    if not os.path.isfile(os.path.join(dist_dir, "index.html")):
        die(f"{dist_dir} has no index.html. Build first, and archive the OUTPUT directory.")

    zip_bytes = archive(dist_dir)
    print(f"1/4 uploading {len(zip_bytes)} bytes to project {cfg['project_id']}")
    multipart = build_multipart(zip_bytes, {
        "spa_fallback": cfg["spa_fallback"],
        "smart_rename_index": "false",
        "description": "deployed by the oneshield-pages agent skill",
    })
    uploaded = request(cfg, "POST", "/deployments", multipart=multipart)
    deployment_id = value_of(uploaded, "deployment_id")
    if not deployment_id:
        die("upload returned no deployment_id")
    renamed = value_of(uploaded, "renamed_index_from")
    if renamed:
        print(f"    note: {renamed} was served as index.html")

    print(f"2/4 preparing release of {deployment_id} on {cfg['channel']}")
    prepared = request(cfg, "POST", "/releases/prepare",
                       body={"deployment_id": deployment_id, "channel": cfg["channel"]})
    digest = value_of(prepared, "manifest_digest")
    if not digest:
        die("prepare returned no manifest_digest")

    print("3/4 activating")
    request(cfg, "POST", "/releases/activate", body={"manifest_digest": digest})

    print("4/4 verifying")
    state = request(cfg, "GET", "/state")
    # The state document reports each channel separately. `effective` is what
    # the edge is serving; `desired` is only what was asked for, and reading it
    # would report success the moment the request was accepted -- the thing
    # this step exists to not do.
    channel_state = value_of(state, cfg["channel"]) or {}
    active = channel_state.get("effective") if isinstance(channel_state, dict) else None
    if active != deployment_id:
        die(f"activation returned success but the {cfg['channel']} channel is serving "
            f"'{active}', not '{deployment_id}'. Nothing is live yet.")
    print(f"Published {deployment_id}. Fetch the site's own hostname to confirm "
          f"what visitors receive.")


if __name__ == "__main__":
    main()
