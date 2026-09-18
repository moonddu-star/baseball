# Same release pipeline for local Windows and GitHub Actions.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) { throw 'Project checks failed.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
    & node tools/prepare-release.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Release preparation failed.' }
    $package = Get-Content -LiteralPath '.work/current-deploy-package.json' -Raw | ConvertFrom-Json
    Compress-Archive -Path (Join-Path $package.stage '*') -DestinationPath $package.zip -CompressionLevel Optimal
    $extracted = $package.stage + '-verify'
    Expand-Archive -LiteralPath $package.zip -DestinationPath $extracted
    & node tools/verify-release.cjs $extracted
    if ($LASTEXITCODE -ne 0) { throw 'Extracted release verification failed.' }
    $hasher = [Security.Cryptography.SHA256]::Create()
    $stream = [IO.File]::OpenRead($package.zip)
    try {
        $digest = ([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
    } finally {
        $stream.Dispose()
        $hasher.Dispose()
    }
    $checksum = $digest + '  ' + [IO.Path]::GetFileName($package.zip) + [Environment]::NewLine
    [IO.File]::WriteAllText($package.zip + '.sha256', $checksum, [Text.UTF8Encoding]::new($false))
    Write-Output ('Release ZIP: ' + $package.zip)
    Write-Output ('SHA256: ' + $digest)
} finally {
    Pop-Location
}
