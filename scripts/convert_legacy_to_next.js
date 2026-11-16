/**
 * Copyright (c) 2026 Maulana Ibrahim
 * Built by : Maulana Ibrahim
 */
/**
 * CLI Jembatan Konversi: Afresto Legacy (.docx) -> Afresto Next (.docx)
 * Penggunaan:
 *   node scripts/convert_legacy_to_next.js <input_legacy.docx> [output_next.docx] [--api-key=AIza...]
 */

import fs from 'fs';
import path from 'path';
import { parseDocx } from './docx_parser.js';
import { buildAfrestoNextDocx } from './afresto_next_exporter.js';
import { GeminiService } from './gemini.js';

async function main() {
  const args = process.argv.slice(2);
  const keyArg = args.find(a => a.startsWith('--api-key='));
  const positional = args.filter(a => !a.startsWith('--'));

  if (positional.length === 0) {
    console.error('Penggunaan: node scripts/convert_legacy_to_next.js <input_legacy.docx> [output_next.docx] [--api-key=...]');
    process.exit(1);
  }

  const inputPath = path.resolve(positional[0]);
  if (!fs.existsSync(inputPath)) {
    console.error('Berkas sumber tidak ditemukan:', inputPath);
    process.exit(1);
  }

  const parsedInput = path.parse(inputPath);
  const outputPath = positional[1]
    ? path.resolve(positional[1])
    : path.join(parsedInput.dir, `${parsedInput.name}_Afresto_Next.docx`);

  const rawBuf = fs.readFileSync(inputPath);
  const ab = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
  const parsed = await parseDocx(ab);
  const questions = parsed.directQuestions || [];

  const apiKey = keyArg ? keyArg.slice('--api-key='.length).trim() : (process.env.GEMINI_API_KEY || '').trim();
  if (apiKey) {
    const gemini = new GeminiService(apiKey, 'gemini-2.5-flash');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.tipe === 'BENAR_SALAH' && Object.keys(q.opsi || {}).length < 2 && q.gambar_base64) {
        console.log(`OCR Gemini Vision untuk soal Benar/Salah #${i + 1}...`);
        const extracted = await gemini.extractBenarSalahFromImage(q.gambar_base64, q.pertanyaan || '');
        q.opsi = extracted.opsi;
        q.kunci = extracted.kunci;
        q._ocrExtracted = true;
        q.gambar_base64 = null;
      }
    }
  }

  const { bytes, stats } = await buildAfrestoNextDocx(questions);
  fs.writeFileSync(outputPath, Buffer.from(bytes));

  const counts = {};
  for (const q of questions) {
    counts[q.tipe] = (counts[q.tipe] || 0) + 1;
  }

  console.log(`Selesai mengekspor ${stats.total} soal ke: ${outputPath}`);
  console.log('Rincian tipe soal:', JSON.stringify(counts));
  if (stats.incompleteBenarSalah.length > 0) {
    console.warn(
      `Peringatan: Soal nomor ${stats.incompleteBenarSalah.join(', ')} memiliki pernyataan Benar/Salah di gambar dan belum di-OCR teksnya. Jalankan ulang dengan --api-key=... atau lengkapi tabel di Word/Konverter Web.`
    );
  }
}

main().catch(err => {
  console.error('Gagal mengonversi dokumen:', err);
  process.exit(1);
});
