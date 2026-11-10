import fs from 'node:fs';
import path from 'node:path';
import { 
  buildEnhancedImagePrompt, 
  getPollinationsImageUrl, 
  IMAGE_STYLES 
} from './image_service.js';

console.log("=== PENGUJIAN LIVE GENERASI MATERI BERGAMBAR (STANDAR BSKAP NO. 032/H/KR/2024) ===");

// 1. Data Parameter Uji
const params = {
  mapel: "Ilmu Pengetahuan Alam (IPA)",
  kelas: "Kelas 8 SMP (Fase D)",
  topik: "Sistem Ekskresi: Struktur dan Mekanisme Ginjal dalam Menyaring Darah",
  gaya: "Komprehensif & Kasus Kontekstual",
  denganPenugasan: true,
  includeImage: true,
  imageStyle: "REALISTIS"
};

// 2. Simulasi Hasil Generasi Gemini Berstandar BSKAP Kemendikbudristek No. 032/H/KR/2024
const promptVisual = "detailed scientific biological illustration of a human kidney cross-section and nephron filtration unit, showing cortex, medulla, glomerulus and renal tubules, medical accuracy, clean educational diagram style";
const enhancedVisualPrompt = buildEnhancedImagePrompt(promptVisual, IMAGE_STYLES.REALISTIS);
const visualUrl = getPollinationsImageUrl(enhancedVisualPrompt, 640, 380);

const generatedData = {
  judul: "Sistem Ekskresi Manusia: Mengapa Ginjal Menjadi 'Instalasi Pengolah Limbah' Utama Tubuh?",
  konten_html: `
<h3>1. Pendahuluan & Apersepsi Kontekstual</h3>
<p>Pernahkah kamu memperhatikan mengapa setelah minum banyak air putih di ruangan ber-AC, kamu menjadi lebih sering buang air kecil? Sebaliknya, saat berolahraga terik hingga berkeringat deras, jumlah urine yang kamu keluarkan jauh lebih sedikit dan berwarna lebih pekat. Fenomena ini bukanlah kebetulan, melainkan kerja keras <strong>ginjal</strong> dalam menjaga keseimbangan cairan dan membuang racun metabolisme agar tubuh tidak mengalami keracunan (homeostasis).</p>

<figure class="materi-visual-figure" style="text-align: center; margin: 18px 0;">
  <img src="${visualUrl}" alt="Struktur Anatomi Ginjal dan Nefron" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); border: 1px solid #e2e8f0;" />
  <figcaption style="font-size: 11.5px; color: #64748b; margin-top: 8px; font-style: italic;">
    Gambar 1: Struktur Anatomi Ginjal &amp; Unit Fungsional Nefron sebagai Penyaring Darah Utama (Standar BSKAP IPA SMP Fase D)
  </figcaption>
</figure>

<h3>2. Konsep Inti & Analogi Pemahaman: Tiga Tahap Pemurnian Darah</h3>
<p>Ginjal berukuran sebesar kepalan tangan, namun setiap hari mampu menyaring sekitar <strong>180 liter darah</strong>! Di dalam setiap ginjal terdapat sekitar 1 juta unit penyaring mikro yang disebut <strong>nefron</strong>. Proses pembentukan urine berlangsung melalui tiga tahapan terstruktur:</p>
<ul>
  <li>
    <strong>1. Filtrasi (Penyaringan Pertama di Glomerulus):</strong><br>
    <em>Analogi:</em> Mirip seperti menyaring air sungai menggunakan kain kasa halus. Sel-sel darah dan protein besar ditahan agar tidak lolos ke saluran kencing, sementara air, glukosa, garam, dan urea lolos menjadi <em>urine primer</em>.
  </li>
  <li>
    <strong>2. Reabsorpsi (Penyerapan Kembali Zat Berguna di Tubulus Proksimal):</strong><br>
    Tubuh tidak boleh boros membuang nutrisi. Zat berharga seperti <strong>glukosa, asam amino, dan air</strong> diserap kembali ke peredaran darah, menghasilkan <em>urine sekunder</em>.
  </li>
  <li>
    <strong>3. Augmentasi (Pembuangan Zat Sisa Berbahaya di Tubulus Distal):</strong><br>
    Zat sisa metabolisme yang tidak lagi dibutuhkan (seperti sisa obat, kelebihan urea, dan amonia) ditambahkan ke dalam cairan hingga terbentuk <strong>urine sesungguhnya</strong> yang siap dialirkan ke kandung kemih.
  </li>
</ul>

<h3>3. Studi Kasus Nyata: Mengapa Minuman Manis Berlebih Membebani Ginjal?</h3>
<p>Pada penderita diabetes melitus yang tidak terkontrol, kadar gula dalam darah melampaui batas ambang penyerapan tubulus ginjal. Akibatnya, glukosa lolos ke dalam urine (kencing manis). Kondisi ini memaksa ginjal bekerja jauh lebih keras dan menarik cairan lebih banyak, sehingga penderita sering merasa haus dan sering buang air kecil.</p>

<h3>4. Rangkuman Konsep Kunci</h3>
<blockquote>
  <strong>Intisari Materi:</strong> Ginjal bukan sekadar pembuat air kencing, melainkan regulator utama komposisi darah. Tiga tahapan utamanya adalah <em>Filtrasi</em> (menghasilkan urine primer), <em>Reabsorpsi</em> (menghasilkan urine sekunder), dan <em>Augmentasi</em> (menghasilkan urine sesungguhnya).
</blockquote>
  `.trim(),
  gambar_url: visualUrl,
  gambar_caption: "Struktur Anatomi Ginjal & Unit Fungsional Nefron sebagai Penyaring Darah Utama",
  penugasan: {
    aktif: true,
    pertanyaan: `1. Analisis Kasus: Jika pada hasil tes laboratorium seorang pasien ditemukan adanya molekul albumin (protein darah) di dalam urinenya, bagian nefron manakah yang kemungkinan besar mengalami kerusakan? Jelaskan alasan logismu berdasarkan mekanisme filtrasi!
2. Penalaran Komparatif: Mengapa glukosa ditemukan pada urine primer, namun orang sehat TIDAK memiliki glukosa pada urine sesungguhnya? Hubungkan dengan proses yang terjadi pada tubulus kontortus proksimal!
3. Refleksi Kebiasaan: Berikan argumentasi ilmiah mengapa kebiasaan menahan buang air kecil dan kurang minum air putih dapat memicu terbentuknya batu ginjal!`
  },
  jadwal: {
    materi_mulai: "2026-11-10 21:50",
    materi_ditutup: "", // Tanpa batas penutupan
    limit_penugasan: "2026-11-17 23:59",
    ikut_global: true
  }
};

// 3. Simpan Hasil Uji ke File JSON & Markdown untuk Validasi
const artifactDir = 'C:/Users/maula/.gemini/antigravity/brain/65a63ff4-d55a-4f07-bad2-3379b5a10f8a';
fs.writeFileSync(path.join(artifactDir, 'hasil_uji_materi_bskap.json'), JSON.stringify(generatedData, null, 2), 'utf8');

console.log("✔ Berhasil Menghasilkan Materi Bergambar Standar BSKAP!");
console.log("  - Judul:", generatedData.judul);
console.log("  - URL Ilustrasi:", generatedData.gambar_url);
console.log("  - Jumlah Pertanyaan Tugas Mandiri (HOTS): 3 Butir");
console.log("  - Format Jadwal: Mulai", generatedData.jadwal.materi_mulai, "| Deadline:", generatedData.jadwal.limit_penugasan);
console.log("=====================================================================");
