# ADR 0002: Arsitektur Ekstensi Chrome Afresto AI Assistant

## Status
Diterima (Accepted)

## Konteks
Pendidik di lingkungan sekolah sering kali menghadapi beban administratif yang berat dan repetitif saat menyusun butir soal ujian/asesmen di platform Afresto. Proses input soal di Afresto melibatkan perpindahan halaman berulang, penulisan pada editor teks kaya (TinyMCE) di dalam iframe, dan pemilihan kunci jawaban manual untuk berbagai tipe soal (Pilihan Ganda, PG Kompleks, Benar/Salah, Isian Singkat, Uraian).

Diperlukan alat bantu pihak ketiga (*third-party companion*) yang bekerja langsung di browser guru tanpa memerlukan izin/akses backend ke server Afresto, memiliki nol biaya server (*zero server cost*), dan menjamin validitas pedagogis sesuai kurikulum nasional (Kurikulum Merdeka).

## Keputusan Arsitektur

1. **Bentuk Aplikasi: Google Chrome Extension (Manifest V3)**
   - Menggunakan **Chrome Side Panel API** untuk antarmuka pengguna di sisi kanan layar.
   - Menggunakan **Content Script Injection** untuk berinteraksi langsung dengan Document Object Model (DOM) Afresto di tab aktif.
   - **Context-Aware Activation:** Ekstensi hanya aktif saat guru berada di halaman pembuatan soal Afresto (`*://*.afresto.id/*`).

2. **Kredensial AI: Bring Your Own Key (BYOK)**
   - Guru menggunakan kunci API Google Gemini mereka sendiri (`gemini-2.5-flash`).
   - Kunci disimpan secara lokal di `chrome.storage.local`.
   - Mengeliminasi kebutuhan backend proxy dan menjamin privasi data sekolah.

3. **Injeksi DOM Dinamis & 3-Tier Readiness Handshake**
   - Menolak penggunaan jeda statis (*hardcoded sleep*).
   - Menerapkan **3-Tier Readiness Handshake**:
     1. Deteksi hilangnya spinner/overlay pengiriman AJAX Afresto.
     2. Polling verifikasi iframe `pertanyaan_ifr` dan `#pilihan-[a-e]_ifr` berstatus `contenteditable="true"` / `mce-content-body`.
     3. Deteksi form bersih (*clean slate*) sebelum menyuntikkan butir berikutnya.
   - Otomasi berantai memanfaatkan tombol resmi Afresto: `Simpan & Soal Berikutnya`.

4. **Pedagogical Alignment & Soft Warning**
   - Kolom opsional **Tujuan Pembelajaran (TP)** sebagai jangkar indikator kompetensi.
   - **Soft Warning Non-Blokir**: Menampilkan notifikasi edukatif jika guru mengisi prompt tetapi mengosongkan TP, tanpa menghalangi eksekusi kuis cepat.

5. **Dukungan Multi-Tipe Soal (6 Tipe Lengkap)**
   - Mendukung generasi serentak untuk 6 tipe asesmen Kurikulum Merdeka di Afresto:
     1. **Pilihan Ganda (PG)** (5 opsi A-E, 1 kunci)
     2. **PG Kompleks / Bertingkat** (5 opsi A-E, multi-kunci)
     3. **Benar / Salah** (pernyataan berpasangan tombol Benar/Salah)
     4. **Mencocokkan / Menjodohkan** (relasi premis kiri ke pasangan jawaban kanan)
     5. **Isian Singkat** (sinonim kunci jawaban)
     6. **Uraian / Esai** (pertanyaan terbuka + rubrik penilaian)
   - Mendukung pengaturan urutan (Urut per Tipe vs Acak).

6. **Cascading Fallback Chain & Self-Healing Auto-Injection**
   - Mengantisipasi lonjakan beban Google AI (503 High Demand) dengan otomatis beralih model secara berantai (`selectedModel` &rarr; `gemini-3.8-flash` &rarr; `gemini-3.6-flash` &rarr; `gemini-3.5-flash-lite` &rarr; `gemini-3.0-flash`).
   - Menerapkan injeksi skrip mandiri (*self-healing executeScript*) saat tab aktif sempat terputus dari ekstensi tanpa perlu reload manual halaman.

7. **Persistent Question Playlist & Progressive Fault-Tolerant Queue**
   - Mengubah mekanisme generasi menjadi berbasis *Playlist/Queue* bertahap (*micro-batch chunking* maks. 5 butir per batch).
   - **Zero Data Loss Guarantee:** Setiap butir/batch yang selesai langsung di-commit ke antrean dan disimpan permanen ke `chrome.storage.local`. Jika pembuatan butir ke-6 gagal karena kendala server/jaringan, 5 butir pertama tetap utuh di playlist dan siap disuntikkan ke Afresto.
   - **Resumable Injection:** Melacak status tiap butir (`READY` vs `INJECTED`). Tombol injeksi otomatis memfilter hanya butir yang belum terinput, dan butir yang telah tersimpan di Afresto tidak akan terinput dobel saat proses dilanjutkan.

## Konsekuensi

### Positif (Upside)
- **Zero Deployment Cost:** Tidak ada server yang perlu dimaintain atau dibayar.
- **Efisiensi Waktu Guru 90%:** Mengurangi waktu input 10 soal dari 30 menit menjadi kurang dari 1 menit.
- **Tahan Gangguan Jaringan:** Readiness handshake memastikan tidak ada data yang terputus atau tertumpuk saat koneksi sekolah lag.

### Risiko & Mitigasi (Downside & Mitigation)
- **Perubahan DOM Afresto di Masa Depan:** Jika pihak pengembang Afresto merombak struktur ID/class mereka di masa depan, selector perlu diperbarui.
  *Mitigasi:* Seluruh selector dipusatkan secara modular di `scripts/injector.js` sehingga mudah disesuaikan.
