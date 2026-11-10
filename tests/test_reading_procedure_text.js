/**
 * ANS QC AUDIT SUITE: VERIFIKASI NASKAH BACAAN & PROSEDUR (READING PROCEDURE TEXT)
 * Mencegah inflasi butir soal akibat langkah resep bernomor (1..N) di dalam stimulus.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parseDocx } from '../scripts/docx_parser.js';

console.log('=== ANS QC AUDIT: VERIFIKASI READING PROCEDURE TEXT ===');

const docxPath = 'C:/Users/maula/.gemini/antigravity/brain/65a63ff4-d55a-4f07-bad2-3379b5a10f8a/.user_uploaded/media_1793877400475_1e0622ff.docx';

if (!fs.existsSync(docxPath)) {
  console.log('⚠ File media_1793877400475_1e0622ff.docx tidak ditemukan, skipping test.');
  process.exit(0);
}

const buffer = fs.readFileSync(docxPath);
const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const res = await parseDocx(ab);

// 1. Tepat 10 Butir Soal Terdeteksi (Bukan 25 Butir!)
assert.strictEqual(res.directQuestions.length, 10, `Harus terdeteksi tepat 10 butir soal, aktual: ${res.directQuestions.length}`);
console.log('✔ Test 1 Lolos: Tepat 10 butir soal terdeteksi (bebas dari inflasi 25 butir)');

// 2. Seluruh 10 Butir Berjenis PG dengan Opsi Lengkap A-E
res.directQuestions.forEach((q, idx) => {
  assert.strictEqual(q.tipe, 'PG', `Soal #${idx + 1} harus bertipe PG (aktual: ${q.tipe})`);
  const optKeys = Object.keys(q.opsi || {});
  assert.strictEqual(optKeys.length, 5, `Soal #${idx + 1} harus memiliki 5 opsi [A,B,C,D,E] (aktual: ${optKeys.length})`);
  assert.deepStrictEqual(optKeys.sort(), ['A', 'B', 'C', 'D', 'E'], `Soal #${idx + 1} opsi harus lengkap [A,B,C,D,E]`);
});
console.log('✔ Test 2 Lolos: Seluruh 10 butir berjenis PG dengan opsi lengkap [A,B,C,D,E]');

// 3. Verifikasi Stimulus Bacaan 1 Melekat pada Soal 1
const q1 = res.directQuestions[0];
assert.ok(q1.pertanyaan.includes('TEXT 1 – HOW TO MAKE A VEGETABLE OMELET'), 'Soal 1 harus memuat teks bacaan 1');
assert.ok(q1.pertanyaan.includes('Ingredients:'), 'Soal 1 harus memuat bahan (Ingredients)');
assert.ok(q1.pertanyaan.includes('Steps:'), 'Soal 1 harus memuat tahapan (Steps)');
assert.ok(q1.pertanyaan.includes('What is the purpose of the text?'), 'Soal 1 harus memuat pertanyaan inti');
console.log('✔ Test 3 Lolos: Stimulus Bacaan 1 (Heading, Bahan, & Langkah) melekat utuh pada Soal 1');

// 4. Verifikasi Stimulus Bacaan 2 Melekat pada Soal 6
const q6 = res.directQuestions[5];
assert.ok(q6.pertanyaan.includes('TEXT 2 – HOW TO MAKE A FRESH FRUIT SALAD'), 'Soal 6 harus memuat teks bacaan 2');
assert.ok(q6.pertanyaan.includes('Ingredients:'), 'Soal 6 harus memuat bahan (Ingredients)');
assert.ok(q6.pertanyaan.includes('Steps:'), 'Soal 6 harus memuat tahapan (Steps)');
assert.ok(q6.pertanyaan.includes('What is the main purpose of the procedure?'), 'Soal 6 harus memuat pertanyaan inti');
console.log('✔ Test 4 Lolos: Stimulus Bacaan 2 (Heading, Bahan, & Langkah) melekat utuh pada Soal 6');

// 5. Verifikasi Kunci Jawaban Resmi dari Blok ANSWER KEY
const expectedKeys = ['A', 'B', 'C', 'C', 'C', 'A', 'D', 'C', 'C', 'B'];
res.directQuestions.forEach((q, idx) => {
  assert.strictEqual(q.kunci, expectedKeys[idx], `Kunci Soal #${idx + 1} harus ${expectedKeys[idx]} (aktual: ${q.kunci})`);
});
console.log('✔ Test 5 Lolos: Kunci jawaban 1-10 100% cocok dengan daftar ANSWER KEY di naskah [A, B, C, C, C, A, D, C, C, B]');

// 6. Verifikasi Kerapian Format Multi-baris Stimulus & Pemisah Kalimat Soal
assert.ok(q1.pertanyaan.includes('\n\n• Ingredients:'), 'Harus ada baris kosong pemisah sebelum blok Ingredients');
assert.ok(q1.pertanyaan.includes('\n\n• Steps:'), 'Harus ada baris kosong pemisah sebelum blok Steps');
assert.ok(q1.pertanyaan.includes('\n\n<b>What is the purpose of the text?</b>') || q1.pertanyaan.includes('\n\nWhat is the purpose of the text?'), 'Harus ada baris kosong pemisah antara teks stimulus dan pertanyaan inti');
console.log('✔ Test 6 Lolos: Format tata letak multi-baris stimulus & pemisah pertanyaan 100% rapi dan presisi');

console.log('\n========================================================');
console.log('⭐ VERIFIKASI QC READING PROCEDURE TEXT: 100% PASS (GRADE A+)');
console.log('========================================================\n');
