# 🛡️ APEX NEXUS SOVEREIGN (ANS) — Global Lessons Learned & Non-Regression Immunity Registry
## Memori Kekebalan Lintas Proyek (*Cross-Project Hardened Engineering Lessons*)

Dokumen ini adalah registri memori permanen dalam ekosistem **APEX NEXUS SOVEREIGN (ANS) 2.6**. Setiap pelajaran keras (*post-mortem*) yang ditemukan dari proyek-proyek nyata dikunci di sini agar setiap proyek baru langsung mewarisi **kekebalan sejak hari pertama** tanpa mengulangi kesalahan yang sama.

---

### 1. [INFRA-01] Proteksi Encoding UTF-8 Tanpa BOM di Windows PowerShell 5.1
- **Akar Masalah:** Di Windows PowerShell 5.1, perintah bawaan `Get-Content` membaca berkas UTF-8 tanpa BOM menggunakan encoding ANSI/Windows-1252. Ketika ditulis ulang dengan `Set-Content -Encoding UTF8`, karakter simbol/emoji (seperti `🏛️`, `—`, `≥`, `→`) rusak menjadi *mojibake* (`ðŸ ›ï¸`, `â€”`) dan menambahkan karakter BOM tersembunyi yang merusak parser JSON/Markdown.
- **Aturan Kekebalan Permanen:**
  - **DILARANG** menggunakan `Get-Content` / `Set-Content` tanpa parameter eksplisit saat memanipulasi berkas kode/markdown di PowerShell.
  - **WAJIB** menggunakan API .NET eksplisit:
    ```powershell
    $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
    ```

---

### 2. [GIT-01] Kedaulatan Kontrol Versi & Larangan Auto-Commit (`git commit`)
- **Akar Masalah:** Eksekusi `git commit` atau `git push` secara sepihak oleh agen AI sebelum pengguna memverifikasi hasil akhir mengotori riwayat repositori dan melanggar otoritas Super Admin.
- **Aturan Kekebalan Permanen:**
  - Agen AI **DILARANG KERAS** menjalankan `git commit` secara otomatis.
  - Setelah seluruh pekerjaan dan QC selesai (Langkah 7 SOP), agen wajib bertanya secara eksplisit: *"Apakah progress terbaru ini mau dicommit ke Git sekarang?"* dan menunggu jawaban persetujuan.

---

### 3. [SCOPE-01] Isolasi Direktori Kerja & Larangan Mencampur Aset Proyek Lain
- **Akar Masalah:** Ketika workspace IDE menunjuk ke direktori lama/kosong (misal `d:\youtube-pipeline`) sedangkan aset produksi aktif berada di direktori lain (`D:\YT Konten`), penulisan file tanpa memverifikasi path absolut berisiko membuat file yatim (*orphan files*) atau mencemari repositori lain.
- **Aturan Kekebalan Permanen:**
  - Selalu pastikan alamat direktori proyek aktif sebelum membuat atau menyinkronkan berkas.
  - Jangan pernah menyalin aset bisnis/konten lintas proyek yang tidak berhubungan.

---

### 4. [VISUAL-01] Pencegahan Tabrakan Teks dengan Sumber Cahaya (*Text-on-Bright-Lamp Collision*)
- **Akar Masalah:** Pada pembuatan thumbnail/poster otomatis, meletakkan teks putih/terang (`#F8F4EB`) di sisi kiri gambar ketika background memiliki kap lampu menyala putih-kuning atau jendela siang hari tepat di koordinat yang sama (`x < 750`) membuat huruf menyatu dengan lampu dan gagal terbaca di layar HP. Selain itu, pemberian vignette hitam pekat (`#000000`) 40%–60% di sisi kiri membuat gambar tampak mati dan berat sebelah.
- **Aturan Kekebalan Permanen (Pilar 26):**
  1. **Posisi Sumber Cahaya (`x > 780px`):** Pastikan kap lampu menyala, jendela terang, atau objek highlight berada di sebelah kanan teks (`x = 800..1450`). Gunakan *Horizontal Mirror* jika sumber cahaya gambar asli berada di kiri.
  2. **Local Highlight Luminance Clamping:** Redupkan piksel yang memiliki kecerahan $> 140$ di dalam zona baca teks (`x < 820, y < 720`) menjadi *warm amber glow* (`max_lum = 115–130`) sebelum merender teks.
  3. **Triple-Layer Shadow Cushion (`8px` + `18px` + `45px`):** Lapisi huruf utama dengan 3 radius bayangan hangat dan verifikasi dengan `verify_visual_contrast.py`.

---

### 5. [MEDIA-01] Konsistensi Waktu, Skala Tipografi, & Verifikasi Efek CapCut
- **Akar Masalah:**
  1. Ketidaksinkronan antara jam pada teks thumbnail (`8:30 AM` atau `4:30 PM`) dengan suasana pencahayaan gambar background (tampak gelap gulita seperti tengah malam).
  2. Ukuran teks Tier 2 berupa kata (`SUNDAY`, `DEEP WORK`, `FRIDAY NIGHT`) dibuat sebesar Tier 3 sehingga saling berebut fokus.
  3. Pemilihan nama efek CapCut secara spekulatif tanpa memverifikasi apakah efek tersebut benar-benar mengekspos slider `Atmosphere` (`effects_adjust_background_animation`) di CapCut PC.
- **Aturan Kekebalan Permanen:**
  1. Pastikan pencahayaan background sesuai secara fisik dengan jam yang tertera pada teks.
  2. Perkecil ukuran Tier 2 non-angka menjadi **55% dari ukuran Tier 3**.
  3. Hanya gunakan efek CapCut yang telah teruji mengekspos slider `Atmosphere` dan tidak memicu *white wash* (`Gold Dust`, `Rainy Season`, `Gold Sparkles`).

---

### 6. [FILE-01] Penanganan File Terkunci (`PermissionError`) pada Sinkronisasi Excel/Database Lokal
- **Akar Masalah:** Saat pengguna sedang membuka file `.xlsx` di Microsoft Excel, OS Windows mengunci file tersebut sehingga skrip otomatisasi Python gagal dengan `PermissionError`.
- **Aturan Kekebalan Permanen:**
  - Selalu bungkus penulisan file Excel dengan penanganan eksepsi yang menulis ke berkas pendamping (`*_SOP_Sempurna.xlsx`), tetap memperbarui `.csv` dan `.py` secara utuh, serta memberi informasi jelas kepada pengguna.

---

### 7. [PYTHON-01] Proteksi `UnicodeEncodeError (cp1252)` pada Stdout Python di Terminal Windows
- **Akar Masalah:** Di Windows, ketika skrip Python dijalankan di dalam pipa PowerShell atau subproses tanpa `PYTHONIOENCODING=utf-8`, `sys.stdout` menggunakan codec `cp1252` sehingga mencetak simbol Unicode/emoji menyebabkan `UnicodeEncodeError`.
- **Aturan Kekebalan Permanen:**
  - Selalu tambahkan konfigurasi ulang encoding di bagian atas skrip CLI Python:
    ```python
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ```
