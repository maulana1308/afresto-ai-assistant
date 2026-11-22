/**
 * Copyright (c) 2026 Maulana Ibrahim
 * Built by : Maulana Ibrahim
 */
import assert from 'assert';
import { convertDocumentXmlToText, parseDocxRelationships, parseQuestionsDirectly } from '../scripts/docx_parser.js';

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

// #10 Regresi BENAR/SALAH format Afresto Legacy ("Pernyataan: ... Hasil Pernyataan : BENAR/SALAH", 5 pernyataan, Pembahasan tanpa titik dua) + Pembahasan PG diawali "D."
const ekonomiBsSample = `
Tipe Soal: PILIHAN GANDA
Pertanyaan:
Suatu wilayah memiliki tingkat pengangguran rendah...
A. Opsi A asli
B. Opsi B asli
C. Opsi C asli
D. Opsi D singkat asli
E. Opsi E asli
KUNCI : D
Pembahasan
D. Penjelasan panjang untuk opsi D agar tidak menimpa opsi D
Tipe Soal: BENAR / SALAH Pernyataan:
Literasi ekonomi dan keuangan digital
| Pernyataan:  Biaya peluang adalah nilai alternatif terbaik yang dikorbankan ketika memilih suatu tindakan  Hasil Pernyataan : BENAR   |
| Pernyataan:  Kenaikan harga barang selalu meningkatkan daya beli masyarakat  Hasil Pernyataan : SALAH   |
| Pernyataan:  Kode OTP boleh diberikan kepada orang lain jika mengaku sebagai petugas bank  Hasil Pernyataan : SALAH   |
| Pernyataan:  Anggaran keuangan membantu seseorang mengendalikan pengeluaran sesuai prioritas  Hasil Pernyataan : BENAR   |
| Pernyataan:  Omzet usaha selalu sama dengan laba bersih usaha  Hasil Pernyataan : SALAH   |
Pembahasan Penyataan 1 : Benar Penyataan 2 : Salah Penyataan 3 : Salah Penyataan 4 : Benar Penyataan 5 : Salah
Tipe Soal: BENAR / SALAH Pernyataan:
Badan usaha, manajemen, dan koperasi
Pernyataan: Perencanaan mencakup penentuan tujuan Hasil Pernyataan : BENAR
Pernyataan: Pengawasan membandingkan hasil dengan standar Hasil
Pernyataan : BENAR
Pernyataan: Kekuasaan koperasi ditentukan modal Hasil Pernyataan : SALAH
Pembahasan Pernyataan 1 : Benar Pernyataan 2 : Benar Pernyataan 3 : Salah
`;
const ekoQs = parseQuestionsDirectly(ekonomiBsSample, {}, []);
assert.strictEqual(ekoQs.length, 3);
assert.strictEqual(ekoQs[0].opsi.D, 'Opsi D singkat asli', 'Pembahasan berawalan "D." tidak boleh menimpa opsi D');
assert.strictEqual(ekoQs[1].tipe, 'BENAR_SALAH');
assert.strictEqual(ekoQs[1].pertanyaan, 'Literasi ekonomi dan keuangan digital', 'Pernyataan B/S dan Pembahasan Penyataan tidak boleh bocor ke stem');
assert.deepStrictEqual(Object.keys(ekoQs[1].opsi), ['A', 'B', 'C', 'D', 'E']);
assert.strictEqual(ekoQs[1].opsi.A, 'Biaya peluang adalah nilai alternatif terbaik yang dikorbankan ketika memilih suatu tindakan');
assert.deepStrictEqual(ekoQs[1].kunci, { A: 'Benar', B: 'Salah', C: 'Salah', D: 'Benar', E: 'Salah' });
assert.strictEqual(ekoQs[2].tipe, 'BENAR_SALAH');
assert.deepStrictEqual(Object.keys(ekoQs[2].opsi), ['A', 'B', 'C']);
assert.deepStrictEqual(ekoQs[2].kunci, { A: 'Benar', B: 'Benar', C: 'Salah' });
console.log('✔ Test 10: Regresi BENAR/SALAH format Afresto Legacy ("Hasil Pernyataan : BENAR/SALAH", 5 pernyataan, baris terpotong, & Pembahasan "D.") 100% akurat');

// #11 Regresi BENAR/SALAH dengan >1 gambar tersemat & kunci fallback dari Pembahasan Penyataan 1..4
const multiImgBsSample = `
Tipe Soal: BENAR / SALAH Pernyataan:
Perhatikan dua tabel gambar berikut!
[GAMBAR_EMBED: rId10]
[GAMBAR_EMBED: rId11]
Pembahasan Penyataan 1 : Benar Penyataan 2 : Salah Penyataan 3 : Benar Penyataan 4 : Salah
`;
const multiImgQs = parseQuestionsDirectly(multiImgBsSample, { rId10: 'data:image/png;base64,AAA', rId11: 'data:image/png;base64,BBB' }, []);
assert.strictEqual(multiImgQs.length, 1);
assert.strictEqual(multiImgQs[0].tipe, 'BENAR_SALAH');
assert.deepStrictEqual(multiImgQs[0].gambar_list, ['data:image/png;base64,AAA', 'data:image/png;base64,BBB']);
assert.deepStrictEqual(multiImgQs[0].kunci, { A: 'Benar', B: 'Salah', C: 'Benar', D: 'Salah' });
console.log('✔ Test 11: Regresi BENAR/SALAH multi-gambar (>1 gambar dalam 1 soal) & kunci Pembahasan terverifikasi');

// #12 Regresi soal PG bergambar di batang soal (#1 PCl3) + bergambar di opsi A-E (#2 NH3) + trailing A.
function makeImgP(rId) {
  return `<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="${rId}"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}
function makeNumOptWithImgP(text, rId, numId = '99') {
  return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="${rId}"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}
const kimImgXml = `<w:document><w:body>
  ${makePlainP('1. Tipe Soal: PILIHAN GANDA')}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Perhatikan gambar bentuk molekul senyawa PCl3 di bawah ini !')}
  ${makeImgP('rId10')}
  ${makePlainP('Jumlah DEB dan DEI berturut-turut adalah ... .')}
  ${makeNumP('1 dan 3\tD. 3 dan 2', '99')}
  ${makeNumP('2 dan 3\tE. 4 dan 3', '99')}
  ${makeNumP('3 dan 1', '99')}
  ${makePlainP('KUNCI : A')}
  ${makePlainP('Pembahasan')}
  ${makePlainP('2. Tipe Soal: PILIHAN GANDA')}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Senyawa amoniak NH3 memiliki elektron valensi 5 dan 1.')}
  ${makeImgP('rId11')}
  ${makePlainP('Bentuk molekul senyawa amonia adalah ... . A.')}
  ${makeImgP('rId12')}
  ${makeNumOptWithImgP('', 'rId13', '98')}
  ${makeNumOptWithImgP('', 'rId14', '98')}
  ${makeNumOptWithImgP('', 'rId15', '98')}
  ${makeNumOptWithImgP('', 'rId16', '98')}
  ${makePlainP('KUNCI : D')}
  ${makePlainP('Pembahasan')}
</w:body></w:document>`;
const kimImgs = {
  rId10: 'data:image/png;base64,IMG10',
  rId11: 'data:image/png;base64,IMG11',
  rId12: 'data:image/png;base64,IMG12',
  rId13: 'data:image/png;base64,IMG13',
  rId14: 'data:image/png;base64,IMG14',
  rId15: 'data:image/png;base64,IMG15',
  rId16: 'data:image/png;base64,IMG16'
};
const kimConv = convertDocumentXmlToText(kimImgXml, kimImgs, { '98': { 0: 'upperLetter' }, '99': { 0: 'upperLetter' } });
const kimQs = parseQuestionsDirectly(kimConv.text, kimImgs, kimConv.tables);
assert.strictEqual(kimQs.length, 2);
assert.strictEqual(kimQs[0].gambar_base64, 'data:image/png;base64,IMG10', 'Soal #1 harus menyimpan gambar PCl3');
assert.strictEqual(kimQs[0].kunci, 'A');
assert.strictEqual(kimQs[1].gambar_base64, 'data:image/png;base64,IMG11', 'Soal #2 harus menyimpan gambar NH3 di stem');
assert.ok(!kimQs[1].pertanyaan.endsWith('A.'), 'Trailing A. di akhir pertanyaan tidak boleh tertinggal');
assert.deepStrictEqual(Object.keys(kimQs[1].opsi), ['A', 'B', 'C', 'D', 'E']);
['A', 'B', 'C', 'D', 'E'].forEach((l, i) => {
  assert.ok(kimQs[1].opsi[l].includes(`data:image/png;base64,IMG${12 + i}`), `Opsi ${l} harus memuat gambar opsi masing-masing`);
});
assert.ok(!kimQs[1].gambar_list, 'Gambar opsi A-E tidak boleh bocor masuk ke gambar stem soal #2');
assert.strictEqual(kimQs[1].kunci, 'D');
console.log('✔ Test 12: Regresi PG bergambar di stem (#1) dan gambar di setiap opsi A-E (#2) 100% akurat');

// #13 Regresi multi-gambar stem (#11 5 gambar) + o:relid VML + Target sebelum Id di rels + B/S tabel rumus gambar (#38)
const relMapSwapped = parseDocxRelationships(`<Relationships><Relationship Target="media/eq1.png" Id="rId21"/><Relationship Id="rId22" Target="word/media/eq2.png"/></Relationships>`);
assert.strictEqual(relMapSwapped.rId21, 'word/media/eq1.png');
assert.strictEqual(relMapSwapped.rId22, 'word/media/eq2.png');

const vmlXml = `<w:document><w:body>
  ${makePlainP('1. Tipe Soal: BENAR / SALAH Pernyataan:')}
  ${makePlainP('Diketahui entalpi beberapa zat:')}
  <w:p><w:r><w:pict><v:shape><v:imagedata o:relid="rId21"/></v:shape></w:pict></w:r></w:p>
  ${makePlainP('Untuk pembakaran sempurna 1 mol gas propana:')}
  ${makeImgP('rId22')}
  <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Pernyataan: Rumus:</w:t></w:r><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rId21"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r><w:r><w:t>Hasil Pernyataan : BENAR</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Pernyataan: Nilai dH O2 adalah 0 Hasil Pernyataan : BENAR</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
  ${makePlainP('Pembahasan')}
</w:body></w:document>`;
const vmlImgs = { rId21: 'data:image/png;base64,EQ1', rId22: 'data:image/png;base64,EQ2' };
const vmlConv = convertDocumentXmlToText(vmlXml, vmlImgs, {});
const vmlQs = parseQuestionsDirectly(vmlConv.text, vmlImgs, vmlConv.tables);
assert.strictEqual(vmlQs.length, 1);
assert.deepStrictEqual(vmlQs[0].gambar_list, ['data:image/png;base64,EQ1', 'data:image/png;base64,EQ2'], 'VML o:relid & drawing di B/S harus terbaca keduanya');
assert.ok(vmlQs[0].opsi.A.includes('data:image/png;base64,EQ1'), 'Gambar rumus di dalam tabel B/S harus ikut tersimpan ke opsi.A');
assert.deepStrictEqual(vmlQs[0].kunci, { A: 'Benar', B: 'Benar' });
console.log('✔ Test 13: Regresi VML o:relid, urutan atribut rels, multi-gambar stem, & gambar dalam tabel B/S 100% pass');

// #14 Regresi naskah Ekonomi/Akuntansi: nested <mc:Fallback> + <w:txbxContent> + baris dobel verbatim (#1) + opsi kombinasi 1) dan 3) (#4) + tabel opsi 4-kolom (#16)
const akuntansiXml = `<w:document><w:body>
  ${makePlainP('1. Tipe Soal: PILIHAN GANDA')}
  ${makePlainP('Pertanyaan:')}
  <w:p><w:r><w:t>Bidang akuntansi yang mengkhususkan diri pada pemeriksaan catatan akuntansi secara bebas</w:t></w:r><mc:AlternateContent><mc:Choice><w:drawing><wp:inline><a:graphic/></wp:inline></w:drawing></mc:Choice><mc:Fallback><mc:AlternateContent><mc:Choice><w:t> </w:t></mc:Choice><mc:Fallback><w:t>DUP</w:t></mc:Fallback></mc:AlternateContent><w:t>Bidang akuntansi yang mengkhususkan diri pada pemeriksaan catatan akuntansi secara bebas</w:t></mc:Fallback></mc:AlternateContent></w:p>
  ${makeNumP('sistem akuntansi\tD. akuntansi manajemen', '91')}
  ${makeNumP('akuntansi keuangan\tE. akuntansi pemeriksaan', '91')}
  ${makeNumP('akuntansi perpajakan', '91')}
  ${makePlainP('KUNCI : E')}
  ${makePlainP('Pembahasan')}
  ${makePlainP('2. Tipe Soal: PILIHAN GANDA')}
  ${makePlainP('Pertanyaan:')}
  <w:p><w:r><w:txbxContent><w:p><w:r><w:t>Berikut adalah nama akun di catatan Barokah:</w:t></w:r></w:p><w:p><w:r><w:t>Yang termasuk akun riil adalah .....</w:t></w:r></w:p></w:txbxContent></w:r></w:p>
  ${makeNumP('1) dan 3)\tD. 3) dan 5)', '92')}
  ${makeNumP('2) dan 4)\tE. 4) dan 5)', '92')}
  ${makeNumP('2) dan 5)', '92')}
  ${makePlainP('KUNCI : C')}
  ${makePlainP('Pembahasan')}
  ${makePlainP('3. Tipe Soal: PILIHAN GANDA')}
  ${makePlainP('Pertanyaan:')}
  ${makePlainP('Besarnya modal awal Sat Set adalah ....')}
  ${makeTbl([['A. Rp.', '120.200.000', 'D. Rp.', '267.300.000'], ['B. Rp.', '122.700.000', 'E. Rp.', '269.800.000'], ['C. Rp.', '125.200.000', '', '']])}
  ${makePlainP('KUNCI : C')}
  ${makePlainP('Pembahasan')}
</w:body></w:document>`;
const akuntansiConv = convertDocumentXmlToText(akuntansiXml, {}, { '91': { 0: 'upperLetter' }, '92': { 0: 'upperLetter' } });
const akuntansiQs = parseQuestionsDirectly(akuntansiConv.text, {}, akuntansiConv.tables);
assert.strictEqual(akuntansiQs.length, 3, 'Harus mendeteksi tepat 3 soal akuntansi tanpa terpecah oleh 1) dan 3)');
assert.ok(!akuntansiQs[0].pertanyaan.includes('DUP'), 'Nested mc:Fallback tidak boleh bocor');
assert.strictEqual(akuntansiQs[0].pertanyaan, 'Bidang akuntansi yang mengkhususkan diri pada pemeriksaan catatan akuntansi secara bebas', 'Teks dobel Soal #1 wajib terdeduplikasi');
assert.strictEqual(akuntansiQs[1].opsi.A, '1) dan 3)', 'Opsi kombinasi angka 1) dan 3) tidak boleh menggeser nomor soal');
assert.strictEqual(akuntansiQs[1].opsi.E, '4) dan 5)');
assert.strictEqual(akuntansiQs[1].kunci, 'C');
assert.deepStrictEqual(Object.keys(akuntansiQs[2].opsi), ['A', 'B', 'C', 'D', 'E']);
assert.strictEqual(akuntansiQs[2].opsi.A, 'Rp. 120.200.000', 'Tabel opsi 4-kolom harus terekstrak rapi tanpa |');
assert.strictEqual(akuntansiQs[2].opsi.C, 'Rp. 125.200.000');
assert.strictEqual(akuntansiQs[2].opsi.E, 'Rp. 269.800.000');
assert.ok(!akuntansiQs[2].pertanyaan.includes('<table'), 'Tabel opsi 4-kolom tidak boleh bocor ke pertanyaan');
console.log('✔ Test 14: Regresi nested mc:Fallback, txbxContent, baris dobel #1, opsi 1) dan 3), & tabel opsi 4-kolom #16 100% pass');

// #15 Regresi BENAR/SALAH Akuntansi: pernyataan menempel+duplikat (#36, #39), & pernyataan 1 gambar + pernyataan 2 multi-baris (#37)
const bsAkuntansiText = `
Tipe Soal: BENAR / SALAH Pernyataan:
Tentukan pernyataan di bawah ini benar atau salah
Pernyataan:Harta yang masa manfaatnya lebih dari setahun disebut harta tetap.Hasil Pernyataan : BENARPernyataan:Harta yang masa manfaatnya lebih dari setahun disebut harta tetap.Hasil Pernyataan : BENAR
Pernyataan:Tagihan perusahaan terhadap pihak lain disebut utang.Hasil Pernyataan : SALAHPernyataan:Tagihan perusahaan terhadap pihak lain disebut utang.Hasil Pernyataan : SALAH
Pembahasan

Tipe Soal: BENAR / SALAH Pernyataan:
Pernyataan:Akuntansi penting bagi masyarakat, pihak intern adalah investor.Hasil Pernyataan : SALAHPernyataan:Laporan keuangan harus relevan.Hasil Pernyataan : BENARPernyataan:Akuntansi penting bagi masyarakat, pihak intern adalah investor.Hasil Pernyataan : SALAHPernyataan:Laporan keuangan harus relevan.Hasil Pernyataan : BENARTentukan benar atau salah pernyataan di bawah ini!
Pembahasan

Tipe Soal: BENAR / SALAH Pernyataan:
[GAMBAR_EMBED: rId37]
Hasil Pernyataan : BENAR
Pernyataan:
Pernyataan:
Pembelian perlengkapan sebesar Rp. 500.000, dibayar minggu depan.
Hasil Pernyataan : SALAH
Hasil Pernyataan : BENAR
Pernyataan:
Pernyataan:
Pembelian perlengkapan sebesar Rp. 500.000, dibayar minggu depan.
Hasil Pernyataan : SALAH
Analisalah pernyataan tentang pencatatan transaksi di bawah ini, tentukan benar atau salah
Pembahasan
`;
const bsAkQs = parseQuestionsDirectly(bsAkuntansiText, { rId37: 'data:image/png;base64,IMG37' }, []);
assert.strictEqual(bsAkQs.length, 3);
assert.strictEqual(bsAkQs[0].tipe, 'BENAR_SALAH');
assert.deepStrictEqual(Object.keys(bsAkQs[0].opsi), ['A', 'B']);
assert.strictEqual(bsAkQs[0].opsi.A, 'Harta yang masa manfaatnya lebih dari setahun disebut harta tetap.');
assert.strictEqual(bsAkQs[0].opsi.B, 'Tagihan perusahaan terhadap pihak lain disebut utang.');
assert.deepStrictEqual(bsAkQs[0].kunci, { A: 'Benar', B: 'Salah' });
assert.strictEqual(bsAkQs[0].pertanyaan, 'Tentukan pernyataan di bawah ini benar atau salah');

assert.strictEqual(bsAkQs[1].tipe, 'BENAR_SALAH');
assert.deepStrictEqual(Object.keys(bsAkQs[1].opsi), ['A', 'B']);
assert.deepStrictEqual(bsAkQs[1].kunci, { A: 'Salah', B: 'Benar' });
assert.strictEqual(bsAkQs[1].pertanyaan, 'Tentukan benar atau salah pernyataan di bawah ini!');

assert.strictEqual(bsAkQs[2].tipe, 'BENAR_SALAH');
assert.deepStrictEqual(Object.keys(bsAkQs[2].opsi), ['A', 'B']);
assert.ok(bsAkQs[2].opsi.A.includes('data:image/png;base64,IMG37'), 'Pernyataan 1 gambar harus masuk ke opsi.A');
assert.strictEqual(bsAkQs[2].opsi.B, 'Pembelian perlengkapan sebesar Rp. 500.000, dibayar minggu depan.');
assert.deepStrictEqual(bsAkQs[2].kunci, { A: 'Benar', B: 'Salah' });
assert.strictEqual(bsAkQs[2].pertanyaan, 'Analisalah pernyataan tentang pencatatan transaksi di bawah ini, tentukan benar atau salah');
assert.ok(!bsAkQs[2].gambar_base64, 'Gambar pernyataan A tidak boleh tampil dobel sebagai gambar stem');
console.log('✔ Test 15: Regresi BENAR/SALAH akuntansi menempel+duplikat (#36, #39) & campuran gambar+teks (#37) 100% pass');

// #16 Regresi grup gambar opsi (<wpg:wgp>), gambar tinggi 2x terbelah (B+C, D+E), & Pembahasan menempel pada paragraf B/S (#7, #8, #19, #21, #34, #40)
function makeAnchorPic(rId, { posH = 931494, cx = 4600000, cy = 800000 } = {}) {
  return `<w:drawing><wp:anchor><wp:positionH relativeFrom="page"><wp:posOffset>${posH}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><a:graphic><a:graphicData><pic:pic><pic:nvPicPr/><pic:blipFill><a:blip r:embed="${rId}"/></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing>`;
}
function makeWpgGroup(posH, cx, cy, bodyXml) {
  return `<w:drawing><wp:anchor><wp:positionH relativeFrom="page"><wp:posOffset>${posH}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><a:graphic><a:graphicData><wpg:wgp>${bodyXml}</wpg:wgp></a:graphicData></a:graphic></wp:anchor></w:drawing>`;
}
function makePicNode(rId, x, y, cx, cy) {
  return `<pic:pic><pic:nvPicPr/><pic:blipFill><a:blip r:embed="${rId}"/></pic:blipFill><pic:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></pic:spPr></pic:pic>`;
}
function makeWspLabel(text, x, y) {
  return `<wps:wsp><wps:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="120000" cy="130000"/></a:xfrm></wps:spPr><wps:txbx><w:txbxContent><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:txbxContent></wps:txbx></wps:wsp>`;
}
const ecoImgXml = `<w:document><w:body>
  ${makePlainP('1. Tipe Soal: PILIHAN GANDA')}
  ${makePlainP('Pertanyaan:')}
  <w:p><w:r><w:t>Pencatatan bukti transaksi Salon Menik adalah .....</w:t></w:r><w:r>${makeWpgGroup(931494, 4800000, 4170000,
    makePicNode('rId101', 0, 0, 4660000, 800000) +
    makePicNode('rId102', 0, 800000, 4660000, 800000) +
    makePicNode('rId103', 0, 1600000, 4660000, 800000) +
    makePicNode('rId104', 0, 2400000, 4660000, 800000) +
    makePicNode('rId105', 0, 3200000, 4660000, 800000)
  )}</w:r></w:p>
  ${makePlainP('A.')}${makePlainP('B.')}${makePlainP('C.')}${makePlainP('D.')}${makePlainP('E.')}
  ${makePlainP('KUNCI : B')}
  ${makePlainP('Pembahasan')}

  ${makePlainP('2. Tipe Soal: PILIHAN GANDA')}
  ${makePlainP('Pertanyaan:')}
  <w:p><w:r>${makeAnchorPic('rId200', { posH: 814055, cx: 5356000, cy: 2569000 })}</w:r></w:p>
  <w:p><w:r><w:t>A.</w:t></w:r><w:r>${makeWpgGroup(931494, 4800000, 4019000,
    makePicNode('rId201', 0, 0, 4610000, 809000) +
    makePicNode('rId202', 0, 809000, 4800000, 1619000) +
    makePicNode('rId203', 0, 2428000, 4714000, 790000) +
    makePicNode('rId204', 0, 3218000, 4667000, 800000)
  )}</w:r></w:p>
  ${makePlainP('B.')}${makePlainP('C.')}${makePlainP('D.')}${makePlainP('E.')}
  ${makePlainP('KUNCI : C')}
  ${makePlainP('Pembahasan')}

  ${makePlainP('3. Tipe Soal: PILIHAN GANDA')}
  <w:p><w:r><w:t>Pertanyaan:</w:t></w:r><w:r>${makeWpgGroup(931494, 2828000, 3727000,
    makePicNode('rId301', 25000, 0, 2690000, 889000) +
    makePicNode('rId302', 0, 901000, 2828000, 1905000) +
    makePicNode('rId303', 25000, 2832000, 2710000, 894000)
  )}</w:r></w:p>
  <w:p><w:r>${makeAnchorPic('rId300', { posH: 785928, cx: 5078000, cy: 1123000 })}</w:r></w:p>
  ${makePlainP('A.')}${makePlainP('B.')}${makePlainP('C.')}${makePlainP('D.')}
  <w:p><w:r><w:t>E.</w:t></w:r><w:r>${makeAnchorPic('rId304', { posH: 959003, cx: 2915000, cy: 852000 })}</w:r></w:p>
  ${makePlainP('KUNCI : B')}
  ${makePlainP('Pembahasan')}

  ${makePlainP('4. Tipe Soal: PILIHAN GANDA')}
  ${makePlainP('Pertanyaan:')}
  <w:p><w:r><w:t>Dibayar beban listrik sebesar Rp500.000,00. Jurnalnya ialah .... A.</w:t></w:r><w:r>${makeWpgGroup(931494, 3686000, 1463000,
    makePicNode('rId401', 0, 0, 3138000, 233000) +
    makePicNode('rId402', 0, 233000, 3184000, 295000) +
    makePicNode('rId403', 0, 528000, 3133000, 285000) +
    makePicNode('rId404', 0, 813000, 3351000, 304000) +
    makePicNode('rId405', 0, 1117000, 3686000, 342000)
  )}</w:r></w:p>
  ${makePlainP('B.')}${makePlainP('C.')}${makePlainP('D.')}${makePlainP('E.')}
  ${makePlainP('KUNCI : D')}
  ${makePlainP('Pembahasan')}

  ${makePlainP('5. Tipe Soal: PILIHAN GANDA KOMPLEKS')}
  ${makePlainP('Pertanyaan:')}
  <w:p><w:r>${makeWpgGroup(730872, 6374000, 5083000,
    makePicNode('rId500', 0, 0, 6373000, 1558000) +
    makeWspLabel('A.', 10121, 1578013) +
    makePicNode('rId501', 200621, 1558836, 4657000, 685800) +
    makeWspLabel('B.', 10121, 2263813) +
    makePicNode('rId502', 200621, 2244636, 4717000, 685800) +
    makeWspLabel('C.', 10121, 2949613) +
    makePicNode('rId503', 200621, 2930436, 4848000, 700828) +
    makeWspLabel('D.', 10121, 3683038) +
    makePicNode('rId504', 200621, 3663861, 4829000, 1419225) +
    makeWspLabel('E.', 10121, 4397413)
  )}</w:r></w:p>
  ${makePlainP('KUNCI : A , D , E')}
  ${makePlainP('Pembahasan')}

  ${makePlainP('6. Tipe Soal: BENAR / SALAH Pernyataan:')}
  ${makePlainP('Analisalah macam-macam akun di bawah ini, tentukan benar atau salah')}
  <w:p><w:r><w:t>Pembahasan</w:t></w:r><w:r>${makeWpgGroup(1417320, 4800000, 2700000,
    makeWspLabel('Hasil Pernyataan : SALAH', 1000, 10000) +
    makePicNode('rId601', 38100, 175260, 1838325, 990600) +
    makeWspLabel('Pernyataan:', 1000, 1200000) +
    makeWspLabel('Hasil Pernyataan : BENAR', 1000, 1400000) +
    makePicNode('rId602', 38100, 1672589, 2324100, 1009650) +
    makeWspLabel('Pernyataan:', 1000, 2600000)
  )}</w:r></w:p>
</w:body></w:document>`;
const ecoImgMap = {
  rId101: 'data:image/png;base64,OPT101', rId102: 'data:image/png;base64,OPT102', rId103: 'data:image/png;base64,OPT103',
  rId104: 'data:image/png;base64,OPT104', rId105: 'data:image/png;base64,OPT105',
  rId200: 'data:image/png;base64,STEM200', rId201: 'data:image/png;base64,OPT201', rId202: 'data:image/png;base64,OPT202DBL',
  rId203: 'data:image/png;base64,OPT203', rId204: 'data:image/png;base64,OPT204',
  rId300: 'data:image/png;base64,STEM300', rId301: 'data:image/png;base64,OPT301', rId302: 'data:image/png;base64,OPT302DBL',
  rId303: 'data:image/png;base64,OPT303', rId304: 'data:image/png;base64,OPT304E',
  rId401: 'data:image/png;base64,OPT401', rId402: 'data:image/png;base64,OPT402', rId403: 'data:image/png;base64,OPT403',
  rId404: 'data:image/png;base64,OPT404', rId405: 'data:image/png;base64,OPT405',
  rId500: 'data:image/png;base64,STEM500', rId501: 'data:image/png;base64,OPT501', rId502: 'data:image/png;base64,OPT502',
  rId503: 'data:image/png;base64,OPT503', rId504: 'data:image/png;base64,OPT504DBL',
  rId601: 'data:image/png;base64,BS601', rId602: 'data:image/png;base64,BS602'
};
const ecoImgConv = convertDocumentXmlToText(ecoImgXml, ecoImgMap, {});
const ecoImgQs = parseQuestionsDirectly(ecoImgConv.text, ecoImgMap, ecoImgConv.tables, ecoImgConv.imageMeta);
assert.strictEqual(ecoImgQs.length, 6);

// Assert #1 (Q#7): 5 grouped option images moved from stem to opsi A-E
assert.ok(!ecoImgQs[0].gambar_base64, '5 gambar opsi tidak boleh tertinggal sebagai gambar stem');
for (let k = 0; k < 5; k++) {
  const L = String.fromCharCode(65 + k);
  assert.ok(ecoImgQs[0].opsi[L].includes(`OPT10${k + 1}`), `Opsi ${L} harus berisi OPT10${k + 1}`);
}

// Assert #2 (Q#8): wide stem intact + 4 bunched pics with 2x OPT202 split into B & C
assert.ok(ecoImgQs[1].gambar_base64.includes('STEM200'));
assert.ok(ecoImgQs[1].opsi.A.includes('OPT201'));
assert.ok(ecoImgQs[1].opsi.B.includes('OPT202DBL'));
assert.ok(ecoImgQs[1].opsi.C.includes('OPT202DBL'));
assert.ok(ecoImgQs[1].opsi.D.includes('OPT203'));
assert.ok(ecoImgQs[1].opsi.E.includes('OPT204'));
assert.deepStrictEqual(ecoImgQs[1]._pendingImgSplits, [{ optKeyTop: 'B', optKeyBottom: 'C', rId: 'rId202' }]);

// Assert #3 (Q#19): indented group redistributed to A-D (OPT302DBL split into B+C) & E stays OPT304E
assert.ok(ecoImgQs[2].gambar_base64.includes('STEM300'));
assert.ok(ecoImgQs[2].opsi.A.includes('OPT301'));
assert.ok(ecoImgQs[2].opsi.B.includes('OPT302DBL'));
assert.ok(ecoImgQs[2].opsi.C.includes('OPT302DBL'));
assert.ok(ecoImgQs[2].opsi.D.includes('OPT303'));
assert.ok(ecoImgQs[2].opsi.E.includes('OPT304E'));
assert.deepStrictEqual(ecoImgQs[2]._pendingImgSplits, [{ optKeyTop: 'B', optKeyBottom: 'C', rId: 'rId302' }]);

// Assert #4 (Q#21): inline trailing A. + 5 bunched pics distributed to A-E
for (let k = 0; k < 5; k++) {
  const L = String.fromCharCode(65 + k);
  assert.ok(ecoImgQs[3].opsi[L].includes(`OPT40${k + 1}`), `Q#21 opsi ${L} harus terisi OPT40${k + 1}`);
}

// Assert #5 (Q#34): y-sorted <wpg:wgp> puts STEM500 in stem, OPT501..503 in A-C, OPT504DBL split into D & E
assert.strictEqual(ecoImgQs[4].tipe, 'PG_KOMPLEKS');
assert.ok(ecoImgQs[4].gambar_base64.includes('STEM500'));
assert.ok(ecoImgQs[4].opsi.A.includes('OPT501'));
assert.ok(ecoImgQs[4].opsi.B.includes('OPT502'));
assert.ok(ecoImgQs[4].opsi.C.includes('OPT503'));
assert.ok(ecoImgQs[4].opsi.D.includes('OPT504DBL'));
assert.ok(ecoImgQs[4].opsi.E.includes('OPT504DBL'));
assert.deepStrictEqual(ecoImgQs[4]._pendingImgSplits, [{ optKeyTop: 'D', optKeyBottom: 'E', rId: 'rId504' }]);

// Assert #6 (Q#40): Pembahasan anchored on same <w:p> as <w:txbxContent> does not swallow B/S images
assert.strictEqual(ecoImgQs[5].tipe, 'BENAR_SALAH');
assert.ok(!ecoImgQs[5].gambar_base64, 'Gambar pernyataan B/S tidak boleh tertinggal di stem');
assert.ok(ecoImgQs[5].opsi.A.includes('BS601'));
assert.ok(ecoImgQs[5].opsi.B.includes('BS602'));
assert.deepStrictEqual(ecoImgQs[5].kunci, { A: 'Salah', B: 'Benar' });
console.log('✔ Test 16: Regresi grup <wpg:wgp> opsi bergambar, pemecahan gambar 2x, & B/S dengan Pembahasan menempel 100% pass');

console.log('\n⭐ SEMUA TEST AFRESTO EXPORT FORMAT 100% PASS!');
