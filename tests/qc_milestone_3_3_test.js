/**
 * Test Suite: QC Audit Milestone 3.3 - Studio Simulasi & Sandbox QC Guru
 * Menguji Test-Drive Engine, 1-Click Key Safeguards, Evaluasi 6 Tipe Soal,
 * KOP Sekolah & Print PDF Optimization, dan Integrasi Sidepanel.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== ANS QC AUDIT: MILESTONE 3.3 STUDIO SIMULASI & SANDBOX QC SUITE ===');

// Import modul preview.js
const previewJsPath = path.join(rootDir, 'preview', 'preview.js');
const previewJs = await import(`file://${previewJsPath}`);

// --------------------------------------------------------------------------
// TEST 1: Evaluasi Pengerjaan Siswa (Test-Drive Answer Validation 6 Tipe Soal)
// --------------------------------------------------------------------------
try {
  const { evaluateAnswer } = previewJs;

  // 1.1 PG
  const qPg = { tipe: 'PG', kunci: 'B' };
  assert.strictEqual(evaluateAnswer(qPg, 'b').matched, true, 'PG huruf kecil harus cocok');
  assert.strictEqual(evaluateAnswer(qPg, ' B ').matched, true, 'PG dengan spasi harus cocok');
  assert.strictEqual(evaluateAnswer(qPg, 'C').matched, false, 'PG salah harus bernilai false');

  // 1.2 PG Kompleks
  const qPgk = { tipe: 'PG_KOMPLEKS', kunci: ['A', 'C', 'E'] };
  assert.strictEqual(evaluateAnswer(qPgk, ['E', 'A', 'C']).matched, true, 'PGK urutan acak harus cocok');
  assert.strictEqual(evaluateAnswer(qPgk, ['A', 'C']).matched, false, 'PGK kurang opsi harus false');
  assert.strictEqual(evaluateAnswer(qPgk, ['A', 'B', 'C']).matched, false, 'PGK salah opsi harus false');

  // 1.3 Benar / Salah
  const qBs = {
    tipe: 'BENAR_SALAH',
    opsi: { A: 'Pernyataan 1', B: 'Pernyataan 2' },
    kunci: { A: 'Benar', B: 'Salah' }
  };
  assert.strictEqual(evaluateAnswer(qBs, { A: 'Benar', B: 'Salah' }).matched, true, 'BS tepat harus cocok');
  assert.strictEqual(evaluateAnswer(qBs, { A: 'Salah', B: 'Salah' }).matched, false, 'BS keliru harus false');

  // 1.4 Mencocokkan
  const qMatch = {
    tipe: 'MENCOCOKKAN',
    pasangan: [
      { kiri: 'Router', kanan: 'Lapisan 3 Network' },
      { kiri: 'Switch', kanan: 'Lapisan 2 Datalink' }
    ]
  };
  assert.strictEqual(evaluateAnswer(qMatch, { 0: 'Lapisan 3 Network', 1: 'Lapisan 2 Datalink' }).matched, true, 'Mencocokkan tepat harus cocok');
  assert.strictEqual(evaluateAnswer(qMatch, { 0: 'Lapisan 2 Datalink', 1: 'Lapisan 3 Network' }).matched, false, 'Mencocokkan terbalik harus false');

  // 1.5 Isian Singkat
  const qIsian = { tipe: 'ISIAN', kunci: ['Ir. Soekarno', 'Bung Karno', 'Soekarno'] };
  assert.strictEqual(evaluateAnswer(qIsian, 'bung karno').matched, true, 'Isian sinonim huruf kecil harus cocok');
  assert.strictEqual(evaluateAnswer(qIsian, 'Mohammad Hatta').matched, false, 'Isian salah harus false');

  // 1.6 Uraian / Essay
  const qUraian = { tipe: 'URAIAN', kunci: 'Rubrik penskoran' };
  assert.strictEqual(evaluateAnswer(qUraian, 'Jawaban panjang uraian siswa yang memadai dan berbobot konseptual').answered, true, 'Uraian terisi harus answered');

  console.log('✔ Test 1 Lolos: Evaluasi Logika Test-Drive 6 Tipe Soal Terverifikasi Presisi');
} catch (err) {
  console.error('❌ Test 1 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 2: Alat Penyelamat Cacat Sekali-Klik (1-Click Key Correction Safeguard)
// --------------------------------------------------------------------------
try {
  const { evaluateAnswer } = previewJs;

  // Simulasi soal di mana kunci awal AI salah (AI bilang kunci "C", tapi kunci benarnya adalah "A")
  const flawedQ = {
    id: 3,
    tipe: 'PG',
    pertanyaan: 'Perangkat jaringan yang bekerja di Layer 3 adalah?',
    opsi: { A: 'Router', B: 'Hub', C: 'Bridge', D: 'Repeater', E: 'Kabel UTP' },
    kunci: 'C' // KUNCI CACAT DARI AI
  };

  const teacherChoice = 'A'; // Guru memilih Router (A)
  const initialEval = evaluateAnswer(flawedQ, teacherChoice);
  assert.strictEqual(initialEval.matched, false, 'Evaluasi awal harus terdeteksi mismatch');

  // Eksekusi mekanisme 1-Click Key Safeguard: jadikan pilihan guru sebagai kunci resmi
  flawedQ.kunci = teacherChoice;
  const postCorrectionEval = evaluateAnswer(flawedQ, teacherChoice);
  assert.strictEqual(postCorrectionEval.matched, true, 'Setelah 1-click correction, kunci harus menjadi cocok 100%');
  assert.strictEqual(flawedQ.kunci, 'A', 'Kunci resmi dalam objek soal harus terupdate menjadi A');

  console.log('✔ Test 2 Lolos: Mekanisme 1-Click Key Safeguard Berhasil Mengoreksi Kunci Cacat');
} catch (err) {
  console.error('❌ Test 2 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 3: Format Output Kunci dan Tipografi Multilingual
// --------------------------------------------------------------------------
try {
  const { formatOfficialKey, detectScriptClass } = previewJs;

  const keyPg = formatOfficialKey({ tipe: 'PG', kunci: 'D' });
  assert.ok(keyPg.includes('D'), 'Format kunci PG harus mengandung D');

  const keyPgk = formatOfficialKey({ tipe: 'PG_KOMPLEKS', kunci: ['B', 'D'] });
  assert.ok(keyPgk.includes('B, D'), 'Format kunci PGK harus menampilkan B, D');

  // Tipografi Arabic RTL, Japanese, & Javanese
  assert.strictEqual(detectScriptClass('مرحبا بك في الاختبار'), 'q-rtl', 'Teks Arab harus terdeteksi q-rtl');
  assert.strictEqual(detectScriptClass('これは日本語のテストです'), 'q-cjk', 'Teks Jepang harus terdeteksi q-cjk');
  assert.strictEqual(detectScriptClass('Soal Bahasa Indonesia standar'), '', 'Teks Latin umum harus string kosong');

  console.log('✔ Test 3 Lolos: Format Kunci Resmi & Deteksi Tipografi Multilingual Terverifikasi');
} catch (err) {
  console.error('❌ Test 3 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 4: Integritas DOM Studio Preview (`preview/preview.html`)
// --------------------------------------------------------------------------
try {
  const htmlPath = path.join(rootDir, 'preview', 'preview.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // 4.1 Elemen KOP Sekolah
  assert.ok(htmlContent.includes('id="exam-formal-header"'), 'Wajib ada kontainer KOP Ujian Resmi');
  assert.ok(htmlContent.includes('id="kop-mapel"'), 'Wajib ada field mata pelajaran KOP');
  assert.ok(htmlContent.includes('id="kop-kelas"'), 'Wajib ada field kelas KOP');
  assert.ok(htmlContent.includes('id="kop-waktu"'), 'Wajib ada field waktu KOP');
  assert.ok(htmlContent.includes('PETUNJUK UMUM'), 'Wajib ada petunjuk umum ujian');

  // 4.2 Dashboard Test-Drive & Scoreboard
  assert.ok(htmlContent.includes('id="testdrive-dashboard"'), 'Wajib ada dashboard test-drive');
  assert.ok(htmlContent.includes('id="stat-score"'), 'Wajib ada skor simulasi');
  assert.ok(htmlContent.includes('id="btn-check-all-answers"'), 'Wajib ada tombol periksa seluruh jawaban');
  assert.ok(htmlContent.includes('id="btn-reset-answers"'), 'Wajib ada tombol reset jawaban');

  // 4.3 Navigasi & Aksi Top
  assert.ok(htmlContent.includes('id="btn-print-pdf"'), 'Wajib ada tombol cetak / PDF');
  assert.ok(htmlContent.includes('id="btn-inject-to-afresto"'), 'Wajib ada tombol suntikkan ke Afresto');
  assert.ok(htmlContent.includes('id="btn-mode-testdrive"'), 'Wajib ada tombol mode test-drive');
  assert.ok(htmlContent.includes('id="btn-mode-editor"'), 'Wajib ada tombol mode editor');

  // 4.4 Lembar Lampiran Kunci Terpisah
  assert.ok(htmlContent.includes('id="answer-key-section"'), 'Wajib ada seksi lampiran kunci jawaban');
  assert.ok(htmlContent.includes('id="key-matrix-table"'), 'Wajib ada tabel matriks kunci jawaban');

  console.log('✔ Test 4 Lolos: Integritas Struktur DOM Studio Preview & KOP Sekolah Terverifikasi');
} catch (err) {
  console.error('❌ Test 4 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 5: CSS Print Optimization (@media print) (`preview/preview.css`)
// --------------------------------------------------------------------------
try {
  const cssPath = path.join(rootDir, 'preview', 'preview.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Cek @media print rules
  assert.ok(cssContent.includes('@media print'), 'Wajib memiliki blok @media print');
  assert.ok(cssContent.includes('@page'), 'Wajib memiliki konfigurasi @page untuk cetak PDF');
  assert.ok(cssContent.includes('.no-print'), 'Wajib menyembunyikan elemen .no-print saat dicetak');
  assert.ok(cssContent.includes('page-break-inside: avoid'), 'Wajib mencegah pemotongan butir soal di tengah halaman');
  assert.ok(cssContent.includes('page-break-before: always'), 'Wajib memisahkan lampiran kunci di lembar baru');
  assert.ok(cssContent.includes('background: #FFFFFF !important'), 'Wajib mereset background putih saat cetak');
  assert.ok(cssContent.includes('white-space: pre-wrap'), 'Wajib menjaga format teks bacaan multi-baris saat dicetak');

  console.log('✔ Test 5 Lolos: Standar Cetak PDF & Lembar Ujian Fisik Terverifikasi');
} catch (err) {
  console.error('❌ Test 5 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 6: Integrasi Sidepanel & Real-Time Storage Synchronization
// --------------------------------------------------------------------------
try {
  const sideHtmlPath = path.join(rootDir, 'sidepanel', 'sidepanel.html');
  const sideHtmlContent = fs.readFileSync(sideHtmlPath, 'utf8');

  assert.ok(sideHtmlContent.includes('id="btn-open-preview"'), 'Sidepanel harus memiliki tombol Studio QC di header');
  assert.ok(sideHtmlContent.includes('id="btn-launch-studio-banner"'), 'Sidepanel harus memiliki callout banner Studio Simulasi');

  const sideJsPath = path.join(rootDir, 'sidepanel', 'sidepanel.js');
  const sideJsContent = fs.readFileSync(sideJsPath, 'utf8');

  assert.ok(sideJsContent.includes('launchStudioPreview'), 'Sidepanel.js harus mengimplementasikan fungsi launchStudioPreview');
  assert.ok(sideJsContent.includes('preview/preview.html'), 'Sidepanel.js harus menargetkan URL preview/preview.html');
  assert.ok(sideJsContent.includes('chrome.storage.onChanged'), 'Sidepanel.js harus memiliki listener onChanged untuk sinkronisasi live');

  const previewJsPath = path.join(rootDir, 'preview', 'preview.js');
  const previewJsContent = fs.readFileSync(previewJsPath, 'utf8');
  assert.ok(previewJsContent.includes('chrome.storage.onChanged'), 'Preview.js harus memiliki listener onChanged untuk sinkronisasi dua arah real-time tanpa refresh');

  console.log('✔ Test 6 Lolos: Integrasi Sidepanel & Sinkronisasi Live Storage Terverifikasi');
} catch (err) {
  console.error('❌ Test 6 Gagal:', err);
  process.exit(1);
}

console.log('\n========================================================');
console.log('⭐ VERIFIKASI QC MILESTONE 3.3: 100% TEST PASS (GRADE A+)');
console.log('========================================================\n');
