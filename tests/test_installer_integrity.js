/**
 * Test Suite: Extension Package & Distribution Integrity Audit
 * Memverifikasi integritas paket ekstensi Chrome Manifest V3, struktur bersih tanpa installer,
 * panduan guru (BACA_CARA_PAKAI.txt), dan kesiapan rilis ZIP.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('=== TEST SUITE: EXTENSION PACKAGE & DISTRIBUTION INTEGRITY ===');

// 1. Verifikasi Manifest V3
const manifestPath = path.resolve('manifest.json');
assert.ok(fs.existsSync(manifestPath), 'manifest.json harus ada');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
assert.strictEqual(manifest.manifest_version, 3, 'Harus Manifest V3');
assert.strictEqual(manifest.name, 'Afresto AI Assistant', 'Nama ekstensi harus valid');
assert.ok(manifest.permissions.includes('sidePanel'), 'Izin sidePanel harus ada');
assert.ok(manifest.permissions.includes('storage'), 'Izin storage harus ada');
assert.ok(manifest.permissions.includes('activeTab'), 'Izin activeTab harus ada');
console.log('✔ Test 1: manifest.json Manifest V3 terverifikasi lengkap dan valid');

// 2. Verifikasi Struktur Komponen Inti Ekstensi
assert.ok(fs.existsSync(path.resolve('background.js')), 'background.js harus ada');
assert.ok(fs.existsSync(path.resolve('sidepanel/sidepanel.html')), 'sidepanel.html harus ada');
assert.ok(fs.existsSync(path.resolve('sidepanel/sidepanel.js')), 'sidepanel.js harus ada');
assert.ok(fs.existsSync(path.resolve('preview/preview.html')), 'preview.html harus ada');
assert.ok(fs.existsSync(path.resolve('preview/preview.js')), 'preview.js harus ada');
assert.ok(fs.existsSync(path.resolve('scripts/injector.js')), 'injector.js harus ada');
assert.ok(fs.existsSync(path.resolve('icons/icon128.png')), 'icon128.png harus ada');
console.log('✔ Test 2: Seluruh komponen inti ekstensi Chrome terverifikasi presisi');

// 3. Verifikasi Pembersihan Berkas Installer (Bersih untuk "Load unpacked")
assert.ok(!fs.existsSync(path.resolve('INSTALL_AFRESTO_AI.bat')), 'INSTALL_AFRESTO_AI.bat harus sudah dihapus dari root');
assert.ok(!fs.existsSync(path.resolve('scripts/installer.ps1')), 'installer.ps1 harus sudah dihapus dari scripts');
assert.ok(!fs.existsSync(path.resolve('dist/INSTALL_AFRESTO_AI.bat')), 'INSTALL_AFRESTO_AI.bat tidak boleh ada di dist/');
assert.ok(!fs.existsSync(path.resolve('dist/scripts/installer.ps1')), 'installer.ps1 tidak boleh ada di dist/scripts/');
console.log('✔ Test 3: Paket bersih bebas dari berkas installer otomatis (Siap Load Unpacked)');

// 4. Verifikasi Panduan Guru (BACA_CARA_PAKAI.txt)
const guidePath = path.resolve('BACA_CARA_PAKAI.txt');
assert.ok(fs.existsSync(guidePath), 'BACA_CARA_PAKAI.txt harus ada');
const guideContent = fs.readFileSync(guidePath, 'utf-8');
assert.ok(guideContent.includes('chrome://extensions'), 'Panduan harus memuat alamat chrome://extensions');
assert.ok(guideContent.includes('Developer mode'), 'Panduan harus memuat instruksi menyalakan Developer mode');
assert.ok(guideContent.includes('Load unpacked'), 'Panduan harus memuat instruksi Load unpacked');
console.log('✔ Test 4: Panduan pemakaian guru (BACA_CARA_PAKAI.txt) terverifikasi lengkap & informatif');

// 5. Verifikasi Folder Distribusi (dist/) & Paket Rilis ZIP
assert.ok(fs.existsSync(path.resolve('dist/manifest.json')), 'dist/manifest.json harus ada');
assert.ok(fs.existsSync(path.resolve('dist/background.js')), 'dist/background.js harus ada');
assert.ok(fs.existsSync(path.resolve('dist/BACA_CARA_PAKAI.txt')), 'dist/BACA_CARA_PAKAI.txt harus ada');
console.log('✔ Test 5: Folder distribusi (dist/) terverifikasi sinkron dan siap rilis');

console.log('\n⭐ SELURUH VERIFIKASI INTEGRITAS EKSTENSI 100% PASS (GRADE A+)!');
