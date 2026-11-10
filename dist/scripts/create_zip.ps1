$distPath = Join-Path $PSScriptRoot "..\dist"
$zipPath = Join-Path $PSScriptRoot "..\Afresto_AI_Assistant_v1.0.0.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($distPath, $zipPath)
Write-Host "Standard ZIP created at $zipPath"
