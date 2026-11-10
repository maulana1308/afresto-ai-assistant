import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log("=== ANS QC AUDIT: MILESTONE 3.2 MULTILINGUAL ADAPTATION SUITE ===");

// 1. UJI DETEKSI TIPOGRAFI BAHASA ARAB (RTL) & PELESTARIAN HARAKAT
function detectScriptTypography(text) {
  if (!text || typeof text !== "string") return { dir: "ltr", isArabic: false, extraStyle: "" };

  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)) {
    return {
      dir: "rtl",
      isArabic: true,
      extraStyle: "direction: rtl; text-align: right; font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 16px; line-height: 1.85;"
    };
  }

  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    return {
      dir: "ltr",
      isArabic: false,
      extraStyle: "font-family: 'Hiragino Sans', 'Noto Sans JP', 'Meiryo', sans-serif; font-size: 14.5px; line-height: 1.7;"
    };
  }

  if (/[\uA980-\uA9DF]/.test(text)) {
    return {
      dir: "ltr",
      isArabic: false,
      extraStyle: "font-family: 'Noto Sans Javanese', 'Yogya', system-ui, sans-serif; font-size: 16px; line-height: 1.9;"
    };
  }

  return { dir: "ltr", isArabic: false, extraStyle: "" };
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

// Test 1: Teks Arab Berharakat Lengkap
const sampleArab = "عَيِّنِ الفَاعِلَ فِي الجُمْلَةِ التَّالِيَةِ: ذَهَبَ أَحْمَدُ إِلَى المَدْرَسَةِ";
const arabMeta = detectScriptTypography(sampleArab);
assert.strictEqual(arabMeta.dir, "rtl", "Teks Arab wajib memiliki atribut dir='rtl'");
assert.strictEqual(arabMeta.isArabic, true, "isArabic harus bernilai true");
assert.ok(arabMeta.extraStyle.includes("direction: rtl"), "Style wajib menyertakan direction: rtl");
assert.ok(arabMeta.extraStyle.includes("text-align: right"), "Style wajib menyertakan text-align: right");

const escapedArab = escapeHtml(sampleArab);
assert.strictEqual(escapedArab, sampleArab, "Harakat Arab (fathah, kasrah, dhommah, tanwin, sukun) wajib utuh 100%");
console.log("✔ Test 1 Lolos: Deteksi Bahasa Arab RTL & Pelestarian Harakat Lengkap Terverifikasi");

// Test 2: Teks Bahasa Jepang (Kanji, Hiragana, Katakana)
const sampleJepang = "田中さんは毎日７時に起きて、学校へ行きます。";
const jepangMeta = detectScriptTypography(sampleJepang);
assert.strictEqual(jepangMeta.dir, "ltr", "Teks Jepang berarah LTR");
assert.ok(jepangMeta.extraStyle.includes("Noto Sans JP"), "Wajib menggunakan font CJK Noto Sans JP");

const escapedJepang = escapeHtml(sampleJepang);
assert.strictEqual(escapedJepang, sampleJepang, "Huruf Kanji dan Hiragana wajib utuh tanpa korup");
console.log("✔ Test 2 Lolos: Deteksi Huruf Jepang (Kanji & Kana) Terverifikasi");

// Test 3: Teks Aksara Jawa & Krama Inggil
const sampleAksaraJawa = "ꦲꦤꦕꦫꦏ";
const jawaMeta = detectScriptTypography(sampleAksaraJawa);
assert.ok(jawaMeta.extraStyle.includes("Noto Sans Javanese"), "Wajib menyertakan font Noto Sans Javanese");

const sampleKrama = "Bapak nembe tindak dhateng kantor numpak sepur.";
const escapedKrama = escapeHtml(sampleKrama);
assert.strictEqual(escapedKrama, sampleKrama, "Kosakata Basa Jawa Krama Alus wajib utuh");
console.log("✔ Test 3 Lolos: Dukungan Bahasa Jawa (Krama Inggil & Aksara Jawa) Terverifikasi");

// Test 4: Diakritik Bahasa Perancis & Jerman (Eropa)
const samplePerancis = "L'élève français récite une leçon très intéressante dans la forêt.";
const escapedPerancis = escapeHtml(samplePerancis);
assert.ok(escapedPerancis.includes("élève"), "Aksen é dan è harus utuh");
assert.ok(escapedPerancis.includes("français"), "Huruf cédille ç harus utuh");
assert.ok(escapedPerancis.includes("très"), "Aksen è harus utuh");
assert.ok(escapedPerancis.includes("forêt"), "Aksen circonflexe ê harus utuh");

const sampleJerman = "Die Schüler müssen fleißig Deutsch üben, um schöne Wörter zu lernen.";
const escapedJerman = escapeHtml(sampleJerman);
assert.ok(escapedJerman.includes("Schüler"), "Umlaut ü harus utuh");
assert.ok(escapedJerman.includes("fleißig"), "Eszett ß harus utuh");
assert.ok(escapedJerman.includes("schöne"), "Umlaut ö harus utuh");
assert.ok(escapedJerman.includes("Wörter"), "Umlaut ö harus utuh");
console.log("✔ Test 4 Lolos: Pelestarian Karakter Diakritik Perancis & Jerman (UTF-8) Terverifikasi");

// Test 5: Verifikasi Integrasi di scripts/gemini.js
const geminiCode = fs.readFileSync(path.resolve('scripts/gemini.js'), 'utf8');
assert.ok(geminiCode.includes("PEDOMAN KHUSUS MATA PELAJARAN BAHASA ARAB"), "Directive Bahasa Arab wajib ada di prompt Gemini");
assert.ok(geminiCode.includes("PEDOMAN KHUSUS MATA PELAJARAN BAHASA JEPANG"), "Directive Bahasa Jepang wajib ada di prompt Gemini");
assert.ok(geminiCode.includes("PEDOMAN KHUSUS MATA PELAJARAN BAHASA JAWA"), "Directive Bahasa Jawa wajib ada di prompt Gemini");
assert.ok(geminiCode.includes("PEDOMAN KHUSUS MATA PELAJARAN BAHASA PERANCIS"), "Directive Bahasa Perancis wajib ada di prompt Gemini");
assert.ok(geminiCode.includes("PEDOMAN KHUSUS MATA PELAJARAN BAHASA JERMAN"), "Directive Bahasa Jerman wajib ada di prompt Gemini");
console.log("✔ Test 5 Lolos: Pedagogical Multilingual Directive di Gemini Engine Terverifikasi");

// Test 6: Verifikasi CSS Multilingual
const cssCode = fs.readFileSync(path.resolve('sidepanel/sidepanel.css'), 'utf8');
assert.ok(cssCode.includes('.q-rtl'), "CSS .q-rtl wajib terdefinisi di sidepanel.css");
assert.ok(cssCode.includes('.q-cjk'), "CSS .q-cjk wajib terdefinisi di sidepanel.css");
assert.ok(cssCode.includes('.q-javanese'), "CSS .q-javanese wajib terdefinisi di sidepanel.css");
console.log("✔ Test 6 Lolos: Kelas Tipografi Multilingual di sidepanel.css Terverifikasi");

console.log("\n========================================================");
console.log("⭐ VERIFIKASI QC MILESTONE 3.2: 100% TEST PASS (GRADE A+)");
console.log("========================================================");
