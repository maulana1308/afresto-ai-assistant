---
name: quality-control-auditor
description: Wajib digunakan oleh sub-agen atau auditor independen untuk melakukan Quality Control (QC) Offline dan Online. Menyediakan protokol Sovereign TDD (Test-Driven Verification), Evidence-Before-Assertion, inspeksi visual E2E browser automation (Playwright/Chrome DevTools), Dual-Axis Code Review Matrix (Spec Fidelity vs Fowler Code Smells), verifikasi unit test 100%, verifikasi jaring pengaman backup lokal/remote, audit proses runtime live (PM2/Docker/systemd), verifikasi endpoint API, dan penyusunan laporan audit formal Grade A+.
---

# Quality Control (QC) Auditor & Systems Assurance Suite
## The Sovereign Systems Quality, Dual-Axis Verification & Visual E2E Audit Shield

> **Identitas:** Senior Quality Assurance, Verification & Compliance Auditor  
> **Divisi:** Divisi III — Kualitas, Perbaikan Bug, Pertahanan Siber & SRE  
> **Mitra Penyeimbang:** `code-fixer-firefighter` (Eksekusi pemadaman akar bug) & `code-refactor-optimizer` (Peningkatan kualitas kode tanpa merusak fungsionalitas)  
> **Prinsip Utama:** *Evidence Before Assertions. Zero Assumptions, 100% Empirical Proof.*

---

## 📌 1. Mandat Auditor Independen (Executive Mandate)

Quality Control (QC) bukan sekadar formalitas stempel tanda tangan, melainkan **benteng pertahanan terakhir integritas sistem** sebelum dan sesudah kode menyentuh server produksi.

1. **Mandat Auditor Independen:** Agen/Sub-agen bertindak sebagai auditor pihak ketiga netral bebas bias *self-review*. Auditor **DILARANG KERAS** mengasumsikan kode "seharusnya berjalan" tanpa bukti eksekusi dingin di terminal atau tangkapan visual nyata.
2. **Evidence Before Assertions:** Dilarang menyatakan "fitur telah selesai", "bug telah diperbaiki", atau "semua tes lewat" sebelum perintah verifikasi dijalankan dan output terminal / tangkapan visual diverifikasi secara empiris.
3. **Non-Regression Ratchet:** Setiap fitur baru wajib meningkatkan atau minimal mempertahankan jumlah unit test yang ada. Jumlah test yang lolos menjadi batas bawah (*ratchet*) permanen yang tidak boleh turun.

---

## 🧭 2. Matriks Peninjauan Kode Dua Sumbu (The Dual-Axis Code Review Matrix)

Dalam mengaudit perubahan kode, Auditor QC **WAJIB** mengevaluasi sistem melalui 2 sumbu ortogonal:

```
                  TINGGI ▲
                         │
                         │    [KUADRAN 1: GRADE A+ GOLDEN DEPLOY]
                         │    • 100% Sesuai Kebutuhan User
                         │    • Desain Bersih, Anti-Smell, Modular
                         │
                         │
  SUMBU Y:               │    [KUADRAN 2: KODE RAPI TAPI SALAH ARAH]
  KESEHATAN DESAIN KODE  │    • Sangat rapi & elegan secara teori
  (Fowler Code Smells)   │    • GAGAL memenuhi mandat instruksi user
                         │
                         │    [KUADRAN 3: ASAL JALAN / SPAGHETTI]
                         │    • Fitur jalan tapi rapuh & penuh utang
                         │    • Primitive obsession, God Object
                         │
                         └────────────────────────────────────────► TINGGI
                               SUMBU X: KESESUAIAN SPESIFIKASI
                               (Specification Fidelity)
```

### Sumbu X: Kesesuaian Spesifikasi (*Specification Fidelity*)
- **100% User Intent Fulfillment:** Apakah kode menyelesaikan apa yang diminta pengguna secara persis?
- **Zero Scope Creep:** Apakah kode bebas dari modifikasi liar di luar mandat yang diminta?
- **Boundary Conditions & Edge Cases:** Apakah skenario ekstrem (input kosong, angka nol/negatif, timeout jaringan, payload raksasa) ditangani secara defensif?
- **Contract Adherence:** Apakah tipe data input/output sesuai dengan kamus domain `GLOSSARY.md` dan kontrak API?

### Sumbu Y: Kesehatan Desain Kode & Kakas Kualitas Deterministik (`aislop` & `react-doctor`)
Auditor QC memindai kode dari anti-pola arsitektur standar industri (Martin Fowler Code Smells) dan pola pembusukan kode buatan AI (*AI Slop*).

1. **Backend / Node.js AST Quality Gate (`aislop`):**  
   Auditor QC **WAJIB** menjalankan pemindaian deterministik `npx aislop scan [target]` (sub-detik, tanpa LLM) pada setiap berkas yang diubah:
   - **Target Skor Mutlak:** Wajib mencapai **Skor $\ge 80 / 100$**.
   - **Critical Slop Errors (Toleransi 0):** Dilarang keras meloloskan kode dengan pelanggaran:
     * `ai-slop/swallowed-exception`: Blok `try/catch` kosong atau menelan error tanpa logging kontekstual.
     * `ai-slop/hardcoded-url`: URL API/bursa hardcoded di dalam file logika alih-alih di modul konfigurasi.
     * `ai-slop/unused-import` & `eslint/no-unused-vars`: Import halusinasi atau variabel mati (*dead code*).
     * `code-quality/duplicate-block`: Potongan kode berulang yang tidak diekstrak ke shared helper function.
     * `complexity/function-too-long` & `file-too-large`: Fungsi raksasa (> 80 baris) atau file raksasa (> 400 baris).

2. **Frontend / React AST Quality Gate (`react-doctor`):**  
   Untuk seluruh proyek berbasis React (Next.js, Vite, SPA), Auditor QC menjalankan pemindaian `npx react-doctor@latest [target]` untuk mencegah:
   - `useless-re-renders`: Re-render sia-sia pada komponen data padat (grafik ekuitas, ticker harga live, tabel transaksi).
   - `effect-dependency-loop`: Kebocoran siklus hidup hook `useEffect` tanpa array dependensi stabil.
   - `repeated-jsx-trees`: Pohon JSX duplikat yang wajib dikomposisi menjadi komponen modular terpisah.

---

## 🧪 3. Protokol Sovereign TDD (Test-Driven Verification)

Auditor QC menegakkan 4 Siklus Kepatuhan Verifikasi berbasis pengujian:

```
    ┌────────────────────────────────────────────────────────┐
    │   1. REPRODUCE / FAILING SPEC FIRST (RED PHASE)         │
    │   Identifikasi / buat skenario uji kondisi batas gagal │
    └──────────────────────────┬─────────────────────────────┘
                               │ Bukti kegagalan terekam di terminal
                               ▼
    ┌────────────────────────────────────────────────────────┐
    │   2. SURGICAL CODE APPLICATION (GREEN PHASE)           │
    │   Implementasi perbaikan / fitur minimal presisi       │
    └──────────────────────────┬─────────────────────────────┘
                               │
                               ▼
    ┌────────────────────────────────────────────────────────┐
    │   3. NON-REGRESSION SUITE VERIFICATION                 │
    │   Eksekusi 100% test suite, pastikan 0 failure         │
    └──────────────────────────┬─────────────────────────────┘
                               │
                               ▼
    ┌────────────────────────────────────────────────────────┐
    │   4. RUNTIME MEMORY & STATE AUDIT                      │
    │   Verifikasi telemetri memori & atomic file safe-write │
    └────────────────────────────────────────────────────────┘
```

1. **Aturan 1 (Failing Spec Verification):** Setiap bug baru wajib dibuktikan dengan penambahan assert/test yang mendeteksi anomali tersebut sebelum perbaikan diterapkan.
2. **Aturan 2 (100% Pass Requirement):** Seluruh suite unit test (misal `npm test`, `pytest`, `cargo test`, `go test`) wajib lolos **100% (0 fail, 0 error, 0 skipped critical)**.
3. **Aturan 3 (Strict Numeric & Anti-NaN Audit):** Pastikan kalkulasi matematis bebas dari `NaN`, `Infinity`, atau pembulatan liar floating point.
4. **Aturan 4 (Atomic Persistence Audit):** Seluruh penulisan file state ke disk wajib menggunakan pola atomic safe-write (`.tmp -> rename`).

---

## 👁️ 4. Protokol Uji Coba Visual E2E & Browser Automation

Untuk pengujian antarmuka pengguna (Web / UI / Formulir), Auditor QC tidak boleh hanya mengandalkan teks kode, melainkan wajib memanfaatkan pengujian browser terotomatisasi (*Playwright / Puppeteer / Chrome DevTools*):

1. **Prinsip Efisiensi Token Mutlak (`playwright-cli`):**  
   Auditor QC **DILARANG** membanjiri konteks LLM dengan pohon DOM/Accessibility Tree mentah berukuran puluhan ribu token dari server MCP browser yang membengkak. Utamakan eksekusi skrip CLI headless terisolasi (`playwright-cli` atau script node assertion) yang hanya mengembalikan status hasil `pass/fail` dan data terukur. Ini menghemat konsumsi token hingga 60%-80%.
2. **Inisialisasi Halaman (Navigation):** Jalankan server dev lokal jika belum aktif, buka halaman, dan navigasikan ke URL target (misal `http://localhost:3000`).
3. **Pemeriksaan Konsol Browser (Zero Console Error):** Ambil log konsol browser (`list_console_messages` atau handler `page.on('console')`) dan pastikan **nol error JavaScript** (*0 uncaught exceptions*).
4. **Pengujian Formulir & Interaksi Nyata:** Simulasikan pengetikan nilai, klik tombol aksi, dan uji kondisi batas (input karakter ilegal pada field angka).
5. **Tangkapan Layar Bukti Visual:** Ambil screenshot visual (`take_screenshot`) dan sajikan sebagai bukti konkret bahwa layout Command Center, tema kontras tinggi, dan komponen UI tampil presisi di depan mata pengguna.

---

## 🔍 5. Dua Fase Standar Audit Quality Control (QC Framework)

### FASE 1: QC OFFLINE (Pra-Deployment Audit)
Dilakukan setelah pembaruan kode diterapkan di lingkungan lokal dan sebelum kode diunggah ke server:
1. **Audit Integritas Berkas Lokal:** Periksa seluruh berkas yang disentuh terhadap instruksi pengguna. Pastikan zero secret leakage (kredensial aman di `.env`).
2. **Audit Unit Test Suite (100% Pass):** Jalankan test suite resmi proyek. Seluruh test wajib lolos 100%.
3. **Evaluasi Matriks Dual-Axis & Skrip Verifikasi Visual (`scripts/verify_visual_contrast.py`):** Pastikan kode berada di Kuadran 1 (Spec Fidelity Tinggi + Desain Bersih). Untuk proyek visual/thumbnail/multimedia, jalankan `python .agents/skills/quality-control-auditor/scripts/verify_visual_contrast.py <target_dir> --mode thumb` untuk memverifikasi nol tabrakan teks di atas area terang (*Text-on-Bright-Lamp Collision*) dan ukuran berkas $< 2\text{ MB}$.
4. **Verifikasi Jaring Pengaman Lokal:** Pastikan cadangan offline tersimpan utuh di `backups/backup_local_pre_[feature]_[timestamp]`.

---

### 🌐 FASE 2: QC ONLINE (Pasca-Deployment Live Audit)
Dilakukan segera setelah kode diunggah ke server produksi/VPS dan layanan direstart:
1. **Audit Telemetri Proses Runtime (PM2 / Docker / Systemd):** Status wajib `online` / `running` tanpa restart loop (*zero crash-loop*), memori dan CPU dalam batas wajar.
2. **Smoke Test Endpoint REST API & Web Server:** Uji respons HTTP endpoint via `curl`. Pastikan merespons HTTP 200/201 OK dengan payload JSON valid.
3. **Verifikasi Jaring Pengaman Server (Production Zip Backup):** Pastikan arsip snapshot server asli (`backup_YYYYMMDD_HHMMSS.zip`) telah sukses diunduh dan tersimpan aman di komputer lokal.
4. **Sanitasi Baseline Produksi:** Pastikan data uji coba simulasi telah dibersihkan kembali ke baseline operasional riil.

---

## 📑 6. Format Standar Laporan Resmi QC (Grade A+ Template)

Ketika sub-agen menyelesaikan audit, laporan wajib disajikan dalam struktur formal berikut:

```markdown
# 🛡️ LAPORAN AUDIT QUALITY CONTROL (QC) [OFFLINE / ONLINE]
**Proyek:** [Nama Proyek / Sistem]  
**Auditor:** Senior Quality Assurance & Compliance Auditor  
**Target Lingkungan:** [Komputer Lokal / Server Produksi (IP)]  
**Status Audit:** 🟢 PASSED (GRADE A+ / 100% EMPIRICAL COMPLIANCE) / 🔴 FAILED  
**Waktu Audit:** [Tanggal & Jam WIB / ISO Timestamp]  

---

## 1. Eksekutif Ringkasan (Executive Summary)
[Ulasan ringkas 1-2 paragraf mengenai ruang lingkup audit dan kesimpulan umum kelaikan sistem]

---

## 2. Evaluasi Matriks Peninjauan Kode Dua Sumbu (Dual-Axis Review)
| Sumbu Evaluasi | Parameter Kunci | Bukti Telemetri / Hasil Audit | Status |
| :--- | :--- | :--- | :---: |
| **Sumbu X: Spec Fidelity** | 100% Mandat Terpenuhi, Zero Scope Creep, Boundary Cases | [Hasil verifikasi fungsionalitas] | 🟢 PASS |
| **Sumbu Y: Clean Design** | Anti-Primitive Obsession, Bebas God Object, Immutability | [Hasil inspeksi Fowler Smells] | 🟢 PASS |

---

## 3. Rincian Hasil Pemeriksaan & Bukti Empiris

### A. Integritas Kode & Protokol TDD
- [x] **Unit Test Suite:** 100% Lolos ([X]/[X] tests pass, 0 fail).
- [x] **Non-Regression Ratchet:** Jumlah test terkunci dan tidak berkurang.
- [x] **Numeric & State Safety:** Bebas dari NaN dan menggunakan atomic safe-write (.tmp -> rename).

### B. Pengujian Visual E2E / Browser Inspection (Jika Relevan)
- [x] **Console Errors:** 0 unhandled exceptions di browser.
- [x] **Interaksi UI & Tooltip:** Berfungsi presisi saat disimulasikan.
- [x] **Tangkapan Layar:** Bukti visual terlampir.

---

## 4. Matriks Kepatuhan Arsitektur & Operasional
| Parameter Audit | Standar Wajib | Hasil Telemetri Empiris | Status |
| :--- | :--- | :--- | :---: |
| Integritas Berkas | 100% Match & Zero Secret | [Hasil pembacaan] | 🟢 PASS |
| Unit Test Suite | 100% Lolos Tanpa Regresi | [Angka test pass] | 🟢 PASS |
| Health Daemon/Process | Online tanpa restart loop | [Status & Memory] | 🟢 PASS |
| Safety Net Backup | Tersedia di direktori lokal | [Nama file & size] | 🟢 PASS |

---

## 5. Kesimpulan Akhir & Rekomendasi
[Pernyataan vonis kelayakan sistem: PASSED / FAILED beserta instruksi langkah berikutnya]
```

---

## ⚖️ Penegakan Independensi
- Auditor **TIDAK BOLEH** meloloskan audit jika ada unit test yang gagal, file cadangan tidak ditemukan, terdeteksi code smell kritis, atau terjadi error pada endpoint server sekecil apa pun.
- Setiap kegagalan wajib dilaporkan sebagai status 🔴 **FAILED** disertai penyebab akar masalah (*root cause*) dan instruksi perbaikan yang harus diambil.
