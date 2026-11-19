/**
 * Copyright (c) 2026 Maulana Ibrahim
 * Built by : Maulana Ibrahim
 */
import assert from 'assert';
import fs from 'fs';
import zlib from 'zlib';
import { parseDocx } from '../scripts/docx_parser.js';
import { buildAfrestoNextDocx } from '../scripts/afresto_next_exporter.js';

function unzipEntries(uint8) {
  const ab = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
  const v = new DataView(ab);
  let off = ab.byteLength - 22;
  while (off >= 0 && v.getUint32(off, true) !== 0x06054b50) off--;
  assert.ok(off >= 0, 'ZIP EOCD harus valid');
  const cdOff = v.getUint32(off + 16, true);
  const n = v.getUint16(off + 10, true);
  const files = {};
  let p = cdOff;
  for (let i = 0; i < n; i++) {
    const m = v.getUint16(p + 10, true);
    const cs = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true);
    const el = v.getUint16(p + 30, true);
    const cl = v.getUint16(p + 32, true);
    const lh = v.getUint32(p + 42, true);
    const name = Buffer.from(ab, p + 46, nl).toString('utf8');
    p += 46 + nl + el + cl;
    const lnl = v.getUint16(lh + 26, true);
    const lel = v.getUint16(lh + 28, true);
    const data = Buffer.from(ab, lh + 30 + lnl + lel, cs);
    files[name] = m === 8 ? zlib.inflateRawSync(data) : data;
  }
  return files;
}

console.log('=== TEST SUITE: AFRESTO NEXT DOCX EXPORTER BRIDGE ===');

const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAASUlEQVR42u3PMQEAAAgEIDu/qLE3NnAEE7BJ6u0A8MsHQD4A+QAAAAD88gGQD0A+APkAAADALx8A+QDkA5APAAAA/PIBkA9APgD5AABo9wO6eO9pSAAAAABJRU5ErkJggg==';

const sampleQuestions = [
  {
    id: 1,
    tipe: 'PG',
    pertanyaan: 'Ibu kota <b>Indonesia</b> saat ini adalah . . .',
    opsi: { A: 'Bandung', B: 'Jakarta', C: 'Surabaya', D: 'Medan', E: 'Semarang' },
    kunci: 'B'
  },
  {
    id: 2,
    tipe: 'PG_KOMPLEKS',
    pertanyaan: 'Ciri teks LHO yang tepat adalah (Pilih 2)',
    opsi: { A: 'Bersifat objektif', B: 'Berisi opini pribadi', C: 'Berdasarkan fakta observasi', D: 'Mengandung alur konflik', E: 'Bersifat fiktif' },
    kunci: ['A', 'C']
  },
  {
    id: 3,
    tipe: 'MENCOCOKKAN',
    pertanyaan: 'Pasangkan operasi berikut dengan hasilnya!',
    pasangan: [
      { kiri: '2 + 3', kanan: '5', kunci: 'A' },
      { kiri: '4 x 2', kanan: '8', kunci: 'B' }
    ]
  },
  {
    id: 4,
    tipe: 'BENAR_SALAH',
    pertanyaan: 'Tentukan benar atau salah pernyataan berikut!',
    opsi: {
      A: 'Adik mengantuk setelah minum obat.',
      B: 'Hujan turun ke atas.'
    },
    kunci: { A: 'Benar', B: 'Salah' },
    gambar_base64: samplePng,
    _ocrExtracted: true
  },
  {
    id: 5,
    tipe: 'BENAR_SALAH',
    pertanyaan: 'Soal B/S masih bergambar belum di-OCR',
    opsi: {},
    kunci: {},
    gambar_base64: samplePng
  }
];

const { bytes, stats } = await buildAfrestoNextDocx(sampleQuestions);
assert.strictEqual(stats.total, 5);
assert.deepStrictEqual(stats.incompleteBenarSalah, [5], 'Soal #5 harus terdeteksi belum lengkap teks B/S-nya');

const zipFiles = unzipEntries(bytes);
assert.ok(zipFiles['word/document.xml'], 'document.xml harus ada');
assert.ok(zipFiles['word/numbering.xml'], 'numbering.xml harus ada');
assert.ok(zipFiles['word/styles.xml'], 'styles.xml harus ada');
assert.ok(zipFiles['word/media/image1.png'], 'Hanya gambar soal #5 yang disematkan (gambar OCR #4 tidak bocor)');
assert.ok(!zipFiles['word/media/image2.png'], 'Gambar screenshot OCR soal #4 tidak boleh ikut terbawa');

const docXml = zipFiles['word/document.xml'].toString('utf8');
const numXml = zipFiles['word/numbering.xml'].toString('utf8');

// 1. Cek startOverride pada daftar opsi agar setiap soal restart A..E
assert.ok(numXml.includes('<w:numFmt w:val="decimal"/>'));
assert.ok(numXml.includes('<w:numFmt w:val="upperLetter"/>'));
assert.ok(numXml.includes('<w:startOverride w:val="1"/>'), 'Harus ada startOverride agar setiap opsi mulai dari A.');
console.log('✔ Test 1: Struktur OpenXML, numbering restart A-E, dan pencegahan kebocoran screenshot OCR lulus');

// 2. Cek warna merah #EE0000 pada kunci PG (#1: Jakarta) & PG_KOMPLEKS (#2: A & C)
const paraMatches = [...docXml.matchAll(/<w:p>(.*?)<\/w:p>/g)].map(m => m[1]);
const redParas = paraMatches.filter(p => p.includes('<w:color w:val="EE0000"/>'));
assert.ok(redParas.every(p => p.includes('<w:b/>')), 'Setiap opsi kunci merah wajib ikut di-bold (<w:b/>)');
assert.ok(redParas.some(p => p.includes('Jakarta')), 'Kunci PG B (Jakarta) wajib berwarna merah #EE0000');
assert.ok(redParas.some(p => p.includes('Bersifat objektif')), 'Kunci PG_KOMPLEKS A wajib merah #EE0000');
assert.ok(redParas.some(p => p.includes('Berdasarkan fakta observasi')), 'Kunci PG_KOMPLEKS C wajib merah #EE000');
assert.ok(!redParas.some(p => p.includes('Bandung') || p.includes('Berisi opini pribadi')), 'Opsi pengecoh tidak boleh merah');
assert.ok(docXml.includes('(Pilih 2)'), 'Instruksi (Pilih 2) wajib dipertahankan');
console.log('✔ Test 2: Penanda kunci warna merah #EE0000 + bold (<w:b/>) untuk PG & PG_KOMPLEKS akurat 100%');

// 3. Cek Mencocokkan tabel 2 kolom & Benar/Salah tabel 4 kolom 'v'
assert.ok(docXml.includes('SOAL') && docXml.includes('JAWABAN') && docXml.includes('Kunci : A') && docXml.includes('Kunci : B'));
assert.ok(docXml.includes('Adik mengantuk setelah minum obat.') && docXml.includes('>v<'));
console.log('✔ Test 3: Format tabel Mencocokkan 2-kolom & Benar/Salah 4-kolom tanda v sesuai standar Afresto Next');

// 4. Round-trip uji parsing dengan parseDocx
const rtParsed = await parseDocx(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
assert.strictEqual(rtParsed.success, true);
assert.strictEqual(rtParsed.stats.tableCount, 3, 'Harus terdapat 3 tabel (1 Mencocokkan + 2 Benar/Salah)');
assert.strictEqual(rtParsed.stats.imageCount, 1, 'Harus ada 1 gambar tersisa dari soal #5');
console.log('✔ Test 4: Round-trip dekompresi & pembacaan tabel/gambar valid');

// 5. Uji konversi file Legacy asli 50 soal ke Afresto Next
const legacyBuf = fs.readFileSync('C:/Users/maula/.gemini/antigravity/brain/65a63ff4-d55a-4f07-bad2-3379b5a10f8a/.user_uploaded/media_1794732649626_8ef44ba2.docx');
const legacyParsed = await parseDocx(legacyBuf.buffer.slice(legacyBuf.byteOffset, legacyBuf.byteOffset + legacyBuf.byteLength));
assert.strictEqual(legacyParsed.directQuestions.length, 50);
const nextOut = await buildAfrestoNextDocx(legacyParsed.directQuestions);
assert.strictEqual(nextOut.stats.total, 50);
assert.deepStrictEqual(nextOut.stats.incompleteBenarSalah, [46, 47, 48, 49, 50]);
const nextZip = unzipEntries(nextOut.bytes);
const nextDoc = nextZip['word/document.xml'].toString('utf8');
// 40 PG (1 kunci merah masing-masing) + 5 PG_KOMPLEKS (C+D=2, A+D=2, A+C+D=3, A+C=2, B=1 -> total 10 kunci merah) = 50 paragraf merah!
const nextRedBoldParas = [...nextDoc.matchAll(/<w:p>(.*?)<\/w:p>/g)].filter(
  m => m[1].includes('<w:color w:val="EE0000"/>') && m[1].includes('<w:b/>')
);
const nextRedCount = nextRedBoldParas.length;
assert.strictEqual(nextRedCount, 50, `Total opsi kunci merah+bold untuk 40 PG + 5 PG Kompleks (2+2+3+2+1) harus tepat 50, terdeteksi ${nextRedCount}`);
console.log(`✔ Test 5: Konversi 50 soal asli Afresto Legacy -> Afresto Next valid (${nextRedCount} opsi kunci #EE0000+bold, 5 tabel B/S)`);

// 6. Uji ekspor gambar opsi (A-E) + multi-gambar stem + gambar dalam pernyataan B/S
const richImgQuestions = [
  {
    id: 1,
    tipe: 'PG',
    pertanyaan: 'Perhatikan gambar molekul ini!',
    gambar_base64: samplePng,
    gambar_list: [samplePng, samplePng],
    opsi: {
      A: `<img src="${samplePng}" />`,
      B: `Teks B <img src="${samplePng}" />`,
      C: 'Opsi C teks',
      D: `<img src="${samplePng}" />`,
      E: 'Opsi E teks'
    },
    kunci: 'D'
  },
  {
    id: 2,
    tipe: 'BENAR_SALAH',
    pertanyaan: 'Perhatikan data berikut!',
    gambar_base64: samplePng,
    opsi: {
      A: `Rumus <img src="${samplePng}" /> adalah benar.`,
      B: 'Pernyataan kedua salah.'
    },
    kunci: { A: 'Benar', B: 'Salah' }
  }
];
const richOut = await buildAfrestoNextDocx(richImgQuestions);
const richZip = unzipEntries(richOut.bytes);
const richDoc = richZip['word/document.xml'].toString('utf8');
const richRels = richZip['word/_rels/document.xml.rels'].toString('utf8');
const mediaKeys = Object.keys(richZip).filter(k => k.startsWith('word/media/'));
// 2 stem PG + 3 option PG + 1 stem B/S (_ocrExtracted undefined) + 1 inline cell B/S = 7 media images!
assert.strictEqual(mediaKeys.length, 7, `Harus menanamkan seluruh 7 gambar (stem PG, opsi A/B/D, stem B/S, & rumus B/S), terdeteksi ${mediaKeys.length}`);
const blipCount = (richDoc.match(/<a:blip r:embed="rIdImg\d+"/g) || []).length;
assert.strictEqual(blipCount, 7);
for (let k = 1; k <= 7; k++) {
  assert.ok(richRels.includes(`Id="rIdImg${k}"`), `Relasi rIdImg${k} harus terdaftar di document.xml.rels`);
}
console.log('✔ Test 6: Ekspor gambar multi-stem, gambar di opsi A-E, dan gambar dalam tabel Benar/Salah valid 100%');

console.log('\n⭐ SEMUA TEST EXPORTER AFRESTO NEXT 100% PASS!');
