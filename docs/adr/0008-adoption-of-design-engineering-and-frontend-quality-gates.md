# ADR-0008: Adopsi Standar Design Engineering, Token-Efficient Browser Testing & Frontend Quality Gate

- **Status:** ACCEPTED
- **Tanggal:** 2026-10-10
- **Penanggung Jawab / Pengambil Keputusan:** Super Admin & Autonomous AI Engineering Council
- **Divisi ANS Terkait:** Divisi IV (Produk, Otomatisasi & Antarmuka) & Divisi III (Kualitas, Verifikasi & SRE)
- **Pilar Terkait:** `uiux-research-applicator`, `quality-control-auditor`, `token-context-efficiency-architect`, `code-refactor-optimizer`
- **Tingkat Triage:** Tier 2 (Frontend Architecture & Design Engineering Standards)

---

## 1. Konteks & Pernyataan Masalah (*Context & Problem Statement*)
Pengembangan antarmuka pengguna (Frontend & UI/UX) menggunakan agen AI sering kali menghadapi 3 kelemahan mendasar:
1. **Kurangnya Sentuhan Desain (*Lack of Design Taste & Micro-Polish*):** Agen AI sering menghasilkan antarmuka fungsional tetapi terasa kaku, kasar, atau canggung (*off*). Masalah umum mencakup sudut border jomplang (*mismatched radii*), teks harga/metrik bergetar saat angka berubah (*layout jitter* karena ketiadaan tabular numbers), kurva animasi tidak wajar (menggunakan `ease-in` untuk animasi masuk), dan tombol tanpa umpan balik sentuhan (*tactile click feedback*).
2. **Kualitas Kode React yang Buruk (*AI Slop in React*):** Agen AI sering memicu *useless re-renders*, loop dependensi `useEffect`, kebocoran state, dan pohon JSX duplikat yang membengkakkan bundle aplikasi.
3. **Pemborosan Token pada Browser Testing (MCP Context Flooding):** Pengujian browser menggunakan Model Context Protocol (MCP) sering membuang ribuan baris Accessibility DOM Tree ke konteks prompt LLM, menyebabkan pemborosan token ekstrem dan penurunan ketajaman penalaran (*context degradation*).

Komunitas rekayasa global (dikurasi oleh `@vibe.itji` di Threads, Emil Kowalski dari Vercel/Linear, Jakub Kręhel, Million.js, Julien Thibeaut, dan Microsoft Playwright) telah merilis standar baru berbasis *Agent Skills*. Diperlukan adopsi resmi atas standar ini ke dalam arsitektur APEX NEXUS SOVEREIGN (ANS) 2.0.

---

## 2. Keputusan yang Dipilih (*Decision Outcome*)
Mengintegrasikan standar **Design Engineering Polish Manifesto**, **Frontend AST Quality Gate**, dan **Token-Efficient Browser Testing** ke dalam APEX NEXUS SOVEREIGN (ANS) 2.0:

1. **Adopsi Design Engineering Polish Manifesto ke Pilar `uiux-research-applicator`:**
   - **Hukum Sudut Konsentris (*Concentric Border Radius*):** $\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}$.
   - **Perataan Optik (*Optical Alignment*):** Perataan berbasis visual mata manusia untuk tombol berikon, segitiga aksi, dan status pills.
   - **Angka Tabular (*Tabular Numbers*):** Wajib menggunakan `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums` atau `font-mono`) pada ticker harga live (BTC, SOL, Gold), persentase PnL, dan jam real-time WIB.
   - **Umpan Balik Taktil (*Tactile Press*):** Efek tekan proporsional `active:scale-[0.96]` pada seluruh tombol aksi interaktif.
   - **Pengendalian Animasi Berwibawa (*Motion Restraint & Taste*):** Mengharamkan `ease-in` untuk animasi masuk (wajib `ease-out`), spring bounce wajib `bounce: 0` (anti-kartun membal), dan transisi CSS interupsi-aman (*interruptible*).
   - **Aksesibilitas & Mobile-Native:** Seluruh tombol icon-only wajib memiliki `aria-label`, eliminasi tap highlight via `-webkit-tap-highlight-color: transparent`, dan penanganan `100dvh` anti-mobile bar bug.

2. **Adopsi `react-doctor` sebagai Frontend AST Quality Gate ke Pilar `code-refactor-optimizer`:**
   - Menjadikan `npx react-doctor@latest` sebagai pasangan frontend untuk `aislop` (Node.js backend).
   - Memindai secara deterministik: *useless re-renders*, siklus loop `useEffect`, dan pohon JSX duplikat.

3. **Adopsi Protokol Pengujian Browser Hemat Token ke Pilar `quality-control-auditor` & `token-context-efficiency-architect`:**
   - Menegakkan prinsip resmi Microsoft Playwright CLI: Memprioritaskan pengujian browser headless berbasis CLI (`playwright-cli` / skrip node assertion terisolasi) alih-alih server MCP yang membuang ribuan baris pohon DOM ke konteks prompt agen.
   - Menghemat konsumsi token prompt antara 60% s.d 80% pada pengujian visual E2E.

---

## 3. Konsekuensi (*Consequences*)

### A. Konsekuensi Positif (*Upside*):
- **Aura Command Center Bertaraf Enterprise:** Seluruh antarmuka web OMNI-X dan produk turunan memiliki kualitas poles visual dan mikro-interaksi setara Vercel dan Linear.
- **Bebas dari Layout Shift & Ticker Jitter:** Angka bursa dan ekuitas stabil di layar tanpa bergetar saat data diperbarui secara real-time.
- **Frontend Bebas Pemborosan RAM/CPU:** Komponen React terlindungi dari re-render berlebihan yang membebani browser pengguna.
- **Efisiensi Anggaran Token:** Pengujian visual E2E berjalan cepat, deterministik, dan hemat token konteks.

### B. Konsekuensi Kompromi (*Downside*):
- Pengembang frontend wajib memperhatikan padding saat menentukan `border-radius` agar selalu mematuhi rumus konsentris.
- Pengujian visual browser memerlukan skrip assertion terfokus alih-alih eksplorasi bebas DOM tanpa batas.

---

## 4. Pagar Pengaman & Uji Verifikasi (*Validation Ratchet*)
- [x] Pilar `uiux-research-applicator/SKILL.md` disinkronkan di seluruh repositori ekosistem.
- [x] Pilar `quality-control-auditor/SKILL.md` disinkronkan memuat `react-doctor` dan `playwright-cli` guideline.
- [x] ADR-0008 diarsipkan permanen di direktori `docs/adr/`.
- [x] Unit test suite 332/332 tests tetap 100% PASS tanpa regresi.
