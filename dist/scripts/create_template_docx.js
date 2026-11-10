/**
 * Generator Berkas Template Resmi: TEMPLATE_SOAL_AFRESTO.docx
 * Memproduksi dokumen Microsoft Word (.docx) berstandar OpenXML valid 100%
 * yang mencakup contoh 6 tipe soal resmi dan panduan format terbaik untuk Bapak/Ibu Guru.
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

// 2. Konten Dokumen XML Template
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <w:body>
    <!-- KOP & PANDUAN PENGGUNAAN -->
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>TEMPLATE RESMI FORMAT NASKAH SOAL AFRESTO AI</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Gunakan berkas ini sebagai acuan penulisan soal agar 100% terbaca sempurna oleh sistem Afresto AI Assistant.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Mata Pelajaran: Simulasi dan Komunikasi Digital</w:t></w:r></w:p>
    <w:p><w:r><w:t>Tingkat / Kelas: Fase E (Kelas 10)</w:t></w:r></w:p>
    <w:p><w:r><w:t>--------------------------------------------------------------------------------</w:t></w:r></w:p>

    <!-- CONTOH 1: PILIHAN GANDA (PG) STANDAR -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>1. Protokol jaringan yang bertugas mentransfer halaman web secara aman dengan enkripsi SSL/TLS adalah...</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. HTTP</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. FTP</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. HTTPS</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. SMTP</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. Telnet</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: C</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: HTTPS menggunakan enkripsi SSL/TLS pada port 443 untuk mengamankan transmisi data web.</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 2: PILIHAN GANDA DENGAN HURUF TEBAL / BOLD SEBAGAI KUNCI -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>2. Komponen perangkat keras komputer yang berfungsi sebagai memori kerja utama yang bersifat volatile (hilang saat listrik mati) adalah...</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Hard Disk Drive (HDD)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>B. Random Access Memory (RAM)</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Read Only Memory (ROM)</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Solid State Drive (SSD)</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. Flash Drive USB</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: RAM menyimpan instruksi program aktif dan data operasional yang hilang ketika daya mati.</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 3: PILIHAN GANDA KOMPLEKS (LEBIH DARI 1 KUNCI BENAR) -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>3. Manakah di antara pilihan berikut yang merupakan contoh sistem operasi open-source? (Pilihlah 3 jawaban yang benar)</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Ubuntu Linux</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Microsoft Windows 11</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Debian GNU/Linux</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Fedora</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. Apple macOS</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: A, C, D</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: Ubuntu, Debian, dan Fedora adalah distribusi Linux berlisensi terbuka (open-source).</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 4: BENAR / SALAH (TABEL PERNYATAAN) -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>4. Tentukan nilai kebenaran dari setiap pernyataan berikut mengenai keamanan siber!</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Menggunakan autentikasi dua faktor (2FA) meningkatkan keamanan akun secara signifikan. (Benar)</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Password yang kuat minimal terdiri dari 4 digit angka sederhana tanggal lahir. (Salah)</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Phishing merupakan teknik penipuan untuk mencuri data pribadi melalui tautan palsu. (Benar)</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Antivirus tidak perlu diperbarui jika komputer jarang terkoneksi internet. (Salah)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: A: Benar, B: Salah, C: Benar, D: Salah</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 5: MENCOCOKKAN (PASANGAN PERNYATAAN & JAWABAN) -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>5. Pasangkanlah istilah perangkat jaringan di sebelah kiri dengan fungsi utamanya di sebelah kanan!</w:t></w:r></w:p>
    <w:p><w:r><w:t>1. Router - Mengarahkan paket data antar subnet jaringan yang berbeda</w:t></w:r></w:p>
    <w:p><w:r><w:t>2. Switch - Menghubungkan banyak perangkat dalam satu Local Area Network (LAN)</w:t></w:r></w:p>
    <w:p><w:r><w:t>3. Access Point - Memancarkan sinyal gelombang radio untuk koneksi nirkabel (Wi-Fi)</w:t></w:r></w:p>
    <w:p><w:r><w:t>4. Firewall - Menyaring lalu lintas jaringan berbahaya berdasarkan aturan keamanan</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: 1-A, 2-B, 3-C, 4-D</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 6: ISIAN SINGKAT -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>6. Topologi jaringan yang menghubungkan setiap komputer ke satu konsentrator sentral (hub/switch) menyerupai pola bintang dinamakan topologi...</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: Star</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: Topologi Star menggunakan kabel terpusat ke hub/switch.</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 7: URAIAN / ESSAY -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>7. Jelaskan 3 perbedaan mendasar antara jaringan kabel (Ethernet) dengan jaringan nirkabel (Wi-Fi) ditinjau dari aspek kecepatan, stabilitas, dan fleksibilitas!</w:t></w:r></w:p>
    <w:p><w:r><w:t>Kunci: Rubrik jawaban: 1. Kecepatan (Ethernet lebih tinggi dan konsisten), 2. Stabilitas (Ethernet kebal interferensi gelombang), 3. Fleksibilitas (Wi-Fi lebih mudah berpindah lokasi tanpa kabel).</w:t></w:r></w:p>

  </w:body>
</w:document>`;

// 3. File ZIP Manifest & Content Types
const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:settings>`;

// 4. Struktur Arsip ZIP Manual
function createZipArchive(entries) {
  const parts = [];
  const cdEntries = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const filenameBuf = Buffer.from(entry.name, 'utf-8');
    const dataBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf-8');
    const compressed = zlib.deflateRawSync(dataBuf);
    const crc = crc32(dataBuf);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8); // Deflate
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localPart = Buffer.concat([localHeader, filenameBuf, compressed]);
    parts.push(localPart);

    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0, 8);
    cdHeader.writeUInt16LE(8, 10);
    cdHeader.writeUInt16LE(0, 12);
    cdHeader.writeUInt16LE(0, 14);
    cdHeader.writeUInt32LE(crc, 16);
    cdHeader.writeUInt32LE(compressed.length, 20);
    cdHeader.writeUInt32LE(dataBuf.length, 24);
    cdHeader.writeUInt16LE(filenameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(currentOffset, 42);

    cdEntries.push(Buffer.concat([cdHeader, filenameBuf]));
    currentOffset += localPart.length;
  }

  const cdStartOffset = currentOffset;
  const cdBuf = Buffer.concat(cdEntries);
  const cdLength = cdBuf.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdLength, 12);
  eocd.writeUInt32LE(cdStartOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, cdBuf, eocd]);
}

// CRC32 Table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// 5. Eksekusi Pembuatan Dokumen
const entries = [
  { name: "[Content_Types].xml", data: contentTypesXml },
  { name: "_rels/.rels", data: relsXml },
  { name: "word/document.xml", data: documentXml },
  { name: "word/_rels/document.xml.rels", data: docRelsXml },
  { name: "word/settings.xml", data: settingsXml },
  { name: "word/media/image1.png", data: samplePngBuffer }
];

const zipBuffer = createZipArchive(entries);
const targetPath = path.resolve(rootDir, 'TEMPLATE_SOAL_AFRESTO.docx');
fs.writeFileSync(targetPath, zipBuffer);
console.log('✔ Berhasil membuat template resmi di:', targetPath, `(${zipBuffer.length} bytes)`);

// Buat juga di folder dist/ jika ada
const distTarget = path.resolve(rootDir, 'dist/TEMPLATE_SOAL_AFRESTO.docx');
if (fs.existsSync(path.resolve(rootDir, 'dist'))) {
  fs.writeFileSync(distTarget, zipBuffer);
  console.log('✔ Berhasil menyalin template ke folder dist/:', distTarget);
}
