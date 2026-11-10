$distPath = Join-Path $PSScriptRoot "..\dist"
$zipPathV3 = Join-Path $PSScriptRoot "..\Afresto_AI_Assistant_v3.0.0.zip"
$zipPathV2 = Join-Path $PSScriptRoot "..\Afresto_AI_Assistant_v2.0.0.zip"
$zipPathV1 = Join-Path $PSScriptRoot "..\Afresto_AI_Assistant_v1.0.0.zip"
$latestZipPath = Join-Path $PSScriptRoot "..\Afresto_AI_Assistant_latest.zip"

if (Test-Path $zipPathV3) {
    Remove-Item $zipPathV3 -Force
}
if (Test-Path $zipPathV2) {
    Remove-Item $zipPathV2 -Force
}
if (Test-Path $zipPathV1) {
    Remove-Item $zipPathV1 -Force
}
if (Test-Path $latestZipPath) {
    Remove-Item $latestZipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($distPath, $zipPathV3)
Copy-Item $zipPathV3 $latestZipPath -Force
Copy-Item $zipPathV3 $zipPathV2 -Force
Copy-Item $zipPathV3 $zipPathV1 -Force

Write-Host "Standard ZIP v3.0.0 created at $zipPathV3"
Write-Host "Latest VPS ZIP created at $latestZipPath"
Write-Host "Legacy v2.0.0 & v1.0.0 ZIP updated for backward compatibility"
