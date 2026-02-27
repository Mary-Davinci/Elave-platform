param(
  [string]$EnvFile = ".env",
  [string]$BackupRoot = "backups",
  [int]$RetentionDays = 30,
  [string]$MongoDumpBin = "mongodump"
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

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $projectRoot $EnvFile }
$backupDir = if ([System.IO.Path]::IsPathRooted($BackupRoot)) { $BackupRoot } else { Join-Path $projectRoot $BackupRoot }

$mongoUri = Get-EnvValue -Path $envPath -Key "MONGO_URI"
if (-not $mongoUri) {
  throw "MONGO_URI non presente in $envPath"
}

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

Write-Host "[backup] completato: $zipOut"
