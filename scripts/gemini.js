/**
 * Afresto AI Assistant - Gemini API Engine
 * Mengelola komunikasi langsung dari browser ke Google Gemini API (BYOK).
 */

export const ALLOWED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash"
];

// Cache daftar model aktif per API key agar tidak memanggil GET /models berulang kali di setiap batch
let cachedOnlineModelsKey = "";
let cachedOnlineModelsList = [];

export class GeminiService {
  constructor(apiKey, model = "gemini-3.5-flash-lite") {
    this.apiKey = (apiKey || "").trim();
    let cleanModel = (model || "").replace(/^models\//, "").trim();
    if (!ALLOWED_MODELS.includes(cleanModel)) {
      cleanModel = "gemini-3.5-flash-lite";
    }
    this.model = cleanModel;
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
  }

  /**
   * Mengambil daftar model yang aktif dan didukung untuk generateContent di akun Google ini (dengan cache)
   */
  async listAvailableModels(forceRefresh = false) {
    try {
      if (!this.apiKey) return [];
      if (!forceRefresh && cachedOnlineModelsKey === this.apiKey && cachedOnlineModelsList.length > 0) {
        return cachedOnlineModelsList;
      }

      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 8000);
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      let response;
      try {
        response = await fetch(testUrl, {
          method: "GET",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutTimer);
      }
      if (!response.ok) return [];
      const data = await response.json();
      if (!data.models || !Array.isArray(data.models)) return [];

      const supported = data.models
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace(/^models\//, "").trim());

      if (supported.length > 0) {
        cachedOnlineModelsKey = this.apiKey;
        cachedOnlineModelsList = supported;
      }
      return supported;
    } catch (_) {
      return [];
    }
  }

  /**
   * Menguji validitas API Key langsung ke endpoint Google Gemini
   */
  async testConnection() {
    try {
      if (!this.apiKey) {
        throw new Error("Kunci API masih kosong.");
      }

      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => {
        controller.abort(new Error("Waktu koneksi habis (10 detik). Periksa koneksi internet Anda."));
      }, 10000);

      // Gunakan GET /models untuk verifikasi keaslian dan status aktif Kunci API secara instan
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      let response;
      try {
        response = await fetch(testUrl, {
          method: "GET",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutTimer);
      }

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errMsg = errorData.error?.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const supportedModels = (data.models || [])
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace(/^models\//, "").trim());

      return {
        success: true,
        models: supportedModels,
        message: `✅ Kunci API Valid & Berhasil Tersambung! (${supportedModels.length} model generateContent aktif)`
      };
    } catch (err) {
      return {
        success: false,
        message: `❌ Gagal Tersambung: ${err.message}`
      };
    }
  }

  /**
   * Membuat paket soal berformat terstruktur (JSON) berdasarkan parameter kurikulum
   */
  async generateQuestions(params, onStatusUpdate = null) {
    const {
      mapel,
      kelas,
      materiPokok,
      tujuanPembelajaran,
      customPrompt,
      tingkatKognitif,
      distribusiTipe,
      includeImage = false,
      imageStyle = "AUTO"
    } = params;

    // Hitung rincian tipe soal yang diminta
    const requestedTypes = Object.entries(distribusiTipe)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([type, qty]) => `- ${type}: ${qty} butir`)
      .join("\n");

    const totalQty = Object.values(distribusiTipe).reduce((acc, curr) => acc + Number(curr), 0);

    // Deteksi Bahasa Target dari Mapel, Materi, atau Instruksi Khusus Guru
    const combinedLangContext = `${mapel || ""} ${customPrompt || ""} ${materiPokok || ""}`.toLowerCase();
    let multilingualDirective = "";

    if (combinedLangContext.includes("arab")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN BAHASA ARAB:
- WAJIB menuliskan teks pertanyaan, narasi bacaan (qira'ah), dialog (muhadatsah), dan opsi A-E dalam BAHASA ARAB BERHARAKAT LENGKAP (Fathah, Kasrah, Dhommah, Sukun, Tanwin).
- Soal harus selaras dengan kaidah kurikulum: Nahwu, Shorof, Mufrodat, Tarjamah, atau pemahaman teks.
- Instruksi pengerjaan soal (misal: 'Pilihlah jawaban yang paling tepat!') boleh disajikan dwibahasa atau bahasa Arab berharakat.`;
    } else if (combinedLangContext.includes("jepang")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN BAHASA JEPANG:
- WAJIB menyusun kalimat stimulus, percakapan dialog, opsi A-E, dan pertanyaan dalam HURUF JEPANG ASLI (Kombinasi Kanji tingkat sekolah/JLPT N5-N4, Hiragana, dan Katakana).
- Sesuai standar kurikulum SMA/SMK: Bunpou (tata bahasa/partikel wa, ga, o, ni), Kotoba (kosakata), Aisatsu (salam), atau Dokkai (pemahaman teks).`;
    } else if (combinedLangContext.includes("jawa")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN BAHASA JAWA (MUATAN LOKAL):
- WAJIB menyusun teks narasi, pacelathon (dialog percakapan), dan butir soal dalam BAHASA JAWA BAKU.
- Terapkan tingkatan bahasa (Unggah-Ungguh Basa Jawa): Ngoko Lugu, Ngoko Alus, Krama Lugu, atau Krama Alus (Inggil) sesuai indikator soal.
- Mendukung materi: Tembang Macapat (Pocung, Sinom, Gambuh, Pangkur), Paribasan/Bebasan, Wayang, serta Aksara Jawa Unicode jika relevan.`;
    } else if (combinedLangContext.includes("perancis") || combinedLangContext.includes("francais") || combinedLangContext.includes("french")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN BAHASA PERANCIS:
- WAJIB menuliskan teks pertanyaan, dialog percakapan, dan opsi dalam BAHASA PERANCIS yang tepat dengan tanda aksen resmi (é, è, ê, ç, à, â, î, ô, û).
- Materi sesuai kurikulum SMA/SMK (tingkat CEFR A1-A2): Conjugaison, Vocabulaire, Grammaire.`;
    } else if (combinedLangContext.includes("jerman") || combinedLangContext.includes("deutsch") || combinedLangContext.includes("german")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN BAHASA JERMAN:
- WAJIB menuliskan teks pertanyaan, dialog, dan opsi dalam BAHASA JERMAN yang benar dengan huruf khusus (ä, ö, ü, ß).
- Materi sesuai kurikulum SMA/SMK (tingkat A1-A2): Grammatik (Artikel der/die/das, Kasus Nominativ/Akkusativ), Wortschatz.`;
    } else if (combinedLangContext.includes("inggris") || combinedLangContext.includes("english")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN BAHASA INGGRIS:
- WAJIB menyusun reading passage, dialog percakapan, butir soal, dan opsi pilihan dalam BAHASA INGGRIS alami berstandar akademik (Grammar, Reading Comprehension, Vocabulary in Context).`;
    } else if (combinedLangContext.includes("sunda")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN BAHASA SUNDA (MUATAN LOKAL):
- WAJIB menyusun teks narasi dan butir soal dalam BAHASA SUNDA BAKU.
- Terapkan Undak Usuk Basa Sunda (Basa Loma atau Basa Lemes) sesuai indikator soal.
- Mendukung materi: Kawih, Pupuh, Carita Pondok, Babasan/Paribasa, Paguneman, serta Aksara Sunda jika relevan.`;
    } else if (combinedLangContext.includes("mandarin") || combinedLangContext.includes("chinese")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN BAHASA MANDARIN:
- WAJIB menyusun butir soal menggunakan Karakter Hanzi Sederhana (Simplified Chinese) disertai Pinyin berton jika sesuai tingkat pemula (HSK 1-3).
- Materi selaras dengan kurikulum peminatan: Tata bahasa (Yufa), Kosakata (Cihui), dan Pemahaman Teks (Yuedu).`;
    } else if (combinedLangContext.includes("fiqih") || combinedLangContext.includes("akhlak") || combinedLangContext.includes("ski") || combinedLangContext.includes("qur'an") || combinedLangContext.includes("hadits") || combinedLangContext.includes("aswaja") || combinedLangContext.includes("kemuhammadiyahan")) {
      multilingualDirective = `
PEDOMAN KHUSUS MATA PELAJARAN PENDIDIKAN AGAMA ISLAM & KEKHUSUSAN SEKOLAH/MADRASAH:
- Selaras dengan standar KMA Kemenag No. 347/2022 & No. 450/2024 atau pedoman yayasan terkait.
- Dalil Al-Qur'an dan Al-Hadits WAJIB ditulis dengan teks Arab berharakat benar disertai terjemahan resmi Kemenag.
- Sajikan studi kasus fikih/akhlak yang kontekstual, toleran, dan moderat (Wasathiyyah).`;
    }

    const systemInstruction = `Anda adalah pakar pembuat soal dan asesmen pendidikan kurikulum di Indonesia (Kurikulum Merdeka).
Tugas Anda adalah memproduksi ${totalQty} butir soal asesmen yang bermutu tinggi, berbobot ilmiah, bebas dari kesalahan konseptual, dan selaras dengan indikator pembelajaran.

STANDAR ASESMEN NASIONAL (BSKAP KEMENDIKBUDRISTEK NO. 032/H/KR/2024 & PUSMENDIK):
1. Penyelarasan Capaian Pembelajaran (CP) & Tujuan Pembelajaran (TP):
   - Soal wajib selaras dengan fase perkembangan siswa (${kelas || "SMA/SMK"} - Kurikulum Merdeka).
2. Tiga Konteks Stimulus AKM Wajib:
   - Personal (kehidupan sehari-hari siswa), Sosial-Budaya (masyarakat, tradisi, pariwisata), atau Saintifik (alam, sains, teknologi, data).
   - Soal TIDAK BOLEH berupa hafalan kering tanpa stimulus.
3. Tiga Tingkat Proses Kognitif Asesmen:
   - Level 1: Knowing (Pemahaman fakta, konsep, dan kalkulasi dasar).
   - Level 2: Applying (Penerapan konsep pada permasalahan kontekstual).
   - Level 3: Reasoning / HOTS (Analisis, evaluasi data/grafik/bacaan, inferensi, dan pemecahan masalah kompleks).

PEDOMAN MATA PELAJARAN MUATAN LOKAL & KHAS SEKOLAH (NON-BSKAP / KEMENAG / DAERAH):
- Untuk Bahasa Daerah (Jawa, Sunda, dsb.): Selaraskan dengan Kurikulum Muatan Lokal Pergub/Perda Dinas Pendidikan Provinsi terkait tata bahasa, tingkatan bahasa baku, dan sastra daerah.
- Untuk Bahasa Arab & PAI Keagamaan: Selaraskan dengan standar KMA Kemenag No. 347/2022 & No. 450/2024, tulis teks Arab berharakat lengkap, kaidah Nahwu/Shorof sahih, dan dalil Al-Qur'an/Hadits yang akurat.
- Untuk Bahasa Asing Pilihan (Jepang, Mandarin, Perancis, Jerman): Terapkan standar internasional CEFR/JLPT/HSK dengan ortografi asli.
- Untuk Mapel Khas Sekolah / Yayasan (misal Kemuhammadiyahan, Ke-NU-an / Aswaja, Vokasi Lokal Mandiri SMK): Terapkan prinsip Contextual Alignment: gunakan silabus/TP yang diberikan guru dan bungkus ke dalam kerangka asesmen bermutu tinggi berstandar AKM (stimulus kontekstual, studi kasus nyata, dan rubrik kunci jawaban terukur).

Pedoman Pembuatan:
1. Mata Pelajaran: ${mapel || "Umum"}
2. Tingkat / Kelas: ${kelas || "SMA/SMK"}
3. Materi Pokok: ${materiPokok || "Materi Umum"}
4. Tujuan Pembelajaran (TP): ${tujuanPembelajaran ? `"${tujuanPembelajaran}"` : "Tidak dispesifikasikan (fokus pada materi pokok)"}
5. Tingkat Kognitif: ${tingkatKognitif || "HOTS (C4-C6)"}
6. Instruksi Tambahan Guru: ${customPrompt ? `"${customPrompt}"` : "Standar akademik berkualitas tinggi"}
7. Mode Ilustrasi Gambar: ${includeImage ? "AKTIF (Sertakan stimulus visual konkret pada butir soal yang relevan)" : "OTOMATIS (Hanya buat jika diminta eksplisit di materi/instruksi guru)"}
8. Preferensi Gaya Visual: ${imageStyle || "AUTO (Sesuaikan konteks materi)"}
${multilingualDirective}

Distribusi Tipe Soal yang WAJIB Dibuat:
${requestedTypes}

ATURAN STRUKTUR JSON:
Output WAJIB berupa JSON MURNI tanpa markdown wrap (\`\`\`json) atau teks pengantar lainnya.
Struktur JSON:
{
  "soal_list": [
    {
      "id": 1,
      "tipe": "PG", // Salah satu dari: "PG", "PG_KOMPLEKS", "BENAR_SALAH", "MENCOCOKKAN", "ISIAN", "URAIAN"
      "level_kognitif": "C4 (Analisis)",
      "pertanyaan": "Teks pertanyaan lengkap termasuk narasi stimulus jika ada",
      "butuh_gambar": false, // true jika butir soal ini memerlukan gambar visual/diagram pendukung
      "gambar_prompt": "Deskripsi visual konkret dalam bahasa Inggris, WAJIB mengikat langsung pada konsep spesifik TUJUAN PEMBELAJARAN (TP) dan objek fisik nyata yang diuji dalam butir soal. DILARANG membuat prompt generik berdasarkan nama mata pelajaran saja (misal: jangan hanya 'biology class', tetapi 'detailed biological illustration of cellular mitosis anaphase with spindle fibers pulling chromatids')",
      "gambar_gaya": "REALISTIS", // "REALISTIS" | "KARTUN_3D" | "FLAT_2D" | "DIAGRAM_TEKNIS"
      "gambar_svg": "", // Kode SVG mandiri (<svg viewBox="0 0 500 250">...</svg>) opsional untuk geometri matematika, topologi, atau grafik fungsi
      "opsi": {
        "A": "Teks opsi A",
        "B": "Teks opsi B",
        "C": "Teks opsi C",
        "D": "Teks opsi D",
        "E": "Teks opsi E"
      },
      "pasangan": [
        { "kiri": "Konsep / Pernyataan 1", "kanan": "Pasangan Cocok 1" },
        { "kiri": "Konsep / Pernyataan 2", "kanan": "Pasangan Cocok 2" }
      ], // Wajib diisi khusus untuk tipe "MENCOCOKKAN" (3-5 pasang)
      "kunci": "A", // Catatan format kunci per tipe:
                   // - PG: "A" / "B" / "C" / "D" / "E"
                   // - PG_KOMPLEKS: array string, misal ["A", "C", "E"]
                   // - BENAR_SALAH: object boolean/status, misal {"A": "Benar", "B": "Salah"}
                   // - MENCOCOKKAN: string ringkasan relasi pasangan cocok, misal "1-B, 2-A, 3-C"
                   // - ISIAN: array sinonim kunci yang benar, misal ["Bung Karno", "Soekarno", "Ir. Soekarno"]
                   // - URAIAN: rubrik ringkas jawaban
      "pembahasan": "Penjelasan ringkas dan padat (maksimal 1-2 kalimat) mengapa kunci jawaban tersebut benar"
    }
  ]
}

Aturan Keras Stimulus Gambar & Anti-Halusinasi (Wajib Patokan Tujuan Pembelajaran / TP):
- Jika "butuh_gambar" bernilai true:
  1. UNTUK SOAL MATEMATIKA, FISIKA, & SAINS TEKNIS (Grafik Fungsi f(x), Kurva Parabola/Eksponensial, Geometri Sudut/Bidang/Ruang, Diagram Vektor, Topologi Jaringan, Rangkaian Listrik):
     - WAJIB buat kode SVG mandiri yang presisi dan valid pada "gambar_svg" (contoh: <svg viewBox="0 0 500 250">...</svg> dengan kurva, sumbu koordinat, dan label teks yang jelas).
     - DILARANG mengandalkan "gambar_prompt" untuk grafik/koordinat matematika, karena AI generator gambar difusi TIDAK MAMPU menggambar grafik numerik dan akan menghasilkan coret-coretan pensil yang rusak!
  2. UNTUK ILUSTRASI OBJEK NYATA / BIOLOGI / GEOGRAFI / SEJARAH / INDUSTRI:
     - "gambar_prompt" WAJIB berupa deskripsi objek fisik konkret dalam Bahasa Inggris (misal: "detailed realistic 3d illustration of coronavirus spherical virion with spike proteins on dark background" atau "modern industrial wastewater treatment facility with biological aeration tanks").
     - DILARANG menuliskan rumus matematika ($...), teks permintaan soal ("buatkan soal matematika jenjang SMA"), atau teks generik ke dalam gambar_prompt.
  3. "pertanyaan" boleh merujuk ke gambar dengan kata pembuka: "Perhatikan gambar berikut..." atau "Berdasarkan ilustrasi di atas...".
- Jika butir soal berupa perhitungan aljabar murni (misal komposisi fungsi f(g(x)), persamaan aljabar, atau hitungan teks tanpa kebutuhan grafik):
  - WAJIB set "butuh_gambar": false dan "gambar_svg": "". JANGAN memaksakan gambar pada soal hitungan murni yang tidak memerlukan stimulus visual!
- Jika "butuh_gambar" bernilai false:
  DILARANG KERAS menuliskan kata "Perhatikan gambar di bawah..." atau "Berdasarkan ilustrasi..." pada teks pertanyaan, agar siswa tidak mencari gambar yang tidak ada.

Aturan Khusus Tipe Soal:
- Untuk "PG": 5 opsi jawaban (A, B, C, D, E), 1 kunci benar.
- Untuk "PG_KOMPLEKS": 5 opsi jawaban (A, B, C, D, E), 2 sampai 3 kunci yang benar.
- Untuk "BENAR_SALAH": Berikan 2 sampai 4 pernyataan di dalam opsi (A, B, C, D) dan berikan kunci Benar/Salah untuk tiap pernyataan.
- Untuk "MENCOCOKKAN": Sediakan 3 sampai 5 pasang pernyataan dan jawaban. Isi properti "pasangan" berupa array objek [{"kiri": "...", "kanan": "..."}, ...]. Properti "opsi" bernilai {}. Kunci berupa ringkasan relasi pasangan yang cocok.
- Untuk "ISIAN": Opsi kosong {}, kunci berupa array variasi jawaban singkat yang benar.
- Untuk "URAIAN": Opsi kosong {}, kunci berupa rubrik jawaban singkat.
- Kepadatan Narasi: Buat narasi stimulus studi kasus yang kontekstual, tajam, dan padat (2-4 kalimat efektif per soal) serta pembahasan ringkas (1-2 kalimat) agar pemrosesan cepat dan presisi.`;

    // Daftar kandidat model fallback otomatis dengan deteksi online dinamis (cached)
    const availableOnline = await this.listAvailableModels();

    let primaryModel = (this.model || "").replace(/^models\//, "").trim();
    if (!ALLOWED_MODELS.includes(primaryModel)) {
      primaryModel = "gemini-3.5-flash-lite";
    }

    const preferredOrder = [
      primaryModel,
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.0-flash"
    ].filter(Boolean);

    let candidateModels = [];
    if (availableOnline.length > 0) {
      // Prioritaskan model pilihan dan model flash yang ada di akun user
      for (const pref of preferredOrder) {
        if (availableOnline.includes(pref) && !candidateModels.includes(pref)) {
          candidateModels.push(pref);
        }
      }
      // Jika belum ada model flash, tambahkan model flash apa saja yang ada
      for (const m of availableOnline) {
        if (m.includes("flash") && !candidateModels.includes(m)) {
          candidateModels.push(m);
        }
      }
    }

    // Jika listModels gagal atau offline, gunakan fallback aman tanpa model invalid
    if (candidateModels.length === 0) {
      candidateModels = preferredOrder.filter((m, idx, arr) => m && arr.indexOf(m) === idx);
    }

    const attemptErrors = [];

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;

      if (i > 0) {
        const friendlyName = currentModel.replace("gemini-", "Gemini ");
        console.warn(`Mengalihkan permintaan ke kandidat model #${i + 1}: ${friendlyName}...`);
        if (typeof onStatusUpdate === "function") {
          onStatusUpdate(`Beralih ke ${friendlyName}...`);
        }
        // Jeda backoff adaptif dengan random jitter agar 30 guru di Wi-Fi yang sama tidak tabrakan
        const jitterMs = 800 + Math.floor(Math.random() * 600);
        await new Promise(resolve => setTimeout(resolve, jitterMs));
      }

      const controller = new AbortController();
      // Timeout 55 detik per batch chunk agar tidak memotong proses saat server Google sedang padat
      const timeoutTimer = setTimeout(() => {
        controller.abort(new Error(`Timeout: Permintaan ke ${currentModel} melebihi 55 detik.`));
      }, 55000);

      // Konfigurasi Free-Tier Optimal: temperature 0.4 (JSON presisi) & maxOutputTokens 4096 (hemat slot kuota TPM)
      const generationConfig = {
        temperature: 0.4,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      };
      if (currentModel.startsWith("gemini-3") && currentModel.includes("flash-lite")) {
        generationConfig.thinkingConfig = {
          thinkingLevel: "minimal"
        };
      } else if (currentModel.startsWith("gemini-3")) {
        generationConfig.thinkingConfig = {
          thinkingLevel: "low"
        };
      } else if (currentModel.startsWith("gemini-2.5")) {
        generationConfig.thinkingConfig = {
          thinkingBudget: 0
        };
      }

      try {
        const requestBody = {
          contents: [
            {
              parts: [{ text: "Silakan buatkan paket soal sekarang sesuai instruksi sistem." }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig,
          safetySettings: [
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
          ]
        };

        let response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(requestBody)
        });

        // Jika endpoint menolak parameter thinkingConfig (HTTP 400), coba ulang sekali tanpa thinkingConfig
        if (!response.ok && response.status === 400 && requestBody.generationConfig.thinkingConfig) {
          delete requestBody.generationConfig.thinkingConfig;
          response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify(requestBody)
          });
        }

        clearTimeout(timeoutTimer);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
          
          // Jika API Key benar-benar salah/tidak terdaftar, hentikan loop
          if (response.status === 401 || (response.status === 400 && errorMsg.toLowerCase().includes("api key not valid"))) {
            throw new Error(`Kunci API tidak valid: ${errorMsg}`);
          }

          // Untuk error model (model tidak tersedia, deprecated, antrean sibuk 503, rate limit 429, atau 404), lanjutkan fallback
          console.warn(`Model ${currentModel} sibuk/gagal (${response.status}: ${errorMsg}). Mencoba fallback ke model alternatif berikutnya...`);
          attemptErrors.push(`[${currentModel} HTTP ${response.status}]: ${errorMsg}`);
          continue; // Coba model berikutnya di daftar kandidat
        }

        const data = await response.json();

        // 1. Verifikasi Filter Keamanan Google
        if (!data.candidates || data.candidates.length === 0) {
          const blockReason = data.promptFeedback?.blockReason || "Permintaan diblokir filter Google";
          throw new Error(`Filter Keamanan Google: ${blockReason}`);
        }

        const candidate = data.candidates[0];
        if (candidate.finishReason === "SAFETY") {
          throw new Error("Konten diblokir oleh filter keamanan Google. Silakan sesuaikan narasi stimulus materi.");
        }

        let rawText = candidate.content?.parts?.[0]?.text || "";
        rawText = rawText.trim();

        if (!rawText) {
          throw new Error("Respon AI kosong dari server Google.");
        }

        // 2. Pembersihan Pembungkus Markdown jika AI membungkusnya dalam ```json ... ```
        if (rawText.startsWith("```json")) {
          rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        } else if (rawText.startsWith("```")) {
          rawText = rawText.replace(/^```\s*/, "").replace(/```$/, "").trim();
        }

        // 3. Parser Multi-Layer & Pemulihan JSON Terpotong (Self-Healing Recovery)
        let parsed = null;
        try {
          parsed = JSON.parse(rawText);
        } catch (parseErr) {
          // Fallback 1: Regex cari blok kurung kurawal { ... }
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { parsed = JSON.parse(jsonMatch[0]); } catch (_) {}
          }

          // Fallback 2: Regex cari blok kurung siku [ ... ]
          if (!parsed) {
            const arrayMatch = rawText.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
              try { parsed = JSON.parse(arrayMatch[0]); } catch (_) {}
            }
          }

          // Fallback 3: Pemulihan jika output terpotong di tengah jalan (Truncated Recovery)
          if (!parsed) {
            const objectRegex = /\{[^{}]*"id"[^{}]*"pertanyaan"[^{}]*\}/g;
            const matches = rawText.match(objectRegex);
            if (matches && matches.length > 0) {
              const recovered = [];
              for (const m of matches) {
                try { recovered.push(JSON.parse(m)); } catch (_) {}
              }
              if (recovered.length > 0) parsed = { soal_list: recovered };
            }
          }

          if (!parsed) {
            throw new Error("Format output AI gagal diparsing sebagai JSON: " + parseErr.message);
          }
        }

        // 4. Normalisasi Variasi Nama Properti JSON
        let extractedList = [];
        if (Array.isArray(parsed)) {
          extractedList = parsed;
        } else if (Array.isArray(parsed.soal_list)) {
          extractedList = parsed.soal_list;
        } else if (Array.isArray(parsed.questions)) {
          extractedList = parsed.questions;
        } else if (Array.isArray(parsed.soal)) {
          extractedList = parsed.soal;
        } else if (Array.isArray(parsed.data)) {
          extractedList = parsed.data;
        } else {
          const anyArray = Object.values(parsed).find(v => Array.isArray(v));
          if (anyArray) extractedList = anyArray;
        }

        // 5. Standarisasi Format Tiap Butir Soal
        return extractedList.map((item, idx) => {
          const normalized = { ...item };
          normalized.id = item.id || `q_${idx + 1}`;
          normalized.pertanyaan = item.pertanyaan || item.question || item.stimulus || "";
          normalized.tipe = (item.tipe || item.type || "PG").toString().toUpperCase().replace(/[-\s]/g, '_');

          // Konversi opsi jika model mengembalikan array alih-alih objek A-E
          if (Array.isArray(item.opsi)) {
            const objOpsi = {};
            item.opsi.forEach((optText, optIdx) => {
              objOpsi[String.fromCharCode(65 + optIdx)] = optText;
            });
            normalized.opsi = objOpsi;
          }

          return normalized;
        });
      } catch (err) {
        clearTimeout(timeoutTimer);
        const errMsg = err.message || "";
        console.warn(`Percobaan ke ${currentModel} gagal/timeout: ${errMsg}`);
        attemptErrors.push(`[${currentModel}]: ${errMsg}`);
        if (errMsg.toLowerCase().includes("api key tidak valid")) {
          throw err;
        }
        // Jika masih ada kandidat model berikutnya, lanjutkan loop
        if (i < candidateModels.length - 1) {
          continue;
        }
        throw new Error(`Gagal pada semua model (${attemptErrors.join(" | ")})`);
      }
    }

    throw new Error("Seluruh model AI sedang mengalami lonjakan beban atau tidak tersedia: " + (attemptErrors.join(" | ") || "Timeout"));
  }

  /**
   * Menstrukturkan teks heterogen dari berkas Word (.docx) ke dalam daftar soal terstandar Afresto
   * @param {string} rawText - Teks hasil ekstraksi naskah Word
   * @param {Object} docxImages - Peta rId -> Data URL gambar dari berkas .docx
   * @returns {Promise<Object>} { detected_mapel, detected_kelas, soal_list }
   */
  async structureDocxQuestions(rawText, docxImages = {}) {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Teks dokumen Word kosong.");
    }

    const availableOnline = await this.listAvailableModels();
    let primaryModel = (this.model || "").replace(/^models\//, "").trim();
    if (!ALLOWED_MODELS.includes(primaryModel)) {
      primaryModel = "gemini-3.5-flash-lite";
    }

    let candidateModels = [primaryModel];
    for (const m of ALLOWED_MODELS) {
      if (!candidateModels.includes(m)) candidateModels.push(m);
    }
    if (availableOnline.length > 0) {
      candidateModels = candidateModels.filter(m => availableOnline.includes(m));
      if (candidateModels.length === 0) {
        candidateModels = availableOnline;
      }
    }

    const systemPrompt = `Anda adalah Asisten Guru Ahli Asesmen & Ingesti Dokumen Bank Soal Kurikulum Merdeka.
Tugas Anda: Membaca teks mentah naskah bank soal hasil ekstraksi berkas Word (.docx) guru, mengenali seluruh butir soal secara cerdas, dan menstrukturkannya menjadi format JSON standar ekstensi Afresto.

STANDAR 6 TIPE SOAL AFRESTO:
1. "PG": Pilihan Ganda standar 5 opsi (A, B, C, D, E), 1 kunci benar ("A"/"B"/"C"/"D"/"E").
2. "PG_KOMPLEKS": Pilihan Ganda Kompleks multi-kunci, kunci berupa array string (misal ["A", "C"]).
3. "BENAR_SALAH": Tabel/pernyataan Benar atau Salah, opsi { "A": "...", "B": "..." }, kunci { "A": "Benar", "B": "Salah" }.
4. "MENCOCOKKAN": Soal menjodohkan premis & target, pasangan: [{"kiri": "...", "kanan": "..."}, ...], opsi: {}.
5. "ISIAN": Soal isian singkat, kunci berupa array variasi jawaban benar (misal ["Soekarno", "Bung Karno"]).
6. "URAIAN": Soal uraian / essay terbuka, kunci berupa rubrik jawaban singkat.

ATURAN PENGENALAN NASKAH WORD:
- Kenali setiap butir soal secara akurat terlepas dari ragam format penomoran (misal: '1.', '1)', 'No. 1', atau tabel).
- Deteksi kunci jawaban heterogen: kenali kunci yang tertulis di samping butir soal (misal '1. (Kunci: B)'), di bawah butir soal ('Kunci: B'), di dalam tabel kunci jawaban di akhir dokumen, atau tanda bintang '*' pada opsi. Jika kunci tidak tertulis, analisislah butir soal dan tentukan kunci yang paling tepat secara kurikuler!
- Deteksi stimulus gambar: Jika ada penanda [GAMBAR_EMBED: rId...], simpan rId tersebut ke properti "gambar_tag".
- Ekstraksi informasi Mata Pelajaran dan Kelas dari KOP/Header naskah jika tersedia.
- Klasifikasi Level Kognitif Taksonomi Bloom: Tentukan ranah kognitif yang paling tepat untuk setiap butir soal: "C1 (Mengingat)", "C2 (Memahami)", "C3 (Aplikasi)", "C4 (Analisis)", "C5 (Evaluasi)", atau "C6 (Kreasi)" berdasarkan Kata Kerja Operasional (KKO) dan kompleksitas stimulus.

FORMAT OUTPUT WAJIB BERUPA JSON MURNI:
{
  "detected_mapel": "Nama Mapel dari KOP jika ada (atau string kosong)",
  "detected_kelas": "Kelas dari KOP jika ada (atau string kosong)",
  "soal_list": [
    {
      "id": 1,
      "tipe": "PG",
      "level_kognitif": "C4 (Analisis)", // Sesuaikan dengan ranah kognitif sebenarnya: C1, C2, C3, C4, C5, atau C6
      "pertanyaan": "Teks pertanyaan lengkap",
      "gambar_tag": "rId4",
      "opsi": {
        "A": "Opsi A",
        "B": "Opsi B",
        "C": "Opsi C",
        "D": "Opsi D",
        "E": "Opsi E"
      },
      "pasangan": [],
      "kunci": "A",
      "pembahasan": "Penjelasan ringkas"
    }
  ]
}`;

    const userPrompt = `Berikut adalah teks hasil ekstraksi naskah bank soal Word (.docx):\n\n---\n${rawText.slice(0, 50000)}\n---\n\nEkstrak seluruh butir soal menjadi format JSON terstandar di atas!`;

    let attemptErrors = [];
    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 45000);

      try {
        const requestBody = {
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            responseMimeType: "application/json"
          }
        };

        let response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(requestBody)
        });

        clearTimeout(timeoutTimer);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;
          attemptErrors.push(`[${currentModel}]: ${errMsg}`);
          continue;
        }

        const data = await response.json();
        const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let cleanJson = rawOutput.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```$/, "").trim();
        }

        const parsed = JSON.parse(cleanJson);
        const soalList = parsed.soal_list || parsed.questions || (Array.isArray(parsed) ? parsed : []);

        // Petakan gambar jika ada gambar_tag yang cocok dengan docxImages
        soalList.forEach((q, idx) => {
          q.id = idx + 1;
          if (q.gambar_tag && docxImages[q.gambar_tag]) {
            q.gambar_base64 = docxImages[q.gambar_tag];
            q.butuh_gambar = true;
          }
        });

        return {
          detected_mapel: parsed.detected_mapel || "",
          detected_kelas: parsed.detected_kelas || "",
          soal_list: soalList
        };
      } catch (err) {
        clearTimeout(timeoutTimer);
        attemptErrors.push(`[${currentModel}]: ${err.message}`);
        if (i < candidateModels.length - 1) continue;
        throw new Error(`Gagal menata dokumen Word: ${attemptErrors.join(" | ")}`);
      }
    }

    throw new Error("Semua model gagal memproses naskah Word: " + attemptErrors.join(" | "));
  }

  /**
   * Menghasilkan artikel materi pembelajaran & pertanyaan penugasan terstruktur untuk Afresto
   * Selaras dengan Standar BSKAP Kemendikbudristek No. 032/H/KR/2024 (Kurikulum Merdeka).
   * @param {Object} params - { mapel, kelas, topik, gaya, denganPenugasan, instruksiKhusus, includeImage, imageStyle }
   * @param {Function} onStatusUpdate - Callback pembaruan status
   */
  async generateLearningMaterial(params, onStatusUpdate = null) {
    const {
      mapel = "Umum",
      kelas = "Umum",
      topik = "",
      gaya = "Komprehensif & Kasus",
      denganPenugasan = true,
      instruksiKhusus = "",
      includeImage = true,
      imageStyle = "AUTO"
    } = params;

    if (!topik || topik.trim().length === 0) {
      throw new Error("Topik / Materi Pokok wajib diisi.");
    }

    const availableOnline = await this.listAvailableModels().catch(() => []);
    const preferredOrder = [
      this.model,
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.0-flash"
    ];

    const candidateModels = [];
    for (const pref of preferredOrder) {
      if (pref && !candidateModels.includes(pref)) candidateModels.push(pref);
    }
    for (const m of availableOnline) {
      if (m && !candidateModels.includes(m)) candidateModels.push(m);
    }

    const systemInstruction = `Anda adalah pakar pengembang bahan ajar dan modul kurikulum nasional (Kurikulum Merdeka) berstandar BSKAP Kemendikbudristek No. 032/H/KR/2024.
Tugas Anda adalah menyusun naskah bahan ajar (materi pembelajaran) yang mendalam, bermakna (meaningful learning), kontekstual, dan mudah dipahami oleh siswa.

STANDAR PENGEMBANGAN MATERI BSKAP NO. 032/H/KR/2024:
1. Penyelarasan Capaian Pembelajaran (CP) & Tujuan Pembelajaran (TP):
   - Materi wajib disesuaikan dengan fase perkembangan peserta didik (${kelas || "SMP/SMA/SMK"}).
2. Prinsip Pembelajaran Mendalam & Kontekstual:
   - Apersepsi Kontekstual: Selalu buka materi dengan menghubungkannya ke fenomena konkret di dunia nyata (Personal siswa, Sosial-Budaya masyarakat, atau Saintifik/Teknologi).
   - Hindari definisi hafalan kering tanpa analogi praktis.
3. Struktur Konten Materi (HTML Editor Afresto):
   - Gunakan format HTML bersih: <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>.
   - Dilarang menyertakan tag <html>, <head>, <body>, atau markdown wrap (\`\`\`html).
   - Susunan materi wajib runtut:
     a. <h3>Pendahuluan & Apersepsi Nyata</h3> (Mengapa materi ini penting dalam kehidupan nyata).
     b. <h3>Konsep Inti & Analogi Pemahaman</h3> (Penjelasan bertahap konsep kunci dengan analogi sederhana).
     c. <h3>Contoh Terapan & Studi Kasus</h3> (Penerapan langsung konsep dalam permasalahan nyata).
     d. <h3>Rangkuman Konsep Kunci</h3> (Ringkasan poin esensial untuk dipelajari kembali).
4. Penguatan Visual Multimodal (Diagram / Gambar Ilustrasi):
   ${includeImage ? `- MODE BERGAMBAR AKTIF: Wajib tentukan stimulus visual konkret yang memperjelas konsep. Tentukan 'butuh_gambar': true, deskripsi 'gambar_prompt' konkret dalam bahasa Inggris, dan caption edukatif. Jika berupa materi matematika, diagram alir, atau sirkuit fisika, Anda juga dapat mengisi 'gambar_svg' (<svg viewBox="0 0 500 250">...</svg>).` : `- Mode gambar: Tidak diaktifkan.`}
5. Asesmen Refleksi Mandiri (BSKAP Formative Assessment):
   - ${denganPenugasan ? "Wajib sertakan 2-3 pertanyaan pemantik daya nalar kritis (HOTS / Penalaran Konseptual) untuk menguji pemahaman konsep siswa, bukan sekadar mengingat definisi." : "Tanpa pertanyaan penugasan mandiri."}

PARAMETER KHUSUS:
- Mata Pelajaran: ${mapel || "Umum"}
- Tingkat / Kelas: ${kelas || "Umum"}
- Topik / Materi Pokok: ${topik}
- Gaya Pembahasan: ${gaya || "Komprehensif & Kasus"}
- Preferensi Visual: ${imageStyle || "AUTO"}
- Instruksi Khusus Guru: ${instruksiKhusus ? `"${instruksiKhusus}"` : "Standar mutu tinggi Kurikulum Merdeka"}

FORMAT OUTPUT JSON MURNI:
Output WAJIB berupa JSON MURNI tanpa teks pengantar atau markdown wrap (\`\`\`json).
{
  "judul": "Judul materi yang menarik, edukatif, dan kontekstual",
  "konten_html": "Isi lengkap artikel materi dalam format HTML bersih (h3, p, ul, ol, li, strong, dll)",
  "butuh_gambar": ${Boolean(includeImage)},
  "gambar_prompt": "Deskripsi visual konkret dalam bahasa Inggris, mengikat langsung pada konsep spesifik materi (contoh: detailed anatomical illustration of human kidney nephron filtration with bowman capsule and glomerulus, educational biological diagram, high quality, realistic lighting)",
  "gambar_gaya": "REALISTIS", // "REALISTIS" | "DIAGRAM_TEKNIS" | "KARTUN_3D" | "FLAT_2D"
  "gambar_svg": "", // Kode SVG mandiri jika berupa skema / grafik matematis
  "gambar_caption": "Keterangan gambar ilmiah/edukatif dalam bahasa Indonesia",
  "penugasan": {
    "aktif": ${Boolean(denganPenugasan)},
    "pertanyaan": "${denganPenugasan ? "1. Teks pertanyaan 1\\n2. Teks pertanyaan 2" : ""}"
  }
}`;

    const requestBody = {
      contents: [{
        parts: [{ text: systemInstruction }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      }
    };

    const attemptErrors = [];
    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i];
      if (typeof onStatusUpdate === "function") {
        onStatusUpdate(`Menyusun materi via ${currentModel}...`);
      }

      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 35000);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutTimer);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text;

        if (!rawText) throw new Error("Respon dari Gemini kosong.");

        let parsed = null;
        try {
          parsed = JSON.parse(rawText.trim());
        } catch (e) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }

        if (!parsed || !parsed.judul || !parsed.konten_html) {
          throw new Error("Format JSON materi tidak sesuai skema.");
        }

        return {
          judul: parsed.judul.trim(),
          konten_html: parsed.konten_html.trim(),
          butuh_gambar: Boolean(parsed.butuh_gambar),
          gambar_prompt: parsed.gambar_prompt || "",
          gambar_gaya: parsed.gambar_gaya || "REALISTIS",
          gambar_svg: parsed.gambar_svg || "",
          gambar_caption: parsed.gambar_caption || "",
          penugasan: {
            aktif: Boolean(parsed.penugasan?.aktif),
            pertanyaan: (parsed.penugasan?.pertanyaan || "").trim()
          }
        };
      } catch (err) {
        clearTimeout(timeoutTimer);
        attemptErrors.push(`[${currentModel}]: ${err.message}`);
        if (i < candidateModels.length - 1) continue;
        throw new Error(`Gagal menyusun materi pembelajaran: ${attemptErrors.join(" | ")}`);
      }
    }

    throw new Error("Semua model gagal menyusun materi: " + attemptErrors.join(" | "));
  }
}
