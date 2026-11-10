import assert from 'node:assert';
import { detectCognitiveLevel, extractAndStripCognitiveTag, parseQuestionsDirectly } from '../scripts/docx_parser.js';

console.log("=== ANS QC AUDIT: SMART BLOOM'S TAXONOMY DETECTION SUITE ===");

// 1. UJI DETEKSI TAG EKSPLISIT & PEMBERSIHAN DARI PROMPT
{
  const res1 = extractAndStripCognitiveTag("[C1] Sebutkan nama pendiri organisasi Budi Utomo!");
  assert.strictEqual(res1.level, "C1 (Mengingat)", "Harus mengenali [C1]");
  assert.strictEqual(res1.cleanText, "Sebutkan nama pendiri organisasi Budi Utomo!", "Tag [C1] harus dibersihkan");

  const res2 = extractAndStripCognitiveTag("Jelaskan prinsip kerja transmisi manual! (C2)");
  assert.strictEqual(res2.level, "C2 (Memahami)", "Harus mengenali (C2)");
  assert.strictEqual(res2.cleanText, "Jelaskan prinsip kerja transmisi manual!", "Tag (C2) harus dibersihkan");

  const res3 = extractAndStripCognitiveTag("[C3 - Aplikasi] Tentukan saldo kas akhir!");
  assert.strictEqual(res3.level, "C3 (Aplikasi)", "Harus mengenali [C3 - Aplikasi]");
  assert.strictEqual(res3.cleanText, "Tentukan saldo kas akhir!", "Tag harus dibersihkan");

  const res4 = extractAndStripCognitiveTag("Level: C4 Analisislah tabel berikut!");
  assert.strictEqual(res4.level, "C4 (Analisis)", "Harus mengenali Level: C4");

  const res5 = extractAndStripCognitiveTag("[HOTS] Mengapa terjadi inflasi di negara berkembang?");
  assert.strictEqual(res5.level, "C4 (Analisis)", "Harus mengenali [HOTS]");
  assert.strictEqual(res5.cleanText, "Mengapa terjadi inflasi di negara berkembang?");

  console.log("✔ Test 1 Lolos: Deteksi Tag Eksplisit & Pembersihan Prompt Berhasil");
}

// 2. UJI KKO BAHASA INDONESIA (C1 - C6)
{
  // C1: Mengingat
  const c1Text = "Sebutkan 3 macam sistem ekonomi yang ada di dunia!";
  assert.strictEqual(detectCognitiveLevel(c1Text), "C1 (Mengingat)", "Sebutkan -> C1");

  const c1TextDef = "Yang dimaksud dengan aktiva lancar adalah...";
  assert.strictEqual(detectCognitiveLevel(c1TextDef), "C1 (Mengingat)", "Yang dimaksud dengan -> C1");

  // C2: Memahami
  const c2Text = "Jelaskan perbedaan mendasar antara pasar persaingan sempurna dan monopolistik!";
  assert.strictEqual(detectCognitiveLevel(c2Text), "C2 (Memahami)", "Jelaskan perbedaan -> C2");

  const c2TextRangkum = "Uraikan mengapa bank sentral menaikkan suku bunga acuan!";
  assert.strictEqual(detectCognitiveLevel(c2TextRangkum), "C2 (Memahami)", "Uraikan mengapa -> C2");

  // C3: Aplikasi (Hitungan & Prosedur)
  const c3TextCalc = "Hitunglah besarnya laba bersih jika diketahui pendapatan Rp100.000.000 dan beban Rp60.000.000!";
  assert.strictEqual(detectCognitiveLevel(c3TextCalc), "C3 (Aplikasi)", "Hitunglah besarnya laba -> C3");

  const c3TextSaldo = "Berapakah besar saldo kas pada akhir periode akuntansi?";
  assert.strictEqual(detectCognitiveLevel(c3TextSaldo), "C3 (Aplikasi)", "Berapakah besar saldo -> C3");

  // C4: Analisis (Studi Kasus, Hubungan Variabel, Kesalahan Pencatatan)
  const c4Text = "Berdasarkan tabel neraca saldo di atas, analisislah penyebab terjadinya ketidakseimbangan debit kredit!";
  assert.strictEqual(detectCognitiveLevel(c4Text), "C4 (Analisis)", "Berdasarkan tabel analisislah -> C4");

  const c4TextError = "Temukan kesalahan pencatatan jurnal penyesuaian yang dilakukan akuntan berikut:";
  assert.strictEqual(detectCognitiveLevel(c4TextError), "C4 (Analisis)", "Temukan kesalahan -> C4");

  // C5: Evaluasi (Penilaian Keputusan & Justifikasi)
  const c5Text = "Evaluasilah apakah keputusan manajer membeli kendaraan operasional secara kredit sudah tepat bagi likuiditas perusahaan!";
  assert.strictEqual(detectCognitiveLevel(c5Text), "C5 (Evaluasi)", "Evaluasilah apakah keputusan -> C5");

  const c5TextCritic = "Nilailah efektivitas penerapan kebijakan moneter kontraktif dalam menekan laju inflasi!";
  assert.strictEqual(detectCognitiveLevel(c5TextCritic), "C5 (Evaluasi)", "Nilailah efektivitas -> C5");

  // C6: Kreasi (Perancangan Solusi & Rekomendasi)
  const c6Text = "Rancanglah sebuah format laporan arus kas metode langsung untuk UMKM kuliner!";
  assert.strictEqual(detectCognitiveLevel(c6Text), "C6 (Kreasi)", "Rancanglah format laporan -> C6");

  const c6TextSol = "Buatlah rekomendasi strategi pemulihan keuangan bagi perusahaan yang mengalami defisit modal!";
  assert.strictEqual(detectCognitiveLevel(c6TextSol), "C6 (Kreasi)", "Buatlah rekomendasi strategi -> C6");

  console.log("✔ Test 2 Lolos: Klasifikasi KKO Bahasa Indonesia C1-C6 Terverifikasi Presisi");
}

// 3. UJI KKO BAHASA INGGRIS (C1 - C6)
{
  assert.strictEqual(detectCognitiveLevel("Define the term gross domestic product (GDP)."), "C1 (Mengingat)");
  assert.strictEqual(detectCognitiveLevel("Explain how exchange rates influence international trade."), "C2 (Memahami)");
  assert.strictEqual(detectCognitiveLevel("Calculate the price elasticity of demand given the price increase."), "C3 (Aplikasi)");
  assert.strictEqual(detectCognitiveLevel("Analyze the primary causes of the 2008 global financial crisis."), "C4 (Analisis)");
  assert.strictEqual(detectCognitiveLevel("Evaluate the trade-off between economic growth and environmental protection."), "C5 (Evaluasi)");
  assert.strictEqual(detectCognitiveLevel("Design an innovative monetary policy framework to address stagflation."), "C6 (Kreasi)");

  console.log("✔ Test 3 Lolos: Klasifikasi KKO Bahasa Inggris C1-C6 Terverifikasi Presisi");
}

// 4. UJI INTEGRASI DENGAN PARSER LANGSUNG (EKONOMI 35 SOAL)
{
  const sampleDoc = `
1. Yang dimaksud dengan akuntansi sebagai sistem informasi adalah...
A. Seni mencatat
B. Proses identifikasi data
C. Laporan keuangan
D. Pengambilan keputusan
E. Pengawasan manajemen

2. Jelaskan perbedaan antara debit dan kredit dalam akuntansi keuangan!
A. Kiri dan kanan
B. Tambah dan kurang
C. Harta dan utang
D. Beban dan modal
E. Masuk dan keluar

3. [TABEL_1]
Berdasarkan data tersebut, besarnya laba bersih perusahaan adalah...
A. Rp10.000.000
B. Rp15.000.000
C. Rp20.000.000
D. Rp25.000.000
E. Rp30.000.000

4. [TABEL_2]
Berdasarkan bukti transaksi tersebut, analisislah akun yang harus didebit dan dikredit!
A. Kas di debit
B. Piutang di kredit
C. Utang di debit
D. Beban di debit
E. Modal di kredit

5. Evaluasilah apakah keputusan manajer membeli obligasi pemerintah sudah tepat!
A. Tepat karena aman
B. Kurang tepat
C. Tidak tepat
D. Perlu ditinjau
E. Menambah risiko
  `;

  const parsed = parseQuestionsDirectly(sampleDoc, {}, []);
  assert.strictEqual(parsed.length, 5, "Harus mem-parse 5 butir soal");

  assert.strictEqual(parsed[0].level_kognitif, "C1 (Mengingat)", "Soal 1 definisi -> C1");
  assert.strictEqual(parsed[1].level_kognitif, "C2 (Memahami)", "Soal 2 konsep -> C2");
  assert.strictEqual(parsed[2].level_kognitif, "C3 (Aplikasi)", "Soal 3 hitungan laba bersih -> C3");
  assert.strictEqual(parsed[3].level_kognitif, "C4 (Analisis)", "Soal 4 analisis transaksi tabel -> C4");
  assert.strictEqual(parsed[4].level_kognitif, "C5 (Evaluasi)", "Soal 5 evaluasi keputusan -> C5");

  console.log("✔ Test 4 Lolos: Integrasi Parsing Soal Nyata Menghasilkan Ragam Level Kognitif Otomatis!");
}

// 5. UJI PROTEKSI INTEGRITAS BASE64 GAMBAR (ANTI-CORRUPTION GUARANTEE)
{
  const fakeBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6e//c2/jAF36CD33lJ/jQ1/8lH7rzf";
  const htmlWithImg = `<p>Perhatikan gambar berikut:</p><table class="afresto-exam-table"><tr><td>1</td><td><img src="${fakeBase64}"></td></tr></table>`;

  const { cleanText, level } = extractAndStripCognitiveTag(htmlWithImg);
  assert.strictEqual(cleanText.includes(fakeBase64), true, "Base64 data tidak boleh mengalami korosi byte");
  assert.strictEqual(level, null, "Pola //c2/ di dalam base64 tidak boleh diartikan sebagai tag [C2]");

  console.log("✔ Test 5 Lolos: Proteksi Integritas Base64 Gambar Bebas Korosi Terverifikasi Presisi!");
}

console.log("\n========================================================");
console.log("⭐ VERIFIKASI QC BLOOM'S TAXONOMY ENGINE: 100% PASS (GRADE A+)");
console.log("========================================================");
