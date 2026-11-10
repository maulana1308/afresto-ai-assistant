/**
 * ANS QC AUDIT SUITE: VERIFIKASI EKONOMI & AKUNTANSI (.DOCX)
 * File under test: media_1793109713668_0c506b04.docx
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { parseDocx } from '../scripts/docx_parser.js';

const filePath = 'C:/Users/maula/.gemini/antigravity/brain/65a63ff4-d55a-4f07-bad2-3379b5a10f8a/.user_uploaded/media_1793109713668_0c506b04.docx';

console.log('=== ANS QC AUDIT: VERIFIKASI NASKAH UJIAN EKONOMI & AKUNTANSI ===');

if (!fs.existsSync(filePath)) {
  console.log('⚠ File ujian ekonomi tidak ditemukan di path artifacts, skipping live test.');
  process.exit(0);
}

const buf = fs.readFileSync(filePath);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const res = await parseDocx(ab);

// 1. Tepat 35 Soal Terdeteksi
assert.strictEqual(res.directQuestions.length, 35, `Jumlah butir soal harus ternormalisasi tepat 35 butir (aktual: ${res.directQuestions.length})`);
console.log('✔ Test 1 Lolos: Tepat 35 butir soal terdeteksi (bebas dari inflasi 47 butir)');

// 2. Seluruh 35 Butir Berjenis PG dengan Opsi A-E Tepat 5 Pilihan
res.directQuestions.forEach((q, idx) => {
  assert.strictEqual(q.tipe, 'PG', `Soal #${idx + 1} harus bertipe PG (aktual: ${q.tipe})`);
  const optKeys = Object.keys(q.opsi || {});
  assert.strictEqual(optKeys.length, 5, `Soal #${idx + 1} harus memiliki tepat 5 opsi [A,B,C,D,E] (aktual: ${optKeys.length})`);
  assert.deepStrictEqual(optKeys.sort(), ['A', 'B', 'C', 'D', 'E'], `Soal #${idx + 1} harus memiliki key opsi [A,B,C,D,E]`);
});
console.log('✔ Test 2 Lolos: Seluruh 35 butir berjenis PG dengan opsi lengkap tepat 5 pilihan [A,B,C,D,E]');

// 3. Eliminasi Total Tag Mentah [TABEL_X]
let unrenderedCount = 0;
res.directQuestions.forEach((q, idx) => {
  if (q.pertanyaan.includes('[TABEL_')) unrenderedCount++;
  for (const [k, v] of Object.entries(q.opsi || {})) {
    if (v.includes('[TABEL_')) unrenderedCount++;
  }
});
assert.strictEqual(unrenderedCount, 0, `Tidak boleh ada tag [TABEL_X] yang belum ter-render (ditemukan: ${unrenderedCount})`);
console.log('✔ Test 3 Lolos: Seluruh tag [TABEL_X] pada narasi dan opsi berhasil dirender ke HTML table');

// 4. Verifikasi Soal 4 (Normalisasi Daftar Pernyataan Bukti Transaksi 1 s.d. 5)
const q4 = res.directQuestions[3];
assert.ok(q4.pertanyaan.includes('(1) Kuitansi adalah bukti transaksi'), 'Pernyataan (1) Kuitansi harus ternormalisasi presisi');
assert.ok(q4.pertanyaan.includes('(5) Bukti Memorial adalah bukti transaksi'), 'Pernyataan (5) Bukti Memorial harus ternormalisasi presisi');
assert.strictEqual(q4.opsi['A'], '(1), (2), dan (3)', 'Opsi A Soal 4 harus cocok dengan opsi (1), (2), dan (3)');
console.log('✔ Test 4 Lolos: Soal 4 (Daftar pernyataan 1-5 & opsi stimulus) ternormalisasi sempurna');

// 5. Verifikasi Soal 28 (Ekstraksi Jurnal Penyesuaian dari Tabel 52 ke Opsi A-E & Kunci Merah C)
const q28 = res.directQuestions[27];
assert.strictEqual(q28.tipe, 'PG', 'Soal 28 harus bertipe PG, bukan MENCOCOKKAN');
assert.ok(q28.opsi['A'].includes('<table class="afresto-exam-table"'), 'Opsi A Soal 28 harus memuat tabel jurnal berformat HTML');
assert.ok(q28.opsi['A'].includes('Persediaan barang dagang'), 'Opsi A Soal 28 harus memuat akun Persediaan barang dagang');
assert.strictEqual(q28.kunci, 'C', 'Kunci Soal 28 harus C dari penandaan merah guru pada Tabel 52');
console.log('✔ Test 5 Lolos: Soal 28 (Tabel jurnal penyesuaian) diekstrak menjadi opsi A-E berformat tabel HTML & kunci C terdeteksi');

// 6. Verifikasi Soal 30 (Pemetaan Opsi F-J ke A-E & Tabel Buku Besar Pembantu)
const q30 = res.directQuestions[29];
assert.strictEqual(q30.tipe, 'PG', 'Soal 30 harus bertipe PG, bukan MENCOCOKKAN');
assert.ok(q30.opsi['A'].includes('Toko Makmun'), 'Opsi A Soal 30 harus berisi Toko Makmun');
assert.ok(q30.opsi['A'].includes('<table class="afresto-exam-table"'), 'Opsi A Soal 30 harus memuat tabel buku besar');
assert.ok(q30.opsi['E'].includes('Toko Putra'), 'Opsi E Soal 30 harus berisi Toko Putra');
console.log('✔ Test 6 Lolos: Soal 30 (Opsi F-J) berhasil dipetakan ke A-E beserta tabel buku besar pembantu');

// 7. Verifikasi Soal 31 (Ekstraksi Kertas Kerja dari Tabel 62 ke Opsi A-E & Kunci Merah D)
const q31 = res.directQuestions[30];
assert.strictEqual(q31.tipe, 'PG', 'Soal 31 harus bertipe PG, bukan MENCOCOKKAN');
assert.ok(q31.opsi['A'].includes('<table class="afresto-exam-table"'), 'Opsi A Soal 31 harus memuat tabel neraca lajur berformat HTML');
assert.ok(q31.opsi['A'].includes('Perlengkapan kant.'), 'Opsi A Soal 31 harus memuat akun Perlengkapan kantor');
assert.strictEqual(q31.kunci, 'D', 'Kunci Soal 31 harus D dari penandaan merah guru pada Tabel 62');
console.log('✔ Test 7 Lolos: Soal 31 (Tabel kertas kerja) diekstrak menjadi opsi A-E berformat tabel HTML & kunci D terdeteksi');

// 8. Verifikasi Soal 7: Tidak Ada Duplikasi Tabel (Tabel Hanya Ada di Opsi A-E, Bukan di Soal)
const q7 = res.directQuestions[6];
assert.strictEqual(q7.pertanyaan.includes('<table'), false, 'Soal 7 narasi pertanyaan tidak boleh memuat tabel opsi');
assert.ok(q7.opsi['A'].includes('<table class="afresto-exam-table"'), 'Opsi A Soal 7 harus memuat tabel jurnal');
assert.ok(q7.opsi['E'].includes('<table class="afresto-exam-table"'), 'Opsi E Soal 7 harus memuat tabel jurnal');
console.log('✔ Test 8 Lolos: Soal 7 bebas duplikasi tabel (tabel hanya muncul pada opsi A-E)');

// 9. Verifikasi Soal 22: Perapian Multi-Paragraf Tabel Carwash Kinclong & Deteksi Kunci Merah (B)
const q22 = res.directQuestions[21];
assert.ok(q22.pertanyaan.includes('Carwash Kinclong'), 'Soal 22 harus memuat Carwash Kinclong');
assert.ok(q22.pertanyaan.includes('Tambahan modal'), 'Soal 22 harus memuat baris Tambahan modal yang terpisah');
assert.ok(q22.pertanyaan.includes('Beban perlengkapan'), 'Soal 22 harus memuat baris Beban perlengkapan yang terpisah');
assert.strictEqual(q22.kunci, 'B', 'Kunci Soal 22 harus B dari teks merah guru');
console.log('✔ Test 9 Lolos: Tabel Soal 22 tertata rapi multi-baris & kunci merah B terdeteksi presisi');

// 10. Verifikasi Kunci Jawaban Merah Soal 19 (C)
const q19 = res.directQuestions[18];
assert.strictEqual(q19.kunci, 'C', 'Kunci Soal 19 harus C dari penandaan merah guru (2), (3), dan (4)');
console.log('✔ Test 10 Lolos: Kunci jawaban merah Soal 19 (C) terdeteksi presisi');

// 11. Verifikasi Soal 33 (Tabel Jurnal Penerimaan Kas: Colspan/Rowspan, Kunci E, Bebas Asterisks)
const q33 = res.directQuestions[25];
assert.strictEqual(q33.kunci, 'E', 'Kunci Soal 33 harus E dari penandaan merah guru pada Tabel 44');
assert.ok(q33.opsi['E'].includes('colspan="2"'), 'Header Debet Soal 33 Opsi E harus memiliki colspan="2"');
assert.ok(q33.opsi['E'].includes('colspan="4"'), 'Header Kredit Soal 33 Opsi E harus memiliki colspan="4"');
assert.ok(q33.opsi['E'].includes('rowspan="3"'), 'Header Tgl & Uraian Soal 33 Opsi E harus memiliki rowspan="3"');
assert.strictEqual(q33.opsi['E'].includes('**'), false, 'Tabel Opsi E Soal 33 tidak boleh memuat tanda asterisks **');
console.log('✔ Test 11 Lolos: Tabel Jurnal Soal 33 (Option E) memiliki colspan/rowspan presisi, kunci E, dan bebas asterisks');

// 12. Verifikasi Global: 100% Seluruh Narasi Soal & Opsi Bebas dari Asterisks Mentah (**)
let globalAsterisksCount = 0;
res.directQuestions.forEach(q => {
  if (q.pertanyaan.includes('**')) globalAsterisksCount++;
  for (const v of Object.values(q.opsi || {})) {
    if (typeof v === 'string' && v.includes('**')) globalAsterisksCount++;
  }
});
assert.strictEqual(globalAsterisksCount, 0, `Tidak boleh ada sisa asterisks ** di narasi maupun opsi (ditemukan: ${globalAsterisksCount})`);
console.log('✔ Test 12 Lolos: Seluruh butir soal dan opsi 100% bersih dari tanda asterisks mentah (**)');

// 13. Verifikasi Soal 15 (ID 20): Pemisahan Opsi D dan Opsi E, Kunci Jawaban E, & Bebas Error 'Opsi Belum Diisi'
const q15 = res.directQuestions[14];
assert.strictEqual(q15.id, 20, 'Soal #15 harus memiliki ID asli dokumen 20');
assert.deepStrictEqual(Object.keys(q15.opsi).sort(), ['A', 'B', 'C', 'D', 'E'], 'Soal 15 harus memiliki opsi lengkap [A, B, C, D, E]');
assert.strictEqual(q15.kunci, 'E', 'Kunci Soal 15 harus E dari cetak tebal pembuat soal (**E** **.**)');
assert.ok(q15.opsi['D'].includes('<table class="afresto-exam-table"'), 'Opsi D Soal 15 harus memuat tabel buku besar');
assert.ok(q15.opsi['E'].includes('<table class="afresto-exam-table"'), 'Opsi E Soal 15 harus memuat tabel buku besar');
assert.strictEqual(q15.opsi['D'].includes('E . Nama Akun'), false, 'Opsi D tidak boleh menelan teks pembuka Opsi E');
assert.ok(q15.opsi['E'].includes('Nama Akun: Kas'), 'Opsi E harus diawali dengan Nama Akun: Kas');
console.log('✔ Test 13 Lolos: Soal 15 (ID 20) berhasil memisahkan Opsi D & E secara presisi, kunci E terdeteksi, dan siap injeksi ke Afresto');

console.log('\n========================================================');
console.log('⭐ VERIFIKASI QC EKONOMI: 100% TEST PASS (GRADE A+)');
console.log('========================================================');
