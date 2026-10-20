# When a deployment fails

Read the error code the server returned. Every refusal below carries one, and
the code — not the HTTP status — says what to do. Report the server's own
sentence to the user; do not paraphrase it into a guess.

## The three that look alike and are not

| code | what it means | fix |
|---|---|---|
| `pages_upload_too_large` | the WHOLE archive is over the request ceiling | remove files, or upgrade the package |
| `pages_file_too_large` | ONE file inside the archive is over the per-file limit | the message names the file and its size; shrink that file |
| `pages_account_storage_quota_exceeded` | the ACCOUNT is full across all its projects, not this project alone | delete an old project or deployment, or upgrade |

A fourth, `pages_project_storage_quota_exceeded`, is this project alone. The
distinction matters: deleting files from this site does not help when the
account is full because of a different site.

## Refusals from the portal layer, before OneShield sees the request

| code / status | cause | fix |
|---|---|---|
| `400 idempotency_key_required` | no `Idempotency-Key` header, or it is not printable ASCII | send one per logical operation |
| `401` | missing, revoked, or wrong-project token | re-issue the token in the portal; a token is scoped to one project |
| `403` | the token is valid for a different project than the one in the path | use the matching project id |
| `404 page not found` | wrong path — usually a zone id where a project id belongs | project ids start with `prj_` |
| `413` with an HTML body and no code | the request never reached the application; the proxy refused it by size | reduce the archive |

## Release refusals

| code | cause | fix |
|---|---|---|
| `invalid_pages_release_prepare_payload` | `deployment_id` missing, or `channel` not `production`/`preview` | send both correctly |
| `manifest_digest_required` | activate called without the digest from prepare | prepare first, pass its `manifest_digest` |
| revision conflict on rollback | someone released between the state read and the rollback | re-read the state and retry with the new `expected_revision` |

## Retryable versus final

`workspace_*` codes and any `503` carrying `"retryable": true` mean the server
could not answer right now and the same request may be sent again after the
`retry_after_seconds` it gives. Everything else is a refusal of the request as
sent: retrying it unchanged will fail identically.

Do not retry a `4xx` in a loop. Fix the request.

## A `201` is not a published site

The upload succeeded and nothing is live yet. Prepare and activate, then read
`GET /projects/{id}/state` and confirm the active deployment is the id the
upload returned — and then fetch the site's own hostname and confirm the new
content is served. Each of those three checks answers a different question, and
only the last one is what a visitor sees.

## Nothing changed after a successful activation

Check in this order:

1. `GET /projects/{id}/state` — is the active deployment the new id? If not, the
   activation did not take.
2. Is the browser holding a cached copy? Re-fetch with `Cache-Control: no-cache`.
3. Is the hostname pointed at this project? DNS bindings are a human's job in
   the portal; a project can be published and still have no hostname reaching it.
