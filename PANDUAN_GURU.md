# 📘 Panduan Praktis Guru: Instalasi & Penggunaan Afresto AI Assistant
> **Asisten Cerdas Pembuat & Penginput Soal Otomatis Berbasis Kurikulum untuk Portal Afresto**  
> *Versi 2.0.0 — Edisi Ramah Guru (Humanist Warm Paper Edition)*

Selamat datang Bapak/Ibu Guru! Ekstensi ini dirancang khusus untuk memangkas waktu pembuatan dan pengetikan soal asesmen di portal Afresto dari hitungan jam menjadi hanya **1–2 menit**.

Berikut adalah 3 langkah mudah untuk memasang dan langsung menggunakannya besok:

---

### 📦 TAHAP 1: Pasang Ekstensi di Google Chrome (Hanya 2 Menit)

1. **Siapkan Berkas Ekstensi:**
   * Dapatkan berkas zip **`Afresto_AI_Assistant_v2.0.0.zip`** (bisa dari Flashdisk atau link Google Drive sekolah).
   * Klik kanan pada berkas zip tersebut $\rightarrow$ pilih **Extract All...** (Ekstrak Semua).
   * Simpan folder hasil ekstrak di tempat yang aman (misalnya di folder *Dokumen* atau *Desktop*).
   *(Pastikan folder hasil ekstrak berisi berkas `manifest.json`, folder `sidepanel`, `scripts`, dan `icons`).*

2. **Buka Menu Ekstensi Chrome:**
   * Buka browser **Google Chrome** di laptop Anda.
   * Ketik alamat berikut di bilah alamat atas: `chrome://extensions/` lalu tekan **Enter**.

3. **Aktifkan Mode Pengembang (Developer Mode):**
   * Di pojok kanan atas layar, geser saklar **"Developer mode"** (Mode Pengembang) hingga berwarna biru/aktif.

4. **Muat Ekstensi:**
   * Di pojok kiri atas, klik tombol **"Load unpacked"** (Muat yang belum dibongkar).
   * Pilih folder hasil ekstrak berkas tadi, lalu klik tombol **Select Folder**.
   * *Selamat! Ekstensi "Afresto AI Assistant" kini sudah terpasang di Chrome Anda.*

5. **Sematkan (Pin) Ikon Ekstensi agar Mudah Dibuka:**
   * Di bilah atas Chrome (sebelah kanan kolom alamat), klik ikon puzzle (🧩).
   * Cari **Afresto AI Assistant**, lalu klik ikon **Pin (📌)** agar logonya selalu muncul di atas.

---

### 🔑 TAHAP 2: Pasang Kunci AI Gemini Gratis (Hanya Sekali di Awal)

Ekstensi ini menggunakan kecerdasan buatan Google Gemini resmi yang **100% Gratis** dan aman:

1. **Ambil Kunci Gratis:**
   * Buka link resmi Google ini: **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)** (pastikan sudah login akun Google/Gmail pribadi atau akun belajar).
   * Klik tombol biru **"Create API key"** (atau "Get API key").
   * Salin kode kunci yang muncul (kode diawali dengan huruf `AIzaSy...`).

2. **Masukkan ke Ekstensi:**
   * Klik ikon **Afresto AI Assistant** di toolbar Chrome Anda (panel samping akan terbuka di sebelah kanan).
   * Klik ikon gerigi (⚙️) di pojok kanan atas panel untuk membuka **Pengaturan API Key**.
   * Tempelkan kode kunci tadi ke kolom **Gemini API Key**.
   * Klik **Tes Koneksi** (akan muncul badge hijau 🟢 *Terhubung*).
   * Klik **Simpan Kunci**.
   *(Kunci ini tersimpan aman hanya di laptop Anda, tidak akan hilang walau laptop dimatikan).*

---

### 🚀 TAHAP 3: Cara Praktis Membuat & Menginput Soal Otomatis

1. **Buka Halaman Form Soal Afresto:**
   * Login ke portal **[Afresto](https://afresto.id)** sekolah Anda.
   * Masuk ke menu: **Evaluasi $\rightarrow$ Butir Soal $\rightarrow$ Tulis Soal Baru**.
   * Perhatikan panel samping ekstensi: status akan langsung menyala hijau:  
     🟢 **Halaman Input Soal Afresto Aktif & Siap Menerima Butir Soal!**
     *(Mata pelajaran dan kelas Anda akan otomatis terdeteksi).*

2. **Tentukan Asesmen & Jumlah Soal:**
   * Isi kolom **Tujuan Pembelajaran (TP)** atau topik materi yang ingin diujikan.
   * Pada kotak centang tipe soal, tentukan jumlah butir yang diinginkan (misal: 5 Pilihan Ganda, 2 Benar/Salah, 1 Uraian).
   * Pilih tingkat kognitif (misal: *HOTS* atau *Campuran Seimbang*).
   * Klik tombol biru: **"✨ Generate Paket Soal via Gemini"**.
   * Tunggu beberapa detik, paket butir soal berkualitas tinggi akan muncul rapi di panel samping!

3. **Input Otomatis ke Afresto (Tinggal Dilihat Saja!):**
   * Di bagian bawah panel samping, klik tombol hijau besar:  
     **"🚀 Input Otomatis Soal Tersisa ke Afresto"**.
   * Duduk santai dan perhatikan: ekstensi akan mengisi teks pertanyaan, opsi pilihan, menentukan kunci jawaban, mengklik tombol Simpan, dan beralih ke formulir soal berikutnya secara otomatis sampai seluruh antrean tuntas! 🎉

---

### 💡 Tips & Bantuan Cepat untuk Guru (FAQ)

* **T: Apakah saya bisa berganti ke tema gelap saat malam hari?**  
  * **J:** Sangat bisa! Di pojok kanan atas panel ada tombol matahari `☀️`. Klik tombol tersebut untuk berganti ke mode gelap `🌙`, atau sebaliknya.
* **T: Bagaimana jika ada 1 butir soal yang ingin saya edit dulu sebelum disimpan?**  
  * **J:** Di setiap kartu soal ada tombol **"⚡ Isi Form"**. Tombol ini akan menyuntikkan soal ke form Afresto tanpa langsung menyimpannya, sehingga Anda bisa mengedit atau menambahkan gambar terlebih dahulu di form Afresto sebelum menekan tombol Simpan sendiri.
* **T: Mengapa muncul tulisan "Buka Formulir Input Soal"?**  
  * **J:** Ekstensi ini menjaga agar tidak salah mengisi halaman lain. Pastikan Anda sudah mengklik tombol **"Tulis Soal Baru"** di portal Afresto sebelum menekan tombol generate/input.
* **T: Jika koneksi internet sempat putus saat proses input berjalan, apakah soal yang sudah masuk akan hilang?**  
  * **J:** Tidak! Ekstensi ini dilengkapi sistem anti-duplikasi. Butir soal yang sudah tersimpan otomatis ditandai centang hijau (`✅ Terinput di Afresto`), sehingga jika dilanjutkan kembali hanya butir yang tersisa yang akan diinput.
