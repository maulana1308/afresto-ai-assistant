import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pathToFileURL } from 'url';

const docxParserUrl = pathToFileURL('d:/Google Antigravity/Add On Afresto/scripts/docx_parser.js').href;
const { parseDocx } = await import(docxParserUrl);

const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAASUlEQVR42u3PMQEAAAgEIDu/qLE3NnAEE7BJ6u0A8MsHQD4A+QAAAAD88gGQD0A+APkAAADALx8A+QDkA5APAAAA/PIBkA9APgD5AABo9wO6eO9pSAAAAABJRU5ErkJggg==";
const samplePngBuffer = Buffer.from(samplePngBase64, 'base64');

// 1. Numbering XML
const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="2">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="upperLetter"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="3">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val=""/>
      <w:lvlJc w:val="left"/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
  <w:num w:numId="3"><w:abstractNumId w:val="3"/></w:num>
</w:numbering>`;

// 2. Document XML
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <!-- KOP & PETUNJUK RESMI AFRESTO AI -->
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>PANDUAN &amp; TEMPLATE RESMI FORMAT NASKAH SOAL AFRESTO AI</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Berkas ini berisi contoh lengkap 6 tipe soal resmi, ragam format kunci jawaban, serta dukungan Bullet and Numbering.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Mata Pelajaran: Informatika / Simulasi Digital</w:t></w:r></w:p>
    <w:p><w:r><w:t>Tingkat / Fase: SMA / SMK Fase E (Kelas 10)</w:t></w:r></w:p>
    <w:p><w:r><w:t>================================================================================</w:t></w:r></w:p>

    <!-- CONTOH 1: PG STANDAR DENGAN WORD NATIVE NUMBERING & NATIVE BULLET POINTS -->
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Perhatikan karakteristik perangkat memori komputer berikut ini:</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr>
      <w:r><w:t>Bersifat volatile (data tersimpan akan hilang ketika aliran daya listrik padam)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr>
      <w:r><w:t>Memiliki kecepatan akses baca dan tulis yang sangat tinggi mendekati prosesor</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr>
      <w:r><w:t>Berfungsi sebagai memori kerja utama dalam mengeksekusi instruksi sistem operasi</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>Berdasarkan karakteristik tersebut, komponen perangkat keras yang dimaksud adalah...</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
      <w:r><w:t>Hard Disk Drive (HDD)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
      <w:r><w:t>Solid State Drive (SSD)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
      <w:r><w:t>Random Access Memory (RAM)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
      <w:r><w:t>Read Only Memory (ROM)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
      <w:r><w:t>Compact Disc Read-Only Memory (CD-ROM)</w:t></w:r>
    </w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: C</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: RAM merupakan memori kerja utama komputer yang bersifat volatile.</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 2: PG STANDAR DENGAN MANUAL NUMBERING & OPSI BOLD SEBAGAI KUNCI -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>2. Protokol jaringan yang bertugas mengamankan transmisi data di internet menggunakan enkripsi SSL/TLS pada port 443 adalah...</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. HTTP</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>**B. HTTPS**</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. FTP</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. SMTP</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. Telnet</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: Guru dapat mencetak tebal (bold) opsi jawaban yang benar tanpa menulis baris Kunci terpisah.</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 3: PG DENGAN STIMULUS GAMBAR PNG & MULTILINGUAL KEY (ENGLISH) -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>3. Perhatikan diagram topologi jaringan di bawah ini!</w:t></w:r></w:p>
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="1200000" cy="1200000"/>
            <wp:docPr id="1" name="Gambar Topologi"/>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr><pic:cNvPr id="0" name="image1.png"/><pic:cNvPicPr/></pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="rIdImage1"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm><a:off x="0" y="0"/><a:ext cx="1200000" cy="1200000"/></a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>Topologi jaringan komputer yang menghubungkan setiap node ke satu kabel tunggal utama (backbone) adalah topologi...</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Ring</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Star</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Mesh</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Bus</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. Tree</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Answer: D</w:t></w:r></w:p>
    <w:p><w:r><w:t>Explanation: Topologi Bus menggunakan kabel backbone tunggal dengan terminator di kedua ujungnya.</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 4: PG DENGAN FORMULA OMML & KUNCI DI AKHIR KALIMAT SOAL -->
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>4. Hasil penyederhanaan dari bentuk aljabar pecahan </w:t></w:r>
      <m:oMath>
        <m:f>
          <m:num><m:r><w:rPr><w:rFonts w:ascii="Cambria Math"/></w:rPr><m:t>x² - 9</m:t></m:r></m:num>
          <m:den><m:r><w:rPr><w:rFonts w:ascii="Cambria Math"/></w:rPr><m:t>x - 3</m:t></m:r></m:den>
        </m:f>
      </m:oMath>
      <w:r><w:rPr><w:b/></w:rPr><w:t> untuk x ≠ 3 adalah ... (A)</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>A. x + 3</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. x - 3</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. x² + 3</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. 2x - 3</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. 3x + 1</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: (x² - 9) = (x - 3)(x + 3). Dibagi (x - 3) menghasilkan (x + 3).</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 5: PILIHAN GANDA KOMPLEKS (MULTI-KUNCI JAWABAN) -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>5. Manakah di antara sistem operasi berikut yang merupakan perangkat lunak berbasis open-source? (Pilihlah 3 jawaban yang benar)</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Ubuntu Linux</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Microsoft Windows 11</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Debian GNU/Linux</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Red Hat Fedora</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. Apple macOS Monterey</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: A, C, D</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: Ubuntu, Debian, dan Fedora adalah distribusi Linux berlisensi sumber terbuka (open-source).</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 6: BENAR / SALAH (FORMAT PERNYATAAN BERBUTIR) -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>6. Tentukan nilai kebenaran dari setiap pernyataan berikut mengenai keamanan akun digital!</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Mengaktifkan Two-Factor Authentication (2FA) mempersulit peretas membobol akun. (Benar)</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Kata sandi yang kuat cukup menggunakan 4 digit angka sederhana tanggal lahir. (Salah)</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Phishing merupakan modus rekayasa sosial untuk mencuri kredensial login via tautan palsu. (Benar)</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Perangkat lunak antivirus tidak perlu diperbarui berkala jika komputer offline. (Salah)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: A: Benar, B: Salah, C: Benar, D: Salah</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 7: MENCOCOKKAN / MENJODOHKAN (FORMAT PASANGAN PREMIS & RESPON) -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>7. Pasangkanlah istilah perangkat keras jaringan komputer di sebelah kiri dengan fungsi utamanya di sebelah kanan!</w:t></w:r></w:p>
    <w:p><w:r><w:t>1. Router - Mengarahkan paket data antar jaringan komputer yang berbeda subnet</w:t></w:r></w:p>
    <w:p><w:r><w:t>2. Switch - Menghubungkan berbagai perangkat komputer dalam satu Local Area Network (LAN)</w:t></w:r></w:p>
    <w:p><w:r><w:t>3. Access Point - Memancarkan sinyal radio nirkabel untuk menyediakan konektivitas Wi-Fi</w:t></w:r></w:p>
    <w:p><w:r><w:t>4. Firewall - Menyaring dan memblokir paket lalu lintas data mencurigakan sesuai aturan keamanan</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: 1-A, 2-B, 3-C, 4-D</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 8: ISIAN SINGKAT (SINGLE & ALTERNATIF KUNCI JAWABAN) -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>8. Tokoh proklamator kemerdekaan Republik Indonesia yang juga menjabat sebagai Presiden pertama RI adalah... (Ir. Soekarno)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: Ir. Soekarno / Soekarno / Bung Karno</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pembahasan: Tanda garis miring (/) pada isian singkat memisahkan variasi penulisan jawaban yang dapat diterima sistem.</w:t></w:r></w:p>
    <w:p/>

    <!-- CONTOH 9: URAIAN / ESSAY -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>9. Jelaskan 3 perbedaan mendasar antara jaringan kabel (Ethernet) dengan jaringan nirkabel (Wi-Fi) ditinjau dari aspek kecepatan transmisi, stabilitas koneksi, dan fleksibilitas instalasi!</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kunci: Rubrik Penilaian: 1. Kecepatan (Ethernet memiliki throughput lebih stabil), 2. Stabilitas (Ethernet kebal gangguan frekuensi radio), 3. Fleksibilitas (Wi-Fi memungkinkan mobilitas tanpa kabel fisik).</w:t></w:r></w:p>
    <w:p/>

    <!-- BAGIAN AKHIR: RANGKUMAN DAFTAR KUNCI JAWABAN NASKAH -->
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>DAFTAR KUNCI JAWABAN</w:t></w:r></w:p>
    <w:p><w:r><w:t>1. C</w:t></w:r></w:p>
    <w:p><w:r><w:t>2. B</w:t></w:r></w:p>
    <w:p><w:r><w:t>3. D</w:t></w:r></w:p>
    <w:p><w:r><w:t>4. A</w:t></w:r></w:p>
    <w:p><w:r><w:t>5. A, C, D</w:t></w:r></w:p>
    <w:p><w:r><w:t>6. A: Benar, B: Salah, C: Benar, D: Salah</w:t></w:r></w:p>
    <w:p><w:r><w:t>7. 1-A, 2-B, 3-C, 4-D</w:t></w:r></w:p>
    <w:p><w:r><w:t>8. Ir. Soekarno</w:t></w:r></w:p>
    <w:p><w:r><w:t>9. Rubrik Terlampir</w:t></w:r></w:p>

  </w:body>
</w:document>`;

// 3. File ZIP Manifest & Content Types
const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:settings>`;

// Zip Archive Builder
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

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
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    parts.push(Buffer.concat([localHeader, filenameBuf, compressed]));

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
    currentOffset += 30 + filenameBuf.length + compressed.length;
  }

  const cdStart = currentOffset;
  const cdData = Buffer.concat(cdEntries);
  const cdSize = cdData.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, cdData, eocd]);
}

const entries = [
  { name: "[Content_Types].xml", data: contentTypesXml },
  { name: "_rels/.rels", data: relsXml },
  { name: "word/document.xml", data: documentXml },
  { name: "word/numbering.xml", data: numberingXml },
  { name: "word/_rels/document.xml.rels", data: docRelsXml },
  { name: "word/settings.xml", data: settingsXml },
  { name: "word/media/image1.png", data: samplePngBuffer }
];

const zipBuf = createZipArchive(entries);
const ab = zipBuf.buffer.slice(zipBuf.byteOffset, zipBuf.byteOffset + zipBuf.byteLength);
const parsed = await parseDocx(ab);

console.log('=== HASIL PARSING TEMPLATE LENGKAP ===');
console.log('Jumlah soal terdeteksi:', parsed.directQuestions.length);
parsed.directQuestions.forEach(q => {
  console.log(`[Soal ${q.id}] ${q.tipe} | Kunci:`, q.kunci, `| Opsi: ${Object.keys(q.opsi || {}).length} | Pasangan: ${q.pasangan ? q.pasangan.length : 0} | Gambar: ${q.butuh_gambar ? 'YA' : 'TIDAK'}`);
});
