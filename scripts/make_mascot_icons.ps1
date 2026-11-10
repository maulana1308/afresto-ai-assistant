Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\maula\.gemini\antigravity\brain\65a63ff4-d55a-4f07-bad2-3379b5a10f8a\.user_uploaded\media_1793162115740_4da58de3.png"
$iconsDir = Join-Path $PSScriptRoot "..\icons"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

# 1. Simpan banner asli untuk sidepanel
$bannerPath = Join-Path $iconsDir "banner.png"
Copy-Item -Path $srcPath -Destination $bannerPath -Force
Write-Host "Banner saved to $bannerPath"

# 2. Buka gambar sumber
$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$srcWidth = $srcBmp.Width
$srcHeight = $srcBmp.Height

# Tentukan area crop bujur sangkar (fokus pada karakter Afresto & wajahnya)
# Tinggi gambar adalah 248. Kita ambil kotak 248 x 248 mulai x = 20
$cropSize = $srcHeight
$cropX = [Math]::Max(0, [Math]::Min(20, $srcWidth - $cropSize))
$cropRect = New-Object System.Drawing.Rectangle $cropX, 0, $cropSize, $cropSize

$cropBmp = New-Object System.Drawing.Bitmap $cropSize, $cropSize
$gCrop = [System.Drawing.Graphics]::FromImage($cropBmp)
$gCrop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gCrop.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gCrop.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gCrop.DrawImage($srcBmp, (New-Object System.Drawing.Rectangle 0, 0, $cropSize, $cropSize), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$gCrop.Dispose()

# 3. Fungsi untuk mengecilkan icon ke berbagai ukuran
function Resize-Icon($sourceBmp, $size, $outputPath) {
    $targetBmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($targetBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($sourceBmp, 0, 0, $size, $size)
    $g.Dispose()

    $targetBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetBmp.Dispose()
    Write-Host "Created icon $size x $size at $outputPath"
}

Resize-Icon $cropBmp 128 (Join-Path $iconsDir "icon128.png")
Resize-Icon $cropBmp 48  (Join-Path $iconsDir "icon48.png")
Resize-Icon $cropBmp 16  (Join-Path $iconsDir "icon16.png")
Resize-Icon $cropBmp 32  (Join-Path $iconsDir "icon32.png")

# Buat juga app.ico
$icoPath = Join-Path $iconsDir "app.ico"
$icon128Bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $iconsDir "icon128.png"))
$hIcon = $icon128Bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::OpenWrite($icoPath)
$icon.Save($fs)
$fs.Close()
$icon128Bmp.Dispose()

$cropBmp.Dispose()
$srcBmp.Dispose()

Write-Host "All icons generated successfully!"
