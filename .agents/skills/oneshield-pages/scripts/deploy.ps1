<#
.SYNOPSIS
  Deploy a built static site to OneShield Pages.
.DESCRIPTION
  An upload does not publish. This runs the whole contract -- archive, upload,
  prepare, activate, verify -- and stops at the first failure, printing the
  server's own error body, because the code inside it says whether to retry.

  The token is never printed and never sent anywhere but ONESHIELD_ENDPOINT.
#>
param(
  [string]$DistDir = ".\dist",
  [string]$Rollback = ""
)

$ErrorActionPreference = "Stop"

function Get-Config {
  $cfg = @{
    endpoint    = $env:ONESHIELD_ENDPOINT
    projectId   = $env:ONESHIELD_PROJECT_ID
    token       = $env:ONESHIELD_AGENT_TOKEN
    spaFallback = $env:ONESHIELD_SPA_FALLBACK
    channel     = $env:ONESHIELD_CHANNEL
  }
  # .env fills only what the environment did not, so a CI secret is never
  # overridden by a file in the checkout.
  $map = @{
    "ONESHIELD_ENDPOINT" = "endpoint"; "ONESHIELD_PROJECT_ID" = "projectId"
    "ONESHIELD_AGENT_TOKEN" = "token"; "ONESHIELD_SPA_FALLBACK" = "spaFallback"
    "ONESHIELD_CHANNEL" = "channel"
  }
  if (Test-Path ".env") {
    foreach ($line in Get-Content ".env") {
      $trimmed = $line.Trim()
      if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) { continue }
      $name, $value = $trimmed.Split("=", 2)
      $field = $map[$name.Trim()]
      if ($field -and -not $cfg[$field]) { $cfg[$field] = $value.Trim().Trim('"').Trim("'") }
    }
  }
  if (-not $cfg.endpoint)    { $cfg.endpoint = "https://portal.inet.vn" }
  if (-not $cfg.spaFallback) { $cfg.spaFallback = "true" }
  if (-not $cfg.channel)     { $cfg.channel = "production" }
  return $cfg
}

$cfg = Get-Config
if (-not $cfg.projectId) { throw "ONESHIELD_PROJECT_ID is not set. It looks like prj_xxxx and is NOT a zone id or a domain." }
if (-not $cfg.projectId.StartsWith("prj_")) { throw "ONESHIELD_PROJECT_ID must start with prj_." }
if (-not $cfg.token) { throw "ONESHIELD_AGENT_TOKEN is not set." }

$base = "$($cfg.endpoint)/api/v1/one-shield/pages/projects/$($cfg.projectId)"

function Invoke-Pages {
  param([string]$Method, [string]$Path, $Body)
  $headers = @{ Authorization = "Bearer $($cfg.token)" }
  if ($Method -ne "GET") { $headers["Idempotency-Key"] = [guid]::NewGuid().ToString() }
  try {
    if ($null -ne $Body) {
      return Invoke-RestMethod -Method $Method -Uri "$base$Path" -Headers $headers `
        -ContentType "application/json" -Body ($Body | ConvertTo-Json -Compress)
    }
    return Invoke-RestMethod -Method $Method -Uri "$base$Path" -Headers $headers
  } catch {
    $detail = ""
    if ($_.ErrorDetails) { $detail = $_.ErrorDetails.Message }
    throw "FAILED $Method $Path -> $($_.Exception.Message)`n$detail"
  }
}

function Get-Field {
  param($Payload, [string]$Name)
  if ($null -eq $Payload) { return $null }
  if ($Payload.PSObject.Properties.Name -contains $Name) { return $Payload.$Name }
  foreach ($nested in @("data", "values")) {
    if ($Payload.PSObject.Properties.Name -contains $nested) {
      $inner = $Payload.$nested
      if ($inner -and $inner.PSObject.Properties.Name -contains $Name) { return $inner.$Name }
    }
  }
  return $null
}

if ($Rollback) {
  $state = Invoke-Pages -Method "GET" -Path "/state"
  $revision = Get-Field $state "revision"
  if ($null -eq $revision) { throw "could not read the project revision; refusing to roll back blind" }
  Invoke-Pages -Method "POST" -Path "/releases/rollback" `
    -Body @{ deployment_id = $Rollback; expected_revision = $revision } | Out-Null
  Write-Host "Rolled back to $Rollback"
  exit 0
}

if (-not (Test-Path $DistDir)) { throw "build directory not found: $DistDir" }
if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
  throw "$DistDir has no index.html. Build first, and archive the OUTPUT directory."
}

$zipPath = Join-Path ([System.IO.Path]::GetTempPath()) "oneshield-pages-$([guid]::NewGuid()).zip"
# -Path "$DistDir\*" so index.html sits at the archive root; archiving the
# directory itself produces entries under dist\ and every URL is then wrong.
Compress-Archive -Path (Join-Path $DistDir "*") -DestinationPath $zipPath -Force

try {
  Write-Host "1/4 uploading to project $($cfg.projectId)"
  $form = @{
    file               = Get-Item $zipPath
    spa_fallback       = $cfg.spaFallback
    smart_rename_index = "false"
    description        = "deployed by the oneshield-pages agent skill"
  }
  $headers = @{ Authorization = "Bearer $($cfg.token)"; "Idempotency-Key" = [guid]::NewGuid().ToString() }
  try {
    $uploaded = Invoke-RestMethod -Method Post -Uri "$base/deployments" -Headers $headers -Form $form
  } catch {
    $detail = ""
    if ($_.ErrorDetails) { $detail = $_.ErrorDetails.Message }
    throw "FAILED upload -> $($_.Exception.Message)`n$detail"
  }
  $deploymentId = Get-Field $uploaded "deployment_id"
  if (-not $deploymentId) { throw "upload returned no deployment_id" }
  $renamed = Get-Field $uploaded "renamed_index_from"
  if ($renamed) { Write-Host "    note: $renamed was served as index.html" }

  Write-Host "2/4 preparing release of $deploymentId on $($cfg.channel)"
  $prepared = Invoke-Pages -Method "POST" -Path "/releases/prepare" `
    -Body @{ deployment_id = $deploymentId; channel = $cfg.channel }
  $digest = Get-Field $prepared "manifest_digest"
  if (-not $digest) { throw "prepare returned no manifest_digest" }

  Write-Host "3/4 activating"
  Invoke-Pages -Method "POST" -Path "/releases/activate" -Body @{ manifest_digest = $digest } | Out-Null

  Write-Host "4/4 verifying"
  $state = Invoke-Pages -Method "GET" -Path "/state"
  # The state document reports each channel separately. `effective` is what the
  # edge is serving; `desired` is only what was asked for.
  $channelState = Get-Field $state $cfg.channel
  $active = $null
  if ($channelState) { $active = $channelState.effective }
  if ($active -ne $deploymentId) {
    throw "activation returned success but the $($cfg.channel) channel is serving '$active', not '$deploymentId'. Nothing is live yet."
  }
  Write-Host "Published $deploymentId. Fetch the site's own hostname to confirm what visitors receive."
}
finally {
  Remove-Item $zipPath -ErrorAction SilentlyContinue
}
