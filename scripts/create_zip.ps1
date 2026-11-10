$distPath = Join-Path $PSScriptRoot "..\dist"
$manifest = Get-Content (Join-Path $distPath "manifest.json") | ConvertFrom-Json
$ver = $manifest.version
$zipPathVer = Join-Path $PSScriptRoot "..\Afresto_AI_Assistant_v$ver.zip"
$zipPathV3 = Join-Path $PSScriptRoot "..\Afresto_AI_Assistant_v3.0.0.zip"
$latestZipPath = Join-Path $PSScriptRoot "..\Afresto_AI_Assistant_latest.zip"

if (Test-Path $zipPathVer) { Remove-Item $zipPathVer -Force }
if (Test-Path $zipPathV3) { Remove-Item $zipPathV3 -Force }
if (Test-Path $latestZipPath) { Remove-Item $latestZipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($distPath, $zipPathVer)
Copy-Item $zipPathVer $latestZipPath -Force
Copy-Item $zipPathVer $zipPathV3 -Force

Write-Host "Standard ZIP v$ver created at $zipPathVer"
Write-Host "Latest ZIP created at $latestZipPath"
