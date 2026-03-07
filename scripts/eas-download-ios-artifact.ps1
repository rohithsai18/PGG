param(
  [string]$BuildId,
  [string]$Profile = "production",
  [string]$OutputDir = "apps/mobile/builds/ios"
)

$ErrorActionPreference = "Stop"

function Invoke-EasJson([string[]]$Arguments) {
  $escapedArgs = $Arguments | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }
  $command = "npx.cmd --yes eas-cli " + ($escapedArgs -join " ") + " 2>&1"
  $output = & cmd.exe /d /s /c $command
  if ($LASTEXITCODE -ne 0) {
    Write-Output ($output -join [Environment]::NewLine)
    throw "EAS command failed."
  }

  $json = $output -join [Environment]::NewLine
  return $json | ConvertFrom-Json
}

function Get-ArtifactUrl($Build) {
  $candidates = @(
    $Build.artifacts.buildUrl,
    $Build.artifacts.applicationArchiveUrl,
    $Build.artifacts.iosArchiveUrl,
    $Build.archiveUrl
  ) | Where-Object { $_ }

  if ($candidates.Count -eq 0) {
    throw "No downloadable IPA URL was found in the EAS build metadata."
  }

  return $candidates[0]
}

function Get-BuildMetadata([string]$SelectedBuildId, [string]$SelectedProfile) {
  if ($SelectedBuildId) {
    return Invoke-EasJson @("build:view", $SelectedBuildId, "--json")
  }

  $builds = Invoke-EasJson @(
    "build:list",
    "--platform", "ios",
    "--status", "finished",
    "--build-profile", $SelectedProfile,
    "--limit", "1",
    "--json",
    "--non-interactive"
  )

  if (-not $builds -or $builds.Count -lt 1) {
    throw "No finished iOS builds were found for profile '$SelectedProfile'."
  }

  return $builds[0]
}

$build = Get-BuildMetadata -SelectedBuildId $BuildId -SelectedProfile $Profile
$artifactUrl = Get-ArtifactUrl -Build $build

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$targetDir = Join-Path $repoRoot $OutputDir
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

$appVersion = if ($build.appVersion) { $build.appVersion } else { "unknown-version" }
$appBuildVersion = if ($build.appBuildVersion) { $build.appBuildVersion } else { (Get-Date -Format "yyyyMMddHHmmss") }
$fileName = "real-estate-demo-ios-$appVersion-$appBuildVersion.ipa"
$destination = Join-Path $targetDir $fileName

Invoke-WebRequest -Uri $artifactUrl -OutFile $destination

Write-Output "Downloaded IPA: $destination"
