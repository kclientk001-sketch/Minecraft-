# OneShield Pages API — measured contract

Base: `https://portal.inet.vn` (the portal BFF). Every path below is prefixed
`/api/v1/one-shield/pages`.

Verified 2026-09-09 by reading `portal-server/src/routes/client/one-shield/PagesRoute.ts`
and the osh_cp handlers it forwards to. Nothing here is inferred from
documentation.

## Authentication

    Authorization: Bearer <ONESHIELD_AGENT_TOKEN>

The agent token is accepted in place of a browser session on project read and
mutation routes. CSRF is deliberately not required for a token caller: an agent
sends its credential on purpose, so there is no ambient authority to forge.

A token is scoped to one project and is issued by a signed-in human at
`POST /projects/{project_id}/tokens`. That route rejects a token caller by
design — an agent cannot mint its own successor.

## Idempotency

Every mutation requires a unique `Idempotency-Key` header of printable ASCII.
Without it the BFF answers `400 idempotency_key_required` before the request
reaches OneShield.

Reuse the SAME key when retrying the SAME logical operation — that is what makes
a retry safe. Use a NEW key for a new deployment.

## The delivery contract

An upload does not publish. Three calls publish.

### 1. Upload a build

    POST /projects/{project_id}/deployments
    Content-Type: multipart/form-data
    Idempotency-Key: <unique>

| field | type | meaning |
|---|---|---|
| `file` | file | ZIP of the built site, `index.html` at the archive root |
| `spa_fallback` | `true`/`false` | serve `/index.html` for unknown paths |
| `smart_rename_index` | `true`/`false` | promote a single top-level HTML file to `index.html` when the archive has none |
| `description` | string | free text shown in the deployment list |

`201 Created`:

```json
{
  "status": "ready",
  "version": "...",
  "deployment_id": "dep_...",
  "deduplicated": false,
  "file_count": 42,
  "extracted_size_bytes": 1234567,
  "renamed_index_from": "home.html",
  "rewritten_files": 0
}
```

`renamed_index_from` is present only when `smart_rename_index` moved a file.
Surface it: a file that silently changes name is a support ticket later.

### 2. Prepare a release

    POST /projects/{project_id}/releases/prepare
    Idempotency-Key: <unique>
    {"deployment_id": "dep_...", "channel": "production"}

`channel` is `production` or `preview`. Any other value is refused with
`invalid_pages_release_prepare_payload`.

Response: `{"release_id", "manifest_digest", "state", "target_channel", "prepared_targets", "requested_at"}`.

### 3. Activate

    POST /projects/{project_id}/releases/activate
    Idempotency-Key: <unique>
    {"manifest_digest": "<from step 2>"}

The digest is what ties the activation to the exact thing that was prepared. A
missing or empty digest is refused with `manifest_digest_required`.

### 4. Roll back

    POST /projects/{project_id}/releases/rollback
    Idempotency-Key: <unique>
    {"deployment_id": "dep_...", "expected_revision": 12}

`expected_revision` comes from the project state read immediately before. It is
a compare-and-set: a concurrent release makes the rollback fail rather than
silently win.

## Reads

| path | returns |
|---|---|
| `GET /projects` | the caller's projects |
| `GET /projects/{id}` | one project |
| `GET /projects/{id}/state` | published state, active deployment id, revision |
| `GET /projects/{id}/deployments` | deployment history |
| `GET /projects/{id}/deployments/{dep}/files` | file list of one deployment |
| `GET /projects/{id}/deployments/{dep}/file?path=&mode=text\|bytes` | one file |
| `GET /projects/{id}/deployments/{dep}/download` | the archive |
| `GET /projects/{id}/deployments/diff` | difference between two deployments |
| `GET /projects/{id}/usage` | this project's storage and bandwidth |
| `GET /projects/{id}/traffic` | request and byte counters |
| `GET /projects/{id}/analytics` | analytics profile |
| `GET /projects/{id}/audit` | who changed what |
| `GET /tiers` | the package catalogue and every limit in it |

## Routes this skill deliberately does not drive

They exist, they work, and they are a human's or another surface's job. Listed
so nobody concludes the API lacks them:

`/projects` POST (create), `/projects/{id}` DELETE, `/projects/{id}/dns-bindings*`,
`/projects/{id}/tokens*`, `/projects/{id}/publishing-policy` (SEO and JSON-LD),
`/projects/{id}/geo`, `/projects/{id}/affiliate-config`, `/projects/{id}/previews`,
`/projects/{id}/referrals`, `/projects/{id}/deployments/workspace` (the browser
editor's publish), `/projects/{id}/deployments/raw-files`,
`/projects/{id}/deployments/git`, `/projects/{id}/deployments/template`,
`/templates*`, `/projects/{id}/vibestudio/bridge/*`, `/dns-records/reserved`,
`/skills/oneshield-pages/download`.

Do not call them from a deployment script. Several are session-only and will
refuse a token; the rest belong to product surfaces with their own rules.
