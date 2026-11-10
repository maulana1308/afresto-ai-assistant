/**
 * Generator Berkas Uji Coba: sample_bank_soal_guru.docx
 * Membuat dokumen Word .docx sintetis yang valid dengan:
 * 1. KOP Soal & Info Akademik
 * 2. Soal PG dengan kunci di bawah (Kunci: C)
 * 3. Soal dengan Persamaan Matematika (OMML <m:oMath> LaTeX)
 * 4. Soal dengan Opsi Tebal / Bold sebagai Kunci (**B. HTTPS**)
 * 5. Soal dengan Stimulus Gambar Biner (.png)
 * 6. Soal Benar/Salah berformat Tabel
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Gambar transparan/diagram mini PNG 64x64 valid
const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAASUlEQVR42u3PMQEAAAgEIDu/qLE3NnAEE7BJ6u0A8MsHQD4A+QAAAAD88gGQD0A+APkAAADALx8A+QDkA5APAAAA/PIBkA9APgD5AABo9wO6eO9pSAAAAABJRU5ErkJggg==";
const samplePngBuffer = Buffer.from(samplePngBase64, 'base64');

// 2. XML Dokumen Word Lengkap
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <w:body>
    <!-- KOP Naskah Asesmen -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>PEMERINTAH DAERAH PROVINSI - DINAS PENDIDIKAN</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>PENILAIAN AKHIR SEMESTER (PAS) TAHUN 2026/2027</w:t></w:r></w:p>
    <w:p><w:r><w:t>Mata Pelajaran: Dasar-Dasar TJKT &amp; Pemrograman</w:t></w:r></w:p>
    <w:p><w:r><w:t>Tingkat / Kelas: Fase E (Kelas 10 SMK)</w:t></w:r></w:p>
    <w:p><w:r><w:t>Waktu: 90 Menit</w:t></w:r></w:p>
    <w:p><w:r><w:t>--------------------------------------------------</w:t></w:r></w:p>

    <!-- Butir 1: Pilihan Ganda Standar dengan Kunci di Bawah -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>1. Perangkat jaringan komputer yang berfungsi untuk menghubungkan dua atau lebih jaringan dengan subnet IP yang berbeda adalah...</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Switch Unmanaged</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Hub Pasif</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Router Layer 3</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Repeater Sinyal</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. Patch Panel</w:t></w:r></w:p>
    <w:p><w:r><w:t>Kunci Jawaban: C</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: Router bekerja pada Network Layer (Layer 3) model OSI untuk melakukan routing paket antar subnet yang berbeda.</w:t></w:r></w:p>

    <!-- Butir 2: Soal dengan Persamaan Matematika (OMML <m:oMath>) -->
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>2. Dalam fisika transmisi gelombang radio data, jika frekuensi sinyal dihitung dengan persamaan </w:t></w:r>
      <m:oMath>
        <m:r><m:t>f = </m:t></m:r>
        <m:f>
          <m:num><m:r><m:t>c</m:t></m:r></m:num>
          <m:den><m:r><m:t>λ</m:t></m:r></m:den>
        </m:f>
      </m:oMath>
      <w:r><w:t>, maka hubungan panjang gelombang terhadap kecepatan cahaya dirumuskan dengan...</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>A. λ = c . f</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. λ = c / f</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. c = λ / f</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. f = λ / c</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. λ = f / c</w:t></w:r></w:p>
    <w:p><w:r><w:t>Kunci: B</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: Dari f = c / λ, jika kedua ruas dikalikan λ dan dibagi f, maka diperoleh λ = c / f.</w:t></w:r></w:p>

    <!-- Butir 3: Soal dengan Opsi Tebal (Bold) sebagai Penanda Kunci -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>3. Protokol jaringan web yang mengamankan komunikasi data menggunakan enkripsi sertifikat SSL/TLS pada port 443 adalah...</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. HTTP Biasa (Port 80)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>B. HTTPS Secure (Port 443)</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. FTP File Transfer</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Telnet Remote Console</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. TFTP Trivial</w:t></w:r></w:p>
    <!-- Kunci tidak ditulis di bawah, tapi opsi B dicetak tebal -->

    <!-- Butir 4: Soal dengan Stimulus Gambar Media PNG -->
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>4. Perhatikan gambar diagram perangkat keras jaringan komputer berikut ini!</w:t></w:r>
      <w:drawing>
        <a:blip r:embed="rId1"/>
      </w:drawing>
    </w:p>
    <w:p><w:r><w:t>Berdasarkan gambar ilustrasi di atas, perangkat tersebut berfungsi sebagai titik pusat koneksi nirkabel (wireless) pada area lokal. Nama perangkat tersebut adalah...</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Wireless Access Point (WAP)</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Kabel Fiber Optik</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Konektor RJ-45</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Tang Crimping</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. LAN Tester</w:t></w:r></w:p>
    <w:p><w:r><w:t>Kunci: A</w:t></w:r></w:p>

    <!-- Butir 5: Soal Benar / Salah Berformat Tabel -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>5. Tentukan kebenaran dari masing-masing pernyataan terkait media transmisi kabel jaringan berikut ini!</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Pernyataan Konsep Jaringan</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Nilai Kebenaran</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Kabel UTP Kategori 6 mendukung kecepatan transfer data hingga 10 Gbps pada jarak tertentu.</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Benar</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Alamat IP 192.168.1.1 merupakan alamat IP Publik yang dapat diakses langsung dari internet global.</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Salah</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Kabel Fiber Optik mentransmisikan data menggunakan pulsa cahaya dan kebal terhadap interferensi elektromagnetik.</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Benar</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

  </w:body>
</w:document>`;

// 3. XML Relasi Media
const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

// 4. Content Types
const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

// 5. Susun Berkas ZIP DOCX
function buildDocxZip() {
  const files = {
    '[Content_Types].xml': contentTypesXml,
    'word/_rels/document.xml.rels': relsXml,
    'word/document.xml': documentXml,
    'word/media/image1.png': samplePngBuffer
  };

  const localHeaders = [];
  const cdHeaders = [];
  let currentOffset = 0;

  for (const [filePath, contentData] of Object.entries(files)) {
    const nameBuf = Buffer.from(filePath, 'utf8');
    const rawData = Buffer.isBuffer(contentData) ? contentData : Buffer.from(contentData, 'utf8');
    const compData = zlib.deflateRawSync(rawData);

    // Local Header
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8); // deflate
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(0, 14);
    lh.writeUInt32LE(compData.length, 18);
    lh.writeUInt32LE(rawData.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBuf.copy(lh, 30);

    // Central Directory Header
    const cdh = Buffer.alloc(46 + nameBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0, 8);
    cdh.writeUInt16LE(8, 10);
    cdh.writeUInt16LE(0, 12);
    cdh.writeUInt16LE(0, 14);
    cdh.writeUInt32LE(0, 16);
    cdh.writeUInt32LE(compData.length, 20);
    cdh.writeUInt32LE(rawData.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(currentOffset, 42);
    nameBuf.copy(cdh, 46);

    localHeaders.push(lh);
    localHeaders.push(compData);
    cdHeaders.push(cdh);

    currentOffset += lh.length + compData.length;
  }

  const cdOffset = currentOffset;
  const cdBuf = Buffer.concat(cdHeaders);

  // EOCD
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, cdBuf, eocd]);
}

const outputPath = path.join(rootDir, 'sample_bank_soal_guru.docx');
const docxBuffer = buildDocxZip();
fs.writeFileSync(outputPath, docxBuffer);
console.log(`✓ Berhasil membuat berkas uji coba Word: ${outputPath} (${docxBuffer.length} bytes)`);
