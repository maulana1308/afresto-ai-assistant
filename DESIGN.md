# 🎨 DESIGN.md — Product Visual Identity & Signature Craftsmanship Manifesto
## Single Source of Truth untuk Karakter Visual, Tipografi, Palet, & Anti-Slop Dials (Pilar 17 + Divisi VI)

> **Catatan Sistem (Boundary Rule R-37):**  
> Berkas ini adalah **DNA Identitas Visual Proyek**. Sebelum membangun atau mengubah antarmuka UI/UX maupun aset visual, Agen AI **WAJIB** membaca berkas ini sebagai arah gaya (*style direction*), lalu menyaring eksekusinya menggunakan `.agents/rules/antislop.md` dan `.agents/skills/uiux-research-applicator/SKILL.md`.  
> **Uji Ciri Khas Mutlak (*The Logo-Swap Test*):** *"Jika logo dan nama produk di halaman ini ditukar dengan merek lain, apakah desain ini masih terasa unik dan langsung dikenali sebagai milik produk ini?"*

---

## 1. Identitas Produk & Analogi Material Fisik (*Brand Soul & Physical Metaphor*)

- **Nama Produk / Proyek:** `Afresto AI Assistant`
- **Kategori Sistem:** `Chrome Browser Extension Sidepanel & Automated Examination Ingestion Engine`
- **Persona Pengguna Utama:** `Bapak/Ibu Guru & Tenaga Pendidik Sekolah yang menyusun dan menginputkan butir soal ujian ke portal Afresto`
- **Analogi Material Dunia Nyata (*Physical Metaphor*):**  
  - **Pilihan Aktif:** `Kertas Ujian Gading Klasik (Warm Paper) + Meja Kayu Ruang Guru + Tinta Emas Fokus (Golden Amber)`
- **3 Kata Kunci Kepribadian (*Brand Adjectives*):**
  1. `Humanist / Hangat, Menghormati Waktu Guru & Nyaman di Mata`
  2. `Tactile / Presisi, Terstruktur Rapi Sesuai Rubrik & Standar Afresto`
  3. `Empowering / Cepat, Otomatis & Memberi Kendali Penuh ke Guru`

---

## 2. Kalibrasi 3 Kenop Karakter (*The 3 Liveliness Dials — R-37 & Part 3*)

Pilih angka **1, 2, atau 3** untuk masing-masing kenop di bawah ini:

| Kenop (*Dial*) | Skor Aktif (1–3) | Definisi & Konsekuensi Eksekusi |
| :--- | :---: | :--- |
| **ENERGY**<br>*(Intensitas Visual)* | **`2`** | • `1 (Whisper-Quiet)`: Kontras lembut, tenang, cocok untuk durasi tatap layar berjam-jam.<br>• `2 (Confident)`: Kontras tegas pada elemen utama, 1 warna aksen terfokus.<br>• `3 (Electric / Editorial)`: Tipografi berani skala besar, kontras dramatis. |
| **RHYTHM**<br>*(Variasi Komposisi)* | **`2`** | • `1 (Uniform Grid)`: Tata letak seragam & terprediksi (untuk tabel data/admin).<br>• `2 (Paced Flow)`: Bergantian antara area informasi padat dan area bernapas lega.<br>• `3 (Asymmetric Editorial)`: Setiap seksi memiliki struktur kolom yang berbeda total. |
| **MOTION**<br>*(Fisika Gerakan)* | **`2`** | • `1 (Instant / Static)`: Nol animasi dekoratif, respons instan.<br>• `2 (Crisp Tactile)`: Transisi mikro `150ms–220ms ease-out`, tombol membal halus (`scale(0.98)`).<br>• `3 (Choreographed)`: Transisi halaman bertahap dan *scroll-reveal* sinematik. |

---

## 3. Arketipe Desain Terpilih (*The 5 Sovereign Archetypes — Pilar 17*)

Beri tanda `[x]` pada satu arketipe utama (atau kombinasi primer + sekunder):

- [ ] **Arketipe 1 — Clean Enterprise SaaS:** Putih gading/slate bersih (`#F8FAFC`), border presisi `1px`, aksen Royal Indigo/Oceanic.
- [x] **Arketipe 2 — Humanist Warm Editorial & Analog Sanctuary:** Kertas gading hangat (`#F8F4EB`) atau Dark Espresso/Walnut (`#140E0A`), tipografi Serif berwibawa + Sans geometris, aksen Golden Amber (`#E59A34`).
- [ ] **Arketipe 3 — Minimalist Scandinavian / Precision Monochromatic:** Monokromatik kontras tinggi, *whitespace* lapang, garis pembatas setajam silet (`1px`).
- [ ] **Arketipe 4 — Tactical Command Center (High-Density Dark):** Obsidian gelap solid (`#080B11`), indikator telemetri presisi (Emerald, Amber, Cyan), bebas dekorasi kosong.
- [ ] **Arketipe 5 — Playful & Tactile Interactive:** Sudut ramah (`rounded-2xl`), tombol fisik 3D (`border-b-4`), warna hangat penuh energi.

---

## 4. Sistem Warna 70 / 25 / 5 (*Purpose-Driven Palette & Contrast Lock*)

> **Aturan Keras (R-01 & R-25):** Dilarang menggunakan gradasi ungu-biru/pink generik AI, hitam mati `#000000` rata tanpa nuansa suhu, atau teks abu-abu pucat yang gagal uji WCAG AA (`4.5:1`).

| Peran Warna (Proporsi) | Token CSS / Nama | Kode Hex | Tujuan & Aturan Penggunaan |
| :--- | :--- | :---: | :--- |
| **70% Primary Surface** | `--bg-surface-primary` | `#120D09` | Latar belakang utama bernuansa suhu (Warm Dark Espresso / Warm Ivory). |
| **25% Elevated / Card** | `--bg-surface-elevated` | `#1C140E` | Kontainer kartu/panel sekunder dengan border `1px solid rgba(230, 179, 90, 0.16)`. |
| **Primary Text** | `--text-primary` | `#F8F4EB` | Teks utama (Warm Alabaster Ivory — rasio kontras $> 12:1$). |
| **Secondary Text** | `--text-secondary` | `#C7B9A5` | Teks pendukung/deskripsi (Warm Muted Sand — rasio kontras $\ge 5.5:1$). |
| **5% Signature Accent** | `--accent-primary` | `#E59A34` | Satu-satunya warna aksen utama untuk Primary CTA & sorotan fokus (Golden Amber). |
| **Semantic Status** | `--status-ok / warn / err` | `#2E9E6B` / `#E59A34` / `#D9534F` | Indikator status fungsional nyata. |

---

## 5. Pasangan Tipografi Khas (*Signature Font Pairing — R-06*)

- **Heading / Display Font (Suara Karakter Utama):**
  - *Font Family:* `Playfair Display` (Black 900 / Bold 700) atau `Fraunces`
  - *Alasan Pemilihan:* Memberikan wibawa editorial klasik dan kontras lekukan organik yang langsung membedakan produk dari template AI standar.
- **Body / UI Controls Font (Keterbacaan Fungsional):**
  - *Font Family:* `Plus Jakarta Sans` atau `Montserrat` (Medium 500 / Bold 700)
  - *Alasan Pemilihan:* Geometri huruf yang terbuka dan sangat tajam pada ukuran kecil di layar ponsel maupun desktop.
- **Numeric / Telemetry / Timecode Font (Presisi Angka):**
  - *Font Family:* `JetBrains Mono` atau `IBM Plex Mono` (`font-variant-numeric: tabular-nums`)
  - *Alasan Pemilihan:* Mencegah angka bergeser saat *timer*, jam, atau statistik berubah secara real-time.

---

## 6. Komponen Ikonik Khas (*Signature Components — Ciri Khas Pembeda*)

Setiap halaman/tampilan wajib memiliki minimal **1 elemen khas** di bawah ini agar lolos *Logo-Swap Test*:
1. **Signature Element #1:** `Badge Status Soal & Tingkat Kognitif (Bloom C1–C6) dengan aksen warna semantik dan Pill Border Radius`
2. **Signature Element #2:** `Kartu Soal Accordion dengan Warm Paper Surface, Two-Tone Split Matrix untuk Menjodohkan, dan Mini-Table Benar/Salah berpresisi tinggi`
3. **Aturan Sudut & Struktur:**
   - Radius luar kontainer wajib mengikuti rumus konsentris: $\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}$.
   - Maksimal **1 Primary CTA** yang menyala dengan warna aksen per tampilan layar (*viewport*).
