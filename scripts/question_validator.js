/**
 * Afresto AI Assistant - Pre-Flight Question Validator Engine
 * Memvalidasi kelengkapan butir soal (pertanyaan, opsi A-D/E, kunci jawaban)
 * sebelum diinjeksi ke formulir web Afresto untuk mencegah runtime error.
 */

export function validateQuestionCompleteness(q, index = 0) {
  const issues = [];
  const warnings = [];

  // 1. Validasi Teks Pertanyaan
  if (!q.pertanyaan || typeof q.pertanyaan !== 'string' || q.pertanyaan.trim().length < 3) {
    issues.push("Teks pertanyaan kosong atau tidak lengkap");
  }

  const tipe = (q.tipe || 'PG').toUpperCase();

  // 2. Validasi Tipe PG & PG_KOMPLEKS
  if (tipe === 'PG' || tipe === 'PG_KOMPLEKS') {
    const opsiKeys = Object.keys(q.opsi || {});
    if (opsiKeys.length < 3) {
      issues.push(`Opsi jawaban hanya terdeteksi ${opsiKeys.length} (minimal 3-4 opsi A-D/E)`);
    } else {
      for (const k of opsiKeys) {
        if (!q.opsi[k] || String(q.opsi[k]).trim() === '') {
          issues.push(`Opsi ${k} bernilai kosong`);
        }
      }
    }

    if (!q.kunci) {
      issues.push("Kunci jawaban belum ditentukan");
    } else if (tipe === 'PG' && typeof q.kunci === 'string') {
      const cleanKey = q.kunci.toUpperCase().trim();
      if (!q.opsi || !q.opsi[cleanKey]) {
        // FATAL: Kunci jawaban tidak ada dalam opsi akan 100% ditolak oleh portal Afresto!
        issues.push(`Kunci jawaban (${cleanKey}) tidak ditemukan dalam daftar opsi [${Object.keys(q.opsi || {}).join(', ')}]`);
      }
    } else if (tipe === 'PG_KOMPLEKS' && Array.isArray(q.kunci) && q.kunci.length === 0) {
      issues.push("Kunci jawaban pilihan ganda kompleks kosong");
    }
  }

  // 3. Validasi Benar / Salah
  if (tipe === 'BENAR_SALAH') {
    const opsiKeys = Object.keys(q.opsi || {});
    if (opsiKeys.length < 2) {
      issues.push(`Pernyataan Benar/Salah hanya terdeteksi ${opsiKeys.length} baris`);
    }
    if (!q.kunci || typeof q.kunci !== 'object') {
      issues.push("Kunci jawaban Benar/Salah belum lengkap");
    }
  }

  // 4. Validasi Mencocokkan
  if (tipe === 'MENCOCOKKAN') {
    if (!Array.isArray(q.pasangan) || q.pasangan.length < 2) {
      issues.push("Pasangan mencocokkan minimal harus memiliki 2 pasang");
    }
  }

  // 5. Validasi Isian
  if (tipe === 'ISIAN') {
    if (!q.kunci || (Array.isArray(q.kunci) && q.kunci.length === 0)) {
      issues.push("Kunci jawaban isian singkat belum ditentukan");
    }
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
    warnings: warnings
  };
}
