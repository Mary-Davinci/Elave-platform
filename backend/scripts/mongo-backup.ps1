param(
  [string]$EnvFile = ".env",
  [string]$BackupRoot = "backups",
  [int]$RetentionDays = 30,
  [string]$MongoDumpBin = "mongodump",
  [switch]$UploadToB2 = $true,
  [string]$B2Prefix = "mongo-backups/"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string]$Path,
    [string]$Key
  )
  if (-not (Test-Path $Path)) {
    throw "File .env non trovato: $Path"
  }

  $line = Get-Content $Path |
    Where-Object { $_ -match "^\s*$Key\s*=" } |
    Select-Object -First 1

  if (-not $line) { return $null }

  $value = $line -replace "^\s*$Key\s*=\s*", ""
  $value = $value.Trim().Trim('"').Trim("'")
  return $value
}

function Get-ConfigValue {
  param(
    [string]$Path,
    [string]$Key
  )

  $envValue = [System.Environment]::GetEnvironmentVariable($Key)
  if (-not [string]::IsNullOrWhiteSpace($envValue)) {
    return $envValue.Trim()
  }

  return Get-EnvValue -Path $Path -Key $Key
}

function Get-ConfigValueAny {
  param(
    [string]$Path,
    [string[]]$Keys
  )

  foreach ($key in $Keys) {
    $value = Get-ConfigValue -Path $Path -Key $key
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return $value.Trim()
    }
  }

  return $null
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $projectRoot $EnvFile }
$backupDir = if ([System.IO.Path]::IsPathRooted($BackupRoot)) { $BackupRoot } else { Join-Path $projectRoot $BackupRoot }

$mongoUri = Get-ConfigValue -Path $envPath -Key "MONGO_URI"
if (-not $mongoUri) {
  throw "MONGO_URI non presente in $envPath"
}

$b2Endpoint = Get-ConfigValueAny -Path $envPath -Keys @("B2_ENDPOINT", "BACKBLAZE_ENDPOINT")
$b2Region = Get-ConfigValueAny -Path $envPath -Keys @("B2_REGION", "BACKBLAZE_REGION")
$b2KeyId = Get-ConfigValueAny -Path $envPath -Keys @("B2_KEY_ID", "B2_APPLICATION_KEY_ID", "BACKBLAZE_KEY_ID")
$b2AppKey = Get-ConfigValueAny -Path $envPath -Keys @("B2_APP_KEY", "B2_APPLICATION_KEY", "BACKBLAZE_APPLICATION_KEY")
$b2BucketName = Get-ConfigValueAny -Path $envPath -Keys @("B2_BUCKET_NAME", "B2_BUCKET_NAM", "BACKBLAZE_BUCKET")

if (-not (Test-Path $backupDir)) {
  New-Item -Path $backupDir -ItemType Directory | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tmpOut = Join-Path $backupDir "tmp-$timestamp"
$zipOut = Join-Path $backupDir "mongo-backup-$timestamp.zip"

Write-Host "[backup] dump in corso..."
& $MongoDumpBin --uri="$mongoUri" --out="$tmpOut"
if ($LASTEXITCODE -ne 0) {
  throw "mongodump fallito con exit code $LASTEXITCODE"
}

Write-Host "[backup] compressione..."
Compress-Archive -Path (Join-Path $tmpOut "*") -DestinationPath $zipOut -Force
Remove-Item -Path $tmpOut -Recurse -Force

Write-Host "[backup] retention ($RetentionDays giorni)..."
$threshold = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $backupDir -File -Filter "mongo-backup-*.zip" |
  Where-Object { $_.LastWriteTime -lt $threshold } |
  Remove-Item -Force

if ($UploadToB2) {
  if (-not $b2Endpoint -or -not $b2KeyId -or -not $b2AppKey -or -not $b2BucketName) {
    throw "Upload B2 richiesto ma variabili mancanti (B2_ENDPOINT, B2_KEY_ID, B2_APP_KEY, B2_BUCKET_NAME)"
  }

  if (-not $b2Region) { $b2Region = "us-east-005" }
  $uploadScript = Join-Path $PSScriptRoot "upload-backup-to-b2.mjs"
  if (-not (Test-Path $uploadScript)) {
    throw "Script upload non trovato: $uploadScript"
  }

  Write-Host "[backup] upload su B2..."
  node $uploadScript `
    --file "$zipOut" `
    --bucket "$b2BucketName" `
    --endpoint "$b2Endpoint" `
    --region "$b2Region" `
    --keyId "$b2KeyId" `
    --appKey "$b2AppKey" `
    --prefix "$B2Prefix" `
    --retentionDays "$RetentionDays"

  if ($LASTEXITCODE -ne 0) {
    throw "Upload su B2 fallito con exit code $LASTEXITCODE"
  }
}

Write-Host "[backup] completato: $zipOut"
