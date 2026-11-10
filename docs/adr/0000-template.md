# ADR-[NOMOR]: [Judul Keputusan Arsitektur]

- **Status:** [PROPOSED | ACCEPTED | REJECTED | DEPRECATED | SUPERSEDED by ADR-XXXX]
- **Tanggal:** [YYYY-MM-DD]
- **Penanggung Jawab / Pengambil Keputusan:** [Nama Developer / Super Admin / Tim Arsitektur]
- **Divisi ANS Terkait:** [Divisi I (Governance) / Divisi II (Core) / Divisi III (Quality) / Divisi IV (Product) / Divisi V (Commercial)]
- **Tingkat Triage:** [Tier 1 (Minor) | Tier 2 (Major Core) | Tier 3 (Critical Infra/Security)]

---

## 1. Konteks & Pernyataan Masalah (*Context & Problem Statement*)

[Jelaskan latar belakang teknis atau operasional yang melatarbelakangi perlunya keputusan ini. Apa masalah yang dihadapi sistem saat ini? Apa kendala arsitektur atau keterbatasan performa yang sedang terjadi?]

---

## 2. Opsi yang Dipertimbangkan (*Considered Options*)

1. **Opsi A: [Nama Pendekatan 1]**
   - *Deskripsi Singkat:* [Uraian pendekatan]
   - *Kelebihan:* [Kelebihan teknis]
   - *Kelemahan:* [Kelemahan atau keterbatasan]
2. **Opsi B: [Nama Pendekatan 2]**
   - *Deskripsi Singkat:* [Uraian pendekatan]
   - *Kelebihan:* [Kelebihan teknis]
   - *Kelemahan:* [Kelemahan atau keterbatasan]
3. **Opsi C: [Nama Pendekatan 3]**
   - ...

---

## 3. Keputusan yang Dipilih (*Decision Outcome*)

**Pilihan Terpilih:** **[Opsi X]**

### Alasan Rasional (*Rationale*):
[Uraikan pertimbangan matematis, arsitektural, atau operasional mengapa opsi ini dipilih di atas opsi lainnya. Tunjukkan bagaimana keputusan ini sesuai dengan kapasitas riil sistem (*Circle of Competence*) dan tujuan jangka panjang proyek.]

---

## 4. Konsekuensi (*Consequences*)

### A. Konsekuensi Positif (*Upside / Keuntungan*):
- [Keuntungan performa, keterbacaan kode, modularitas, atau skalabilitas]
- [Penyederhanaan alur kerja developer / agen AI]

### B. Konsekuensi Negatif & Utang Teknis (*Downside / Kompromi*):
- [Kebutuhan refaktorisasi atau migrasi skema data lama]
- [Keterbatasan baru yang harus diperhatikan oleh tim rekayasa]

---

## 5. Pagar Pengaman & Uji Verifikasi (*Validation & Non-Regression Ratchet*)

Bagaimana keputusan ini diverifikasi dan dikunci agar tidak mengalami regresi di masa depan:

- [x] **Unit & Integration Tests:** [Sebutkan test case atau suite yang memverifikasi perilaku ini]
- [x] **Static Linting / Compiler Checks:** [Aturan linter atau tipe data ketat yang menegakkannya]
- [x] **Observabilitas & Telemetri:** [Metrik atau log terstruktur yang memantau performa keputusan ini di runtime]
