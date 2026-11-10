@echo off
title Perekam Form Afresto (Playwright Codegen)
echo ==========================================================
echo   APEX NEXUS SOVEREIGN (ANS) - Perekam Form Afresto
echo ==========================================================
echo Membuka browser Playwright Inspector menggunakan Google Chrome...
echo Silakan login ke Afresto dan coba isi 1 butir soal.
echo Setelah selesai, cukup tutup browser Playwright.
echo ==========================================================

:: Coba menggunakan Google Chrome bawaan komputer terlebih dahulu
call npx playwright codegen --channel=chrome -o codegen_afresto.js

:: Jika gagal atau Chrome tidak ditemukan, fallback ke Chromium Playwright
if %ERRORLEVEL% NEQ 0 (
    echo Mencoba membuka dengan browser Chromium bawaan Playwright...
    call npx playwright codegen -o codegen_afresto.js
)

echo.
echo ==========================================================
echo Rekaman selesai! File codegen_afresto.js berhasil diperbarui.
echo ==========================================================
pause
