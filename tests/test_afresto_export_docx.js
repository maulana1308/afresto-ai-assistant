/**
 * Copyright (c) 2026 Maulana Ibrahim
 * Built by : Maulana Ibrahim
 */
import assert from 'assert';
import { convertDocumentXmlToText, parseQuestionsDirectly } from '../scripts/docx_parser.js';

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

// #7 Regresi PG_KOMPLEKS (#43, #44, #45): opsi diawali "Teks tersebut..." + "44. Tipe Soal: PILIHAN GANDA KOMPLEKS" + Word upperLetter numPr
function makeNumP(text, numId = '99', bold = false) {
  const bTag = bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r>${bTag}<w:t>${text}</w:t></w:r></w:p>`;
}
function makePlainP(text, bold = false) {
  const bTag = bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:p><w:r>${bTag}<w:t>${text}</w:t></w:r></w:p>`;
}
const pgkXml = `<w:document><w:body>
  ${makePlainP('43. Tipe Soal: PILIHAN GANDA KOMPLEKS')}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Bacalah teks berikut!')}
  ${makePlainP('Pernyataan yang sesuai dengan isi teks tersebut adalah ....')}
  ${makeNumP('Paragraf pertama berisi tesis tentang pentingnya literasi bagi pelajar.')}
  ${makeNumP('Paragraf kedua memuat argumen mengenai manfaat membaca.')}
  ${makeNumP('Teks tersebut termasuk teks narasi karena menceritakan pengalaman seorang pelajar.')}
  ${makeNumP('Penulis berpendapat bahwa literasi hanya berkaitan dengan kemampuan membaca dan menulis.')}
  ${makeNumP('Penyediaan bahan bacaan yang beragam merupakan salah satu upaya meningkatkan budaya literasi.')}
  ${makePlainP('KUNCI : A , B , E')}
  ${makePlainP('Pembahasan')}
  ${makePlainP('44. Tipe Soal: PILIHAN GANDA KOMPLEKS')}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Bacalah teks berikut!')}
  ${makePlainP('Pernyataan yang tepat mengenai kaidah kebahasaan teks tersebut adalah ....')}
  ${makeNumP('Kata oleh sebab itu merupakan konjungsi yang menunjukkan hubungan sebab-akibat.')}
  ${makeNumP('Kata harus menunjukkan modalitas yang menyatakan keharusan.')}
  ${makeNumP('Kata selain itu digunakan untuk menyatakan pertentangan antara dua gagasan.')}
  ${makeNumP('Kata sehingga menunjukkan hubungan akibat dari pernyataan sebelumnya.')}
  ${makeNumP('Teks tersebut didominasi kalimat langsung yang ditandai dengan tanda petik.')}
  ${makePlainP('KUNCI : A , B , D')}
  ${makePlainP('Pembahasan')}
  ${makePlainP('45. Tipe Soal: PILIHAN GANDA KOMPLEKS')}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Bacalah teks berikut!')}
  ${makePlainP('Pernyataan yang menunjukkan pemahaman kritis terhadap argumen teks tersebut adalah ....')}
  ${makeNumP('Gawai selalu memberikan dampak positif sehingga siswa bebas menggunakannya kapan saja.')}
  ${makeNumP('Penulis menyampaikan manfaat gawai sekaligus mengakui adanya risiko dalam penggunaannya.')}
  ${makeNumP('Argumen penulis menunjukkan bahwa penggunaan gawai perlu disertai pengawasan dan pengaturan.')}
  ${makeNumP('Teks tersebut tidak memiliki argumen karena hanya berisi pendapat pribadi tanpa penjelasan.')}
  ${makeNumP('Kesimpulan yang dapat ditarik adalah penggunaan gawai dalam pembelajaran perlu dilakukan secara bijaksana.')}
  ${makePlainP('KUNCI : B , C , E')}
  ${makePlainP('Pembahasan')}
</w:body></w:document>`;

const pgkNumbering = { '99': { 0: 'upperLetter' } };
const pgkConv = convertDocumentXmlToText(pgkXml, {}, pgkNumbering);
const pgkQs = parseQuestionsDirectly(pgkConv.text, {}, pgkConv.tables);
assert.strictEqual(pgkQs.length, 3, 'Harus terpisah menjadi 3 butir soal PG_KOMPLEKS (#43, #44, #45)');
assert.deepStrictEqual(pgkQs.map(q => q.id), [43, 44, 45]);
assert.deepStrictEqual(pgkQs.map(q => q.tipe), ['PG_KOMPLEKS', 'PG_KOMPLEKS', 'PG_KOMPLEKS']);
pgkQs.forEach((q, idx) => {
  assert.deepStrictEqual(Object.keys(q.opsi), ['A', 'B', 'C', 'D', 'E'], `Soal #${q.id} wajib memiliki lengkap 5 opsi A-E`);
  assert.ok(!/Tipe\s*Soal\s*:/i.test(q.pertanyaan), `Header Tipe Soal tidak boleh bocor ke pertanyaan #${q.id}`);
  assert.ok(!q.pertanyaan.includes('Teks tersebut'), `Opsi "Teks tersebut..." pada #${q.id} tidak boleh terpotong menjadi stimulus soal`);
});
assert.deepStrictEqual(pgkQs[0].kunci, ['A', 'B', 'E']);
assert.deepStrictEqual(pgkQs[1].kunci, ['A', 'B', 'D']);
assert.deepStrictEqual(pgkQs[2].kunci, ['B', 'C', 'E']);
console.log('✔ Test 7: Regresi 3 soal PG_KOMPLEKS ("Teks tersebut..." + "44. Tipe Soal" + upperLetter numPr) 100% terpisah & utuh A-E');

// #8 Regresi MENCOCOKKAN / MENCOCOKAN Afresto Legacy: 5 soal (#46-#50) dengan tabel Kiri/Kanan terpisah, blok Kanan floating, nested table, & bold tergabung
function makeTbl(rows) {
  return `<w:tbl>${rows.map(cells => `<w:tr>${cells.map(c => `<w:tc><w:p><w:r><w:t>${c}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
}
const matchingXml = `<w:document><w:body>
  ${makePlainP('46. Tipe Soal: MENCOCOKAN')}
  ${makePlainP('Pernyataan:')}
  ${makePlainP('Jodohkan pernyataan berikut!')}
  ${makePlainP('Pernyataan Kiri:')}
  ${makeTbl([['1', 'Bagian teks LHO pengenalan umum. Kunci : b'], ['2', 'Ciri teks LHO faktual. Kunci : a']])}
  ${makePlainP('Pembahasan')}
  ${makePlainP('47. Tipe Soal: MENCOCOKAN')}
  ${makePlainP('Pernyataan:')}
  ${makePlainP('Jodohkan pernyataan di bawah ini!')}
  ${makePlainP('Pernyataan Kiri:')}
  ${makeTbl([['1', 'Struktur eksposisi pendapat awal. Kunci : b'], ['2', 'Bagian eksposisi alasan dan fakta. Kunci : a']])}
  ${makePlainP('Pembahasan')}
  ${makePlainP('Pernyataan Kanan:')}
  ${makeTbl([['A', 'Bersifat objektif'], ['B', 'Pernyataan umum']])}
  ${makePlainP('Pernyataan Kanan:')}
  ${makeTbl([['A', 'Argumentasi'], ['B', 'Tesis']])}
  ${makePlainP('48. Tipe Soal: MENCOCOKAN')}
  ${makePlainP('Pernyataan:')}
  ${makePlainP('Jodohkan pernyataan di bawah ini!')}
  ${makePlainP('Pernyataan Kiri:')}
  ${makeTbl([['1', 'Tujuan utama teks eksposisi. Kunci : b'], ['2', 'Karakteristik kemustahilan hikayat. Kunci : a']])}
  ${makePlainP('Pembahasan')}
  ${makePlainP('49. Tipe Soal: MENCOCOKAN')}
  ${makePlainP('Pernyataan:')}
  ${makePlainP('Jodohkan pernyataan di bawah ini!')}
  ${makePlainP('Pernyataan Kiri:')}
  ${makePlainP('Pernyataan Kanan:')}
  ${makeTbl([['A', 'Terdapat kemustahilan'], ['B', 'Menguatkan pendapat dengan alasan dan bukti']])}
  ${makePlainP('Pernyataan Kanan:')}
  <w:p>
    <w:r><w:rPr><w:b/></w:rPr><w:t>1</w:t></w:r>
    <w:r><w:t> </w:t></w:r>
    <w:r><w:rPr><w:b/></w:rPr><w:t>Karakteristik hikayat istana sentris.|</w:t></w:r>
    <w:r><w:t> Kunci : a 2 Kata-kata kuno hikayat. Kunci : b </w:t></w:r>
    <w:r><w:rPr><w:b/></w:rPr><w:t>A</w:t></w:r>
    <w:r><w:t> </w:t></w:r>
    <w:r><w:rPr><w:b/></w:rPr><w:t>Istana sentris</w:t></w:r>
    <w:r><w:t> </w:t></w:r>
    <w:r><w:rPr><w:b/></w:rPr><w:t>B</w:t></w:r>
    <w:r><w:t> </w:t></w:r>
    <w:r><w:rPr><w:b/></w:rPr><w:t>Terdapat kemustahilan</w:t></w:r>
  </w:p>
  ${makePlainP('Pembahasan')}
  ${makePlainP('50. Tipe Soal: MENCOCOKAN')}
  ${makePlainP('Pernyataan:')}
  ${makePlainP('Jodohkan pernyataan di bawah ini!')}
  ${makePlainP('Pernyataan Kiri:')}
  ${makeTbl([['1', 'Bagian LHO rincian ciri objek. Kunci : b'], ['2', 'Penegasan kembali akhir eksposisi. Kunci : a']])}
  ${makePlainP('Pembahasan')}
  ${makePlainP('Pernyataan Kanan:')}
  ${makeTbl([['A', 'Penegasan ulang'], ['B', 'Deskripsi bagian']])}
</w:body></w:document>`;

const matchingConv = convertDocumentXmlToText(matchingXml, {}, {});
const matchingQs = parseQuestionsDirectly(matchingConv.text, {}, matchingConv.tables);
assert.strictEqual(matchingQs.length, 5, 'Harus mendeteksi tepat 5 soal MENCOCOKKAN (#46-#50)');
assert.deepStrictEqual(matchingQs.map(q => q.id), [46, 47, 48, 49, 50]);
matchingQs.forEach(q => {
  assert.strictEqual(q.tipe, 'MENCOCOKKAN', `Soal #${q.id} tidak boleh jatuh menjadi URAIAN`);
  assert.strictEqual(q.pasangan.length, 2, `Soal #${q.id} wajib punya 2 pasangan`);
  assert.ok(q.pasangan.every(p => p.kiri && p.kanan && p.kunci), `Semua kiri/kanan/kunci #${q.id} wajib terisi`);
});
assert.strictEqual(matchingQs[0].pasangan[0].kanan, 'Bersifat objektif');
assert.strictEqual(matchingQs[0].pasangan[1].kanan, 'Pernyataan umum');
assert.strictEqual(matchingQs[1].pasangan[0].kanan, 'Argumentasi');
assert.strictEqual(matchingQs[2].pasangan[0].kanan, 'Terdapat kemustahilan');
assert.strictEqual(matchingQs[2].pasangan[1].kanan, 'Menguatkan pendapat dengan alasan dan bukti');
assert.strictEqual(matchingQs[3].pasangan[0].kanan, 'Istana sentris');
assert.strictEqual(matchingQs[3].pasangan[1].kanan, 'Terdapat kemustahilan');
assert.strictEqual(matchingQs[3].kunci, '1-A, 2-B');
assert.strictEqual(matchingQs[4].pasangan[0].kanan, 'Penegasan ulang');
assert.strictEqual(matchingQs[4].pasangan[1].kanan, 'Deskripsi bagian');
assert.strictEqual(matchingQs[4].kunci, '1-B, 2-A');
console.log('✔ Test 8: Regresi 5 soal MENCOCOKKAN (blok Kanan floating, tabel nested/terpisah, & inline bold tergabung) 100% akurat');

// #9 Regresi penomoran Word multi-numId: numId="2" bersarang di dalam soal numId="1" tidak boleh menggeser nomor soal (50 tetap 50, bukan 51)
function makeNumPrP(text, numId, ilvl = 0) {
  return `<w:p><w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
}
const multiNumXml = `<w:document><w:body>
  ${makeNumPrP('Tipe Soal: PILIHAN GANDA', '1', 0)}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Soal pertama normal.')}
  ${makeNumPrP('Opsi A1', '1', 1)}
  ${makeNumPrP('Opsi B1', '1', 1)}
  ${makePlainP('KUNCI : A')}
  ${makePlainP('Pembahasan')}
  ${makeNumPrP('Tipe Soal: PILIHAN GANDA', '1', 0)}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Bacalah teks literasi berikut!')}
  ${makeNumPrP('Tujuan utama teks tersebut adalah ....', '2', 0)}
  ${makeNumPrP('Opsi A2', '2', 1)}
  ${makeNumPrP('Opsi B2', '2', 1)}
  ${makeNumPrP('Opsi C2', '2', 1)}
  ${makePlainP('KUNCI : C')}
  ${makePlainP('Pembahasan')}
  ${makeNumPrP('Tipe Soal: PILIHAN GANDA', '1', 0)}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Soal ketiga terakhir.')}
  ${makeNumPrP('Opsi A3', '1', 1)}
  ${makeNumPrP('Opsi B3', '1', 1)}
  ${makePlainP('KUNCI : B')}
  ${makePlainP('Pembahasan')}
</w:body></w:document>`;
const multiNumMap = {
  '1': { 0: 'decimal', 1: 'upperLetter' },
  '2': { 0: 'decimal', 1: 'upperLetter' }
};
const multiNumConv = convertDocumentXmlToText(multiNumXml, {}, multiNumMap);
const multiNumQs = parseQuestionsDirectly(multiNumConv.text, {}, multiNumConv.tables);
assert.strictEqual(multiNumQs.length, 3, 'Harus tetap terdeteksi tepat 3 soal (daftar numId=2 di dalam soal #2 tidak boleh membelah menjadi 4 soal)');
assert.deepStrictEqual(multiNumQs.map(q => q.id), [1, 2, 3], 'Penomoran #1, #2, #3 harus tetap urut sesuai numId=1');
assert.deepStrictEqual(Object.keys(multiNumQs[1].opsi), ['A', 'B', 'C'], 'Soal #2 tetap wajib memiliki opsi A-C lengkap');
assert.strictEqual(multiNumQs[1].kunci, 'C');
console.log('✔ Test 9: Regresi daftar bersarang numId=2 di dalam numId=1 (jumlah & penomoran soal tetap presisi)');

console.log('\n⭐ SEMUA TEST AFRESTO EXPORT FORMAT 100% PASS!');
