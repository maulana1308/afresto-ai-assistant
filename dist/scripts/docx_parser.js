/**
 * Afresto AI Assistant - Native Client-Side DOCX Document Parser
 * Mengekstrak teks, tabel, relasi, dan gambar dari berkas Microsoft Word (.docx)
 * secara 100% lokal di browser (Zero-Server, Zero-Dependency, Native Web Streams).
 */

/**
 * Ekstraksi tag penanda eksplisit level kognitif dari teks soal (misal: [C1], (C3), [C4 - Analisis], Level: C2)
 * dan membersihkan tag tersebut agar tidak terlihat pada teks soal ujian siswa.
 * Dilengkapi proteksi absolut token masking agar tidak mengorup data gambar base64 atau tabel HTML.
 */
export function extractAndStripCognitiveTag(text) {
  if (!text || typeof text !== 'string') {
    return { cleanText: text || '', level: null };
  }

  // Lindungi seluruh tag <img> dan <table> agar tidak terkontaminasi atau terpotong
  const protectedItems = [];
  let cleanText = text.replace(/(<img\b[^>]*>|<table\b[\s\S]*?<\/table>)/gi, (match) => {
    protectedItems.push(match);
    return `__PROTECTED_MEDIA_${protectedItems.length - 1}__`;
  });

  let level = null;

  // 1. Cek pola eksplisit C1 - C6 dengan pembatas ketat: [C1], (C2), [C3 - Aplikasi], Level: C4, Tingkat: C5
  const explicitCRegex = /(?:\[\s*(?:Level|Tingkat(?:\s+Kognitif)?)?\s*(C[1-6])(?:\s*[-–:][^\]]+)?\s*\]|\(\s*(?:Level|Tingkat(?:\s+Kognitif)?)?\s*(C[1-6])(?:\s*[-–:][^\)]+)?\s*\)|\b(?:Level|Tingkat(?:\s+Kognitif)?)\s*:\s*(C[1-6])\b)/i;
  const matchC = cleanText.match(explicitCRegex);
  if (matchC) {
    const cNum = (matchC[1] || matchC[2] || matchC[3]).toUpperCase();
    const map = {
      'C1': 'C1 (Mengingat)',
      'C2': 'C2 (Memahami)',
      'C3': 'C3 (Aplikasi)',
      'C4': 'C4 (Analisis)',
      'C5': 'C5 (Evaluasi)',
      'C6': 'C6 (Kreasi)'
    };
    level = map[cNum] || 'C4 (Analisis)';
    cleanText = cleanText.replace(explicitCRegex, '').trim();
  } else {
    // 2. Cek pola eksplisit HOTS / MOTS / LOTS dalam tanda kurung atau siku
    const hotsRegex = /(?:\[\s*(HOTS|MOTS|LOTS)\s*\]|\(\s*(HOTS|MOTS|LOTS)\s*\)|\b(?:Level|Tingkat)\s*:\s*(HOTS|MOTS|LOTS)\b)/i;
    const matchHots = cleanText.match(hotsRegex);
    if (matchHots) {
      const tag = (matchHots[1] || matchHots[2] || matchHots[3]).toUpperCase();
      if (tag === 'LOTS') level = 'C2 (Memahami)';
      else if (tag === 'MOTS') level = 'C3 (Aplikasi)';
      else if (tag === 'HOTS') level = 'C4 (Analisis)';
      cleanText = cleanText.replace(hotsRegex, '').trim();
    }
  }

  // Pulihkan seluruh media yang dilindungi tanpa ada satu karakter pun yang berubah
  cleanText = cleanText.replace(/__PROTECTED_MEDIA_(\d+)__/g, (match, idx) => {
    return protectedItems[parseInt(idx, 10)] || match;
  });

  return { cleanText, level };
}

/**
 * Mesin Deteksi Cerdas Level Kognitif Taksonomi Bloom (C1 s.d. C6)
 * Menganalisis Kata Kerja Operasional (KKO), struktur stimulus data/tabel, dan semantik pertanyaan.
 */
export function detectCognitiveLevel(text, hasStimulus = false) {
  if (!text || typeof text !== 'string') {
    return hasStimulus ? 'C4 (Analisis)' : 'C2 (Memahami)';
  }

  const { level } = extractAndStripCognitiveTag(text);
  if (level) return level;

  const lower = text.toLowerCase();

  // PRIORITAS 1: C6 (Kreasi / Mencipta / HOTS)
  // Membuat rekomendasi, merancang arsitektur/tata kelola, mendesain, memformulasikan solusi baru
  if (/\b(?:rancang(?:lah)?|merancang|perancangan|buatlah\s+rekomendasi|formulasikan|memformulasikan|kembangkan\s+(?:solusi|strategi|model)|desainlah|mendesain|ciptakan|menciptakan|gagaslah|menggagas|konstruksikan|kreasikan|create|design|formulate|devise|compose|construct)\b/i.test(lower)) {
    return 'C6 (Kreasi)';
  }

  // PRIORITAS 2: C5 (Evaluasi / Menilai / HOTS)
  // Menilai keputusan manajerial, mengkritik, menguji efektivitas, justifikasi, pertimbangan terbaik
  if (/\b(?:evaluasi(?:lah)?|mengevaluasi|nilailah|menilai|berikan\s+kritik|kritiklah|validasi|memvalidasi|putuskan|keputusan\s+(?:yang\s+)?paling\s+tepat|pertimbangkan|justifikasi|menjustifikasi|buktikan\s+kebenaran|keabsahan|efektivitas|evaluate|assess|judge|justify|critique|defend|appraise|rate|validate)\b/i.test(lower)) {
    return 'C5 (Evaluasi)';
  }

  // PRIORITAS 3: C4 (Analisis Khusus / Menganalisis / HOTS)
  // Menelaah kasus, membandingkan data, mengaitkan variabel, menganalisis tabel/grafik/jurnal, mendeteksi kesalahan
  const isAnalysisStrict = /\b(?:analisis(?:lah)?|menganalisis|telaah(?:lah)?|menelaah|bandingkan|membandingkan|perbandingan|kaitkan|mengaitkan|korelasikan|temukan\s+kesalahan|kesalahan\s+pencatatan|periksalah|faktor\s+penyebab|penyebab\s+terjadinya|kesimpulan\s+yang\s+(?:paling\s+)?(?:tepat|benar)|pernyataan\s+yang\s+(?:benar|tepat)\s+adalah|identifikasi\s+faktor|analyze|analyse|differentiate|distinguish|examine|infer|break\s+down)\b/i.test(lower);
  if (isAnalysisStrict) {
    return 'C4 (Analisis)';
  }

  // PRIORITAS 4: C3 (Aplikasi / Hitungan Matematis / Jurnal Akuntansi / MOTS)
  const isCalculation = /\b(?:hitung(?:lah)?|menghitung|perhitungan|berapakah\s+(?:besar|nilai|jumlah|saldo|harga|keuntungan|laba|rugi|pajak)|tentukan\s+(?:besar|nilai|jumlah|saldo|hasil|laba|rugi)|carilah\s+nilai|besarnya\s+(?:laba|rugi|saldo|modal|beban|pendapatan|kas|piutang)|susun(?:lah)?\s+(?:jurnal|laporan|persamaan)|calculate|compute|solve|determine\s+the\s+amount|find\s+the\s+value)\b/i.test(lower);
  if (isCalculation) {
    return 'C3 (Aplikasi)';
  }

  // Cek penerapan prosedur / operasional C3
  if (/\b(?:gunakan|menggunakan|terapkan|menerapkan|penerapan|penggunaan|selesaikan|bagaimanakah\s+cara\s+kerja|bagaimanakah\s+langkah|operasikan|mengoperasikan|tata\s+cara|apply|demonstrate|implement|prepare\s+the\s+journal)\b/i.test(lower)) {
    return 'C3 (Aplikasi)';
  }

  // PRIORITAS 5: C4 (Analisis Berbasis Stimulus Data / Kasus / Tabel Umum)
  if (/\b(?:berdasarkan\s+(?:data|kasus|tabel|grafik|bacaan|stimulus|jurnal|wacana|pernyataan))\b/i.test(lower)) {
    return 'C4 (Analisis)';
  }

  // Jika soal memiliki stimulus tabel akuntansi atau gambar teknis dan tidak masuk hitungan, maka otomatis C4 Analisis
  if (hasStimulus || lower.includes('<table') || lower.includes('[tabel_')) {
    return 'C4 (Analisis)';
  }

  // PRIORITAS 5: C2 (Memahami / Konseptual / LOTS)
  if (/\b(?:jelaskan|menjelaskan|penjelasan|terangkan|menerangkan|uraikan\s+mengapa|simpulkan|menyimpulkan|merangkum|rangkumlah|kelompokkan|mengelompokkan|artinya|maksud\s+dari|intisari|makna\s+(?:dari|kata)|klasifikasikan|mengklasifikasikan|kemukakan|explain|describe|summarize|paraphrase|clarify|classify|interpret|what\s+is\s+meant\s+by)\b/i.test(lower)) {
    return 'C2 (Memahami)';
  }

  // PRIORITAS 6: C1 (Mengingat / Faktual / LOTS)
  if (/\b(?:sebutkan|siapakah|siapa|di\s+manakah|kapan|tahun\s+berapakah|yang\s+dimaksud\s+dengan|apa\s+pengertian|apakah\s+nama|nama\s+tokoh|daftarkan|tunjukkan|pasangkan|define|identify|list|name|state|who|when|where|what\s+is\s+the\s+definition)\b/i.test(lower)) {
    return 'C1 (Mengingat)';
  }

  // Fallback netral: Jika pertanyaan pendek tanpa stimulus -> C2 (Memahami). Jika ada data -> C4 (Analisis).
  return hasStimulus ? 'C4 (Analisis)' : 'C2 (Memahami)';
}

/**
 * Membaca Central Directory dari berkas ZIP / DOCX menggunakan Uint8Array & DataView
 */
export function parseZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = [];

  // 1. Cari signature End of Central Directory (EOCD): 0x06054b50 (PK\x05\x06)
  // Mulai pencarian dari belakang berkas (maksimal 65KB + 22 bytes comment)
  let eocdOffset = -1;
  const maxSearch = Math.min(bytes.length, 65557);
  for (let i = bytes.length - 22; i >= bytes.length - maxSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Berkas bukan berupa ZIP/DOCX yang valid (EOCD tidak ditemukan).");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  // 2. Loop membaca Central Directory Headers: 0x02014b50 (PK\x01\x02)
  let currentOffset = cdOffset;
  const textDecoder = new TextDecoder('utf-8');

  for (let i = 0; i < totalEntries; i++) {
    if (currentOffset + 46 > bytes.length) break;
    const sig = view.getUint32(currentOffset, true);
    if (sig !== 0x02014b50) break;

    const compressionMethod = view.getUint16(currentOffset + 10, true);
    const compressedSize = view.getUint32(currentOffset + 20, true);
    const uncompressedSize = view.getUint32(currentOffset + 24, true);
    const nameLen = view.getUint16(currentOffset + 28, true);
    const extraLen = view.getUint16(currentOffset + 30, true);
    const commentLen = view.getUint16(currentOffset + 32, true);
    const localHeaderOffset = view.getUint32(currentOffset + 42, true);

    const nameBytes = bytes.subarray(currentOffset + 46, currentOffset + 46 + nameLen);
    const name = textDecoder.decode(nameBytes);

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    });

    currentOffset += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * Mendekompresi satu entri ZIP ke dalam Uint8Array
 */
export async function decompressZipEntry(buffer, entry) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  const localOffset = entry.localHeaderOffset;
  if (localOffset + 30 > bytes.length) {
    throw new Error(`Local header offset di luar jangkauan: ${entry.name}`);
  }

  const sig = view.getUint32(localOffset, true);
  if (sig !== 0x04034b50) {
    throw new Error(`Signature local file header tidak valid: ${entry.name}`);
  }

  const localNameLen = view.getUint16(localOffset + 26, true);
  const localExtraLen = view.getUint16(localOffset + 28, true);

  const dataStart = localOffset + 30 + localNameLen + localExtraLen;
  const compressedData = bytes.subarray(dataStart, dataStart + entry.compressedSize);

  // Method 0: Uncompressed (Stored)
  if (entry.compressionMethod === 0) {
    return compressedData;
  }

  // Method 8: Deflate (Native DecompressionStream)
  if (entry.compressionMethod === 8) {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('deflate-raw');
      const response = new Response(new Blob([compressedData]).stream().pipeThrough(ds));
      const arrayBuf = await response.arrayBuffer();
      return new Uint8Array(arrayBuf);
    } else {
      throw new Error("DecompressionStream tidak didukung di lingkungan runtime ini.");
    }
  }

  throw new Error(`Metode kompresi tidak didukung (${entry.compressionMethod}) untuk ${entry.name}`);
}

/**
 * Mem-parsing XML relasi (word/_rels/document.xml.rels) untuk memetakan rId -> nama file gambar
 */
export function parseDocxRelationships(relsXmlString) {
  const relsMap = {};
  if (!relsXmlString) return relsMap;

  // Regex mencari <Relationship Id="rId..." Target="media/image1.png" .../>
  const relRegex = /<Relationship[^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/gi;
  let match;
  while ((match = relRegex.exec(relsXmlString)) !== null) {
    const rId = match[1];
    let target = match[2];
    // Normalisasi target path (misal "media/image1.png" -> "word/media/image1.png")
    if (!target.startsWith('word/')) {
      target = 'word/' + target.replace(/^\/+/, '');
    }
    relsMap[rId] = target;
  }

  return relsMap;
}

/**
 * Mengonversi Uint8Array biner gambar ke Data URL Base64
 */
export function bytesToBase64DataUrl(bytes, mimeType = 'image/png') {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = (typeof btoa !== 'undefined') 
    ? btoa(binary) 
    : Buffer.from(binary, 'binary').toString('base64');
  return `data:${mimeType};base64,${b64}`;
}

/**
 * Mendeteksi MIME type berdasarkan ekstensi nama berkas media
 */
function getMimeType(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

/**
 * Mengekstrak struktur teks, tabel, dan gambar dari dokumen Word (.docx)
 * @param {ArrayBuffer} arrayBuffer - Buffer biner berkas .docx
 * @returns {Promise<Object>} Konten naskah terstruktur
 */
export async function parseDocx(arrayBuffer) {
  const entries = parseZipEntries(arrayBuffer);
  const textDecoder = new TextDecoder('utf-8');

  // Cari entri kunci
  const docEntry = entries.find(e => e.name === 'word/document.xml');
  if (!docEntry) {
    throw new Error("Berkas Word tidak valid: 'word/document.xml' tidak ditemukan.");
  }

  const relsEntry = entries.find(e => e.name === 'word/_rels/document.xml.rels');
  let relsMap = {};
  if (relsEntry) {
    const relsBytes = await decompressZipEntry(arrayBuffer, relsEntry);
    relsMap = parseDocxRelationships(textDecoder.decode(relsBytes));
  }

  // Ekstrak berkas media gambar jika ada
  const mediaEntries = entries.filter(e => e.name.startsWith('word/media/'));
  const mediaMap = {}; // path -> dataUrl

  for (const mediaEntry of mediaEntries) {
    try {
      const imgBytes = await decompressZipEntry(arrayBuffer, mediaEntry);
      const mime = getMimeType(mediaEntry.name);
      mediaMap[mediaEntry.name] = bytesToBase64DataUrl(imgBytes, mime);
    } catch (imgErr) {
      console.warn("Gagal mengekstrak gambar media:", mediaEntry.name, imgErr);
    }
  }

  // Buat mapping rId -> Data URL gambar
  const imageRIdMap = {};
  for (const [rId, targetPath] of Object.entries(relsMap)) {
    if (mediaMap[targetPath]) {
      imageRIdMap[rId] = mediaMap[targetPath];
    }
  }

  // Ekstrak dan parse word/numbering.xml jika ada
  const numberingEntry = entries.find(e => e.name === 'word/numbering.xml');
  let numberingMap = {};
  if (numberingEntry) {
    try {
      const numBytes = await decompressZipEntry(arrayBuffer, numberingEntry);
      const numXml = textDecoder.decode(numBytes);
      numberingMap = parseNumberingXml(numXml);
    } catch (numErr) {
      console.warn("Gagal mengekstrak numbering.xml:", numErr);
    }
  }

  // Ekstrak dan parse word/document.xml
  const docBytes = await decompressZipEntry(arrayBuffer, docEntry);
  const docXml = textDecoder.decode(docBytes);

  const parsedDoc = convertDocumentXmlToText(docXml, imageRIdMap, numberingMap);
  const directQuestions = parseQuestionsDirectly(parsedDoc.text, imageRIdMap, parsedDoc.tables);

  return {
    success: true,
    rawText: parsedDoc.text,
    paragraphs: parsedDoc.paragraphs,
    tables: parsedDoc.tables,
    images: imageRIdMap,
    directQuestions: directQuestions,
    stats: {
      paragraphCount: parsedDoc.paragraphs.length,
      tableCount: parsedDoc.tables.length,
      imageCount: Object.keys(imageRIdMap).length,
      detectedQuestionsCount: directQuestions.length
    }
  };
}

/**
 * Mem-parsing XML word/numbering.xml untuk memetakan numId -> ilvl -> format penomoran (decimal, upperLetter, dll)
 */
export function parseNumberingXml(numberingXml) {
  if (!numberingXml) return {};

  const abstractMap = {};
  const absRegex = /<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"[\s\S]*?<\/w:abstractNum>/gi;
  let absMatch;

  while ((absMatch = absRegex.exec(numberingXml)) !== null) {
    const absId = absMatch[1];
    abstractMap[absId] = {};

    const lvlRegex = /<w:lvl\b[^>]*w:ilvl="(\d+)"[\s\S]*?<w:numFmt\b[^>]*w:val="([^"]+)"[\s\S]*?<\/w:lvl>/gi;
    let lvlMatch;
    while ((lvlMatch = lvlRegex.exec(absMatch[0])) !== null) {
      const ilvl = parseInt(lvlMatch[1], 10);
      const fmt = lvlMatch[2]; // 'decimal', 'upperLetter', 'lowerLetter', 'bullet'
      abstractMap[absId][ilvl] = fmt;
    }
  }

  const numMap = {};
  const numRegex = /<w:num\b[^>]*w:numId="(\d+)"[\s\S]*?<w:abstractNumId\b[^>]*w:val="(\d+)"[\s\S]*?<\/w:num>/gi;
  let nMatch;

  while ((nMatch = numRegex.exec(numberingXml)) !== null) {
    const numId = nMatch[1];
    const absId = nMatch[2];
    if (abstractMap[absId]) {
      numMap[numId] = abstractMap[absId];
    }
  }

  return numMap;
}

/**
 * Mengonversi XML dokumen Word menjadi teks bersih terstruktur (dengan penanda tabel & gambar)
 */
export function convertDocumentXmlToText(xml, imageRIdMap = {}, numberingMap = {}) {
  const paragraphs = [];
  const tables = [];
  const fullTextLines = [];

  // Pindai blok top-level <w:p> dan <w:tbl> secara berurutan sesuai alur naskah
  const blockRegex = /<w:(p|tbl)(?:[\s\S]*?)<\/w:\1>/gi;
  let blockMatch;
  let tableIndex = 0;
  let listQCounter = 0;
  let listOptCounter = 0;

  // Cek apakah naskah dokumen sudah memuat penomoran soal alami (1., 2., ... 25.)
  const docHasNaturalNumbers = /<w:t\b[^>]*>\s*(?:No\.?\s*)?\d{1,3}[\.\)]/i.test(xml);

  while ((blockMatch = blockRegex.exec(xml)) !== null) {
    const blockType = blockMatch[1];
    const blockXml = blockMatch[0];

    // Jika blok adalah Tabel: <w:tbl>
    if (blockType === 'tbl') {
      const tableRows = [];
      const trRegex = /<w:tr[\s\S]*?<\/w:tr>/gi;
      let trMatch;
      while ((trMatch = trRegex.exec(blockXml)) !== null) {
        const trXml = trMatch[0];
        const cellParas = [];
        const tcRegex = /<w:tc[\s\S]*?<\/w:tc>/gi;
        let tcMatch;
        while ((tcMatch = tcRegex.exec(trXml)) !== null) {
          const tcXml = tcMatch[0];
          const pRegex = /<w:p[\s\S]*?<\/w:p>/gi;
          const paras = [];
          let pMatch;
          while ((pMatch = pRegex.exec(tcXml)) !== null) {
            let pText = extractTextRuns(pMatch[0]).trim();
            // Cek gambar embed di dalam sel/paragraf
            const imgRegex = /(?:<a:blip[^>]*?r:embed="([^"]+)"|<v:imagedata[^>]*?r:id="([^"]+)")/gi;
            let imgMatch;
            while ((imgMatch = imgRegex.exec(pMatch[0])) !== null) {
              const rId = imgMatch[1] || imgMatch[2];
              if (imageRIdMap[rId]) {
                pText += `<img src="${imageRIdMap[rId]}" style="max-height:120px; max-width:100%; display:block; margin:auto;" />`;
              } else {
                pText += (pText ? '\n' : '') + `[GAMBAR_EMBED: ${rId}]`;
              }
            }
            if (pText) paras.push(pText);
          }
          if (paras.length === 0) {
            let cellText = extractTextRuns(tcXml).trim();
            if (cellText) paras.push(cellText);
            else paras.push('');
          }
          cellParas.push(paras);
        }

        if (cellParas.length > 0) {
          const maxP = Math.max(...cellParas.map(p => p.length));
          const multiParaCount = cellParas.filter(p => p.length > 1).length;

          // Jika banyak sel dalam 1 baris memuat multi-paragraf (kebiasaan guru tekan Enter dalam sel untuk buat baris baru)
          if (maxP > 1 && multiParaCount >= 2) {
            for (let r = 0; r < maxP; r++) {
              const rowCells = cellParas.map(paras => (paras[r] !== undefined ? paras[r] : ''));
              if (rowCells.some(c => c.trim().length > 0)) {
                tableRows.push(rowCells);
              }
            }
          } else {
            const rowCells = cellParas.map(paras => paras.join(' ').trim());
            if (rowCells.some(c => c.trim().length > 0)) {
              tableRows.push(rowCells);
            }
          }
        }
      }

      if (tableRows.length > 0) {
        tableRows.renderedHtml = renderWordTableToHtml(blockXml, imageRIdMap);
        tableRows.hasRed = /<w:color\b[^>]*w:val="(?:FF0000|C00000|ED1C24|E00000|D00000|red)"/i.test(blockXml);
        tables.push(tableRows);
        tableIndex++;
        const tableFormatted = tableRows.map(row => '| ' + row.join(' | ') + ' |').join('\n');
        const tableBlockText = `[TABEL_${tableIndex}]\n${tableFormatted}`;
        paragraphs.push(tableBlockText);
        fullTextLines.push(tableBlockText);
      }
    } 
    // Jika blok adalah Paragraf: <w:p>
    else if (blockType === 'p') {
      let pText = extractTextRuns(blockXml).trim();

      const isHeadingOrStimulus = /^(?:\*\*|\*)?(?:(?:Read|Bacalah|Perhatikan|Cermati)\s+[\w\s]+(?:questions?|soal|berikut)|TEXT|TEKS|PASSAGE|BACAAN|WACANA|STIMULUS|READING|DIALOG|DIALOGUE|SOAL|PETUNJUK|DIRECTIONS|INSTRUCTIONS|BAGIAN|SECTION|PART|CHAPTER|BAB)\b/i.test(pText);
      if (isHeadingOrStimulus) {
        listOptCounter = 0;
      }

      // Selaraskan listQCounter & listOptCounter dengan penomoran manual jika ada
      const manualQMatch = pText.match(/^(?:\*\*)?(?:No\.?\s*)?(\d{1,3})[\.\)]/i);
      if (manualQMatch && !pText.match(/^(?:\*\*)?[A-Ea-e][\.\)]/i)) {
        const parsedManualNum = parseInt(manualQMatch[1], 10);
        if (parsedManualNum > listQCounter) {
          listQCounter = parsedManualNum;
          listOptCounter = 0;
        }
      }
      const manualOptMatch = pText.match(/^(?:\*\*)?([A-Ea-e])[\.\)]/i);
      if (manualOptMatch) {
        listOptCounter = manualOptMatch[1].toUpperCase().charCodeAt(0) - 65 + 1;
      }

      // Periksa apakah paragraf ini menggunakan Auto-Numbering Word (<w:numPr>)
      const numPrMatch = blockXml.match(/<w:numPr[\s\S]*?<\/w:numPr>/i);
      if (numPrMatch) {
        const ilvlMatch = numPrMatch[0].match(/<w:ilvl\b[^>]*w:val="(\d+)"/i);
        const numIdMatch = numPrMatch[0].match(/<w:numId\b[^>]*w:val="(\d+)"/i);
        const ilvl = ilvlMatch ? parseInt(ilvlMatch[1], 10) : 0;
        const numId = numIdMatch ? numIdMatch[1] : null;

        // Ambil format penomoran asli dari word/numbering.xml (decimal = soal, upperLetter = opsi A-E)
        let numFmt = numId && numberingMap[numId] ? numberingMap[numId][ilvl] : null;
        if (!numFmt) {
          numFmt = (ilvl === 0 && !pText.match(/^(?:\*\*)?[A-Ea-e][\.\)]/i)) ? 'decimal' : 'upperLetter';
        }

        if (numFmt === 'upperLetter' || numFmt === 'lowerLetter') {
          // INI ADALAH OPSI JAWABAN (A, B, C, D, E atau F-J)! JANGAN PERNAH JADIKAN NOMOR SOAL!
          // Tetap verifikasi: jika pText adalah judul/heading/bacaan/petunjuk, JANGAN beri prefix huruf opsi!
          if (!pText.match(/^(?:\*\*)?[A-Ja-j][\.\)]/i) && !isHeadingOrStimulus && listOptCounter < 10) {
            const letter = String.fromCharCode(65 + listOptCounter);
            listOptCounter++;
            pText = `${letter}. ${pText}`;
          }
        } else if (numFmt === 'decimal') {
          // INI ADALAH NOMOR BUTIR SOAL (1, 2, 3...)
          if (!pText.match(/^(?:\*\*)?(?:No\.?\s*)?\d{1,3}[\.\)]/i) && !pText.match(/^(?:\*\*)?[A-Ea-e][\.\)]/i)) {
            listQCounter++;
            listOptCounter = 0; // Reset counter opsi setiap kali masuk nomor butir soal baru!
            pText = `${listQCounter}. ${pText}`;
          }
        } else if (numFmt === 'bullet') {
          // INI ADALAH BULLET POINT STIMULUS / DAFTAR
          if (!pText.match(/^[•\-\*\u2022\u25CF\u25AA\u25B8]/)) {
            pText = `• ${pText}`;
          }
        }
      }

      // Periksa apakah paragraf ini menyematkan gambar (<a:blip r:embed="rId..."/> atau VML <v:imagedata r:id="rId..."/>)
      const imgRegex = /(?:<a:blip[^>]*?r:embed="([^"]+)"|<v:imagedata[^>]*?r:id="([^"]+)")/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(blockXml)) !== null) {
        const rId = imgMatch[1] || imgMatch[2];
        pText += (pText ? '\n' : '') + `[GAMBAR_EMBED: ${rId}]`;
      }

      if (pText.length > 0) {
        paragraphs.push(pText);
        fullTextLines.push(pText);
      }
    }
  }

  const rawText = fullTextLines.join('\n\n');

  return {
    text: rawText,
    paragraphs,
    tables
  };
}

/**
 * Mengonversi Office Math Markup Language (OMML <m:oMath>) ke representasi HTML presisi tinggi
 * Mendukung:
 * 1. m:sPre (Notasi Atom / Isotop Kimia & Pre-Sub-Superscript: 58-top, 28-bottom Ni)
 * 2. m:sSubSup & m:sSup & m:sSub (Pangkat & Indeks Kimia/Matematika)
 * 3. m:f (Pecahan Matematika bertingkat dengan pembilang & penyebut)
 * 4. m:rad (Bentuk akar dan radikal)
 * 5. m:r (Teks & operator matematika)
 */
export function convertOmmlToHtml(ommlXml) {
  let str = ommlXml;

  // 1. Notasi Isotop Kimia / Pre-script: <m:sPre>...<m:sub>...</m:sub>...<m:sup>...</m:sup>...<m:e>...</m:e>...</m:sPre>
  str = str.replace(/<m:sPre\b[^>]*>[\s\S]*?<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:sPre>/gi, (match, sub, sup, e) => {
    const subText = cleanMathTags(sub).trim();
    const supText = cleanMathTags(sup).trim();
    const eText = cleanMathTags(e).trim();
    return `<span style="display:inline-block; vertical-align:-0.3em; font-size:75%; line-height:1; text-align:right; margin-right:1px;"><span style="display:block;">${supText}</span><span style="display:block;">${subText}</span></span>${eText}`;
  });

  // 2. Pangkat / Superscript: <m:sSup>...<m:e>...</m:e>...<m:sup>...</m:sup>...</m:sSup>
  str = str.replace(/<m:sSup\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/gi, (match, e, sup) => {
    const eConverted = convertOmmlToHtml(e);
    const supText = cleanMathTags(sup).trim();
    return `${eConverted}<sup>${supText}</sup>`;
  });

  // 3. Indeks Bawah / Subscript: <m:sSub>...<m:e>...</m:e>...<m:sub>...</m:sub>...</m:sSub>
  str = str.replace(/<m:sSub\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/gi, (match, e, sub) => {
    const eConverted = convertOmmlToHtml(e);
    const subText = cleanMathTags(sub).trim();
    return `${eConverted}<sub>${subText}</sub>`;
  });

  // 4. Pangkat & Indeks Bawah Simultan: <m:sSubSup>...<m:e>...</m:e>...<m:sub>...</m:sub>...<m:sup>...</m:sup>...</m:sSubSup>
  str = str.replace(/<m:sSubSup\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSubSup>/gi, (match, e, sub, sup) => {
    const eConverted = convertOmmlToHtml(e);
    const subText = cleanMathTags(sub).trim();
    const supText = cleanMathTags(sup).trim();
    return `${eConverted}<sup>${supText}</sup><sub>${subText}</sub>`;
  });

  // 5. Pecahan (Fractions): <m:f>...<m:num>...</m:num>...<m:den>...</m:den>...</m:f>
  str = str.replace(/<m:f\b[^>]*>[\s\S]*?<m:num\b[^>]*>([\s\S]*?)<\/m:num>[\s\S]*?<m:den\b[^>]*>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/gi, (match, num, den) => {
    const numConverted = convertOmmlToHtml(num);
    const denConverted = convertOmmlToHtml(den);
    return `<span style="display:inline-block; vertical-align:middle; text-align:center; font-size:85%; line-height:1.1; margin:0 2px;"><span style="display:block; border-bottom:1px solid currentColor; padding:0 2px;">${numConverted}</span><span style="display:block; padding:0 2px;">${denConverted}</span></span>`;
  });

  // 6. Bentuk Akar & Radikal: <m:rad>...<m:deg>...</m:deg>...<m:e>...</m:e>...</m:rad>
  str = str.replace(/<m:rad\b[^>]*>[\s\S]*?<m:deg\b[^>]*>([\s\S]*?)<\/m:deg>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/gi, (match, deg, e) => {
    const degText = cleanMathTags(deg).trim();
    const eConverted = convertOmmlToHtml(e);
    return (degText ? `<sup>${degText}</sup>` : '') + `&radic;(${eConverted})`;
  });

  // 7. Math Runs / Text Biasa dalam <m:r>
  str = str.replace(/<m:r\b[^>]*>([\s\S]*?)<\/m:r>/gi, (match, rContent) => {
    return cleanMathTags(rContent);
  });

  return cleanMathTags(str).trim();
}

/**
 * Pembersih tag XML Word/OMML internal dengan preservasi tag HTML presisi
 */
function cleanMathTags(xml) {
  if (!xml) return '';
  return xml.replace(/<m:t\b[^>]*>([\s\S]*?)<\/m:t>/gi, '$1')
            .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi, '$1')
            .replace(/<\/?(?:m|w):[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
}

export function convertOmmlToLatex(ommlXml) {
  return convertOmmlToHtml(ommlXml);
}

/**
 * Mengekstrak teks dari elemen text run <w:r>, rumus matematika <m:oMath>, dan line break <w:br/>
 */
function extractTextRuns(xmlFragment) {
  let text = '';
  // Periksa apakah fragmen (misal <w:pPr> atau <w:rPr>) ditandai dengan font merah (indikator kunci jawaban guru)
  const fragHasRed = /<w:color\b[^>]*w:val="(?:FF0000|C00000|ED1C24|E00000|D00000|red)"/i.test(xmlFragment);

  // Tokenize run biasa (<w:r>) dan blok persamaan matematika (<m:oMath>, <m:oMathPara>) secara berurutan
  const tokenRegex = /(<w:r\b[\s\S]*?<\/w:r>|<m:oMath\b[\s\S]*?<\/m:oMath>|<m:oMathPara\b[\s\S]*?<\/m:oMathPara>)/gi;
  let match;
  let hasTokens = false;

  while ((match = tokenRegex.exec(xmlFragment)) !== null) {
    hasTokens = true;
    const chunk = match[0];

    // Jika blok matematika Word (OMML): konversi ke HTML presisi & periksa highlight kunci
    if (chunk.startsWith('<m:oMath')) {
      const isRedMath = fragHasRed || /<w:color\b[^>]*w:val="(?:FF0000|C00000|ED1C24|E00000|D00000|red)"/i.test(chunk);
      const isBoldMath = /<w:b\b/i.test(chunk) || /<w:highlight\b/i.test(chunk) || /<w:shd\b[^>]*w:fill="(?!auto|none|FFFFFF)[^"]+"/i.test(chunk) || isRedMath;
      const mathHtml = convertOmmlToHtml(chunk);
      if (mathHtml) {
        if (isBoldMath) {
          text += (text ? ' ' : '') + `**${mathHtml}** `;
        } else {
          text += (text ? ' ' : '') + mathHtml + ' ';
        }
      }
      continue;
    } 
    // Jika run teks Word (<w:r>): periksa cetak tebal (bold / highlight / teks merah) dan indeks kimia (subscript/superscript)
    else if (chunk.startsWith('<w:r')) {
      const isRed = fragHasRed || /<w:color\b[^>]*w:val="(?:FF0000|C00000|ED1C24|E00000|D00000|red)"/i.test(chunk);
      const isBold = /<w:b\b/i.test(chunk) || /<w:highlight\b/i.test(chunk) || /<w:shd\b[^>]*w:fill="(?!auto|none|FFFFFF)[^"]+"/i.test(chunk) || isRed;
      const isSub = /<w:vertAlign\b[^>]*w:val="subscript"/i.test(chunk);
      const isSup = /<w:vertAlign\b[^>]*w:val="superscript"/i.test(chunk);

      let rText = '';
      const tRegex = /(<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\b[^>]*\/>|<w:tab\b[^>]*\/>)/gi;
      let tMatch;
      while ((tMatch = tRegex.exec(chunk)) !== null) {
        if (tMatch[2] !== undefined) {
          const decoded = tMatch[2]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
          rText += decoded;
        } else if (tMatch[0].includes('w:br')) {
          rText += '\n';
        } else if (tMatch[0].includes('w:tab')) {
          rText += '\t';
        }
      }

      if (rText) {
        // Preservasi format kimia (H2O -> H<sub>2</sub>O, Ca2+ -> Ca<sup>2+</sup>)
        if (isSub) rText = `<sub>${rText}</sub>`;
        else if (isSup) rText = `<sup>${rText}</sup>`;

        // Jika opsi atau teks dicetak tebal / di-highlight, tandai dengan markdown **teks**
        if (isBold && rText.trim()) {
          if (isSup || isSub) {
            text = text.trimEnd() + `**${rText.trim()}** `;
          } else {
            text += `**${rText.trim()}** `;
          }
        } else {
          if (isSup || isSub) {
            text = text.trimEnd() + rText;
          } else {
            text += rText;
          }
        }
      }
    }
  }

  // Fallback jika XML tidak membungkus run secara formal
  if (!hasTokens) {
    const fallbackRegex = /(<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\b[^>]*\/>|<w:tab\b[^>]*\/>)/gi;
    let fbMatch;
    while ((fbMatch = fallbackRegex.exec(xmlFragment)) !== null) {
      if (fbMatch[2] !== undefined) text += fbMatch[2];
      else if (fbMatch[0].includes('w:br')) text += '\n';
      else if (fbMatch[0].includes('w:tab')) text += '\t';
    }
  }

  return text.trim();
}

/**
 * Mem-parsing teks naskah Word menjadi daftar butir soal terstandar secara deterministik (100% Persis, Tanpa AI)
 * @param {string} rawText - Teks hasil ekstraksi naskah Word
 * @param {Object} docxImages - Peta rId -> Data URL gambar
 * @param {Array} tables - Daftar matriks sel tabel dari naskah
 * @returns {Array<Object>} Daftar butir soal siap masuk playlist
 */
/**
 * Mengekstrak opsi pilihan ganda jika opsi disusun di dalam baris-baris tabel (misal jurnal akuntansi)
 * @param {Array<Array<string>>} tblData
 * @returns {Object|null}
 */
export function extractOptionsFromTable(tblData) {
  if (!tblData || tblData.length < 2) return null;
  const letters = ['A', 'B', 'C', 'D', 'E'];
  let currentLetter = null;
  const letterRows = {};
  let detectedKey = '';

  let headerRows = [];
  let startRow = 0;
  if ((tblData[0][0] || '').trim() === '' && (tblData[0][1] || '').trim() !== '') {
    headerRows.push(tblData[0].slice(1));
    startRow = 1;
    if (tblData[1] && (tblData[1][0] || '').trim() === '' && tblData[1].slice(1).some(c => c.trim())) {
      headerRows.push(tblData[1].slice(1));
      startRow = 2;
    }
  }

  for (let r = startRow; r < tblData.length; r++) {
    const row = tblData[r];
    const col0 = (row[0] || '').replace(/[\*\_\.\:\)\s]/g, '').trim().toUpperCase();
    if (letters.includes(col0)) {
      currentLetter = col0;
      if (!letterRows[currentLetter]) letterRows[currentLetter] = [];
      letterRows[currentLetter].push(row);
      // Cek apakah baris ini memuat penanda tebal/merah (indikator kunci jawaban guru)
      if (row.some(c => (c || '').includes('**'))) {
        detectedKey = currentLetter;
      }
    } else if (currentLetter && (row[0] || '').replace(/[\*\_\s]/g, '').trim() === '') {
      letterRows[currentLetter].push(row);
      if (row.some(c => (c || '').includes('**'))) {
        detectedKey = currentLetter;
      }
    }
  }

  if (['A', 'B', 'C', 'D'].every(l => letterRows[l] && letterRows[l].length > 0)) {
    const opsi = {};
    for (const [letter, rows] of Object.entries(letterRows)) {
      const cleanRows = rows.map(r => r.slice(1).map(c => (c || '').replace(/\*\*/g, '').trim()));
      const cleanHeader = headerRows.map(hr => hr.map(c => (c || '').replace(/\*\*/g, '').trim()));
      const fullRows = cleanHeader.length > 0 ? [...cleanHeader, ...cleanRows] : cleanRows;
      opsi[letter] = formatTableHtml(fullRows);
    }
    if (detectedKey) {
      Object.defineProperty(opsi, '__detectedKey', {
        value: detectedKey,
        enumerable: false,
        writable: true
      });
    }
    return opsi;
  }
  return null;
}

export function parseQuestionsDirectly(rawText, docxImages = {}, tables = []) {
  if (!rawText && (!tables || tables.length === 0)) return [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];
  let currentQ = null;
  let inOptions = false;
  let pendingStimulusLines = [];

  // Regex pemisah nomor butir soal: '1.', '1)', '1:', 'No. 1', '32:' (dengan proteksi angka nominal uang)
  const qNumRegex = /^(?:\*+)?(?:No\.?\s*)?(\d{1,3})[\.\:\)](?!\d{3})\s*(.*)/i;
  // Regex opsi: 'A.', 'B.', 'A:', 'A)', '(A)', '[A]', '**A.**', '**E** **.**', 'E.Laba', serta dukungan 'F.' s.d. 'J.'
  const optRegex = /^\s*(?:\*+|\[|\()?([A-Ja-j])(?:\*+|\))?\s*(?:\*+)?[\.\:\)\]](?:\*+)?\s*(.*)/i;
  // Regex kunci multilingual: 'Kunci:', 'Jawaban:', 'Answer:', 'Ans:', 'Key:', 'Correct Answer:', 'Réponse:', 'Antwort:'
  const keyRegex = /^(?:\*+)?(?:Kunci(?:\s+Jawaban)?|Jawaban|Kunci\s+Soal|Answer(?:\s+Key)?|Correct\s+(?:Answer|Option)|Ans|Key|Solution|Réponse|Antwort|Respuesta|解答|答え|الإجابة|الجواب)\s*[:=]\s*(?:[\*\_\(\[])?\s*([A-Ea-e](?:\s*[,&danDan\s]+\s*[A-Ea-e])+|\bBenar\b|\bSalah\b|\bTrue\b|\bFalse\b|[A-Ea-e]|[^\n]+)/i;
  // Regex pembahasan multilingual: 'Pembahasan:', 'Explanation:', 'Discussion:', 'Solution:'
  const pembRegex = /^(?:Pembahasan|Penjelasan|Rasionalisasi|Explanation|Discussion|Solution)\s*[:=]\s*(.*)/i;
  // Regex kunci isian dalam kurung di akhir pertanyaan: 'disebut ... (Orbital)' atau '... adalah … (2555 Mn)'
  const parenKeyRegex = /\(\s*([0-9A-Za-z\/\-\s<>_]{1,50})\s*\)\s*(?:\*+)?\s*$/i;
  // Regex baris pernyataan Benar/Salah dengan kunci di akhir: 'Jumlah proton... (Benar)'
  const bsLineRegex = /^(.*?)\s*\(\s*(Benar|Salah)\s*\)$/i;

  // Deteksi cerdas apakah suatu baris berangka merupakan sub-item/stimulus (bukan butir soal baru)
  function isSubItemLine(idx, line, qMatch, q) {
    if (!q) return false;
    // Jika soal saat ini sudah memiliki opsi, maka butir soal tersebut sudah lengkap
    if (Object.keys(q.opsi || {}).length > 0) return false;

    const num = parseInt(qMatch[1], 10);
    // 1. Backwards jump (misal di soal 31 tiba-tiba ada nomor 1, 2, 3...)
    if (num < q.id) return true;

    // 2. Baris sebelumnya di currentQ berakhir dengan titik dua atau kata pengantar stimulus
    const prevLines = q.pertanyaanLines.slice(-3).join(' ');
    const hasIntroColon = /(?:sebagai berikut|berikut ini|data penyesuaian|transaksi|pernyataan yang berkaitan)\s*:?$/i.test(prevLines.trim());

    // 3. Scan forward: cek apakah rangkaian nomor ini menuju ke kalimat pertanyaan penutup ('pernyataan yang benar', 'berdasarkan', dll) dan opsi A-E
    let foundOptAhead = false;
    let hasStimulusIndicatorAhead = false;
    for (let j = idx + 1; j < Math.min(lines.length, idx + 25); j++) {
      const fLine = lines[j];
      if (optRegex.test(fLine)) {
        foundOptAhead = true;
        if (/\([1-5]\)/.test(fLine)) hasStimulusIndicatorAhead = true;
        break;
      }
      if (/(?:pernyataan yang benar|berdasarkan data|jurnal penyesuaian yang benar|posting ke|kertas kerja yang benar)/i.test(fLine)) {
        hasStimulusIndicatorAhead = true;
      }
    }

    if ((hasIntroColon || hasStimulusIndicatorAhead) && foundOptAhead) {
      return true;
    }
    return false;
  }

  // Deteksi apakah suatu baris berangka merupakan butir langkah/resep/prosedur dalam stimulus (bukan soal baru)
  function isStimulusNumberedLine(idx, line, qMatch) {
    const num = parseInt(qMatch[1], 10);
    const expectedQNum = questions.length + 1;

    // Cek apakah ada opsi jawaban langsung di bawah baris ini (dalam 6 baris ke depan)
    let hasOwnOptions = false;
    for (let j = idx + 1; j < Math.min(lines.length, idx + 6); j++) {
      const fLine = lines[j].trim();
      if (!fLine) continue;
      if (optRegex.test(fLine)) {
        hasOwnOptions = true;
        break;
      }
      if (fLine.match(qNumRegex)) break;
    }

    if (hasOwnOptions) return false;

    if (pendingStimulusLines.length > 0) {
      const stimContext = pendingStimulusLines.slice(-3).join(' ');
      const isStepContext = /(?:steps?|langkah(?:-langkah)?|tahapan?|cara(?:\s+membuat|\s+kerja)?|ingredients?|bahan(?:-bahan)?|petunjuk|prosedur)\s*:?/i.test(stimContext);

      for (let j = idx + 1; j < Math.min(lines.length, idx + 40); j++) {
        const fLine = lines[j].trim();
        const fMatch = fLine.match(qNumRegex);
        if (fMatch) {
          const fNum = parseInt(fMatch[1], 10);
          if (fNum === 1 || fNum === expectedQNum) {
            for (let k = j + 1; k < Math.min(lines.length, j + 12); k++) {
              if (optRegex.test(lines[k].trim())) {
                return true;
              }
            }
          }
        }
      }

      if (isStepContext) return true;
    }

    return false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Cek apakah mulai masuk blok daftar kunci jawaban di akhir naskah (bukan baris kunci per butir)
    if (!keyRegex.test(line) && /^(?:\*\*|\*)?(?:DAFTAR\s+)?(?:KUNCI(?:\s+JAWABAN)?|ANSWER\s+KEYS?|ANSWERS?|KEYS?|CORRECT\s+ANSWERS?|SOLUTIONS?|مفتاح\s+الإجابة|解答)(?:\s+(?:DAN\s+PEMBAHASAN|SOAL|PAS|PTS|PAT|US|[A-Za-z0-9\s]+))?\s*:?\s*(?:\*\*|\*)?$/i.test(line.trim())) {
      if (currentQ) {
        questions.push(finalizeQuestion(currentQ, docxImages, tables));
        currentQ = null;
      }
      break; // Hentikan loop butir soal, sisanya adalah daftar kunci jawaban
    }

    const isHeadingOrStimulus = /^(?:\*\*|\*)?(?:(?:Read|Bacalah|Perhatikan|Cermati)\s+[\w\s]+(?:questions?|soal|berikut)|TEXT|TEKS|PASSAGE|BACAAN|WACANA|STIMULUS|READING|DIALOG|DIALOGUE|SOAL|PETUNJUK|DIRECTIONS|INSTRUCTIONS|BAGIAN|SECTION|PART|CHAPTER|BAB)\b/i.test(line);
    const isIngredientsOrSteps = /^(?:\*\*|\*|[•\-\*]\s*)?(?:Ingredients?|Steps?|Langkah(?:-langkah)?|Bahan(?:-bahan)?|Cara\s+(?:Membuat|Kerja)|Alat\s+dan\s+Bahan|Tahapan?)\s*[:=]/i.test(line);

    // Jika sedang dalam opsi dan menemui heading / stimulus baru, finalisasi soal sebelumnya
    if (inOptions && (isHeadingOrStimulus || isIngredientsOrSteps)) {
      if (currentQ) {
        questions.push(finalizeQuestion(currentQ, docxImages, tables));
        currentQ = null;
      }
      inOptions = false;
      pendingStimulusLines.push(line);
      continue;
    }

    // Cek apakah ada tag tabel: [TABEL_X] yang berisi opsi pilihan ganda
    const tblMatch = line.match(/^\[TABEL_(\d+)\]$/i);
    if (tblMatch && currentQ) {
      const tblIdx = parseInt(tblMatch[1], 10) - 1;
      if (tables && tables[tblIdx]) {
        const extractedOpts = extractOptionsFromTable(tables[tblIdx]);
        if (extractedOpts && Object.keys(currentQ.opsi).length === 0) {
          currentQ.opsi = extractedOpts;
          if (extractedOpts.__detectedKey && !currentQ.kunci) {
            currentQ.kunci = extractedOpts.__detectedKey;
          }
          inOptions = true;
          currentQ.tableOptionsTag = line;
          continue;
        }
      }
    }

    // Cek apakah ini awal nomor butir baru
    const qMatch = line.match(qNumRegex);
    if (qMatch && (!inOptions || !line.match(optRegex))) {
      // Cek apakah nomor ini adalah butir langkah stimulus
      if (isStimulusNumberedLine(i, line, qMatch)) {
        pendingStimulusLines.push(line);
        continue;
      }

      if (isSubItemLine(i, line, qMatch, currentQ)) {
        // Ini adalah sub-item (stimulus), jangan buat butir soal baru
        // Jika nomor offset akibat penomoran otomatis Word (misal soal 4 -> 5, 6, 7, 8, 9), ubah jadi (1), (2), dst.
        const num = parseInt(qMatch[1], 10);
        let subItemText = line;
        if (num > currentQ.id) {
          const subNum = num - currentQ.id;
          if (subNum >= 1 && subNum <= 10) {
            subItemText = `(${subNum}) ${qMatch[2]}`;
          }
        }
        currentQ.pertanyaanLines.push(subItemText);
        continue;
      }

      if (currentQ) {
        questions.push(finalizeQuestion(currentQ, docxImages, tables));
      }

      const qText = qMatch[2];
      let initialPertanyaanLines;
      if (pendingStimulusLines.length > 0) {
        const lastStimLine = pendingStimulusLines[pendingStimulusLines.length - 1];
        if (lastStimLine !== '') {
          initialPertanyaanLines = [...pendingStimulusLines, '', qText];
        } else {
          initialPertanyaanLines = [...pendingStimulusLines, qText];
        }
      } else {
        initialPertanyaanLines = [qText];
      }
      const stimulusText = pendingStimulusLines.length > 0
        ? pendingStimulusLines.join('\n').trim()
        : null;
      pendingStimulusLines = [];

      currentQ = {
        id: parseInt(qMatch[1], 10),
        originalIndex: questions.length + 1,
        pertanyaanLines: initialPertanyaanLines,
        stimulus: stimulusText,
        opsi: {},
        kunci: '',
        pembahasan: '',
        tipe: 'PG',
        pasangan: [],
        gambarTag: null
      };
      inOptions = false;
      continue;
    }

    if (!currentQ) {
      if (isHeadingOrStimulus || isIngredientsOrSteps || pendingStimulusLines.length > 0) {
        if (line.trim().length > 0) {
          // Beri pemisah baris kosong sebelum sub-heading baru (seperti Ingredients: atau Steps:) agar terpisah rapi dari blok sebelumnya
          if (isIngredientsOrSteps && pendingStimulusLines.length > 0 && pendingStimulusLines[pendingStimulusLines.length - 1] !== '') {
            pendingStimulusLines.push('');
          }
          pendingStimulusLines.push(line);
        }
      }
      continue; // Belum masuk butir soal (misal KOP naskah)
    }

    // Cek baris pembahasan
    const pembMatch = line.match(pembRegex);
    if (pembMatch) {
      currentQ.pembahasan = pembMatch[1].trim();
      continue;
    }

    // Cek baris kunci langsung di bawah soal
    const keyMatch = line.match(keyRegex);
    if (keyMatch) {
      let rawKey = keyMatch[1].replace(/[\*\_\(\)\[\]\.]/g, '').trim().toUpperCase();
      if (rawKey === 'TRUE') rawKey = 'Benar';
      else if (rawKey === 'FALSE') rawKey = 'Salah';
      currentQ.kunci = rawKey;
      continue;
    }

    // Cek opsi horizontal dalam satu baris (misal: A. apel   B. mangga   C. jeruk atau A: apel B: mangga)
    const inlineOptRegex = /(?:^|[\t\s]{2,}|\t|\s+(?=(?:\*\*|\*|\[\s*\]|\(\s*\))?[A-Ja-j][\.\:\)]))(?:\*\*|\*|\[\s*\]|\(\s*\))?([A-Ja-j])[\.\:\)]\s*(.*?)(?=(?:[\t\s]{2,}|\t|\s+(?=(?:\*\*|\*|\[\s*\]|\(\s*\))?[A-Ja-j][\.\:\)]))(?:\*\*|\*|\[\s*\]|\(\s*\))?[A-Ja-j][\.\:\)]|$)/gi;
    const inlineMatches = [];
    let inlineM;
    while ((inlineM = inlineOptRegex.exec(line)) !== null) {
      if (inlineM[1] && inlineM[2].trim()) {
        inlineMatches.push(inlineM);
      }
    }

    if (inlineMatches.length > 1) {
      inOptions = true;
      for (const m of inlineMatches) {
        let letter = m[1].toUpperCase();
        const fToJ = { 'F': 'A', 'G': 'B', 'H': 'C', 'I': 'D', 'J': 'E' };
        if (fToJ[letter] && (currentQ.isFToJ || letter === 'F')) {
          currentQ.isFToJ = true;
          letter = fToJ[letter];
        }
        let optText = m[2].trim();
        if (!currentQ.boldOptions) currentQ.boldOptions = [];
        if (m[0].includes('**') || m[0].startsWith('*')) {
          currentQ.kunci = letter;
          if (!currentQ.boldOptions.includes(letter)) {
            currentQ.boldOptions.push(letter);
          }
        }
        optText = optText.replace(/\*\*/g, '').trim();
        currentQ.opsi[letter] = optText;
      }
      continue;
    }

    // Cek baris opsi tunggal A-E (atau F-J)
    const optMatch = line.match(optRegex);
    if (optMatch) {
      inOptions = true;
      let letter = optMatch[1].toUpperCase();
      const fToJ = { 'F': 'A', 'G': 'B', 'H': 'C', 'I': 'D', 'J': 'E' };
      if (fToJ[letter] && (currentQ.isFToJ || letter === 'F')) {
        currentQ.isFToJ = true;
        letter = fToJ[letter];
      }
      let optText = optMatch[2].trim();

      // Jika opsi dicetak tebal (baik di huruf maupun di teks kalimat), tandai sebagai kunci!
      if (!currentQ.boldOptions) currentQ.boldOptions = [];
      if (line.includes('**') || line.startsWith('*')) {
        currentQ.kunci = letter;
        if (!currentQ.boldOptions.includes(letter)) {
          currentQ.boldOptions.push(letter);
        }
      }
      optText = optText.replace(/\*\*/g, '').trim();
      currentQ.opsi[letter] = optText;
      continue;
    }

    // Cek gambar embed
    const imgMatch = line.match(/\[GAMBAR_EMBED:\s*([^\]]+)\]/i);
    if (imgMatch) {
      currentQ.gambarTag = imgMatch[1].trim();
      continue;
    }

    // Cek pernyataan Benar/Salah dengan kunci di akhir (misal: 'Jumlah proton... (Benar)')
    const bsMatch = line.match(bsLineRegex);
    if (bsMatch && !inOptions) {
      if (!currentQ.bsItems) currentQ.bsItems = [];
      currentQ.bsItems.push({
        teks: bsMatch[1].trim(),
        nilai: bsMatch[2].toLowerCase() === 'benar' ? 'Benar' : 'Salah'
      });
      continue;
    }

    // Cek kunci isian dalam kurung di akhir pertanyaan (misal: 'disebut ... (Orbital)' atau 'adalah … (2555 Mn)')
    const parenMatch = line.match(parenKeyRegex);
    if (parenMatch && !inOptions && !line.includes('|') && !line.match(/\b(?:19|20)\d{2}\b/)) {
      currentQ.kunci = parenMatch[1].trim();
      const cleanLine = line.replace(parenKeyRegex, '').trim();
      currentQ.pertanyaanLines.push(cleanLine);
      continue;
    }

    // Cek baris tabel markdown
    if (line.startsWith('|')) {
      if (inOptions && currentQ.tableOptionsTag) {
        continue; // Lewati baris markdown jika tabel opsi sudah diekstrak rapi
      }
      // HANYA kumpulkan baris tabel ke stimulus pertanyaan jika belum masuk blok opsi
      if (!inOptions) {
        if (!currentQ.tableRows) currentQ.tableRows = [];
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 2) currentQ.tableRows.push(cells);
      }
      continue;
    }

    // Jika belum masuk opsi, ini adalah lanjutan narasi pertanyaan
    if (!inOptions) {
      currentQ.pertanyaanLines.push(line);
    } else {
      // Jika sudah masuk opsi tapi ada baris lanjutan, sambungkan ke opsi terakhir
      const lastKey = Object.keys(currentQ.opsi).pop();
      if (lastKey) {
        if (line.includes('**')) {
          currentQ.kunci = lastKey;
          if (!currentQ.boldOptions) currentQ.boldOptions = [];
          if (!currentQ.boldOptions.includes(lastKey)) currentQ.boldOptions.push(lastKey);
        }
        currentQ.opsi[lastKey] += ' ' + line.replace(/\*\*/g, '').trim();
      }
    }
  }

  if (currentQ) {
    questions.push(finalizeQuestion(currentQ, docxImages, tables));
  }

  // Pemetaan daftar kunci di akhir naskah (jika ada blok KUNCI JAWABAN / ANSWER KEY)
  const keyHeaderMatch = rawText.match(/(?:^|\n)\s*(?:\*+)?(?:DAFTAR\s+)?(?:KUNCI(?:\s+JAWABAN)?|ANSWER\s+KEYS?|ANSWERS?|KEYS?|CORRECT\s+ANSWERS?|SOLUTIONS?|مفتاح\s+الإجابة|解答)(?:[^\n]*?)?\s*:?(?:\*+)?\s*\n([\s\S]*)/i);
  if (keyHeaderMatch) {
    const keySection = keyHeaderMatch[1];
    const pairRegex = /(?:^|\n|[\t\s]{2,}|\|)\s*(?:No\.?\s*)?(\d{1,3})[\.\)\:\s=\|]+([A-Ea-e]|\bBenar\b|\bSalah\b|\bTrue\b|\bFalse\b)(?=$|[\s,;|\t\.\)\|\r\n])/gi;
    let m;
    while ((m = pairRegex.exec(keySection)) !== null) {
      const qId = parseInt(m[1], 10);
      const targetQ = questions.find(q => q.id === qId);
      if (targetQ && (!targetQ.kunci || targetQ.kunci === 'A')) {
        let val = m[2].toUpperCase();
        if (val === 'TRUE') val = 'Benar';
        else if (val === 'FALSE') val = 'Salah';
        targetQ.kunci = val;
      }
    }
  }

  // Hitung rentang stimulus otomatis (misal Teks 1 untuk 1 s.d. 5, Teks 2 untuk 6 s.d. 10)
  for (let idx = 0; idx < questions.length; idx++) {
    if (questions[idx].stimulus) {
      questions[idx].stimulus_range_start = idx + 1;
      let nextStimIdx = questions.length;
      for (let k = idx + 1; k < questions.length; k++) {
        if (questions[k].stimulus) {
          nextStimIdx = k;
          break;
        }
      }
      questions[idx].stimulus_range_end = nextStimIdx;
    }
  }

  // Jika pemindaian paragraf menghasilkan butir soal, kembalikan hasil paragraf
  if (questions.length > 0) {
    return questions;
  }

  // JIKA PARAGRAF MENGHASILKAN 0 SOAL, CEK APAKAH SOAL DISUSUN DALAM TABEL (FORMAT ATS/PAS SEKOLAH)
  if (tables && tables.length > 0) {
    const tableQuestions = parseQuestionsFromTables(tables, docxImages);
    if (tableQuestions.length > 0) {
      return tableQuestions;
    }
  }

  return [];
}

/**
 * Mengekstrak butir soal yang disusun di dalam format tabel kisi-kisi atau template ATS/PAS sekolah
 */
export function parseQuestionsFromTables(tables, docxImages = {}) {
  const questions = [];
  if (!tables || tables.length === 0) return questions;

  for (const tableRows of tables) {
    if (!tableRows || tableRows.length < 2) continue;

    const headers = tableRows[0].map(h => (h || '').toLowerCase().trim());
    let noCol = -1;
    let soalCol = -1;
    let keyCol = -1;

    headers.forEach((h, idx) => {
      if (h.includes('no') || h === '#') noCol = idx;
      else if (h.includes('soal') || h.includes('pertanyaan') || h.includes('materi') || h.includes('deskripsi')) soalCol = idx;
      else if (h.includes('kunci') || h.includes('jawaban')) keyCol = idx;
    });

    if (noCol === -1) {
      const col0HasNums = tableRows.slice(1).some(r => /^\d{1,3}$/.test((r[0] || '').trim()));
      if (col0HasNums) noCol = 0;
    }
    if (soalCol === -1) {
      let maxLen = 0;
      tableRows.slice(1).forEach(r => {
        r.forEach((c, idx) => {
          if (idx !== noCol && idx !== keyCol && (c || '').length > maxLen) {
            maxLen = (c || '').length;
            soalCol = idx;
          }
        });
      });
    }

    if (noCol === -1 || soalCol === -1) continue;

    for (let r = 1; r < tableRows.length; r++) {
      const row = tableRows[r];
      const noText = (row[noCol] || '').replace(/[\.\)]/g, '').trim();
      const qId = parseInt(noText, 10);
      if (isNaN(qId)) continue;

      let fullSoalText = row[soalCol] || '';
      let kunci = keyCol !== -1 && row[keyCol] ? row[keyCol].trim().toUpperCase() : 'A';

      const opsi = {};
      const optCols = ['a', 'b', 'c', 'd', 'e'];
      let foundColOpts = false;

      headers.forEach((h, idx) => {
        const cleanH = h.replace(/[\.\(\)\[\]]/g, '').trim();
        if (optCols.includes(cleanH) && row[idx]) {
          foundColOpts = true;
          opsi[cleanH.toUpperCase()] = row[idx].replace(/\*\*/g, '').trim();
          if (row[idx].includes('**')) kunci = cleanH.toUpperCase();
        }
      });

      if (!foundColOpts) {
        const lines = fullSoalText.split('\n').map(l => l.trim()).filter(Boolean);
        const pertanyaanLines = [];
        const optRegex = /^\s*(?:\*\*|\*|\[|\()?([A-Ea-e])(?:\*\*|\*|\))?\s*(?:\*\*|\*)?[\.\:\)\]](?:\*\*|\*)?\s*(.*)/i;
        const inlineOptRegex = /(?:^|[\t\s]{2,}|\t)(?:\*\*|\*|\[\s*\]|\(\s*\))?([A-Ea-e])[\.\)]\s*(.*?)(?=(?:[\t\s]{2,}|\t)(?:\*\*|\*|\[\s*\]|\(\s*\))?[A-Ea-e][\.\)]|$)/g;

        let inOpt = false;
        for (const line of lines) {
          const inlineMatches = [];
          let im;
          while ((im = inlineOptRegex.exec(line)) !== null) {
            if (im[1] && im[2].trim()) inlineMatches.push(im);
          }

          if (inlineMatches.length > 1) {
            inOpt = true;
            for (const m of inlineMatches) {
              const letter = m[1].toUpperCase();
              if (m[0].includes('**') || m[0].startsWith('*')) kunci = letter;
              opsi[letter] = m[2].replace(/\*\*/g, '').trim();
            }
            continue;
          }

          const optMatch = line.match(optRegex);
          if (optMatch) {
            inOpt = true;
            const letter = optMatch[1].toUpperCase();
            if (line.includes('**') || line.startsWith('*')) kunci = letter;
            opsi[letter] = optMatch[2].replace(/\*\*/g, '').trim();
            continue;
          }

          if (!inOpt) {
            pertanyaanLines.push(line);
          } else {
            const lastKey = Object.keys(opsi).pop();
            if (lastKey) opsi[lastKey] += ' ' + line;
          }
        }
        fullSoalText = pertanyaanLines.join('\n').trim() || fullSoalText;
      }

      let gambarTag = null;
      const imgMatch = fullSoalText.match(/\[GAMBAR_EMBED:\s*([^\]]+)\]/i);
      if (imgMatch) {
        gambarTag = imgMatch[1].trim();
        fullSoalText = fullSoalText.replace(/\[GAMBAR_EMBED:\s*[^\]]+\]/g, '').trim();
      }

      const { cleanText: cleanedPrompt, level: taggedLevel } = extractAndStripCognitiveTag(fullSoalText);
      const hasStimulus = cleanedPrompt.includes('<table') || cleanedPrompt.includes('[TABEL_') || !!gambarTag;
      const detectedLevel = taggedLevel || detectCognitiveLevel(cleanedPrompt, hasStimulus);

      const qObj = {
        id: qId,
        originalIndex: questions.length + 1,
        tipe: 'PG',
        level_kognitif: detectedLevel,
        pertanyaan: cleanedPrompt,
        opsi: opsi,
        kunci: kunci,
        pembahasan: ''
      };

      if (gambarTag && docxImages[gambarTag]) {
        qObj.gambar_base64 = docxImages[gambarTag];
        qObj.butuh_gambar = true;
      }

      questions.push(qObj);
    }

    if (questions.length > 0) break;
  }

  return questions;
}

/**
 * Mengonversi blok XML tabel Word (<w:tbl>) menjadi HTML <table> berpresisi tinggi
 * Mendukung: <w:gridSpan> (colspan), <w:vMerge> (rowspan), gambar embed, formula OMML, dan multi-paragraf
 */
export function renderWordTableToHtml(tblXml, imageRIdMap = {}) {
  const rawRows = [];
  const trRegex = /<w:tr[\s\S]*?<\/w:tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(tblXml)) !== null) {
    const trXml = trMatch[0];
    const cells = [];
    const tcRegex = /<w:tc[\s\S]*?<\/w:tc>/gi;
    let tcMatch;

    while ((tcMatch = tcRegex.exec(trXml)) !== null) {
      const tcXml = tcMatch[0];
      const gsMatch = tcXml.match(/<w:gridSpan\b[^>]*w:val="(\d+)"/i);
      const colspan = gsMatch ? parseInt(gsMatch[1], 10) : 1;

      const vmMatch = tcXml.match(/<w:vMerge\b[^>]*w:val="([^"]+)"/i);
      const isRestart = vmMatch && vmMatch[1].toLowerCase() === 'restart';
      const isContinue = !isRestart && /<w:vMerge\b/i.test(tcXml);

      // Ekstrak paragraf di dalam sel
      const pRegex = /<w:p[\s\S]*?<\/w:p>/gi;
      const paras = [];
      let pMatch;
      while ((pMatch = pRegex.exec(tcXml)) !== null) {
        let pText = extractTextRuns(pMatch[0]).trim();
        // Cek gambar embed di dalam sel
        const imgRegex = /(?:<a:blip[^>]*?r:embed="([^"]+)"|<v:imagedata[^>]*?r:id="([^"]+)")/gi;
        let imgMatch;
        while ((imgMatch = imgRegex.exec(pMatch[0])) !== null) {
          const rId = imgMatch[1] || imgMatch[2];
          if (imageRIdMap[rId]) {
            pText += `<img src="${imageRIdMap[rId]}" style="max-height:120px; max-width:100%; display:block; margin:auto;" />`;
          }
        }
        // Bersihkan tanda ** atau penanda kunci dari sel tabel
        pText = pText.replace(/\*\*/g, '').trim();
        if (pText) paras.push(pText);
      }
      if (paras.length === 0) {
        let cellText = extractTextRuns(tcXml).trim().replace(/\*\*/g, '').trim();
        if (cellText) paras.push(cellText);
        else paras.push('');
      }

      cells.push({
        colspan,
        vMerge: isRestart ? 'restart' : (isContinue ? 'continue' : null),
        rowspan: 1,
        paras
      });
    }
    if (cells.length > 0) rawRows.push(cells);
  }

  if (rawRows.length === 0) return '';

  // Hitung rowspan untuk sel-sel vertikal merge (vMerge)
  const colActiveRestart = {};
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    let colIdx = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell.vMerge === 'restart') {
        colActiveRestart[colIdx] = cell;
        cell.rowspan = 1;
      } else if (cell.vMerge === 'continue') {
        if (colActiveRestart[colIdx]) {
          colActiveRestart[colIdx].rowspan++;
        }
      } else {
        delete colActiveRestart[colIdx];
      }
      colIdx += cell.colspan;
    }
  }

  // Bangun elemen HTML Table
  let html = '<table class="afresto-exam-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; margin:10px 0; font-size:13px; text-align:left; border:1px solid #cbd5e1;">\n';

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    const isHeaderRow = r === 0 || row.some(cell => cell.vMerge !== null);
    const maxP = Math.max(...row.map(cell => cell.paras.length));
    const multiParaCount = row.filter(cell => cell.paras.length > 1).length;

    // Jika baris memuat data transaksi multi-paragraf dalam sel
    if (maxP > 1 && multiParaCount >= 2 && !row.some(c => c.vMerge !== null)) {
      for (let pIdx = 0; pIdx < maxP; pIdx++) {
        html += '  <tr style="">\n';
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          const text = cell.paras[pIdx] !== undefined ? cell.paras[pIdx] : '';
          const tag = 'td';
          const spanAttrs = (cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '');
          html += `    <${tag}${spanAttrs} style="border:1px solid #cbd5e1; padding:6px 10px;">${text}</${tag}>\n`;
        }
        html += '  </tr>\n';
      }
    } else {
      const trStyle = isHeaderRow ? 'background:#f1f5f9; font-weight:bold;' : '';
      html += `  <tr style="${trStyle}">\n`;
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell.vMerge === 'continue') continue; // Dilewati karena sudah di-cover rowspan sebelumnya

        const tag = isHeaderRow ? 'th' : 'td';
        const spanAttrs = (cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '') +
                          (cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : '');
        const text = cell.paras.join(' ').trim();
        html += `    <${tag}${spanAttrs} style="border:1px solid #cbd5e1; padding:6px 10px;">${text}</${tag}>\n`;
      }
      html += '  </tr>\n';
    }
  }

  html += '</table>';
  return html;
}

/**
 * Mengonversi matriks sel tabel menjadi HTML <table> yang rapi dan siap dirender di TinyMCE
 */
export function formatTableHtml(rows) {
  if (!rows || rows.length === 0) return '';
  if (rows.renderedHtml) return rows.renderedHtml;
  let html = '<table class="afresto-exam-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; margin:10px 0; font-size:13px; text-align:left; border:1px solid #cbd5e1;">\n';
  rows.forEach((r, idx) => {
    html += '  <tr style="' + (idx === 0 ? 'background:#f1f5f9; font-weight:bold;' : '') + '">\n';
    r.forEach(cell => {
      const tag = idx === 0 ? 'th' : 'td';
      const cleanCell = (cell || '').replace(/\*\*/g, '').trim();
      html += `    <${tag} style="border:1px solid #cbd5e1; padding:6px 10px;">${cleanCell}</${tag}>\n`;
    });
    html += '  </tr>\n';
  });
  html += '</table>';
  return html;
}

/**
 * Normalisasi format rumus kimia & superskrip/subskrip matematika
 * 1. Mengeliminasi spasi liar antara subkulit dan eksponen pangkat (1s 2 / 1s <sup>2</sup> -> 1s<sup>2</sup>)
 * 2. Merapatkan eksponen ion (Fe <sup>3+</sup> -> Fe<sup>3+</sup>, X2+ -> X<sup>2+</sup>)
 * 3. Merapatkan indeks molekul (H <sub>2</sub> O -> H<sub>2</sub>O, <sub>9</sub> F -> <sub>9</sub>F)
 */
export function normalizeFormulasAndSuperscripts(text) {
  if (!text) return "";

  // Lindungi tag <img ...>, data:image base64, dan tag struktural ber-atribut dari modifikasi regex kimia
  const protectedItems = [];
  let res = text.replace(/<img\b[^>]*>|data:image\/[^"'\s]+|<(?:table|tr|th|td)\b[^>]*>/gi, (match) => {
    protectedItems.push(match);
    return `__PROTECTED_TOKEN_${protectedItems.length - 1}__`;
  });

  // 1. Rapatkan konfigurasi elektron kimia (1s 2 -> 1s<sup>2</sup>, 1s <sup>2</sup> -> 1s<sup>2</sup>, [Ar] 3d 10 -> [Ar] 3d<sup>10</sup>)
  res = res.replace(/([1-7][spdf])\s*(?:<sup>\s*(\d{1,2})\s*<\/sup>|(\d{1,2}))(?!\w)/gi, (match, p1, p2, p3) => {
    return `${p1}<sup>${p2 || p3}</sup>`;
  });

  // 2. Eksponen muatan ion (X2+ -> X<sup>2+</sup>, Ca2+ -> Ca<sup>2+</sup>, Fe3+ -> Fe<sup>3+</sup>, ion X 2+ -> ion X<sup>2+</sup>)
  res = res.replace(/\b([A-Z][a-z]?)\s*(\d+[+-])(?![A-Za-z0-9])/g, (match, p1, p2) => `${p1}<sup>${p2}</sup>`);
  res = res.replace(/\b(ion\s+[A-Z][a-z]?)\s*([+-])(?![A-Za-z0-9=])/gi, (match, p1, p2) => `${p1}<sup>${p2}</sup>`);

  // 3. Subskrip & isotop (<sub>9</sub> F -> <sub>9</sub>F, <sub>25</sub><sup>55</sup> Mn -> <sub>25</sub><sup>55</sup>Mn, bare 11 Na -> <sub>11</sub>Na)
  res = res.replace(/<sub>(\d+)<\/sub>\s+([A-Za-z])/g, '<sub>$1</sub>$2');
  res = res.replace(/<sub>(\d+)<\/sub><sup>(\d+)<\/sup>\s+([A-Za-z])/g, '<sub>$1</sub><sup>$2</sup>$3');
  res = res.replace(/^(\d{1,2})\s+([A-Z][a-z]?)$/, '<sub>$1</sub>$2');

  // 4. Rapatkan spasi liar antara basis huruf/angka dan <sup> atau <sub>
  res = res.replace(/([A-Za-z0-9\)])\s+<sup>/g, '$1<sup>')
           .replace(/([A-Za-z0-9\)])\s+<sub>/g, '$1<sub>');

  // Pulihkan seluruh token gambar dan tabel yang dilindungi
  res = res.replace(/__PROTECTED_TOKEN_(\d+)__/g, (match, idx) => {
    return protectedItems[parseInt(idx, 10)] || match;
  });

  return res;
}

function finalizeQuestion(q, docxImages, tables = []) {
  let pertanyaan = q.pertanyaanLines.join('\n').trim();

  // Konversi markdown formatting (**bold** & *italic*) menjadi tag HTML resmi agar tampil tebal di UI & TinyMCE
  pertanyaan = pertanyaan.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
                         .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
                         .replace(/\*\*/g, '');

  let tipe = 'PG';
  let kunci = q.kunci || 'A';

  // Hapus tag tabel yang diekstrak menjadi opsi agar tidak dobel di pertanyaan
  if (q.tableOptionsTag) {
    pertanyaan = pertanyaan.replace(q.tableOptionsTag, '').trim();
  }

  // 1. Deteksi Benar/Salah jika opsi A-E berakhiran (Benar)/(Salah) atau pertanyaan mengandung 'benar atau salah'
  const optValues = Object.values(q.opsi || {});
  const isAllBs = optValues.length >= 2 && optValues.every(val => /\(\s*(Benar|Salah)\s*\)$/i.test(val.trim()));
  const promptHasBs = /benar\s*(?:atau|\/|-)\s*salah/i.test(pertanyaan);

  if (isAllBs || (promptHasBs && optValues.length >= 2)) {
    tipe = 'BENAR_SALAH';
    const cleanOpsi = {};
    const bsKunci = {};
    const hasBoldOptions = q.boldOptions && q.boldOptions.length > 0;
    for (const [letter, val] of Object.entries(q.opsi)) {
      const bsMatch = val.match(/\(\s*(Benar|Salah)\s*\)$/i);
      if (bsMatch) {
        cleanOpsi[letter] = val.replace(/\(\s*(Benar|Salah)\s*\)$/i, '').trim();
        bsKunci[letter] = bsMatch[1].toLowerCase() === 'benar' ? 'Benar' : 'Salah';
      } else if (hasBoldOptions) {
        cleanOpsi[letter] = val.trim();
        bsKunci[letter] = q.boldOptions.includes(letter) ? 'Benar' : 'Salah';
      } else {
        cleanOpsi[letter] = val.trim();
        bsKunci[letter] = 'Benar';
      }
    }
    q.opsi = cleanOpsi;
    kunci = bsKunci;
  }
  // 2. Deteksi Benar/Salah dari daftar baris pernyataan terpisah
  else if (q.bsItems && q.bsItems.length > 0) {
    tipe = 'BENAR_SALAH';
    const opsiObj = {};
    const kunciObj = {};
    q.bsItems.forEach((item, idx) => {
      const char = String.fromCharCode(65 + idx);
      opsiObj[char] = item.teks.replace(/^\*\*|\*\*$/g, '').trim();
      kunciObj[char] = item.nilai;
    });
    q.opsi = opsiObj;
    kunci = kunciObj;
  }
  // 3. Deteksi tabel Mencocokkan / Matching vs Benar/Salah Murni (jika tidak memiliki opsi A-E)
  else if (q.tableRows && q.tableRows.length > 1 && Object.keys(q.opsi).length === 0) {
    // Cek apakah tabel ini sebenarnya berisi opsi A, B, C, D, E (seperti pada tabel akuntansi)
    const tblOptions = extractOptionsFromTable(q.tableRows);
    if (tblOptions) {
      tipe = 'PG';
      q.opsi = tblOptions;
      if (tblOptions.__detectedKey && !kunci) {
        kunci = tblOptions.__detectedKey;
      }
    } else {
      const dataRows = q.tableRows;
      const isStrictBsTable = dataRows.slice(1).every(r => /^(?:Benar|Salah|True|False)$/i.test((r[1] || '').trim()));
      if (isStrictBsTable) {
        tipe = 'BENAR_SALAH';
        const bsOpsi = {};
        const bsKunci = {};
        dataRows.slice(1).forEach((r, idx) => {
          const char = String.fromCharCode(65 + idx);
          bsOpsi[char] = (r[0] || '').trim();
          bsKunci[char] = /^(?:Benar|True)$/i.test((r[1] || '').trim()) ? 'Benar' : 'Salah';
        });
        q.opsi = bsOpsi;
        kunci = bsKunci;
      } else {
        // Tabel Mencocokkan (Premis di kiri, Respon di kanan)
        tipe = 'MENCOCOKKAN';
        const pasangan = [];
        dataRows.forEach(r => {
          const kiri = (r[1] || r[0] || '').trim();
          const kanan = (r[3] || r[2] || '').trim();
          if (kiri && kanan && !kiri.toLowerCase().includes('gambar model')) {
            pasangan.push({ kiri, kanan });
          }
        });
        q.pasangan = pasangan;
        kunci = pasangan.map((p, i) => `${i + 1}-${i + 1}`).join(', ');
        q.opsi = {};
      }
    }
  }

  // 3b. Safety Net Anti-Swallowed Options: Cek jika opsi saat ini menelan opsi berikutnya (misal D menelan E)
  if (tipe === 'PG') {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    for (let lIdx = 0; lIdx < letters.length - 1; lIdx++) {
      const curL = letters[lIdx];
      const nextL = letters[lIdx + 1];
      if (q.opsi[curL] && !q.opsi[nextL]) {
        const splitRegex = new RegExp(`(?:^|\\n|<br>|\\s{2,}|<\\/table>\\s*)(?:\\*\\*|\\*|\\[|\\()?\\s*${nextL}\\s*(?:\\*\\*|\\*|\\))?\\s*(?:\\*\\*|\\*)?[\\.\\:\\)\\]](?:\\*\\*|\\*)?\\s*(.*)`, 'is');
        const splitMatch = q.opsi[curL].match(splitRegex);
        if (splitMatch) {
          const splitIdx = q.opsi[curL].search(splitRegex);
          const firstPart = q.opsi[curL].substring(0, splitIdx).trim();
          const secondPart = splitMatch[1].trim();
          q.opsi[curL] = firstPart;
          q.opsi[nextL] = secondPart;
          if (splitMatch[0].includes('**') && (!kunci || kunci === curL)) {
            kunci = nextL;
          }
        }
      }
    }
  }

  // 4. Deteksi tipe PG Kompleks jika kunci berisi koma atau lebih dari 1 opsi di-bold
  if (tipe === 'PG' && q.boldOptions && q.boldOptions.length > 1) {
    tipe = 'PG_KOMPLEKS';
    kunci = q.boldOptions;
  } else if (tipe === 'PG' && typeof kunci === 'string' && /^[A-Ea-e][\s,]+[A-Ea-e]/.test(kunci)) {
    tipe = 'PG_KOMPLEKS';
    kunci = kunci.split(/[\s,]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
  }

  // 4b. Deteksi Mencocokkan berbasis baris pasangan (1. Router - Mengarahkan...) atau kunci format "1-A, 2-B"
  if (Object.keys(q.opsi).length === 0 && (!q.pasangan || q.pasangan.length === 0)) {
    const isMatchingKey = typeof kunci === 'string' && /\d+\s*-\s*[A-Za-z]/.test(kunci);
    const hasMatchingPrompt = /(?:pasangkanlah|jodohkanlah|mencocokkan|pasangan\s+yang\s+tepat)/i.test(pertanyaan);

    if (isMatchingKey || hasMatchingPrompt) {
      const remainingLines = [];
      const extractedPairs = [];
      const lines = pertanyaan.split('\n');

      for (const l of lines) {
        const pairM = l.match(/^(?:(?:\*\*|\*)?\d+[\.\)]\s*)?([^-\n]+?)\s*[-–—:]\s*([^\n]+)$/);
        if (pairM && pairM[1].trim() && pairM[2].trim() && !pairM[1].includes('http') && !pairM[1].toLowerCase().includes('kunci')) {
          extractedPairs.push({
            kiri: pairM[1].replace(/^\*\*|\*\*$/g, '').trim(),
            kanan: pairM[2].replace(/^\*\*|\*\*$/g, '').trim()
          });
        } else {
          remainingLines.push(l);
        }
      }

      if (extractedPairs.length >= 2) {
        tipe = 'MENCOCOKKAN';
        q.pasangan = extractedPairs;
        pertanyaan = remainingLines.join('\n').trim();
        if (!isMatchingKey) {
          kunci = extractedPairs.map((p, i) => `${i + 1}-${i + 1}`).join(', ');
        }
      }
    }
  }

  // 4c. Jika kunci berupa string Benar/Salah majemuk (misal: "A: Benar, B: Salah...")
  if (typeof kunci === 'string' && /([A-Ea-e])\s*[:=]\s*(Benar|Salah|True|False)/i.test(kunci)) {
    tipe = 'BENAR_SALAH';
    const parsedBs = {};
    const bsRegex = /([A-Ea-e])\s*[:=]\s*(Benar|Salah|True|False)/gi;
    let bm;
    while ((bm = bsRegex.exec(kunci)) !== null) {
      const char = bm[1].toUpperCase();
      parsedBs[char] = /^(?:Benar|True)$/i.test(bm[2]) ? 'Benar' : 'Salah';
    }
    kunci = parsedBs;
  }

  // Deteksi kunci PG dalam kurung di akhir pertanyaan: '... adalah .... (C)'
  const pgParenMatch = pertanyaan.match(/\(\s*([A-Ea-e])\s*\)\s*$/);
  if (pgParenMatch && Object.keys(q.opsi).length > 0 && (!kunci || kunci === 'A' || !q.kunci)) {
    kunci = pgParenMatch[1].toUpperCase();
    pertanyaan = pertanyaan.replace(/\(\s*([A-Ea-e])\s*\)\s*$/, '').trim();
  }

  // 5. Deteksi Isian Singkat dengan kunci dalam kurung di akhir: '... disebut ... (Orbital)' atau '... (2555 Mn)'
  const parenMatch = pertanyaan.match(/\(\s*([0-9A-Za-z\/\-\s<>_]{1,50})\s*\)\s*(?:\*+)?\s*$/i);
  if (parenMatch && Object.keys(q.opsi).length === 0 && (!q.pasangan || q.pasangan.length === 0) && tipe !== 'BENAR_SALAH') {
    tipe = 'ISIAN';
    const rawVal = parenMatch[1].trim();
    kunci = /(?<!<)\//.test(rawVal) ? rawVal.split(/\s*(?<!<)\/\s*/).map(k => k.trim()).filter(Boolean) : [rawVal];
    pertanyaan = pertanyaan.replace(/\(\s*([0-9A-Za-z\/\-\s<>_]{1,50})\s*\)\s*(?:\*+)?\s*$/i, '').trim();
  } else if (Object.keys(q.opsi).length === 0 && (!q.pasangan || q.pasangan.length === 0) && tipe !== 'BENAR_SALAH') {
    const isUraianText = /^(?:rubrik|uraian|penjelasan|langkah|jelaskan)/i.test(String(kunci).trim()) || pertanyaan.toLowerCase().startsWith('jelaskan');
    const hasAltSlash = /(?<!<)\//.test(String(kunci));
    if (kunci && !isUraianText && (hasAltSlash || (typeof kunci === 'string' && kunci.length < 60)) && kunci !== 'A') {
      tipe = 'ISIAN';
      kunci = typeof kunci === 'string' && hasAltSlash ? kunci.split(/\s*(?<!<)\/\s*/).map(k => k.trim()).filter(Boolean) : (Array.isArray(kunci) ? kunci : [kunci]);
    } else {
      tipe = 'URAIAN';
    }
  }

  // 6. Sisipkan HTML tabel ke pertanyaan jika pertanyaan memuat [TABEL_X] atau memiliki tabel stimulus
  if (pertanyaan.includes('[TABEL_')) {
    pertanyaan = pertanyaan.replace(/\[TABEL_(\d+)\]/g, (match, num) => {
      const idx = parseInt(num, 10) - 1;
      if (tables && tables[idx]) {
        return '\n' + formatTableHtml(tables[idx]);
      }
      if (q.tableRows && q.tableRows.length > 0) {
        return '\n' + formatTableHtml(q.tableRows);
      }
      return match;
    });
  } else if (q.tableRows && q.tableRows.length > 0 && tipe !== 'MENCOCOKKAN' && tipe !== 'BENAR_SALAH' && !q.tableOptionsTag) {
    pertanyaan += '\n' + formatTableHtml(q.tableRows);
  }

  // Sisipkan HTML tabel ke opsi jika opsi memuat [TABEL_X]
  if (q.opsi) {
    for (const [letter, val] of Object.entries(q.opsi)) {
      if (typeof val === 'string' && val.includes('[TABEL_')) {
        q.opsi[letter] = val.replace(/\[TABEL_(\d+)\]/g, (match, num) => {
          const idx = parseInt(num, 10) - 1;
          if (tables && tables[idx]) {
            // Cek apakah tabel ini memuat penanda tebal/merah (indikator kunci jawaban guru)
            const tableHasKey = tables[idx].hasRed || tables[idx].some(r => r.some(c => (c || '').includes('**')));
            if (tableHasKey && (!kunci || kunci === 'A' || !q.kunci || q.kunci === 'A')) {
              kunci = letter;
              q.kunci = letter;
            }
            return '<br>' + formatTableHtml(tables[idx]);
          }
          return match;
        }).trim();
      }
    }
  }

  // Bersihkan sisa tag [TABEL_X] jika soal adalah tipe MENCOCOKKAN atau BENAR_SALAH
  if (tipe === 'MENCOCOKKAN' || tipe === 'BENAR_SALAH') {
    pertanyaan = pertanyaan.replace(/\[TABEL_\d+\]/g, '').trim();
  }

  // 7. Normalisasi formula, eksponen pangkat, dan subskrip/superskrip
  pertanyaan = normalizeFormulasAndSuperscripts(pertanyaan);
  const cleanNormalizedOpsi = {};
  for (const [k, v] of Object.entries(q.opsi || {})) {
    // Bersihkan tanda ** dari opsi agar tidak ada asterisks mentah di UI
    let cleanVal = typeof v === 'string' ? v.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*\*/g, '') : v;
    cleanNormalizedOpsi[k] = normalizeFormulasAndSuperscripts(cleanVal);
  }
  q.opsi = cleanNormalizedOpsi;

  if (Array.isArray(q.pasangan)) {
    q.pasangan.forEach(pair => {
      pair.kiri = normalizeFormulasAndSuperscripts(pair.kiri);
      pair.kanan = normalizeFormulasAndSuperscripts(pair.kanan);
    });
  }

  const { cleanText: cleanedPertanyaan, level: taggedLevel } = extractAndStripCognitiveTag(pertanyaan);
  const hasStimulus = cleanedPertanyaan.includes('<table') || cleanedPertanyaan.includes('[TABEL_') || !!q.gambarTag;
  const detectedLevel = q.level_kognitif && q.level_kognitif !== 'C4 (Analisis)'
    ? q.level_kognitif
    : (taggedLevel || detectCognitiveLevel(cleanedPertanyaan, hasStimulus));

  const res = {
    id: q.id,
    originalIndex: q.originalIndex || (parseInt(String(q.id).replace(/\D/g, ''), 10) || undefined),
    tipe: tipe,
    level_kognitif: detectedLevel,
    pertanyaan: cleanedPertanyaan,
    opsi: q.opsi,
    kunci: kunci,
    pembahasan: q.pembahasan || ''
  };

  if (q.stimulus) {
    res.stimulus = q.stimulus.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
                             .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
                             .replace(/\*\*/g, '');
  }

  if (q.pasangan && q.pasangan.length > 0) {
    res.pasangan = q.pasangan;
  }

  if (q.gambarTag && docxImages[q.gambarTag]) {
    res.gambar_base64 = docxImages[q.gambarTag];
    res.butuh_gambar = true;
  }

  return res;
}
