# Convert PNG to Windows ICO format
Add-Type -AssemblyName System.Drawing

$pngPath = Join-Path $PSScriptRoot "..\icons\icon128.png"
$icoPath = Join-Path $PSScriptRoot "..\icons\app.ico"

if (Test-Path $pngPath) {
    $bmp = [System.Drawing.Bitmap]::FromFile($pngPath)
    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $fs = [System.IO.File]::OpenWrite($icoPath)
    $icon.Save($fs)
    $fs.Close()
    $bmp.Dispose()
    Write-Host "ICO successfully created at: $icoPath"
}
