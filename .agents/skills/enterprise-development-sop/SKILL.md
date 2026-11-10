---
name: enterprise-development-sop
description: Standar Operasional Prosedur (SOP) pengembangan perangkat lunak tingkat Enterprise. Memandu alur 7 langkah pembaruan kode, 4-Tier Triage, backup lokal offline, dual-phase audit Quality Control (QC) sub-agen independen, backup server produksi, deployment aman, dan tata kelola zero-trust untuk semua proyek.
---

# Enterprise Development SOP & Governance Workflow
## The Sovereign 7-Step Deployment & Dual-QC Assurance Protocol Universal

> **Identitas:** Enterprise Process & Governance Director  
> **Divisi:** Divisi I — Tata Kelola, Risiko, Arsitektur, Roadmap & Protokol  
> **Mitra Penyeimbang:** `quality-control-auditor` (Pelaksana audit) & `devops-infrastructure-deployer` (Pelaksana deployment)  
> **Prinsip Utama:** *Process Drives Reliability. Never Touch Production Without Rollback Safety.*

---

## 📌 1. Mandat & 4-Tier Triage Protocol (Executive Mandate)

Seluruh pembaruan kode mengacu pada tata kelola siklus hidup resmi **`ANS_MASTER_SOP.md`** dengan klasifikasi 4-Tier Triage:
- **Tier 0 (Fast-Track Micro-Fixes):** Perbaikan typo, teks statis UI, formatting komentar/markdown, penambahan log debug lokal non-invasif. **DIPERBOLEHKAN bypass telaah formal panjang** untuk mencegah pemborosan token dan kelumpuhan analisis. Cukup backup lokal, edit presisi, dan uji kilat.
- **Tier 1 (Minor Standard Engineering):** Endpoint terisolasi, styling visual CSS, unit test baru, perbaikan bug minor. Wajib backup lokal, telaah konsekuensi ringkas, eksekusi, QC offline, dan laporan.
- **Tier 2 (Major Core & Business Logic):** Logika bisnis inti sistem, formula kalkulasi kritis, refaktor multi-file, migrasi skema basis data/state, rilis penuh 9 fase (F0 s.d. F8). Wajib dual QC (offline & online live), pembaruan ADR, dan unduhan backup ZIP.
- **Tier 3 (Critical Infrastructure, Security & Live Assets):** Kredensial produksi, arsitektur keamanan, konfigurasi root server / Nginx / firewall, migrasi data skala besar. Wajib konfirmasi tertulis Super Admin di setiap gerbang.

---

## 🔄 2. 7 Langkah Alur Kerja Pembaruan Kode & Deploy (Mandatory Workflow)
Setiap kali AI diminta untuk memperbarui, mengedit, menambah, atau menghapus kode dalam sebuah proyek berstatus produksi, **WAJIB** mengikuti 7 langkah berurutan tanpa terlewat:

1. **Backup Lokal Offline (`scripts/pre_flight_backup.py`):**
   - Sebelum menyentuh kode, lakukan pencadangan (*backup*) terhadap berkas lokal yang akan diubah ke direktori `backups/backup_local_pre_<feature>_<timestamp>` (dapat dieksekusi cepat via `python .agents/skills/enterprise-development-sop/scripts/pre_flight_backup.py --project-root . --tag <feature> <files...>`).
2. **Eksekusi Offline:**
   - Terapkan pembaruan/edit/tambah kode pada berkas lokal tersebut secara offline di lingkungan kerja lokal.
3. **QC Offline (Sub-agen Independen):**
   - Panggil sub-agen `quality_control` untuk memeriksa integritas sintaks, evaluasi Dual-Axis Review, menjalankan unit test (100% pass), dan memvalidasi apakah perubahan lokal sudah presisi sesuai instruksi User.
4. **Backup Server Produksi (Download Zip):**
   - Jika QC offline lolos sempurna, unduh berkas asli yang akan ditiban dari server produksi dan simpan ke komputer lokal dalam format `.zip` dengan nama `backup_YYYYMMDD_HHMMSS.zip` sebagai jaring pengaman darurat (*safety net*).
5. **Deploy ke Server Produksi:**
   - Unggah (*upload*) berkas yang telah lolos uji ke server produksi, jalankan kompilasi build (jika ada), dan lakukan tindakan restart layanan yang diperlukan (misal `pm2 restart <service>`, container reload, dsb).
6. **QC Online (Sub-agen Independen):**
   - Jalankan sub-agen `quality_control` sekali lagi secara *live* di server produksi untuk memverifikasi endpoint API, respons HTTP valid, konsumsi memori, dan integritas runtime.
7. **Laporan Final:**
   - Laporkan hasil akhir kepada User secara transparan: daftar berkas yang disentuh, ringkasan fitur baru, status unit test, dan konfirmasi lolosnya seluruh tahap backup & QC.

---

## 🔒 3. Tata Kelola Git & Dokumentasi (Post-Execution Gate)
1. **Pencatatan Berkelanjutan:**
   - Selalu perbarui dokumen pelacak progres (`task.md`, `TODO.md`) dan ADR terkait begitu sebuah milestone selesai.
2. **Larangan Auto-Commit:**
   - AI **DILARANG KERAS** menjalankan `git commit` secara otomatis atau diam-diam.
3. **Gerbang Konfirmasi Eksplisit:**
   - AI **WAJIB BERTANYA SECARA EKSPLISIT**: *"Apakah progress terbaru ini mau dicommit ke Git sekarang?"* dan hanya mengeksekusi setelah ada persetujuan tegas dari User.

---

## 🛡️ 4. Keamanan Siber Zero-Trust & Desain UI
- **Zero-Trust Input Validation:** Jangan percaya input dari klien. Sanitasi ketat untuk mencegah SQL/NoSQL Injection, Command Injection, dan XSS.
- **Pemisahan Hak Akses:** Pisahkan secara tegas otorisasi tingkat admin vs member/tenant biasa di level backend controller.
- **Filosofi UI/UX Command Center:** Terapkan tema *Command Center* gelap (*cyber-premium solid dark*, grid bersih, aksen neon subtil, kontras tinggi, bebas clutter).
