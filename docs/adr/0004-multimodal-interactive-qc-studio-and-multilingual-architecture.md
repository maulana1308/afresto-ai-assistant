# ADR 0004: Arsitektur Ekosistem Multimodal, Multi-Bahasa, dan Studio Simulasi QC Guru

## Status
Diterima untuk Roadmap Pengembangan v2.0 (Accepted for Execution)

## Konteks
Evaluasi penggunaan Afresto AI Assistant menunjukkan 4 kebutuhan fundamental yang saling terkait:
1. Guru membutuhkan kemampuan menyerap bank soal yang sudah ada dalam format Microsoft Word (`.docx`).
2. Soal asesmen Kurikulum Merdeka membutuhkan stimulus visual nyata (gambar ilustrasi realistis, 2D, kartun, dan diagram teknis presisi) tanpa membebani guru dengan biaya API berbayar dan tanpa risiko gambar abstrak.
3. Kebutuhan guru mata pelajaran bahasa asing (Arab dengan RTL/Harakat, Jepang, Perancis, Jerman) dan bahasa daerah (Jawa) yang memerlukan integrasi font Unicode dan tata arah teks yang benar.
4. Keterbatasan ruang antarmuka Side Panel (380px) dan adanya risiko soal cacat (*hallucination / key mismatch*) dari AI generatif memerlukan ruang pengujian mandiri (*Teacher Test-Drive Sandbox*) di layar penuh sebelum soal disuntikkan ke Afresto.

---

## Keputusan Arsitektur

### 1. Ingesti Berkas Word (.docx) Berbasis Klien (ADR 0003)
* Pemrosesan teks dan tabel `.docx` secara lokal di browser guru.
* Gemini menstrukturkan hasil bacaan ke 6 tipe soal standar ekstensi dan langsung mengalirkannya ke `currentQuestions` (Playlist Soal).

### 2. Generator Gambar Hybrid Multimodal Gratis (FLUX & SVG)
* **Zero Cost Architecture:** Menggunakan Pollinations AI (FLUX / SDXL) tanpa perlu API Key berbayar dan tanpa biaya.
* **Concrete Prompt Anchoring:** Gemini menerjemahkan konsep naratif abstrak menjadi entitas fisik 3D konkret (orang, alat, meja, seragam, latar) untuk mencegah gambar abstrak.
* **Base64 Inline Embed:** Gambar dikonversikan menjadi biner Base64 teroptimasi ($\pm$ 25–40 KB) dan disuntikkan ke TinyMCE Afresto (`pertanyaan_ifr`), menjamin gambar tersimpan permanen di database sekolah tanpa risiko *broken link*.
* **Precision SVG Generator:** Untuk Matematika, Fisika, dan Topologi TJKT, Gemini menghasilkan kode vektor SVG berkoordinat presisi.

### 3. Modulasi Bahasa Global & Skrip RTL
* Pemanfaatan kemampuan multibahasa native Google Gemini.
* Penerapan penanda arah baca `dir="rtl"` untuk teks Arab berharakat, dan pemeliharaan standar encoding UTF-8 untuk karakter Jepang, Jawa, dan diakritik Eropa.

### 4. Studio Simulasi & Sandbox QC Guru (Interactive Test-Drive Studio)
* Antarmuka tab penuh (`preview.html`) terbebas dari batasan lebar Sidepanel.
* Mode pengerjaan interaktif layaknya siswa untuk mendeteksi soal atau kunci jawaban cacat.
* Fitur mitigasi cacat cepat:
  1. *Single Targeted Regenerate:* Merancang ulang hanya nomor yang cacat.
  2. *1-Click Key Correction:* Menjadikan pilihan guru sebagai kunci jawaban yang sah.
  3. *Print / PDF Export:* Naskah soal siap cetak fisik untuk arsip sekolah.

---

## Urutan Rencana Eksekusi (Sequencing):
1. **Fase 1:** Milestone 3.1 — Mesin Ingesti Word (.docx).
2. **Fase 2:** Milestone 3.2 — Mesin Gambar AI & SVG Terintegrasi Injektor.
3. **Fase 3:** Milestone 3.3 — Adaptasi Multi-Bahasa Asing & Daerah.
4. **Fase 4:** Milestone 3.4 — Studio Simulasi Interaktif & Sandbox QC Guru.
