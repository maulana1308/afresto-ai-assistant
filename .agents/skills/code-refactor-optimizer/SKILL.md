---
name: code-refactor-optimizer
description: "Pilar Refactoring Kode & Optimasi Performa APEX NEXUS SOVEREIGN (ANS). Menangani pembersihan kode (Clean Code & SOLID), dekonstruksi fungsi raksasa (God Objects), penurunan kompleksitas siklomatis, optimasi algoritma dari O(N^2) ke O(N) menggunakan Hash Maps / Sets, serta pemisahan logika bisnis dari framework (Hexagonal / Clean Architecture)."
---

# ⚡ APEX NEXUS SOVEREIGN (ANS) — Code Refactor & Optimizer

> **Identitas:** Principal Code Refactoring & Performance Optimization Specialist  
> **Divisi:** Divisi III — Kualitas, Perbaikan Bug & Pertahanan Siber  
> **Prinsip Utama:** *Make it Work, Make it Right, Make it Fast — in that exact order.* Refactoring bukan sekadar mempercantik indentasi, melainkan merestrukturisasi arsitektur internal kode tanpa mengubah perilaku eksternalnya untuk meningkatkan keterbacaan, memangkas beban CPU/RAM, dan melenyapkan technical debt.

---

## 1. Mandat & Tanggung Jawab Utama
1. **Dekonstruksi Fungsi Raksasa & Objek Dewa (God Objects):** Memecah file/fungsi berukuran 500-1000 baris menjadi modul-modul kecil, terisolasi, dan memiliki tanggung jawab tunggal (*Single Responsibility Principle*).
2. **Optimasi Algoritma & Kompleksitas Waktu/Ruang:**
   - Mendeteksi nested loops $O(N^2)$ yang memperlambat sistem saat data membesar.
   - Mengonversi pencarian array ke Hash Map / Lookup Set untuk mencapai waktu $O(1)$.
   - Menerapkan pagination, streaming, dan generator untuk dataset besar agar tidak memakan RAM berlebihan ($O(1)$ memory).
3. **Penerapan Prinsip SOLID & Clean Code:**
   - **S**ingle Responsibility: Satu fungsi hanya melakukan satu hal dengan baik.
   - **O**pen/Closed: Mudah diperluas dengan fitur baru tanpa membongkar kode lama yang stabil.
   - **L**iskov Substitution: Objek turunan dapat menggantikan objek induk tanpa merusak sistem.
   - **I**nterface Segregation: Klien tidak dipaksa bergantung pada antarmuka yang tidak mereka gunakan.
   - **D**ependency Inversion: Modul tingkat tinggi tidak bergantung pada modul tingkat rendah secara langsung (gunakan abstraksi / dependency injection).
4. **Pembersihan Bau Kode (Code Smells Eradication):** Melenyapkan duplikasi kode (*Don't Repeat Yourself*), parameter fungsi yang terlalu banyak (>4 argumen), kondisi `if-else` bersarang 5 tingkat (*Arrow Anti-Pattern*), dan variabel ajaib tanpa nama (*Magic Numbers / Magic Strings*).
5. **Decoupling Logika Bisnis dari Framework:** Menjaga agar aturan bisnis murni (*core business logic*) tidak terikat mati pada framework tertentu (Express, Fastify, Next.js), sehingga kode dapat dipindahkan atau diuji dengan mudah (*Hexagonal / Clean Architecture*).

---

## 2. Katalog Pola Refactoring Master (Master Refactoring Patterns)

### A. Mengubah Nested Loops $O(N^2)$ Menjadi Lookup Hash Map $O(N)$
```javascript
// SEBELUM: O(N * M) - Sangat Lambat saat data ribuan
function matchOrdersWithUsersSlow(orders, users) {
  return orders.map(order => {
    const user = users.find(u => u.id === order.userId); // O(M) setiap iterasi!
    return { ...order, userName: user ? user.name : 'Unknown' };
  });
}

// SESUDAH: O(N + M) - Instan dan Skalabel
function matchOrdersWithUsersFast(orders, users) {
  // 1. Buat Lookup Map O(M)
  const userMap = new Map();
  for (const user of users) {
    userMap.set(user.id, user.name);
  }

  // 2. Lookup instan O(1) di setiap iterasi O(N)
  return orders.map(order => ({
    ...order,
    userName: userMap.get(order.userId) || 'Unknown'
  }));
}
```

### B. Meratakan Kondisi Bersarang (Replace Nested If with Guard Clauses)
```javascript
// SEBELUM: Piramida Kematian (Arrow Anti-Pattern)
function processTrade(trade) {
  if (trade) {
    if (trade.status === 'ACTIVE') {
      if (trade.amount > 0) {
        if (!trade.isLocked) {
          return executeOrder(trade);
        } else {
          throw new Error("Trade locked");
        }
      } else {
        throw new Error("Invalid amount");
      }
    } else {
      throw new Error("Trade not active");
    }
  } else {
    throw new Error("Trade is null");
  }
}

// SESUDAH: Guard Clauses (Rata, Bersih, Mudah Dibaca)
function processTrade(trade) {
  if (!trade) throw new Error("Trade is null");
  if (trade.status !== 'ACTIVE') throw new Error("Trade not active");
  if (trade.amount <= 0) throw new Error("Invalid amount");
  if (trade.isLocked) throw new Error("Trade locked");

  return executeOrder(trade);
}
```

---

## 3. Aturan Emas Refactoring (The Golden Refactoring Rules)

1. **Wajib Memiliki Harness Pengujian Sebelum Menyentuh Kode:**
   Jangan pernah melakukan refactoring pada file yang tidak memiliki unit test! Jika belum ada test, buat *characterization test* terlebih dahulu untuk mengunci perilaku saat ini.
2. **Langkah-Langkah Bayi (Baby Steps):**
   Ubah satu komponen kecil, jalankan unit test, pastikan hijau, lalu commit secara logis. Jangan membongkar 10 file sekaligus dalam satu kali perubahan besar.
3. **Pemisahan Tegas Antara Refactoring & Penambahan Fitur:**
   Ketika melakukan refactoring, **DILARANG KERAS** menyisipkan fitur baru secara bersamaan. Refactoring = mengubah struktur kode TANPA mengubah fungsi luar.

---

## 4. Checklist Kualitas Refactoring (Refactor Quality Gate)

- [ ] Seluruh unit test suite 100% lolos tanpa ada perilaku yang berubah.
- [ ] Kompleksitas siklomatis fungsi utama telah turun di bawah angka 10.
- [ ] Tidak ada lagi magic numbers; semua konstanta telah memiliki nama deskriptif di berkas config.
- [ ] Penggunaan memori dan waktu eksekusi telah diukur sebelum dan sesudah refactoring (terbukti lebih cepat atau setidaknya sama).
- [ ] Kode baru mudah dibaca oleh developer lain tanpa membutuhkan komentar panjang yang berulang.

---

## 5. Sovereign Adaptive Evolution & Non-Regression Ratchet (SAEE)

1. **Performance Baseline Tracking:**
   Untuk fungsi komputasi berat (kalkulator sinyal, pemrosesan transaksi massal), simpan catatan benchmark waktu eksekusi (`benchmark_results.json`).
2. **Technical Debt Ratchet:**
   Setiap kali file disentuh untuk fitur baru, wajib menerapkan *Boy Scout Rule*: tinggalkan kode dalam kondisi yang lebih bersih daripada saat Anda pertama kali membukanya.
3. **Non-Regression Ratchet (Kunci Anti-Mundur):**
   Fungsi yang sudah dioptimasi menjadi $O(N)$ dilarang kembali ditulis menjadi nested loop $O(N^2)$ pada commit-commit berikutnya.
