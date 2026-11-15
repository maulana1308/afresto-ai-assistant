/**
 * Afresto AI Assistant — Afresto Next OpenXML (.docx) Exporter
 * Menghasilkan berkas Microsoft Word (.docx) sesuai struktur Afresto Next:
 * - PG & PG_KOMPLEKS: auto-numbering angka (1., 2.), opsi huruf kapital (A.–E.),
 *   dan penanda kunci jawaban dengan warna teks merah (#EE0000).
 * - MENCOCOKKAN: tabel 2 kolom (SOAL | JAWABAN) dengan baris 'Kunci : <Huruf>'.
 * - BENAR_SALAH: tabel 4 kolom (No | Pernyataan | Benar | Salah) dengan tanda 'v'.
 * - ISIAN / URAIAN: paragraf bernomor beserta Kunci / Rubrik.
 *
 * Bekerja 100% di Browser (Sidepanel / Standalone HTML) maupun Node.js tanpa dependensi luar.
 */

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripTagsAndNormalizeText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');
}

function decodeBase64ToBytes(b64) {
  const clean = b64.replace(/\s+/g, '');
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function encodeUtf8(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  return new Uint8Array(Buffer.from(str, 'utf8'));
}

function parseDataUrlImage(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/i);
  if (!m) return null;
  let ext = m[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  if (ext === 'svg') return null; // Word OpenXML dasar hanya menjamin raster png/jpg/gif
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const bytes = decodeBase64ToBytes(m[2]);
  const { widthPx, heightPx } = readImageDimensions(bytes, ext);
  return { ext, mime, bytes, widthPx, heightPx };
}

function readImageDimensions(bytes, ext) {
  const fallback = { widthPx: 420, heightPx: 220 };
  try {
    if (ext === 'png' && bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
      const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
      const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
      if (w > 0 && h > 0) return { widthPx: w, heightPx: h };
    }
    if ((ext === 'jpg' || ext === 'jpeg') && bytes.length > 4) {
      let i = 2;
      while (i + 9 < bytes.length) {
        if (bytes[i] !== 0xFF) break;
        const marker = bytes[i + 1];
        const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
        if (marker === 0xC0 || marker === 0xC2) {
          const h = (bytes[i + 5] << 8) | bytes[i + 6];
          const w = (bytes[i + 7] << 8) | bytes[i + 8];
          if (w > 0 && h > 0) return { widthPx: w, heightPx: h };
          break;
        }
        if (segLen < 2) break;
        i += 2 + segLen;
      }
    }
  } catch {
    return fallback;
  }
  return fallback;
}

/**
 * Mengonversi teks ber-tag inline sederhana (<b>, <strong>, <i>, <em>, <u>, **bold**)
 * menjadi deretan elemen <w:r> OpenXML yang valid.
 */
function buildInlineRunsXml(rawText, styleOpts = {}) {
  const normalized = stripTagsAndNormalizeText(rawText)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

  const tokens = [];
  const tagRegex = /(<\/?(?:b|strong|i|em|u|sup|sub)>|<[^>]+>)/gi;
  let lastIdx = 0;
  let bold = Boolean(styleOpts.bold);
  let italic = Boolean(styleOpts.italic);
  let underline = Boolean(styleOpts.underline);
  let vertAlign = null;

  let m;
  while ((m = tagRegex.exec(normalized)) !== null) {
    if (m.index > lastIdx) {
      tokens.push({ text: normalized.slice(lastIdx, m.index), bold, italic, underline, vertAlign });
    }
    const tag = m[1].toLowerCase();
    if (tag === '<b>' || tag === '<strong>') bold = true;
    else if (tag === '</b>' || tag === '</strong>') bold = Boolean(styleOpts.bold);
    else if (tag === '<i>' || tag === '<em>') italic = true;
    else if (tag === '</i>' || tag === '</em>') italic = Boolean(styleOpts.italic);
    else if (tag === '<u>') underline = true;
    else if (tag === '</u>') underline = Boolean(styleOpts.underline);
    else if (tag === '<sup>') vertAlign = 'superscript';
    else if (tag === '<sub>') vertAlign = 'subscript';
    else if (tag === '</sup>' || tag === '</sub>') vertAlign = null;
    lastIdx = tagRegex.lastIndex;
  }
  if (lastIdx < normalized.length) {
    tokens.push({ text: normalized.slice(lastIdx), bold, italic, underline, vertAlign });
  }

  if (tokens.length === 0) {
    tokens.push({ text: '', bold, italic, underline, vertAlign: null });
  }

  const colorHex = styleOpts.color || '';
  const sizeVal = styleOpts.size || '24';

  return tokens
    .filter(tok => tok.text !== '' || tokens.length === 1)
    .map(tok => {
      const rPrParts = [
        `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>`,
        tok.bold ? '<w:b/>' : '',
        tok.italic ? '<w:i/>' : '',
        tok.underline ? '<w:u w:val="single"/>' : '',
        colorHex ? `<w:color w:val="${colorHex}"/>` : '',
        `<w:sz w:val="${sizeVal}"/><w:szCs w:val="${sizeVal}"/>`,
        tok.vertAlign ? `<w:vertAlign w:val="${tok.vertAlign}"/>` : ''
      ].filter(Boolean).join('');

      return `<w:r><w:rPr>${rPrParts}</w:rPr><w:t xml:space="preserve">${escapeXml(tok.text)}</w:t></w:r>`;
    })
    .join('');
}

function buildParagraphXml(text, opts = {}) {
  const pPrParts = [`<w:pStyle w:val="BodyText"/>`];
  if (opts.numId) {
    pPrParts.push(`<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${opts.numId}"/></w:numPr>`);
  }
  if (opts.indentLeft) {
    pPrParts.push(`<w:ind w:left="${opts.indentLeft}"/>`);
  }
  if (opts.align) {
    pPrParts.push(`<w:jc w:val="${opts.align}"/>`);
  }
  const rPrInner = [
    `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>`,
    opts.bold ? '<w:b/>' : '',
    opts.color ? `<w:color w:val="${opts.color}"/>` : '',
    `<w:sz w:val="${opts.size || '24'}"/><w:szCs w:val="${opts.size || '24'}"/>`
  ].filter(Boolean).join('');
  pPrParts.push(`<w:rPr>${rPrInner}</w:rPr>`);

  const runsXml = buildInlineRunsXml(text, opts);
  return `<w:p><w:pPr>${pPrParts.join('')}</w:pPr>${runsXml}</w:p>`;
}

function buildImageParagraphXml(rId, docPrId, widthPx, heightPx) {
  const maxWidthEmu = 4800000; // ~5.25 inci (aman untuk halaman A4 ber-margin)
  const pxToEmu = 9525;
  let cx = Math.max(400000, Math.round(widthPx * pxToEmu));
  let cy = Math.max(250000, Math.round(heightPx * pxToEmu));
  if (cx > maxWidthEmu) {
    const ratio = maxWidthEmu / cx;
    cx = maxWidthEmu;
    cy = Math.round(cy * ratio);
  }
  return `<w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPrId}" name="Gambar ${docPrId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="image_${docPrId}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

function splitLinesForParagraphs(text) {
  return stripTagsAndNormalizeText(text)
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter((l, i, arr) => l.trim() !== '' || (i === 0 && arr.length === 1));
}

function extractMatchingKeyLetter(pair, rightLetters, indexFallback) {
  const kRaw = String(pair?.kunci || '').trim().toUpperCase();
  if (/^[A-Z]$/.test(kRaw) && rightLetters.includes(kRaw)) return kRaw;
  const idx = rightLetters.indexOf(String.fromCharCode(65 + indexFallback));
  return idx >= 0 ? rightLetters[idx] : (rightLetters[0] || 'A');
}

function buildMatchingTableXml(pasangan, allocateNumId) {
  const leftNumId = allocateNumId(1);  // decimal 1., 2., ...
  const rightNumId = allocateNumId(2); // upperLetter A., B., ...
  const rightLetters = pasangan.map((_, idx) => String.fromCharCode(65 + idx));

  const headerRow = `<w:tr><w:trPr><w:trHeight w:val="460"/></w:trPr>` +
    `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="808080"/><w:vAlign w:val="center"/></w:tcPr>` +
    buildParagraphXml('SOAL', { bold: true, indentLeft: '120' }) + `</w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="808080"/><w:vAlign w:val="center"/></w:tcPr>` +
    buildParagraphXml('JAWABAN', { bold: true, indentLeft: '120' }) + `</w:tc></w:tr>`;

  const bodyRows = pasangan.map((pair, idx) => {
    const leftText = (pair.kiri || '').trim();
    const rightText = (pair.kanan || '').trim();
    const keyLetter = extractMatchingKeyLetter(pair, rightLetters, idx);

    const leftCell = `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>` +
      buildParagraphXml(leftText, { numId: leftNumId }) +
      buildParagraphXml(`Kunci : ${keyLetter}`, { indentLeft: '360', bold: true }) +
      `</w:tc>`;

    const rightCell = `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>` +
      buildParagraphXml(rightText, { numId: rightNumId }) +
      `</w:tc>`;

    return `<w:tr><w:trPr><w:trHeight w:val="460"/></w:trPr>${leftCell}${rightCell}</w:tr>`;
  }).join('');

  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9000" w:type="dxa"/><w:tblInd w:w="360" w:type="dxa"/>` +
    `<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
    `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
    `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid>${headerRow}${bodyRows}</w:tbl>`;
}

function buildBenarSalahTableXml(opsi, kunci) {
  const entries = Object.entries(opsi || {});
  const rowsData = entries.length > 0
    ? entries.map(([letter, text], idx) => {
        const rawAns = kunci && typeof kunci === 'object' ? String(kunci[letter] || 'Benar') : 'Benar';
        const isBenar = !/salah|false/i.test(rawAns);
        return { no: String(idx + 1), text: String(text || '').trim(), isBenar };
      })
    : [
        { no: '1', text: '[Lengkapi pernyataan A dari gambar]', isBenar: true },
        { no: '2', text: '[Lengkapi pernyataan B dari gambar]', isBenar: false }
      ];

  const headerRow = `<w:tr>` +
    `<w:tc><w:tcPr><w:tcW w:w="500" w:type="dxa"/></w:tcPr>${buildParagraphXml('')}</w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="5700" w:type="dxa"/></w:tcPr>${buildParagraphXml('')}</w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr>${buildParagraphXml('Benar', { bold: true, align: 'center' })}</w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr>${buildParagraphXml('Salah', { bold: true, align: 'center' })}</w:tc>` +
    `</w:tr>`;

  const bodyRows = rowsData.map(row => {
    const benarMark = row.isBenar ? 'v' : '';
    const salahMark = row.isBenar ? '' : 'v';
    return `<w:tr>` +
      `<w:tc><w:tcPr><w:tcW w:w="500" w:type="dxa"/></w:tcPr>${buildParagraphXml(row.no, { align: 'center' })}</w:tc>` +
      `<w:tc><w:tcPr><w:tcW w:w="5700" w:type="dxa"/></w:tcPr>${buildParagraphXml(row.text)}</w:tc>` +
      `<w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr>${buildParagraphXml(benarMark, { align: 'center' })}</w:tc>` +
      `<w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr>${buildParagraphXml(salahMark, { align: 'center' })}</w:tc>` +
      `</w:tr>`;
  }).join('');

  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9000" w:type="dxa"/><w:tblInd w:w="360" w:type="dxa"/>` +
    `<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
    `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
    `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="500"/><w:gridCol w:w="5700"/><w:gridCol w:w="1400"/><w:gridCol w:w="1400"/></w:tblGrid>${headerRow}${bodyRows}</w:tbl>`;
}

// CRC32 Lookup Table (universal, 0 dependensi eksternal)
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c;
}

function crc32Bytes(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

async function deflateRawUniversal(bytes) {
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const outBuf = await new Response(cs.readable).arrayBuffer();
    return { method: 8, data: new Uint8Array(outBuf) };
  }
  return { method: 0, data: bytes }; // Fallback STORED valid di 100% ZIP reader
}

async function buildZipBytes(entries) {
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encodeUtf8(entry.name);
    const rawBytes = entry.data instanceof Uint8Array ? entry.data : encodeUtf8(entry.data);
    const crc = crc32Bytes(rawBytes);
    const { method, data: compBytes } = await deflateRawUniversal(rawBytes);

    const local = new Uint8Array(30);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, method, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, compBytes.length, true);
    lv.setUint32(22, rawBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);

    localParts.push(local, nameBytes, compBytes);

    const cd = new Uint8Array(46);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, method, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, compBytes.length, true);
    cv.setUint32(24, rawBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);

    cdParts.push(cd, nameBytes);
    offset += 30 + nameBytes.length + compBytes.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const p of cdParts) cdSize += p.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);

  const totalLen = offset + cdSize + 22;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of [...localParts, ...cdParts, eocd]) {
    result.set(p, pos);
    pos += p.length;
  }
  return result;
}

/**
 * Membangun berkas .docx berstandar Afresto Next dari array butir soal playlist.
 * @param {Array<Object>} questions - Daftar butir soal terstruktur
 * @param {Object} options - { includeSectionHeader?: boolean }
 * @returns {Promise<{ bytes: Uint8Array, stats: { total: number, incompleteBenarSalah: number[] } }>}
 */
export async function buildAfrestoNextDocx(questions, options = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const includeSectionHeader = options.includeSectionHeader !== false;

  // numId 1 reserved untuk nomor soal utama (continuous 1, 2, 3, ...)
  const numDefinitions = [{ numId: 1, abstractNumId: 1, restart: false }];
  let nextNumId = 2;
  function allocateNumId(abstractNumId) {
    const id = nextNumId++;
    numDefinitions.push({ numId: id, abstractNumId, restart: true });
    return id;
  }

  const mediaFiles = [];
  const imageExts = new Set();
  let nextImgIdx = 1;
  function registerImage(dataUrl) {
    const parsed = parseDataUrlImage(dataUrl);
    if (!parsed) return null;
    const idx = nextImgIdx++;
    const rId = `rIdImg${idx}`;
    const target = `media/image${idx}.${parsed.ext}`;
    imageExts.add(parsed.ext);
    mediaFiles.push({ rId, target, zipPath: `word/${target}`, ...parsed });
    return { rId, docPrId: idx, widthPx: parsed.widthPx, heightPx: parsed.heightPx };
  }

  const bodyChunks = [];
  const incompleteBenarSalah = [];
  let pgHeaderEmitted = false;
  let bsHeaderEmitted = false;

  for (let i = 0; i < list.length; i++) {
    const q = list[i] || {};
    const tipe = String(q.tipe || 'PG').toUpperCase();

    if (includeSectionHeader && !pgHeaderEmitted && (tipe === 'PG' || tipe === 'PG_KOMPLEKS')) {
      pgHeaderEmitted = true;
      bodyChunks.push(buildParagraphXml(
        'Pilihlah salah satu jawaban yang paling benar dengan memberi tanda silang (X) pada huruf A, B, C, D atau E pada lembar jawaban yang tersedia.',
        { bold: true }
      ));
      bodyChunks.push(buildParagraphXml(''));
    }

    // Stimulus (jika ada) diletakkan sebelum soal terkait agar konteks terbaca
    if (q.stimulus && String(q.stimulus).trim()) {
      for (const sLine of splitLinesForParagraphs(q.stimulus)) {
        bodyChunks.push(buildParagraphXml(sLine, { italic: true }));
      }
    }

    const stemLines = splitLinesForParagraphs(q.pertanyaan || `Soal #${i + 1}`);
    const firstStem = stemLines[0] || `Soal #${i + 1}`;
    const restStem = stemLines.slice(1);

    if (tipe === 'BENAR_SALAH') {
      const hasTextStatements = Object.keys(q.opsi || {}).length >= 2;
      if (!hasTextStatements) {
        incompleteBenarSalah.push(i + 1);
      }

      const bsPrompt = includeSectionHeader && !bsHeaderEmitted && !/benar|salah/i.test(firstStem)
        ? `Jawab soal berikut dengan memberikan pernyataan salah/benar ! ${firstStem}`
        : firstStem;
      bsHeaderEmitted = true;
      bodyChunks.push(buildParagraphXml(bsPrompt, { numId: 1, bold: true }));
      for (const line of restStem) {
        bodyChunks.push(buildParagraphXml(line));
      }

      // Jangan bocorkan gambar screenshot Legacy jika pernyataannya sudah diekstrak ke tabel teks
      const shouldEmbedImg = Boolean(q.gambar_base64) && (!hasTextStatements || q._ocrExtracted === false);
      if (shouldEmbedImg) {
        const imgRef = registerImage(q.gambar_base64);
        if (imgRef) {
          bodyChunks.push(buildImageParagraphXml(imgRef.rId, imgRef.docPrId, imgRef.widthPx, imgRef.heightPx));
        }
      }

      bodyChunks.push(buildBenarSalahTableXml(q.opsi, q.kunci));
    } else if (tipe === 'MENCOCOKKAN') {
      bodyChunks.push(buildParagraphXml(firstStem, { numId: 1 }));
      for (const line of restStem) {
        bodyChunks.push(buildParagraphXml(line));
      }
      if (q.gambar_base64) {
        const imgRef = registerImage(q.gambar_base64);
        if (imgRef) {
          bodyChunks.push(buildImageParagraphXml(imgRef.rId, imgRef.docPrId, imgRef.widthPx, imgRef.heightPx));
        }
      }
      const pasangan = Array.isArray(q.pasangan) && q.pasangan.length > 0
        ? q.pasangan
        : [{ kiri: 'Item 1', kanan: 'Pasangan A', kunci: 'A' }, { kiri: 'Item 2', kanan: 'Pasangan B', kunci: 'B' }];
      bodyChunks.push(buildMatchingTableXml(pasangan, allocateNumId));
    } else if (tipe === 'PG' || tipe === 'PG_KOMPLEKS') {
      bodyChunks.push(buildParagraphXml(firstStem, { numId: 1 }));
      for (const line of restStem) {
        bodyChunks.push(buildParagraphXml(line));
      }
      if (q.gambar_base64) {
        const imgRef = registerImage(q.gambar_base64);
        if (imgRef) {
          bodyChunks.push(buildImageParagraphXml(imgRef.rId, imgRef.docPrId, imgRef.widthPx, imgRef.heightPx));
        }
      }

      const keySet = new Set(
        Array.isArray(q.kunci)
          ? q.kunci.map(k => String(k).trim().toUpperCase())
          : String(q.kunci || '').split(/[\s,;]+/).map(k => k.trim().toUpperCase()).filter(Boolean)
      );
      const optNumId = allocateNumId(2);
      const orderedEntries = Object.entries(q.opsi || {}).sort(([a], [b]) => a.localeCompare(b));
      for (const [letter, optVal] of orderedEntries) {
        const isCorrect = keySet.has(letter.toUpperCase());
        bodyChunks.push(buildParagraphXml(String(optVal || ''), {
          numId: optNumId,
          color: isCorrect ? 'EE0000' : '',
          bold: isCorrect
        }));
      }
    } else {
      // ISIAN / URAIAN
      bodyChunks.push(buildParagraphXml(firstStem, { numId: 1 }));
      for (const line of restStem) {
        bodyChunks.push(buildParagraphXml(line));
      }
      if (q.gambar_base64) {
        const imgRef = registerImage(q.gambar_base64);
        if (imgRef) {
          bodyChunks.push(buildImageParagraphXml(imgRef.rId, imgRef.docPrId, imgRef.widthPx, imgRef.heightPx));
        }
      }
      const keyText = Array.isArray(q.kunci) ? q.kunci.join(' / ') : String(q.kunci || '');
      if (keyText.trim()) {
        const label = tipe === 'URAIAN' ? 'Rubrik' : 'Kunci';
        bodyChunks.push(buildParagraphXml(`${label} : ${keyText.trim()}`, { indentLeft: '360', color: 'EE0000', bold: true }));
      }
    }

    bodyChunks.push(buildParagraphXml(''));
  }

  const documentXml = `${XML_HEADER}
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyChunks.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const numberingNumsXml = numDefinitions.map(def => {
    const override = def.restart
      ? '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride>'
      : '';
    return `<w:num w:numId="${def.numId}"><w:abstractNumId w:val="${def.abstractNumId}"/>${override}</w:num>`;
  }).join('');

  const numberingXml = `${XML_HEADER}
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="420" w:hanging="300"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="2">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="300"/></w:pPr></w:lvl>
  </w:abstractNum>
  ${numberingNumsXml}
</w:numbering>`;

  const stylesXml = `${XML_HEADER}
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/></w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/>
    <w:tblPr><w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders></w:tblPr>
  </w:style>
</w:styles>`;

  const imageDefaultsXml = [...imageExts].map(ext => {
    const ct = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return `<Default Extension="${ext}" ContentType="${ct}"/>`;
  }).join('');

  const contentTypesXml = `${XML_HEADER}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${imageDefaultsXml}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

  const relsXml = `${XML_HEADER}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const imgRelsXml = mediaFiles.map(m =>
    `<Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${m.target}"/>`
  ).join('');

  const docRelsXml = `${XML_HEADER}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${imgRelsXml}
</Relationships>`;

  const settingsXml = `${XML_HEADER}<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`;

  const entries = [
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: relsXml },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/numbering.xml', data: numberingXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/_rels/document.xml.rels', data: docRelsXml },
    { name: 'word/settings.xml', data: settingsXml },
    ...mediaFiles.map(m => ({ name: m.zipPath, data: m.bytes }))
  ];

  const bytes = await buildZipBytes(entries);
  return {
    bytes,
    stats: {
      total: list.length,
      incompleteBenarSalah
    }
  };
}
