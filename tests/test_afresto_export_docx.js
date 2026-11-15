import assert from 'assert';
import { parseQuestionsDirectly } from '../scripts/docx_parser.js';

console.log('=== TEST SUITE: AFRESTO EXPORT FORMAT (PG KOMPLEKS & BENAR/SALAH) ===');

const sample = `
32. Tipe Soal: PILIHAN GANDA
Pertanyaan:
Makna kata literasi pada paragraf di atas adalah . . .
A. membaca\tD. menulis
B. berhitung\tE. perpustakaan KUNCI : A
Pembahasan

41. Tipe Soal: PILIHAN GANDA KOMPLEKS
Pertanyaan:
**Bacalah kutipan berikut!**
Aku menatap lembaran kosong...
Watak Aku dalam kutipan di atas adalah . . .
A. Sombong dan percaya diri\tD. ragu-ragu dalam bersikap
B. Pemalas dan tidak peduli\tE. Ceria dan periang
C. Tidak percaya diri
**KUNCI** : C , D
Pembahasan

42. Tipe Soal: PILIHAN GANDA KOMPLEKS
Pertanyaan:
Latar suasana yang dominan dalam kutipan adalah . . . .
A. meresahkan\tD. penuh keraguan
B. Romantis dan bahagia\tE. mengecewakan
C. menggelikan KUNCI : A , D
Pembahasan

43. Tipe Soal: PILIHAN GANDA KOMPLEKS
Pertanyaan:
Ciri-ciri kebahasaan Teks Laporan Hasil Observasi (LHO) yang benar adalah\t(Pilih 3)
A. Menggunakan kalimat definisi
B. Menggunakan kata ganti orang pertama
C. Menggunakan istilah ilmiah
D. Menggunakan kalimat deskripsi
E. Menggunakan bahasa emotif
KUNCI : A , C , D
Pembahasan

Tipe Soal: PILIHAN GANDA KOMPLEKS
Pertanyaan:
Yang termasuk kalimat aktif transitif adalah . . . .
A. Kedua anak itu bersepeda dengan santai
B. Mereka membeli nasi goreng di kantin sekolah.
C. Dinda menuliskan namanya di meja tulisnya.
D. Sudah lama mereka pergi.
E. Siapa namamu?
KUNCI : B
Pembahasan

46. Tipe Soal: BENAR / SALAH Pernyataan:
Kalimat berikut yang termasuk kalimat aktif transitif adalah . . . .
[GAMBAR_EMBED: rId10]
`;

const qs = parseQuestionsDirectly(sample, { rId10: 'data:image/png;base64,AAA' }, []);

assert.strictEqual(qs.length, 6, 'Harus mendeteksi tepat 6 butir soal (termasuk blok Tipe Soal tanpa nomor)');

// #1 (soal 32)
assert.strictEqual(qs[0].tipe, 'PG');
assert.strictEqual(qs[0].kunci, 'A');
assert.strictEqual(qs[0].opsi.E, 'perpustakaan', 'Kunci inline di akhir opsi E harus dipisahkan bersih');
assert.deepStrictEqual(Object.keys(qs[0].opsi), ['A', 'B', 'C', 'D', 'E'].filter(k => qs[0].opsi[k] !== undefined), 'Urutan kunci opsi harus alfabetis A,B,D,E');
assert.ok(!/Tipe Soal:|Pertanyaan:|Pembahasan/i.test(qs[0].pertanyaan), 'Metadata label tidak boleh bocor ke teks pertanyaan');
console.log('✔ Test 1: Inline KUNCI pada opsi 2-kolom & pembersihan label Tipe Soal/Pertanyaan/Pembahasan terverifikasi');

// #2 (soal 41)
assert.strictEqual(qs[1].tipe, 'PG_KOMPLEKS');
assert.deepStrictEqual(qs[1].kunci, ['C', 'D']);
assert.deepStrictEqual(Object.keys(qs[1].opsi), ['A', 'B', 'C', 'D', 'E'], 'Opsi 2-kolom harus terurut A-E');
console.log('✔ Test 2: **KUNCI** : C , D + 2-kolom terurut A-E terdeteksi sebagai PG_KOMPLEKS');

// #3 (soal 42)
assert.strictEqual(qs[2].tipe, 'PG_KOMPLEKS');
assert.deepStrictEqual(qs[2].kunci, ['A', 'D']);
assert.strictEqual(qs[2].opsi.C, 'menggelikan', 'Opsi C harus bersih dari KUNCI : A , D');
assert.strictEqual(qs[2].opsi.E, 'mengecewakan', 'Opsi E harus bersih dari Pembahasan');
console.log('✔ Test 3: Inline KUNCI : A , D di ujung opsi PG Kompleks & Pembahasan tanpa titik dua bersih');

// #4 (soal 43)
assert.strictEqual(qs[3].tipe, 'PG_KOMPLEKS');
assert.deepStrictEqual(qs[3].kunci, ['A', 'C', 'D']);
assert.ok(qs[3].pertanyaan.includes('(Pilih 3)'), 'Instruksi (Pilih 3) tidak boleh terhapus oleh regex kunci kurung');
console.log('✔ Test 4: Instruksi (Pilih 3) tetap utuh pada soal PG_KOMPLEKS');

// #5 (unnumbered Tipe Soal: PILIHAN GANDA KOMPLEKS dengan kunci tunggal)
assert.strictEqual(qs[4].tipe, 'PG_KOMPLEKS');
assert.deepStrictEqual(qs[4].kunci, ['B'], 'Tipe Soal PG Kompleks berkunci 1 huruf harus tetap PG_KOMPLEKS dengan array kunci');
console.log('✔ Test 5: Blok Tipe Soal tanpa nomor + kunci tunggal pada PG Kompleks terdeteksi akurat');

// #6 (soal 46 BENAR/SALAH dengan gambar tersemat)
assert.strictEqual(qs[5].tipe, 'BENAR_SALAH', 'Tipe Soal: BENAR / SALAH dengan pernyataan di gambar wajib diklasifikasikan BENAR_SALAH, bukan URAIAN');
assert.deepStrictEqual(qs[5].kunci, {}, 'Kunci Benar/Salah kosong jika pernyataan berada di dalam gambar (bukan Rubrik: A)');
assert.deepStrictEqual(qs[5].opsi, {});
assert.strictEqual(qs[5].gambar_base64, 'data:image/png;base64,AAA');
console.log('✔ Test 6: Tipe Soal: BENAR / SALAH dengan pernyataan screenshot tidak turun menjadi URAIAN/Rubrik: A');

console.log('\n⭐ SEMUA TEST AFRESTO EXPORT FORMAT 100% PASS!');
