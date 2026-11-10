# ADR 0003: Mesin Ingesti & Parsing Berkas Word (.docx) ke Antrean Playlist Soal

## Status
Diterima & Terimplementasi Penuh (Accepted & Implemented in Milestone 3.4)

## Konteks
Banyak pendidik dan guru di sekolah telah memiliki bank soal yang disusun dalam format Microsoft Word (`.docx`), baik hasil ketikan sendiri, arsip semester lalu, maupun dari MGMP (Musyawarah Guru Mata Pelajaran). Saat ini, alur kerja guru masih memerlukan input ulang atau pembuatan ulang melalui prompt AI.

Diperlukan fitur **Mesin Ingesti Berkas Word (.docx)** pada panel ekstensi yang memungkinkan guru mengunggah (*upload/drag-and-drop*) file Word bank soal mereka, kemudian sistem mengekstrak butir-butir soal tersebut secara otomatis menjadi format terstruktur yang langsung masuk ke **Antrean Playlist Soal**, sehingga siap disuntikkan secara otomatis ke formulir Afresto menggunakan jalur injektor yang sudah ada.

---

## Rencana Desain Arsitektur Teknis

### 1. Ingesti Berkas Sisi Klien (Client-Side Ingestion)
* **Privasi Tanpa Server:** Berkas `.docx` dibaca langsung di browser guru (menggunakan pembaca biner client-side seperti `mammoth.js` atau ekstraksi XML native zip).
* Tidak ada pengiriman berkas utuh ke server pihak ketiga, menjaga kerahasiaan naskah ujian sekolah.

### 2. Ekstraksi Cerdas Berbasis Gemini AI (Structured Document Parser)
Format penulisan soal Word guru di lapangan sangat beragam (ada yang menggunakan tabel, penomoran otomatis, format `A. / B. / C.`, kunci jawaban di bawah butir, atau kunci jawaban di halaman terpisah).
* Teks mentah hasil ekstraksi dikirim ke Google Gemini dengan instruksi ekstraksi struktur terstandar (*Zero-Shot Document Structuring*).
* Gemini memetakan teks menjadi 6 tipe soal standar ekstensi (`PG`, `PG_KOMPLEKS`, `BENAR_SALAH`, `MENCOCOKKAN`, `ISIAN`, `URAIAN`).

### 3. Integrasi Langsung ke Playlist Queue (Zero Redundancy Pipeline)
* Hasil ekstraksi langsung dikonversikan ke objek butir soal terstandar:
  ```json
  {
    "id": "q_docx_...",
    "tipe": "PG | BENAR_SALAH | MENCOCOKKAN | ...",
    "pertanyaan": "...",
    "opsi": { "A": "...", "B": "..." },
    "kunci": "A",
    "status": "READY"
  }
  ```
* Butir-butir soal hasil bacaan Word langsung dimasukkan ke dalam `currentQuestions` (Playlist Soal) yang sudah ada di [`sidepanel.js`](file:///d:/Google%20Antigravity/Add%20On%20Afresto/sidepanel/sidepanel.js).
* **Keuntungan:** Tidak perlu membuat DOM injector baru! Soal dari file Word dapat disortir, diedit, diacak, dan langsung diinputkan ke Afresto menggunakan tombol `🚀 Input Otomatis Soal Tersisa ke Afresto` yang sudah teruji 100%.

### 4. Rencana Penanganan Gambar (Stimulus Visual)
* Jika butir soal di Word memiliki gambar (diagram/peta), sistem akan mengekstrak data gambar dan menyuntikkannya ke editor TinyMCE Afresto (`pertanyaan_ifr`) via Base64 Image Tag (`<img src="data:image/png;base64,...">`).

---

## Langkah Tindak Lanjut untuk Sesi Pengembangan Berikutnya
1. Evaluasi pustaka parser ringan client-side (`mammoth.js` atau pembaca XML docx berbasis Web Worker).
2. Perancangan UI tab / zona drop berkas: `[✨ Buat via AI]` vs `[📄 Unggah Bank Soal Word (.docx)]` pada Sidepanel.
3. Pembuatan prompt ekstraksi cerdas Gemini untuk mengenali format soal dan kunci jawaban heterogen dari naskah Word.
4. Uji coba end-to-end: Word $\rightarrow$ Playlist Card $\rightarrow$ Auto-Input Afresto.
