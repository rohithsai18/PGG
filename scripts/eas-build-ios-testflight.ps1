param(
  [string]$Profile = "production",
  [string]$OutputDir = "apps/mobile/builds/ios"
)

$ErrorActionPreference = "Stop"

$buildCommand = "npx.cmd --yes eas-cli build --platform ios --profile $Profile --wait --json --non-interactive 2>&1"
$buildOutput = & cmd.exe /d /s /c $buildCommand
if ($LASTEXITCODE -ne 0) {
  Write-Output ($buildOutput -join [Environment]::NewLine)
  throw "EAS iOS build failed."
}

$buildJson = $buildOutput -join [Environment]::NewLine | ConvertFrom-Json
$buildId = if ($buildJson.id) { $buildJson.id } elseif ($buildJson[0].id) { $buildJson[0].id } else { $null }

if (-not $buildId) {
  throw "EAS build completed, but the build ID could not be determined from JSON output."
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "eas-download-ios-artifact.ps1") -BuildId $buildId -Profile $Profile -OutputDir $OutputDir
if ($LASTEXITCODE -ne 0) {
  throw "The iOS build finished, but downloading the IPA failed."
}

$submitCommand = "npx.cmd --yes eas-cli submit --platform ios --profile $Profile --latest --non-interactive"
& cmd.exe /d /s /c $submitCommand
if ($LASTEXITCODE -ne 0) {
  throw "The IPA was downloaded, but TestFlight submission failed."
}
