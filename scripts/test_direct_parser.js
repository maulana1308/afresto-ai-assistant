import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseDocx } from './docx_parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function parseQuestionsDirectly(rawText, docxImages = {}) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];
  let currentQ = null;
  let inOptions = false;

  // Regex pemisah nomor butir soal: '1.', '1)', 'No. 1', 'No 1' (baik bold ** maupun biasa)
  const qNumRegex = /^(?:\*\*)?(?:No\.?\s*)?(\d{1,3})[\.\)]\s*(.*)/i;
  // Regex opsi: 'A.', 'B.', 'A)', '(A)', '*A.', '**A.**'
  const optRegex = /^(?:\*\*|\*|\[\s*\]|\(\s*\))?\s*([A-Ea-e])[\.\)]\s*(.*)/i;
  // Regex kunci: 'Kunci:', 'Jawaban:', 'Kunci Jawaban:'
  const keyRegex = /^(?:Kunci(?:\s+Jawaban)?|Jawaban)\s*[:=]\s*([A-Ea-e]|\bBenar\b|\bSalah\b|[^\n]+)/i;
  // Regex pembahasan: 'Pembahasan:'
  const pembRegex = /^Pembahasan\s*[:=]\s*(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Cek apakah ini awal nomor butir baru
    const qMatch = line.match(qNumRegex);
    // Pastikan bukan sekadar angka di dalam kalimat
    if (qMatch && !inOptions) {
      if (currentQ) questions.push(finalizeQuestion(currentQ, docxImages));
      currentQ = {
        id: parseInt(qMatch[1], 10),
        pertanyaanLines: [qMatch[2]],
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

    // Jika sedang dalam opsi tapi menemukan nomor baru
    if (qMatch && inOptions && !line.match(optRegex)) {
      if (currentQ) questions.push(finalizeQuestion(currentQ, docxImages));
      currentQ = {
        id: parseInt(qMatch[1], 10),
        pertanyaanLines: [qMatch[2]],
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

    if (!currentQ) continue; // Belum masuk butir soal (misal KOP)

    // Cek baris pembahasan
    const pembMatch = line.match(pembRegex);
    if (pembMatch) {
      currentQ.pembahasan = pembMatch[1].trim();
      continue;
    }

    // Cek baris kunci
    const keyMatch = line.match(keyRegex);
    if (keyMatch) {
      currentQ.kunci = keyMatch[1].replace(/[\*\_\(\)]/g, '').trim().toUpperCase();
      continue;
    }

    // Cek baris opsi A-E
    const optMatch = line.match(optRegex);
    if (optMatch) {
      inOptions = true;
      const letter = optMatch[1].toUpperCase();
      let optText = optMatch[2].trim();
      
      // Jika opsi dicetak tebal '**B. ...**' atau diawali '*', tandai sebagai kunci!
      if (line.startsWith('**') || line.startsWith('*')) {
        currentQ.kunci = letter;
      }
      optText = optText.replace(/^\*\*|\*\*$/g, '').trim();
      currentQ.opsi[letter] = optText;
      continue;
    }

    // Cek gambar embed
    const imgMatch = line.match(/\[GAMBAR_EMBED:\s*([^\]]+)\]/i);
    if (imgMatch) {
      currentQ.gambarTag = imgMatch[1].trim();
      continue;
    }

    // Cek baris tabel
    if (line.startsWith('|')) {
      if (!currentQ.tableRows) currentQ.tableRows = [];
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2) currentQ.tableRows.push(cells);
      continue;
    }

    // Jika belum masuk opsi, ini adalah lanjutan narasi pertanyaan
    if (!inOptions) {
      currentQ.pertanyaanLines.push(line);
    } else {
      // Jika sudah masuk opsi tapi ada baris lanjutan, sambungkan ke opsi terakhir
      const lastKey = Object.keys(currentQ.opsi).pop();
      if (lastKey) {
        currentQ.opsi[lastKey] += ' ' + line;
      }
    }
  }

  if (currentQ) questions.push(finalizeQuestion(currentQ, docxImages));
  return questions;
}

function finalizeQuestion(q, docxImages) {
  let pertanyaan = q.pertanyaanLines.join('\n').trim();
  pertanyaan = pertanyaan.replace(/^\*\*|\*\*$/g, '').trim();

  let tipe = 'PG';
  let kunci = q.kunci || 'A';

  // Deteksi tipe Benar/Salah jika ada tabel dengan kata Benar/Salah
  if (q.tableRows && q.tableRows.length > 1) {
    const dataRows = q.tableRows.slice(1);
    const isBs = dataRows.some(r => /benar|salah/i.test(r[1] || ''));
    if (isBs) {
      tipe = 'BENAR_SALAH';
      const opsiObj = {};
      const kunciObj = {};
      dataRows.forEach((r, idx) => {
        const char = String.fromCharCode(65 + idx);
        opsiObj[char] = r[0].replace(/^\*\*|\*\*$/g, '');
        kunciObj[char] = /benar/i.test(r[1] || '') ? 'Benar' : 'Salah';
      });
      q.opsi = opsiObj;
      kunci = kunciObj;
    }
  }

  const res = {
    id: q.id,
    tipe: tipe,
    level_kognitif: 'C4 (Analisis)',
    pertanyaan: pertanyaan,
    opsi: q.opsi,
    kunci: kunci,
    pembahasan: q.pembahasan || ''
  };

  if (q.gambarTag && docxImages[q.gambarTag]) {
    res.gambar_base64 = docxImages[q.gambarTag];
    res.butuh_gambar = true;
  }

  return res;
}

const docxPath = path.join(rootDir, 'sample_bank_soal_guru.docx');
const buf = fs.readFileSync(docxPath);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

parseDocx(ab).then(res => {
  const directQuestions = parseQuestionsDirectly(res.rawText, res.images);
  console.log('Total butir soal ter-ekstrak langsung (TANPA GEMINI):', directQuestions.length);
  directQuestions.forEach(q => {
    console.log(`\n===========================================`);
    console.log(`No: ${q.id} | Tipe: ${q.tipe} | Kunci: ${JSON.stringify(q.kunci)}`);
    console.log(`Pertanyaan: ${q.pertanyaan.slice(0, 100)}...`);
    console.log(`Opsi:`, q.opsi);
    if (q.pembahasan) console.log(`Pembahasan: ${q.pembahasan}`);
    if (q.gambar_base64) console.log(`Gambar Base64: YES (Panjang: ${q.gambar_base64.length} karakter)`);
  });
});
