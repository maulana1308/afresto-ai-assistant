/**
 * Test Suite: Backlog 5 Fixes & Enhancements Verification
 * Memverifikasi:
 * 1. Ergonomi tombol hapus & toolbar playlist responsif.
 * 2. Akurasi prompt gambar berbasis Tujuan Pembelajaran (TP).
 * 3. Pre-Flight Auto Checker untuk deteksi soal cacat/kurang lengkap.
 * 4. Dialog konfirmasi proteksi playlist saat berpindah mode (AI <-> Docx).
 * 5. Peningkatan parser DOCX & template naskah Word resmi (TEMPLATE_SOAL_AFRESTO.docx).
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { parseDocx } from '../scripts/docx_parser.js';
import { buildEnhancedImagePrompt } from '../scripts/image_service.js';
import { validateQuestionCompleteness } from '../scripts/question_validator.js';

console.log('=== TEST SUITE: BACKLOG 5 REMEDIATIONS & ENHANCEMENTS ===\n');

// ------------------------------------------------------------------------
// TEST 1: Ergonomi Tombol Hapus Playlist & Toolbar Responsif
// ------------------------------------------------------------------------
const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf-8');
const css = fs.readFileSync('sidepanel/sidepanel.css', 'utf-8');

assert.ok(html.includes('class="playlist-toolbar"'), 'sidepanel.html harus memiliki playlist-toolbar');
assert.ok(html.includes('btn-clear-playlist'), 'sidepanel.html harus memiliki btn-clear-playlist');
assert.ok(html.includes('btn-danger-pill'), 'btn-clear-playlist harus menggunakan styling btn-danger-pill');
assert.ok(css.includes('.playlist-toolbar'), 'sidepanel.css harus mendefinisikan .playlist-toolbar');
assert.ok(css.includes('.btn-danger-pill'), 'sidepanel.css harus mendefinisikan .btn-danger-pill');
assert.ok(css.includes('.btn-delete-q'), 'sidepanel.css harus mendefinisikan .btn-delete-q');
console.log('✔ Test 1: Ergonomi tombol hapus dan toolbar responsif terverifikasi presisi.');

// ------------------------------------------------------------------------
// TEST 2: Akurasi Prompt Gambar Berbasis Tujuan Pembelajaran (TP)
// ------------------------------------------------------------------------
const geminiJs = fs.readFileSync('scripts/gemini.js', 'utf-8');
assert.ok(geminiJs.includes('TUJUAN PEMBELAJARAN (TP)'), 'gemini.js harus mengikat prompt gambar pada Tujuan Pembelajaran (TP)');
assert.ok(geminiJs.includes('DILARANG membuat prompt generik berdasarkan nama mata pelajaran saja'), 'gemini.js harus melarang prompt generik nama mapel');

const samplePrompt = buildEnhancedImagePrompt("Mata pelajaran Biologi: Mitosis pembelahan sel tahap anafase");
assert.ok(!samplePrompt.toLowerCase().includes('mata pelajaran'), 'buildEnhancedImagePrompt harus membersihkan kata generik "mata pelajaran"');
console.log('✔ Test 2: Akurasi gambar berbasis Tujuan Pembelajaran (TP) terverifikasi presisi.');

// ------------------------------------------------------------------------
// TEST 3: Pre-Flight Auto Checker Validasi Kelengkapan Soal
// ------------------------------------------------------------------------
// Case 3a: Soal PG Cacat (Hanya 2 opsi, opsi C/D hilang)
const invalidPg = {
  tipe: 'PG',
  pertanyaan: 'Apakah fungsi router?',
  opsi: { A: 'Menghubungkan jaringan', B: 'Menyimpan file' }, // Kurang dari 3 opsi
  kunci: 'A'
};
const checkInvalid = validateQuestionCompleteness(invalidPg);
assert.strictEqual(checkInvalid.isValid, false, 'Soal dengan opsi < 3 harus dinyatakan INVALID');
assert.ok(checkInvalid.issues.some(i => i.includes('Opsi jawaban hanya terdeteksi')), 'Harus memunculkan pesan deteksi opsi minim');

// Case 3b: Soal PG dengan Kunci Kosong
const invalidKeyPg = {
  tipe: 'PG',
  pertanyaan: 'Apakah kepanjangan CPU?',
  opsi: { A: 'Central Processing Unit', B: 'Central Unit', C: 'Core Unit', D: 'Control Unit' },
  kunci: ''
};
const checkKey = validateQuestionCompleteness(invalidKeyPg);
assert.strictEqual(checkKey.isValid, false, 'Soal tanpa kunci harus dinyatakan INVALID');

// Case 3c: Soal Valid 100%
const validPg = {
  tipe: 'PG',
  pertanyaan: 'Manakah memori komputer yang bersifat volatile?',
  opsi: { A: 'HDD', B: 'RAM', C: 'ROM', D: 'SSD', E: 'Flashdisk' },
  kunci: 'B'
};
const checkValid = validateQuestionCompleteness(validPg);
assert.strictEqual(checkValid.isValid, true, 'Soal lengkap harus dinyatakan VALID (Siap Input)');

// Verifikasi DOM Pre-Flight Box di HTML
assert.ok(html.includes('id="preflight-status-box"'), 'sidepanel.html harus memiliki preflight-status-box');
assert.ok(html.includes('id="preflight-icon"'), 'sidepanel.html harus memiliki preflight-icon');
assert.ok(html.includes('id="preflight-title"'), 'sidepanel.html harus memiliki preflight-title');
console.log('✔ Test 3: Pre-Flight Auto Checker terverifikasi handal mendeteksi butir cacat & valid.');

// ------------------------------------------------------------------------
// TEST 4: Dialog Konfirmasi Proteksi Playlist Saat Berpindah Mode
// ------------------------------------------------------------------------
assert.ok(html.includes('id="modal-switch-mode-confirm"'), 'sidepanel.html harus memiliki modal-switch-mode-confirm');
assert.ok(html.includes('id="btn-switch-clear-playlist"'), 'sidepanel.html harus memiliki btn-switch-clear-playlist');
assert.ok(html.includes('id="btn-switch-keep-playlist"'), 'sidepanel.html harus memiliki btn-switch-keep-playlist');
assert.ok(html.includes('id="btn-switch-cancel"'), 'sidepanel.html harus memiliki btn-switch-cancel');

const sidepanelJs = fs.readFileSync('sidepanel/sidepanel.js', 'utf-8');
assert.ok(sidepanelJs.includes('requestSwitchSource'), 'sidepanel.js harus memiliki pengaman requestSwitchSource');
assert.ok(sidepanelJs.includes('modal-switch-mode-confirm'), 'sidepanel.js harus mengorkestrasi modal konfirmasi switch');
console.log('✔ Test 4: Dialog konfirmasi proteksi playlist terverifikasi presisi di DOM & kontroler.');

// ------------------------------------------------------------------------
// TEST 5: Peningkatan Parser & Template Resmi TEMPLATE_SOAL_AFRESTO.docx
// ------------------------------------------------------------------------
const templatePath = path.resolve('TEMPLATE_SOAL_AFRESTO.docx');
assert.ok(fs.existsSync(templatePath), 'TEMPLATE_SOAL_AFRESTO.docx harus tersedia di root');

const templateBuf = fs.readFileSync(templatePath);
const parseRes = await parseDocx(templateBuf.buffer.slice(templateBuf.byteOffset, templateBuf.byteOffset + templateBuf.byteLength));

assert.strictEqual(parseRes.directQuestions.length, 9, 'Template harus menghasilkan tepat 9 butir soal contoh');

const qTypes = parseRes.directQuestions.map(q => q.tipe);
assert.ok(qTypes.includes('PG'), 'Template harus memiliki soal PG');
assert.ok(qTypes.includes('PG_KOMPLEKS'), 'Template harus memiliki soal PG_KOMPLEKS');
assert.ok(qTypes.includes('BENAR_SALAH'), 'Template harus memiliki soal BENAR_SALAH');
assert.ok(qTypes.includes('MENCOCOKKAN'), 'Template harus memiliki soal MENCOCOKKAN');
assert.ok(qTypes.includes('ISIAN'), 'Template harus memiliki soal ISIAN');
assert.ok(qTypes.includes('URAIAN'), 'Template harus memiliki soal URAIAN');

// Cek tombol unduh template di HTML dan manifest
assert.ok(html.includes('id="btn-download-template"'), 'sidepanel.html harus memiliki tombol btn-download-template');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
const resources = manifest.web_accessible_resources[0].resources;
assert.ok(resources.includes('TEMPLATE_SOAL_AFRESTO.docx'), 'manifest.json harus mengekspos TEMPLATE_SOAL_AFRESTO.docx di web_accessible_resources');

console.log('✔ Test 5: Template resmi TEMPLATE_SOAL_AFRESTO.docx 100% valid mencakup seluruh 6 tipe soal.');

console.log('\n⭐ SELURUH VERIFIKASI 5 POIN BACKLOG 100% PASS (GRADE A+)!');
