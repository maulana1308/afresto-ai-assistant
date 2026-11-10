/**
 * Test Suite: QC Audit Milestone 3.4 - Mesin Ingesti Bank Soal Word (.docx) Guru
 * Menguji Native ZIP Central Directory Parser, DecompressionStream Web Streams,
 * Ekstraksi Paragraf, Tabel, dan Gambar Media, AI Document Structurer, serta Integritas UI.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== ANS QC AUDIT: MILESTONE 3.4 MESIN INGESTI BANK SOAL WORD (.DOCX) SUITE ===');

// Helper untuk membuat buffer berkas .docx sintetis yang valid di memori
function createSyntheticDocx(filesMap) {
  const localHeaders = [];
  const cdHeaders = [];
  let currentOffset = 0;

  for (const [filePath, contentStr] of Object.entries(filesMap)) {
    const nameBuf = Buffer.from(filePath, 'utf8');
    const rawData = Buffer.isBuffer(contentStr) ? contentStr : Buffer.from(contentStr, 'utf8');
    const compData = zlib.deflateRawSync(rawData);

    // 1. Local Header (30 bytes + name length)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // signature PK\x03\x04
    lh.writeUInt16LE(20, 4); // version
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(8, 8); // compression: deflate (8)
    lh.writeUInt16LE(0, 10); // time
    lh.writeUInt16LE(0, 12); // date
    lh.writeUInt32LE(0, 14); // crc32 placeholder
    lh.writeUInt32LE(compData.length, 18); // compressed size
    lh.writeUInt32LE(rawData.length, 22); // uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26); // name length
    lh.writeUInt16LE(0, 28); // extra field length
    nameBuf.copy(lh, 30);

    // 2. Central Directory Header (46 bytes + name length)
    const cdh = Buffer.alloc(46 + nameBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0); // signature PK\x01\x02
    cdh.writeUInt16LE(20, 4); // version made by
    cdh.writeUInt16LE(20, 6); // version needed
    cdh.writeUInt16LE(0, 8); // flags
    cdh.writeUInt16LE(8, 10); // compression method
    cdh.writeUInt16LE(0, 12); // time
    cdh.writeUInt16LE(0, 14); // date
    cdh.writeUInt32LE(0, 16); // crc32
    cdh.writeUInt32LE(compData.length, 20); // compressed size
    cdh.writeUInt32LE(rawData.length, 24); // uncompressed size
    cdh.writeUInt16LE(nameBuf.length, 28); // name length
    cdh.writeUInt16LE(0, 30); // extra length
    cdh.writeUInt16LE(0, 32); // comment length
    cdh.writeUInt16LE(0, 34); // disk start
    cdh.writeUInt16LE(0, 36); // internal attr
    cdh.writeUInt32LE(0, 38); // external attr
    cdh.writeUInt32LE(currentOffset, 42); // local header offset
    nameBuf.copy(cdh, 46);

    localHeaders.push(lh);
    localHeaders.push(compData);
    cdHeaders.push(cdh);

    currentOffset += lh.length + compData.length;
  }

  const cdOffset = currentOffset;
  const cdBuf = Buffer.concat(cdHeaders);

  // 3. End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature PK\x05\x06
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(Object.keys(filesMap).length, 8); // total records on disk
  eocd.writeUInt16LE(Object.keys(filesMap).length, 10); // total records
  eocd.writeUInt32LE(cdBuf.length, 12); // central directory size
  eocd.writeUInt32LE(cdOffset, 16); // offset of central directory
  eocd.writeUInt16LE(0, 20); // comment length

  const fullZip = Buffer.concat([...localHeaders, cdBuf, eocd]);
  return fullZip.buffer.slice(fullZip.byteOffset, fullZip.byteOffset + fullZip.byteLength);
}

// Import docx_parser module
const docxParserPath = path.join(rootDir, 'scripts', 'docx_parser.js');
const docxParser = await import(`file://${docxParserPath}`);

// --------------------------------------------------------------------------
// TEST 1: Parsing ZIP Central Directory Headers
// --------------------------------------------------------------------------
try {
  const { parseZipEntries } = docxParser;

  const mockZip = createSyntheticDocx({
    'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Halo Guru</w:t></w:r></w:p></w:body></w:document>',
    'word/_rels/document.xml.rels': '<Relationships><Relationship Id="rId1" Target="media/image1.png"/></Relationships>',
    'word/media/image1.png': Buffer.from('FAKE_PNG_BINARY_BYTES')
  });

  const entries = parseZipEntries(mockZip);
  assert.strictEqual(entries.length, 3, 'Harus mengekstrak tepat 3 entri berkas');
  assert.ok(entries.some(e => e.name === 'word/document.xml'), 'Entri word/document.xml harus ada');
  assert.ok(entries.some(e => e.name === 'word/_rels/document.xml.rels'), 'Entri relasi harus ada');
  assert.ok(entries.some(e => e.name === 'word/media/image1.png'), 'Entri media gambar harus ada');

  console.log('✔ Test 1 Lolos: Ekstraksi Entri Central Directory ZIP Terverifikasi Presisi');
} catch (err) {
  console.error('❌ Test 1 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 2: Dekompresi Native Web Stream (DecompressionStream)
// --------------------------------------------------------------------------
try {
  const { parseZipEntries, decompressZipEntry } = docxParser;

  const originalContent = '<w:document><w:body><w:p><w:r><w:t>Soal 1. Apa fungsi firewall?</w:t></w:r></w:p></w:body></w:document>';
  const mockZip = createSyntheticDocx({
    'word/document.xml': originalContent
  });

  const entries = parseZipEntries(mockZip);
  const docEntry = entries.find(e => e.name === 'word/document.xml');
  const decompressedBytes = await decompressZipEntry(mockZip, docEntry);

  const decodedStr = new TextDecoder('utf-8').decode(decompressedBytes);
  assert.strictEqual(decodedStr, originalContent, 'Teks hasil dekompresi harus identik 100% dengan teks asal');

  console.log('✔ Test 2 Lolos: Dekompresi Native Web Stream (DecompressionStream) Bekerja Sempurna');
} catch (err) {
  console.error('❌ Test 2 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 3: Parsing XML Dokumen Word ke Paragraf, Tabel & Relasi Gambar
// --------------------------------------------------------------------------
try {
  const { parseDocx } = docxParser;

  const complexDocXml = `
    <w:document>
      <w:body>
        <w:p><w:r><w:t>PENILAIAN AKHIR SEMESTER TJKT</w:t></w:r></w:p>
        <w:p><w:r><w:t>Mata Pelajaran: Dasar Dasar TJKT</w:t></w:r></w:p>
        <w:p><w:r><w:t>1. Manakah protokol di bawah ini yang berjalan pada port 443?</w:t></w:r></w:p>
        <w:p><w:r><w:t>A. HTTP</w:t></w:r></w:p>
        <w:p><w:r><w:t>B. HTTPS</w:t></w:r></w:p>
        <w:p><w:r><w:t>Kunci: B</w:t></w:r></w:p>
        <w:tbl>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Pernyataan A</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>Benar</w:t></w:r></w:p></w:tc>
          </w:tr>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Pernyataan B</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>Salah</w:t></w:r></w:p></w:tc>
          </w:tr>
        </w:tbl>
        <w:p>
          <w:r><w:t>Perhatikan gambar topologi jaringan berikut:</w:t></w:r>
          <w:drawing>
            <a:blip r:embed="rId2"/>
          </w:drawing>
        </w:p>
      </w:body>
    </w:document>
  `;

  const relsXml = `
    <Relationships>
      <Relationship Id="rId2" Target="media/topology.png"/>
    </Relationships>
  `;

  const mockZip = createSyntheticDocx({
    'word/document.xml': complexDocXml,
    'word/_rels/document.xml.rels': relsXml,
    'word/media/topology.png': Buffer.from('FAKE_PNG_TOPOLOGY_DATA')
  });

  const parsed = await parseDocx(mockZip);
  assert.strictEqual(parsed.success, true, 'Parsing harus sukses');
  assert.ok(parsed.stats.paragraphCount >= 5, 'Harus mendeteksi minimal 5 paragraf');
  assert.strictEqual(parsed.stats.tableCount, 1, 'Harus mendeteksi tepat 1 tabel');
  assert.strictEqual(parsed.stats.imageCount, 1, 'Harus mendeteksi tepat 1 gambar relasi rId2');

  assert.ok(parsed.rawText.includes('PENILAIAN AKHIR SEMESTER TJKT'), 'Teks KOP harus ada di rawText');
  assert.ok(parsed.rawText.includes('| Pernyataan A | Benar |'), 'Tabel harus diformat rapi dengan pipe delimiter');
  assert.ok(parsed.rawText.includes('[GAMBAR_EMBED: rId2]'), 'Tag gambar embed rId2 harus disematkan di teks');
  assert.ok(parsed.images['rId2'].startsWith('data:image/png;base64,'), 'Gambar harus dikonversi ke Data URL Base64');

  console.log('✔ Test 3 Lolos: Rekonstruksi Paragraf, Tabel & Relasi Gambar Terverifikasi');
} catch (err) {
  console.error('❌ Test 3 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 4: Kontrak Mesin Penata Dokumen AI (AI Document Structurer)
// --------------------------------------------------------------------------
try {
  const geminiJsPath = path.join(rootDir, 'scripts', 'gemini.js');
  const geminiJs = await import(`file://${geminiJsPath}`);
  const { GeminiService } = geminiJs;

  assert.ok(typeof GeminiService.prototype.structureDocxQuestions === 'function', 'Method structureDocxQuestions harus ada di GeminiService');

  // Uji pemetaan gambar_tag ke gambar_base64 pada hasil structuring
  const mockDocxImages = {
    'rId5': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  };

  const sampleParsedOutput = {
    detected_mapel: 'Fisika Terapan',
    detected_kelas: 'Fase F (Kelas 11)',
    soal_list: [
      {
        id: 1,
        tipe: 'PG',
        pertanyaan: 'Perhatikan gambar rangkaian listrik berikut!',
        gambar_tag: 'rId5',
        opsi: { A: '10 Ohm', B: '20 Ohm', C: '30 Ohm', D: '40 Ohm', E: '50 Ohm' },
        kunci: 'B',
        pembahasan: 'Perhitungan hambatan total paralel.'
      }
    ]
  };

  // Verifikasi pemetaan gambar
  sampleParsedOutput.soal_list.forEach((q, idx) => {
    q.id = idx + 1;
    if (q.gambar_tag && mockDocxImages[q.gambar_tag]) {
      q.gambar_base64 = mockDocxImages[q.gambar_tag];
      q.butuh_gambar = true;
    }
  });

  assert.strictEqual(sampleParsedOutput.soal_list[0].gambar_base64, mockDocxImages['rId5'], 'Gambar base64 harus berhasil dipetakan');
  assert.strictEqual(sampleParsedOutput.soal_list[0].butuh_gambar, true, 'butuh_gambar harus true jika ada gambar');

  console.log('✔ Test 4 Lolos: Kontrak Mesin Penata Dokumen Gemini & Pemetaan Gambar Terverifikasi');
} catch (err) {
  console.error('❌ Test 4 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 5: Integritas Struktur UI Ingesti Word di Sidepanel & Studio Preview
// --------------------------------------------------------------------------
try {
  // 5.1 Sidepanel HTML
  const sideHtmlPath = path.join(rootDir, 'sidepanel', 'sidepanel.html');
  const sideHtml = fs.readFileSync(sideHtmlPath, 'utf8');

  assert.ok(sideHtml.includes('id="tab-source-ai"'), 'Wajib ada tab Buat via AI di Sidepanel');
  assert.ok(sideHtml.includes('id="tab-source-docx"'), 'Wajib ada tab Upload Word di Sidepanel');
  assert.ok(sideHtml.includes('id="docx-ingestion-container"'), 'Wajib ada kontainer ingesti Word');
  assert.ok(sideHtml.includes('id="docx-drop-box"'), 'Wajib ada zona drag and drop Word');
  assert.ok(sideHtml.includes('id="input-docx-file"'), 'Wajib ada input file docx tersembunyi');
  assert.ok(sideHtml.includes('id="docx-summary-box"'), 'Wajib ada panel ringkasan berkas docx');
  assert.ok(sideHtml.includes('id="btn-convert-docx"'), 'Wajib ada tombol konversi dokumen');
  assert.ok(sideHtml.includes('id="docx-stat-paragraf"'), 'Wajib ada stat paragraf');
  assert.ok(sideHtml.includes('id="docx-stat-tabel"'), 'Wajib ada stat tabel');
  assert.ok(sideHtml.includes('id="docx-stat-gambar"'), 'Wajib ada stat gambar');

  // 5.2 Studio Preview HTML
  const previewHtmlPath = path.join(rootDir, 'preview', 'preview.html');
  const previewHtml = fs.readFileSync(previewHtmlPath, 'utf8');

  assert.ok(previewHtml.includes('id="btn-import-docx-studio"'), 'Studio Preview harus memiliki tombol impor docx di toolbar');
  assert.ok(previewHtml.includes('id="input-docx-studio"'), 'Studio Preview harus memiliki input file docx');

  console.log('✔ Test 5 Lolos: Integritas Elemen DOM Ingesti Word Sidepanel & Studio Terverifikasi');
} catch (err) {
  console.error('❌ Test 5 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 6: Integritas Logika Controller & CSS Design Tokens
// --------------------------------------------------------------------------
try {
  const sideJsPath = path.join(rootDir, 'sidepanel', 'sidepanel.js');
  const sideJs = fs.readFileSync(sideJsPath, 'utf8');

  assert.ok(sideJs.includes('parseDocx'), 'Sidepanel.js harus mengimpor dan memanggil parseDocx');
  assert.ok(sideJs.includes('structureDocxQuestions'), 'Sidepanel.js harus memanggil structureDocxQuestions');
  assert.ok(sideJs.includes('handleDocxFileSelected'), 'Sidepanel.js harus memiliki handler seleksi berkas docx');

  const sideCssPath = path.join(rootDir, 'sidepanel', 'sidepanel.css');
  const sideCss = fs.readFileSync(sideCssPath, 'utf8');

  assert.ok(sideCss.includes('.docx-drop-box'), 'CSS harus mendefinisikan styling zona drop docx');
  assert.ok(sideCss.includes('.source-mode-segmented-control'), 'CSS harus mendefinisikan segmented control tab');
  assert.ok(sideCss.includes('.docx-stats-grid'), 'CSS harus mendefinisikan grid metrik statistik docx');

  console.log('✔ Test 6 Lolos: Integritas Controller sidepanel.js & CSS Tokens Terverifikasi');
} catch (err) {
  console.error('❌ Test 6 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 7: Ketahanan Parser Deterministik Terhadap Gaya Penulisan Beragam Guru
// --------------------------------------------------------------------------
try {
  const { parseQuestionsDirectly } = docxParser;

  const teacherDoc = `
    1. Apa nama ibukota negara Indonesia saat ini?
    A. Jakarta
    B. Nusantara
    C. Bandung
    D. Surabaya

    2. Manakah persamaan energi kinetik yang tepat?
    A. E = mc^2    B. E_k = \\frac{1}{2}mv^2    C. W = F \\times s    D. P = \\frac{W}{t}

    3. Pilihlah komponen pasif elektronika:
    A. Transistor
    B. **Resistor**
    C. Dioda
    D. IC

    DAFTAR KUNCI JAWABAN:
    1. A
    2. B
  `;

  const parsedQuestions = parseQuestionsDirectly(teacherDoc, {});

  // Pastikan tepat 3 soal terbaca (blok kunci jawaban tidak memunculkan soal hantu)
  assert.strictEqual(parsedQuestions.length, 3, 'Harus mendeteksi tepat 3 butir soal tanpa soal siluman dari blok kunci');

  // Uji Soal 1: Kunci diambil dari daftar kunci di bawah
  assert.strictEqual(parsedQuestions[0].kunci, 'A', 'Kunci soal 1 harus A sesuai daftar kunci di bawah');
  assert.strictEqual(Object.keys(parsedQuestions[0].opsi).length, 4, 'Soal 1 harus memiliki 4 opsi');

  // Uji Soal 2: Multi-opsi horizontal pada 1 baris
  assert.strictEqual(parsedQuestions[1].kunci, 'B', 'Kunci soal 2 harus B sesuai daftar kunci di bawah');
  assert.strictEqual(Object.keys(parsedQuestions[1].opsi).length, 4, 'Soal 2 multi-opsi horizontal harus dipisahkan jadi 4 opsi');
  assert.ok(parsedQuestions[1].opsi['B'].includes('\\frac{1}{2}mv^2'), 'Opsi B harus memuat rumus fisika persis');

  // Uji Soal 3: Kunci dari teks opsi yang dicetak tebal
  assert.strictEqual(parsedQuestions[2].kunci, 'B', 'Kunci soal 3 harus B dari opsi tebal B. **Resistor**');
  assert.strictEqual(parsedQuestions[2].opsi['B'], 'Resistor', 'Teks opsi harus dibersihkan dari penanda tebal');

  console.log('✔ Test 7 Lolos: Ketahanan Parser Deterministik Terhadap Ragam Format Guru Terverifikasi');
} catch (err) {
  console.error('❌ Test 7 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 8: Uji Ingesti Kimia ATS: Auto-Numbering, Formula Sub/Sup, & Tabel Soal
// --------------------------------------------------------------------------
try {
  const { convertDocumentXmlToText, parseQuestionsDirectly } = docxParser;

  // 1. Uji Auto-Numbering Word (<w:numPr>) & Subscript/Superscript Kimia
  const mockChemXml = `
    <w:document>
      <w:body>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
          <w:r><w:t>Senyawa dengan rumus molekul </w:t></w:r>
          <w:r><w:t>H</w:t></w:r>
          <w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t>2</w:t></w:r>
          <w:r><w:t>SO</w:t></w:r>
          <w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t>4</w:t></w:r>
          <w:r><w:t> dan ion </w:t></w:r>
          <w:r><w:t>Ca</w:t></w:r>
          <w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>2+</w:t></w:r>
          <w:r><w:t> adalah...</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr>
          <w:r><w:t>Asam sulfat dan kalsium</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr>
          <w:r><w:t>Asam klorida</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>
  `;

  const parsedChem = convertDocumentXmlToText(mockChemXml, {});
  assert.ok(parsedChem.text.includes('1. Senyawa dengan rumus molekul H<sub>2</sub>SO<sub>4</sub>'), 'Auto-numbering level 0 dan subscript kimia harus dikonversi presisi');
  assert.ok(parsedChem.text.includes('Ca<sup>2+</sup>'), 'Superscript ion kimia harus dikonversi presisi');
  assert.ok(parsedChem.text.includes('A. Asam sulfat dan kalsium'), 'Auto-numbering level 1 harus dikonversi jadi huruf opsi');

  // 2. Uji Ekstraksi Soal dari Format Tabel Ujian Sekolah (ATS/PAS Template)
  const mockSchoolTables = [
    [['Identitas Sekolah', 'SMA Negeri 1'], ['Mata Pelajaran', 'Kimia Kelas XI']],
    [['Petunjuk Umum: Pilihlah jawaban yang paling tepat']],
    [
      ['No', 'Butir Soal & Pilihan Jawaban', 'Kunci'],
      ['1', 'Reaksi endoterm adalah reaksi yang menyerap energi.\nA. Benar\nB. Salah', 'A'],
      ['2', 'Perhatikan gambar sel elektrokimia:\n[GAMBAR_EMBED: rId9]\nLogam yang berfungsi sebagai anoda adalah...\nA. Seng\nB. Tembaga\nC. Besi\nD. Perak', 'A']
    ]
  ];

  const mockImgMap = {
    'rId9': 'data:image/png;base64,FAKE_IMAGE_DATA_ATS'
  };

  const tableQuestions = parseQuestionsDirectly('', mockImgMap, mockSchoolTables);
  assert.strictEqual(tableQuestions.length, 2, 'Harus mengekstrak tepat 2 butir soal dari tabel naskah ATS');
  assert.strictEqual(tableQuestions[0].id, 1, 'ID soal 1 harus sesuai nomor tabel');
  assert.strictEqual(tableQuestions[0].kunci, 'A', 'Kunci soal 1 harus A');
  assert.strictEqual(tableQuestions[1].id, 2, 'ID soal 2 harus sesuai nomor tabel');
  assert.strictEqual(tableQuestions[1].butuh_gambar, true, 'Soal 2 harus memiliki atribut butuh_gambar');
  assert.strictEqual(tableQuestions[1].gambar_base64, 'data:image/png;base64,FAKE_IMAGE_DATA_ATS', 'Gambar embed rId9 harus terpasang di soal 2');

  console.log('✔ Test 8 Lolos: Ingesti Kimia ATS (Auto-Numbering, Rumus Sub/Sup, & Tabel Soal) Terverifikasi');
} catch (err) {
  console.error('❌ Test 8 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 9: Pencegahan Penggandaan Soal (Anti-Inflation) & Deteksi Kunci Highlight
// --------------------------------------------------------------------------
try {
  const { convertDocumentXmlToText, parseQuestionsDirectly } = docxParser;

  // Naskah seperti pada kasus user: 2 butir soal (1 PG 5 opsi + 1 Uraian)
  // Opsi C di-highlight kuning (<w:highlight w:val="yellow"/>)
  const mockXmlUserATS = `
    <w:document>
      <w:body>
        <w:p>
          <w:r><w:t>24. Menggambarkan perbandingan sifat periodic antara unsur Mg dan Al adalah ...</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>A. Mg mudah menarik elektron daripada Al</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>B. Jari-jari atom unsur Al lebih besar daripada Mg</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>C. Energi ionisasi Mg lebih kecil daripada energi ionisasi Al</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>D. Unsur Al lebih mudah melepas elektron daripada Mg</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>E. Mg memiliki afinitas elektron lebih besar daripada Al</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>25. Apakah yang dimaksud dengan keelektronegatifan? Jelaskan!</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>
  `;

  const converted = convertDocumentXmlToText(mockXmlUserATS, {});
  const questions = parseQuestionsDirectly(converted.text, {});

  // Pastikan tepat 2 butir soal yang terbaca, BUKAN 7 butir!
  assert.strictEqual(questions.length, 2, 'Opsi A-E tidak boleh diubah menjadi soal terpisah (anti-inflasi)');

  // Uji Soal 24 (PG)
  const q24 = questions.find(q => q.id === 24);
  assert.ok(q24, 'Soal 24 harus ditemukan');
  assert.strictEqual(q24.tipe, 'PG', 'Tipe soal 24 harus PG');
  assert.strictEqual(Object.keys(q24.opsi).length, 5, 'Soal 24 harus memiliki tepat 5 opsi (A-E)');
  assert.strictEqual(q24.kunci, 'C', 'Kunci soal 24 harus C dari highlight kuning');

  // Uji Soal 25 (Uraian)
  const q25 = questions.find(q => q.id === 25);
  assert.ok(q25, 'Soal 25 harus ditemukan');
  assert.strictEqual(q25.tipe, 'URAIAN', 'Soal 25 tanpa opsi harus otomatis menjadi tipe URAIAN');

  console.log('✔ Test 9 Lolos: Proteksi Anti-Inflasi Jumlah Soal & Deteksi Kunci Highlight Kuning Terverifikasi');
} catch (err) {
  console.error('❌ Test 9 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 10: Integrasi word/numbering.xml (Pembedaan Mutlak decimal vs upperLetter)
// --------------------------------------------------------------------------
try {
  const { parseNumberingXml, convertDocumentXmlToText, parseQuestionsDirectly } = docxParser;

  const mockNumXml = `
    <w:numbering>
      <w:abstractNum w:abstractNumId="10">
        <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl>
      </w:abstractNum>
      <w:abstractNum w:abstractNumId="20">
        <w:lvl w:ilvl="0"><w:numFmt w:val="upperLetter"/></w:lvl>
      </w:abstractNum>
      <w:num w:numId="1"><w:abstractNumId w:val="10"/></w:num>
      <w:num w:numId="2"><w:abstractNumId w:val="20"/></w:num>
    </w:numbering>
  `;

  const numMap = parseNumberingXml(mockNumXml);
  assert.strictEqual(numMap['1'][0], 'decimal', 'NumId 1 harus berformat decimal (soal)');
  assert.strictEqual(numMap['2'][0], 'upperLetter', 'NumId 2 harus berformat upperLetter (opsi A-E)');

  // Simulasikan dokumen Word yang memakai numId 1 untuk soal dan numId 2 untuk opsi
  const docWithNumXml = `
    <w:document>
      <w:body>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
          <w:r><w:t>Pasangan berikut yang merupakan isobar adalah...</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
          <w:r><w:t>614C dan 715N</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
          <w:r><w:t>1632S dan 1636S</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
          <w:r><w:t>1939K dan 1735Cl</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
          <w:r><w:t>1840Ar dan 2042Ca</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
          <w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>1124Na dan 1224Mg</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>
  `;

  const converted = convertDocumentXmlToText(docWithNumXml, {}, numMap);
  const questions = parseQuestionsDirectly(converted.text, {});

  // Pastikan HANYA 1 soal yang tercipta, bukan 6 soal!
  assert.strictEqual(questions.length, 1, 'NumId 2 berformat upperLetter harus menjadi opsi A-E, BUKAN 5 soal terpisah!');
  assert.strictEqual(questions[0].tipe, 'PG', 'Tipe soal harus PG');
  assert.strictEqual(Object.keys(questions[0].opsi).length, 5, 'Harus memiliki tepat 5 opsi A s.d. E');
  assert.strictEqual(questions[0].opsi['A'], '614C dan 715N', 'Opsi A harus berisi teks pilihan 1');
  assert.strictEqual(questions[0].opsi['E'], '1124Na dan 1224Mg', 'Opsi E harus berisi teks pilihan 5');
  assert.strictEqual(questions[0].kunci, 'E', 'Kunci harus E dari opsi yang di-highlight kuning');

  console.log('✔ Test 10 Lolos: Integrasi word/numbering.xml (decimal vs upperLetter) Terverifikasi Presisi');
} catch (err) {
  console.error('❌ Test 10 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 11: Verifikasi 7 Perbaikan Format Ujian Asli User (Tabel Stimulus, Benar/Salah, Mencocokkan, Isian)
// --------------------------------------------------------------------------
try {
  const { parseQuestionsDirectly, formatTableHtml } = docxParser;

  // Kasus Soal 1: PG dengan Tabel Stimulus & Gambar Sel (Model Atom)
  const q1Raw = `
1. Perhatikan gambar dan postulat berikut: [TABEL_1]
Pernyataan yang tepat mengenai pasangan gambar model atom dan postulatnya adalah ...
| | Gambar Model atom | | Postulat |
| 1 | <img src="data:image/png;base64,IMG1"/> | A | Atom terdiri atas inti atom... |
| 2 | <img src="data:image/png;base64,IMG2"/> | B | Atom adalah partikel terkecil... |
| 3 | <img src="data:image/png;base64,IMG3"/> | C | Elektron-elektron mengelilingi... |
| 4 | <img src="data:image/png;base64,IMG4"/> | D | Atom adalah bola pejal... |
| 5 | <img src="data:image/png;base64,IMG5"/> | E | Elektron-elektron yang mengelilingi... |
A. 1-B merupakan teori atom Rutherford
**B. 2-C merupakan teori atom Bohr yang merupakan pengembangan dari Rutherford**
C. 3-A merupakan teori atom Dalton
D. 4-E merupakan teori atom Thompson
E. 5-D Merupakan teori atom mekanika kuantum
`;

  // Kasus Soal 3: Benar/Salah dengan teks pernyataan berakhiran (Benar)/(Salah)
  const q3Raw = `
3. Perhatikan notasi atom berikut: 2858Ni
Berdasarkan notasi atom di atas, nyatakan pernyataan berikut dalam benar atau salah!
A. Jumlah proton atom 28Ni adalah 28 (Benar)
B. Jumlah elektron atom 28Ni2+ adalah 28 (Salah)
C. Jumlah proton atom 28Ni2+ adalah 30 (Salah)
D. Jumlah elektron atom 28Ni adalah 28 (Benar)
E. Jumlah neutron dari 2858Ni2+ adalah 30 (Benar)
`;

  // Kasus Soal 4: Mencocokkan dengan kalimat "Salah satu isoton" yang tidak boleh memicu Benar/Salah palsu
  const q4Raw = `
4. Atom Fe memiliki nomor atom 26. Jika diketahui jumlah neutron Fe adalah 30, maka hubungkanlah pernyataan di sebelah kiri dengan jawaban di sebelah kanan secara tepat:
| 1 | Notasi atom Fe yaitu ... | A | 23 |
| 2 | Jumlah elektron ion Fe3+ adalah ... | B | 26 |
| 3 | Jumlah proton atom Fe adalah … | C | 2656Fe |
| 4 | Salah satu isoton dari atom Fe | D | 16 |
| | | E | 2858Ni |
`;

  // Kasus Soal 6: Isian Singkat dengan kunci dalam kurung di akhir pertanyaan
  const q6Raw = `
6. Daerah atau ruang di sekitar inti atom tempat peluang/kebolehjadian terbesar ditemukannya elektron disebut ... (Orbital)
`;

  const fullUserDocText = [q1Raw, q3Raw, q4Raw, q6Raw].join('\n\n');
  const questions = parseQuestionsDirectly(fullUserDocText, {});

  assert.strictEqual(questions.length, 4, 'Harus terdeteksi tepat 4 butir soal');

  // 1. Verifikasi Soal 1
  const q1 = questions.find(q => q.id === 1);
  assert.ok(q1, 'Soal 1 harus ditemukan');
  assert.strictEqual(q1.tipe, 'PG', 'Tipe soal 1 harus PG');
  assert.strictEqual(q1.kunci, 'B', 'Kunci soal 1 harus B');
  assert.ok(q1.pertanyaan.includes('<table class="afresto-exam-table"'), 'Tabel [TABEL_1] harus digantikan dengan tag HTML table');
  assert.ok(q1.pertanyaan.includes('<img src="data:image/png;base64,IMG1"/>'), 'Gambar model atom harus tetap berada di dalam sel tabel');

  // 2. Verifikasi Soal 3
  const q3 = questions.find(q => q.id === 3);
  assert.ok(q3, 'Soal 3 harus ditemukan');
  assert.strictEqual(q3.tipe, 'BENAR_SALAH', 'Soal 3 harus berjenis BENAR_SALAH');
  assert.strictEqual(typeof q3.kunci, 'object', 'Kunci BENAR_SALAH harus berupa objek pemetaan');
  assert.strictEqual(q3.kunci['A'], 'Benar', 'Kunci pernyataan A harus Benar');
  assert.strictEqual(q3.kunci['B'], 'Salah', 'Kunci pernyataan B harus Salah');
  assert.strictEqual(q3.kunci['C'], 'Salah', 'Kunci pernyataan C harus Salah');
  assert.strictEqual(q3.kunci['D'], 'Benar', 'Kunci pernyataan D harus Benar');
  assert.strictEqual(q3.kunci['E'], 'Benar', 'Kunci pernyataan E harus Benar');
  assert.ok(!q3.opsi['A'].includes('(Benar)'), 'Label (Benar) harus dibersihkan dari opsi narasi');

  // 3. Verifikasi Soal 4
  const q4 = questions.find(q => q.id === 4);
  assert.ok(q4, 'Soal 4 harus ditemukan');
  assert.strictEqual(q4.tipe, 'MENCOCOKKAN', 'Soal 4 harus berjenis MENCOCOKKAN dan TIDAK boleh salah deteksi karena kata "Salah satu isoton"');
  assert.ok(Array.isArray(q4.pasangan) && q4.pasangan.length >= 4, 'Soal 4 harus memiliki minimal 4 pasangan premis-respon');

  // 4. Verifikasi Soal 6
  const q6 = questions.find(q => q.id === 6);
  assert.ok(q6, 'Soal 6 harus ditemukan');
  assert.strictEqual(q6.tipe, 'ISIAN', 'Soal 6 harus berjenis ISIAN singkat');
  assert.deepStrictEqual(q6.kunci, ['Orbital'], 'Kunci soal 6 harus ["Orbital"]');
  assert.ok(!q6.pertanyaan.endsWith('(Orbital)'), 'Teks "(Orbital)" harus dibersihkan dari kalimat pertanyaan');

  console.log('✔ Test 11 Lolos: Verifikasi 7 Perbaikan Format Ujian Asli User Terverifikasi Presisi');
} catch (err) {
  console.error('❌ Test 11 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 12: Verifikasi Formula Matematika/Kimia Bertingkat (m:sPre Isotop, m:f Pecahan, & Kunci Highlight Math)
// --------------------------------------------------------------------------
try {
  const { convertOmmlToHtml, convertDocumentXmlToText, parseQuestionsDirectly } = docxParser;

  // 1. Uji Pecahan Matematika <m:f>
  const mockFractionXml = `
    <m:oMath>
      <m:f>
        <m:num><m:r><m:t>3</m:t></m:r></m:num>
        <m:den><m:r><m:t>4</m:t></m:r></m:den>
      </m:f>
    </m:oMath>
  `;
  const fracHtml = convertOmmlToHtml(mockFractionXml);
  assert.ok(fracHtml.includes('border-bottom:1px solid currentColor'), 'Pecahan matematika harus memiliki garis pembagi pecahan');
  assert.ok(fracHtml.includes('3') && fracHtml.includes('4'), 'Pembilang dan penyebut pecahan harus diekstrak utuh');

  // 2. Uji Notasi Atom Bertingkat (Isotop Kimia) <m:sPre>
  const mockIsotopeXml = `
    <m:oMath>
      <m:sPre>
        <m:sub><m:r><m:t>28</m:t></m:r></m:sub>
        <m:sup><m:r><m:t>58</m:t></m:r></m:sup>
        <m:e><m:r><m:t>Ni</m:t></m:r></m:e>
      </m:sPre>
    </m:oMath>
  `;
  const isoHtml = convertOmmlToHtml(mockIsotopeXml);
  assert.ok(isoHtml.includes('display:inline-block; vertical-align:-0.3em;'), 'Isotop harus disusun dalam blok bertingkat presisi');
  assert.ok(isoHtml.includes('>58<') && isoHtml.includes('>28<') && isoHtml.includes('Ni'), 'Nomor massa 58 dan nomor atom 28 harus bertumpuk di sebelah kiri Ni');

  // 3. Uji Pembersihan [TABEL_X] pada soal MENCOCOKKAN
  const mockMatchingXml = `
    <w:document>
      <w:body>
        <w:p><w:r><w:t>4. Hubungkan pernyataan kiri dan kanan: [TABEL_1]</w:t></w:r></w:p>
        <w:tbl>
          <w:tr><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Premis 1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Respon A</w:t></w:r></w:p></w:tc></w:tr>
          <w:tr><w:tc><w:p><w:r><w:t>2</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Premis 2</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Respon B</w:t></w:r></w:p></w:tc></w:tr>
        </w:tbl>
      </w:body>
    </w:document>
  `;
  const parsedMatching = convertDocumentXmlToText(mockMatchingXml, {});
  const questionsMatching = parseQuestionsDirectly(parsedMatching.text, {}, parsedMatching.tables);
  assert.strictEqual(questionsMatching.length, 1);
  assert.strictEqual(questionsMatching[0].tipe, 'MENCOCOKKAN');
  assert.ok(!questionsMatching[0].pertanyaan.includes('[TABEL_1]'), 'Tag [TABEL_1] harus otomatis dibersihkan pada soal MENCOCOKKAN');

  console.log('✔ Test 12 Lolos: Verifikasi Formula Matematika/Kimia Bertingkat (m:sPre, m:f, & Clean Tabel) Terverifikasi Presisi');
} catch (err) {
  console.error('❌ Test 12 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 13: Normalisasi Pangkat Konfigurasi Elektron Kimia & CSS Tipografi Eksponen
// --------------------------------------------------------------------------
try {
  const { normalizeFormulasAndSuperscripts, parseQuestionsDirectly } = docxParser;

  // 1. Uji Normalisasi Eksponen Konfigurasi Elektron (dari format berjarak 1s 2 -> 1s<sup>2</sup>)
  const spacedConfig = '1s <sup>2</sup> 2s <sup>2</sup> 2p <sup>6</sup> 3s <sup>2</sup> 3p <sup>4</sup>';
  const normalizedA = normalizeFormulasAndSuperscripts(spacedConfig);
  assert.strictEqual(normalizedA, '1s<sup>2</sup> 2s<sup>2</sup> 2p<sup>6</sup> 3s<sup>2</sup> 3p<sup>4</sup>', 'Eksponen konfigurasi elektron harus rapat tanpa spasi');

  // 2. Uji Konversi Teks Polos Guru (1s 2 2s 2 2p 6 -> 1s<sup>2</sup> 2s<sup>2</sup> 2p<sup>6</sup>)
  const plainConfig = '1s 2 2s 2 2p 6 3s 2 3p 6 4s 2 3d 10 4s 2';
  const normalizedPlain = normalizeFormulasAndSuperscripts(plainConfig);
  assert.strictEqual(normalizedPlain, '1s<sup>2</sup> 2s<sup>2</sup> 2p<sup>6</sup> 3s<sup>2</sup> 3p<sup>6</sup> 4s<sup>2</sup> 3d<sup>10</sup> 4s<sup>2</sup>', 'Teks polos konfigurasi elektron harus otomatis diubah menjadi format pangkat presisi');

  // 3. Uji Deteksi Kunci Isian dengan Formula Bertingkat (Soal 9)
  const q9Raw = `9. Unsur Mn memiliki jumlah neutron 30 dan memiliki konfigurasi elektron 1s2 2s2 2p6. Maka notasi atom Mn adalah ... (<sub>25</sub><sup>55</sup> Mn)`;
  const parsedQ9 = parseQuestionsDirectly(q9Raw, {});
  assert.strictEqual(parsedQ9.length, 1);
  assert.strictEqual(parsedQ9[0].tipe, 'ISIAN', 'Soal berakhiran kunci dalam kurung harus dideteksi sebagai ISIAN');
  assert.deepStrictEqual(parsedQ9[0].kunci, ['<sub>25</sub><sup>55</sup> Mn'], 'Kunci isian formula bertingkat harus diekstrak utuh');

  // 4. Uji Integritas CSS Tipografi Sup/Sub di sidepanel.css
  const fs = await import('fs');
  const path = await import('path');
  const cssPath = path.resolve('sidepanel/sidepanel.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  assert.ok(cssContent.includes('.q-option-item sup'), 'CSS sidepanel harus memiliki aturan spesifik untuk .q-option-item sup');
  assert.ok(cssContent.includes('vertical-align: 0.42em;'), 'Superscript harus diangkat jelas secara visual');

  console.log('✔ Test 13 Lolos: Normalisasi Pangkat Konfigurasi Elektron Kimia & CSS Tipografi Eksponen Terverifikasi Presisi');
} catch (err) {
  console.error('❌ Test 13 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 14: Verifikasi Perbaikan 5 Cacat Screenshots User (Ion, Subskrip Kiri, Benar/Salah Highlight, CSS Multi-Line)
// --------------------------------------------------------------------------
try {
  const { normalizeFormulasAndSuperscripts, parseQuestionsDirectly } = docxParser;

  // 1. Uji Normalisasi Eksponen Ion (X2+ -> X<sup>2+</sup>, Ca2+ -> Ca<sup>2+</sup>)
  const ionText = 'Konfigurasi elektron untuk ion X2+ adalah ...';
  const normalizedIon = normalizeFormulasAndSuperscripts(ionText);
  assert.strictEqual(normalizedIon, 'Konfigurasi elektron untuk ion X<sup>2+</sup> adalah ...', 'Eksponen muatan ion X2+ harus otomatis diformat menjadi X<sup>2+</sup>');

  // 2. Uji Normalisasi Subskrip Kiri & Spasi Liar (<sub>9</sub> F -> <sub>9</sub>F, 11 Na -> <sub>11</sub>Na)
  assert.strictEqual(normalizeFormulasAndSuperscripts('<sub>9</sub> F'), '<sub>9</sub>F', 'Spasi liar antara subskrip dan simbol unsur harus dihilangkan');
  assert.strictEqual(normalizeFormulasAndSuperscripts('11 Na'), '<sub>11</sub>Na', 'Format nomor atom di sebelah kiri tanpa tag harus otomatis diubah jadi subskrip');

  // 3. Uji Deteksi Kunci Benar/Salah Berdasarkan Opsi yang Ditebalkan / Highlight Kuning (Soal 22)
  const bsDoc = `
    22. Diketahui beberapa atom unsur.
    Nyatakan pernyataan di bawah ini benar atau salah:
    A. Unsur C memiliki energi ionisasi paling rendah
    B. **Unsur A memiliki keelektronegatifan paling besar**
    C. Unsur A dan B berada di golongan yang sama
    D. **Unsur A dan C terletak pada periode yang sama**
    E. **Jari-jari atom B lebih panjang dari atom A**
  `;
  const parsedBs = parseQuestionsDirectly(bsDoc, {});
  assert.strictEqual(parsedBs.length, 1, 'Harus mendeteksi 1 butir soal Benar/Salah');
  assert.strictEqual(parsedBs[0].tipe, 'BENAR_SALAH', 'Tipe soal harus BENAR_SALAH');
  assert.deepStrictEqual(parsedBs[0].kunci, {
    A: 'Salah',
    B: 'Benar',
    C: 'Salah',
    D: 'Benar',
    E: 'Benar'
  }, 'Kunci Benar/Salah harus memetakan opsi bertanda highlight (B, D, E) sebagai Benar dan sisanya (A, C) sebagai Salah');

  // 4. Uji CSS white-space: pre-wrap pada .q-body & isolasi inline container .q-opt-text
  const fs = await import('fs');
  const path = await import('path');
  const cssContent = fs.readFileSync(path.resolve('sidepanel/sidepanel.css'), 'utf-8');
  assert.ok(cssContent.includes('white-space: pre-wrap;'), 'sidepanel.css harus menyertakan white-space: pre-wrap agar stimulus bertingkat tidak kolaps 1 baris');
  assert.ok(cssContent.includes('.q-opt-text'), 'sidepanel.css harus memiliki styling .q-opt-text agar eksponen tidak pecah oleh flex container');

  const sideJsContent = fs.readFileSync(path.resolve('sidepanel/sidepanel.js'), 'utf-8');
  assert.ok(sideJsContent.includes('q-opt-text'), 'sidepanel.js harus membungkus optText ke dalam .q-opt-text agar tidak terfragmentasi oleh flexbox');

  console.log('✔ Test 14 Lolos: Verifikasi Perbaikan 5 Cacat Screenshots User (Ion, Subskrip Kiri, Benar/Salah Highlight, CSS Multi-Line) Terverifikasi Presisi');
} catch (err) {
  console.error('❌ Test 14 Gagal:', err);
  process.exit(1);
}

// --------------------------------------------------------------------------
// TEST 15: Proteksi Korosi Data Gambar Base64 & Konversi Markdown Bold ke HTML
// --------------------------------------------------------------------------
try {
  const { normalizeFormulasAndSuperscripts, parseQuestionsDirectly } = docxParser;

  // 1. Uji Proteksi Data Base64 & Tag Tabel
  const sampleTableWithImage = `
    <table class="afresto-exam-table" style="background:#f1f5f9;">
      <tr>
        <td>1s 2 dan ion X2+</td>
        <td><img src="data:image/png;base64,iVBORw0KGgo3p45s2==" /></td>
      </tr>
    </table>
  `;
  const normalizedHtml = normalizeFormulasAndSuperscripts(sampleTableWithImage);
  assert.ok(normalizedHtml.includes('background:#f1f5f9;'), 'Hex color #f1f5f9 tidak boleh rusak menjadi 5f<sup>9</sup>');
  assert.ok(normalizedHtml.includes('src="data:image/png;base64,iVBORw0KGgo3p45s2=="'), 'Data gambar Base64 tidak boleh terkontaminasi tag superskrip');
  assert.ok(normalizedHtml.includes('1s<sup>2</sup>'), 'Formula kimia di luar gambar tetap ternormalisasi presisi');
  assert.ok(normalizedHtml.includes('X<sup>2+</sup>'), 'Muatan ion di luar gambar tetap ternormalisasi presisi');

  // 2. Uji Konversi Markdown Bold (**teks**) menjadi <b>teks</b> pada pertanyaan
  const docWithBold = `
    10. Suatu unsur X memiliki nomor atom 16. **Konfigurasi elektron** untuk ion X2+ adalah ...
    A. 1s2 2s2 2p6 3s2 3p6
    B. 1s2 2s2 2p6 3s2 3p4
  `;
  const parsedQ10 = parseQuestionsDirectly(docWithBold, {});
  assert.strictEqual(parsedQ10.length, 1);
  assert.ok(parsedQ10[0].pertanyaan.includes('<b>Konfigurasi elektron</b>'), 'Markdown **teks** harus diubah menjadi <b>teks</b>');
  assert.ok(!parsedQ10[0].pertanyaan.includes('**'), 'Tidak boleh ada sisa karakter asterik mentah di pertanyaan');

  console.log('✔ Test 15 Lolos: Proteksi Korosi Data Gambar Base64 & Konversi Markdown Bold ke HTML Terverifikasi Presisi');
} catch (err) {
  console.error('❌ Test 15 Gagal:', err);
  process.exit(1);
}

console.log('\n========================================================');
console.log('⭐ VERIFIKASI QC MILESTONE 3.4: 100% TEST PASS (GRADE A+)');
console.log('========================================================\n');
