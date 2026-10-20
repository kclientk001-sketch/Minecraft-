#!/usr/bin/env bash
# Deploy a built static site to OneShield Pages.
#
# An upload does not publish. This runs the whole contract: archive, upload,
# prepare, activate, verify. It stops at the first failure and prints the
# server's own error code, because that code is what says whether to retry.
#
# The token is never printed, never written to a file, and never sent anywhere
# but ONESHIELD_ENDPOINT.
set -euo pipefail

ENDPOINT="${ONESHIELD_ENDPOINT:-https://portal.inet.vn}"
PROJECT_ID="${ONESHIELD_PROJECT_ID:-}"
AGENT_TOKEN="${ONESHIELD_AGENT_TOKEN:-}"
SPA_FALLBACK="${ONESHIELD_SPA_FALLBACK:-true}"
CHANNEL="${ONESHIELD_CHANNEL:-production}"

# .env fills only what the environment did not. An explicit environment value
# always wins, so a CI secret cannot be overridden by a file in the checkout.
if [ -f .env ]; then
  for key in ONESHIELD_ENDPOINT ONESHIELD_PROJECT_ID ONESHIELD_AGENT_TOKEN ONESHIELD_SPA_FALLBACK ONESHIELD_CHANNEL; do
    current="$(eval "printf '%s' \"\${${key}:-}\"")"
    [ -n "$current" ] && continue
    line="$(grep -E "^${key}=" .env | tail -1 || true)"
    [ -z "$line" ] && continue
    value="${line#*=}"
    value="${value%\"}"; value="${value#\"}"
    value="${value%\'}"; value="${value#\'}"
    case "$key" in
      ONESHIELD_ENDPOINT)     ENDPOINT="$value" ;;
      ONESHIELD_PROJECT_ID)   PROJECT_ID="$value" ;;
      ONESHIELD_AGENT_TOKEN)  AGENT_TOKEN="$value" ;;
      ONESHIELD_SPA_FALLBACK) SPA_FALLBACK="$value" ;;
      ONESHIELD_CHANNEL)      CHANNEL="$value" ;;
    esac
  done
fi

die() { printf '%s\n' "$1" >&2; exit 1; }

[ -n "$PROJECT_ID" ] || die "ONESHIELD_PROJECT_ID is not set. It looks like prj_xxxx and is NOT a zone id or a domain."
[ -n "$AGENT_TOKEN" ] || die "ONESHIELD_AGENT_TOKEN is not set."
case "$PROJECT_ID" in
  prj_*) ;;
  *) die "ONESHIELD_PROJECT_ID must start with prj_. Got a value of ${#PROJECT_ID} characters that does not." ;;
esac

BASE="${ENDPOINT}/api/v1/one-shield/pages/projects/${PROJECT_ID}"
AUTH_HEADER="Authorization: Bearer ${AGENT_TOKEN}"

new_key() {
  # A key per logical operation. Retrying the SAME operation must reuse its key;
  # that is what makes the retry safe rather than a second deployment.
  if command -v uuidgen >/dev/null 2>&1; then uuidgen
  else date +%s%N | sha256sum | cut -c1-32
  fi
}

api_json() { # method path body -> body on stdout, exits on HTTP >= 400
  local method="$1" path="$2" body="$3" out code
  out="$(mktemp)"
  code="$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "${BASE}${path}" \
    -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -H "Idempotency-Key: $(new_key)" --data "$body")"
  if [ "$code" -ge 400 ]; then
    printf 'FAILED %s %s -> HTTP %s\n' "$method" "$path" "$code" >&2
    cat "$out" >&2; printf '\n' >&2
    rm -f "$out"; exit 1
  fi
  cat "$out"; rm -f "$out"
}

json_field() { # field -- flat scan, no jq dependency
  sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1
}

if [ "${1:-}" = "--rollback" ]; then
  [ -n "${2:-}" ] || die "usage: deploy.sh --rollback <deployment_id>"
  REVISION="$(curl -sS "${BASE}/state" -H "$AUTH_HEADER" \
    | sed -n 's/.*"revision"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)"
  [ -n "$REVISION" ] || die "could not read the project revision; refusing to roll back blind"
  api_json POST /releases/rollback "{\"deployment_id\":\"$2\",\"expected_revision\":${REVISION}}" >/dev/null
  echo "Rolled back to $2"
  exit 0
fi

DIST_DIR="${1:-./dist}"
[ -d "$DIST_DIR" ] || die "build directory not found: $DIST_DIR"
[ -f "$DIST_DIR/index.html" ] || die "$DIST_DIR has no index.html. Build the site first, and archive the OUTPUT directory rather than its parent."
command -v zip >/dev/null 2>&1 || die "zip is required and was not found on PATH."

ZIP="$(mktemp -t oneshield-pages).zip"
trap 'rm -f "$ZIP"' EXIT
# cd into the directory so index.html sits at the archive root; an archive whose
# entries all begin with dist/ deploys a site whose every URL is wrong.
( cd "$DIST_DIR" && zip -r -q "$ZIP" . )

echo "1/4 uploading $(du -h "$ZIP" | cut -f1) to project ${PROJECT_ID}"
UPLOAD_OUT="$(mktemp)"
UPLOAD_CODE="$(curl -sS -o "$UPLOAD_OUT" -w '%{http_code}' -X POST "${BASE}/deployments" \
  -H "$AUTH_HEADER" -H "Idempotency-Key: $(new_key)" \
  -F "file=@${ZIP}" \
  -F "spa_fallback=${SPA_FALLBACK}" \
  -F "smart_rename_index=false" \
  -F "description=deployed by the oneshield-pages agent skill")"
if [ "$UPLOAD_CODE" -ge 400 ]; then
  printf 'FAILED upload -> HTTP %s\n' "$UPLOAD_CODE" >&2
  cat "$UPLOAD_OUT" >&2; printf '\n' >&2
  rm -f "$UPLOAD_OUT"; exit 1
fi
DEPLOYMENT_ID="$(json_field deployment_id < "$UPLOAD_OUT")"
RENAMED="$(json_field renamed_index_from < "$UPLOAD_OUT")"
rm -f "$UPLOAD_OUT"
[ -n "$DEPLOYMENT_ID" ] || die "upload returned no deployment_id"
[ -n "$RENAMED" ] && echo "    note: ${RENAMED} was served as index.html"

echo "2/4 preparing release of ${DEPLOYMENT_ID} on ${CHANNEL}"
DIGEST="$(api_json POST /releases/prepare \
  "{\"deployment_id\":\"${DEPLOYMENT_ID}\",\"channel\":\"${CHANNEL}\"}" | json_field manifest_digest)"
[ -n "$DIGEST" ] || die "prepare returned no manifest_digest"

echo "3/4 activating"
api_json POST /releases/activate "{\"manifest_digest\":\"${DIGEST}\"}" >/dev/null

echo "4/4 verifying"
# The state document reports each channel separately:
#   {"data":{"production":{"desired":..,"effective":..,"in_sync":..},"preview":{...}}}
# `effective` is what the edge is actually serving; `desired` is what was asked
# for. Reading `desired` would report success the moment the request was
# accepted, which is the thing this step exists to not do.
ACTIVE="$(curl -sS "${BASE}/state" -H "$AUTH_HEADER" \
  | sed -n "s/.*\"${CHANNEL}\":{[^}]*\"effective\":\"\([^\"]*\)\".*/\1/p" | head -1)"
if [ "$ACTIVE" != "$DEPLOYMENT_ID" ]; then
  die "activation returned success but the ${CHANNEL} channel is serving '${ACTIVE}', not '${DEPLOYMENT_ID}'. Nothing is live yet."
fi
echo "Published ${DEPLOYMENT_ID}. Fetch the site's own hostname to confirm what visitors receive."
