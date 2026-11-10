@echo off
setlocal
title Afresto AI Assistant - Updater Otomatis

echo ====================================================================
echo      AFRESTO AI ASSISTANT - SISTEM PEMBARUAN OTOMATIS (UPDATER)
echo ====================================================================
echo(

:: 1. Tentukan direktori kerja (folder tempat file bat ini berada)
set "TARGET_DIR=%~dp0"
if "%TARGET_DIR:~-1%"=="\" set "TARGET_DIR=%TARGET_DIR:~0,-1%"

:: 2. Ambil URL Pembaruan dari file update_url.txt jika ada, atau gunakan default
set "UPDATE_URL="
if exist "%TARGET_DIR%\update_url.txt" (
    set /p UPDATE_URL=<"%TARGET_DIR%\update_url.txt"
)

if "%UPDATE_URL%"=="" (
    set "UPDATE_URL=https://update.sekolahanda.com/afresto/Afresto_AI_Assistant_latest.zip"
)

echo [INFO] Memeriksa server pembaruan...
echo Server: %UPDATE_URL%
echo(

:: 3. Jalankan pengunduhan file menggunakan PowerShell
echo [1/3] Mengunduh paket pembaruan terbaru di latar belakang...
set "TEMP_ZIP=%TEMP%\afresto_update_%RANDOM%.zip"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; try { $wc=New-Object Net.WebClient; $wc.Headers.Add('User-Agent','AfrestoUpdater/1.0'); $wc.DownloadFile($env:UPDATE_URL, $env:TEMP_ZIP); if (-not (Test-Path $env:TEMP_ZIP) -or (Get-Item $env:TEMP_ZIP).Length -lt 500) { exit 2 } exit 0 } catch { exit 1 }"
set "PS_RESULT=%ERRORLEVEL%"

if "%PS_RESULT%"=="1" (
    echo(
    echo [ERROR] Gagal terhubung ke server pembaruan!
    echo Kemungkinan penyebab:
    echo 1. Laptop Anda sedang tidak terhubung ke internet.
    echo 2. Alamat server di file update_url.txt belum aktif atau belum diatur oleh Admin Sekolah.
    echo(
    echo Silakan hubungi Admin Sekolah untuk memastikan alamat server pembaruan aktif.
    echo(
    if not "%~1"=="--silent" pause
    exit /b 1
)

if "%PS_RESULT%"=="2" (
    echo(
    echo [ERROR] Berkas pembaruan yang diunduh tidak valid atau rusak (ukuran terlalu kecil).
    echo Silakan hubungi Admin Sekolah untuk memastikan file zip di VPS sudah benar.
    echo(
    if not "%~1"=="--silent" pause
    exit /b 1
)

echo [2/3] Menginstal dan memperbarui file sistem ekstensi...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { Expand-Archive -Path $env:TEMP_ZIP -DestinationPath $env:TARGET_DIR -Force; Remove-Item -Path $env:TEMP_ZIP -Force -ErrorAction SilentlyContinue; exit 0 } catch { exit 1 }"

if not "%ERRORLEVEL%"=="0" (
    echo(
    echo [ERROR] Gagal mengekstrak berkas pembaruan.
    echo Pastikan Anda memiliki izin akses untuk mengubah file di folder ini.
    echo(
    if not "%~1"=="--silent" pause
    exit /b 1
)

echo [3/3] Pembaruan Berhasil Dipasang 100%! ⭐
echo(
echo ====================================================================
echo                   PEMBARUAN BERHASIL SELESAI!
echo ====================================================================
echo Seluruh file Afresto AI Assistant telah diperbarui ke versi terbaru.
echo(
echo LANGKAH TERAKHIR UNTUK BAPAK/IBU GURU:
echo 1. Buka browser Google Chrome Anda.
echo 2. Masuk ke halaman ekstensi: chrome://extensions
echo 3. Klik tombol REFRESH (ikon panah melingkar 🔄) pada kartu
echo    "Afresto AI Assistant".
echo(
echo Selesai! Anda sudah bisa langsung menggunakan versi terbaru.
echo ====================================================================
echo(

if /i "%~1"=="--silent" goto :finish
if /i "%~1"=="--no-prompt" goto :finish

set /p OPEN_CHROME="Buka halaman ekstensi Chrome sekarang? (Y/T) [Default: Y]: "
if "%OPEN_CHROME%"=="" set "OPEN_CHROME=Y"
if /i "%OPEN_CHROME%"=="Y" (
    start chrome://extensions
)

echo(
echo Terima kasih! Jendela ini akan tertutup otomatis dalam 5 detik...
timeout /t 5 >nul 2>&1 || ping 127.0.0.1 -n 6 >nul

:finish
exit /b 0
