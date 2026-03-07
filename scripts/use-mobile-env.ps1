param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('local', 'railway')]
  [string]$Target
)

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "apps\mobile\.env.$Target"
$destination = Join-Path $root "apps\mobile\.env"

if (-not (Test-Path $source)) {
  throw "Mobile env preset not found: $source"
}

Copy-Item -Path $source -Destination $destination -Force
Write-Host "Active mobile env set to '$Target' -> $destination"
