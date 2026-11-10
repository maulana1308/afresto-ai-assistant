/**
 * Afresto AI Assistant - Smart Content Script & DOM Injector
 * Mengontrol injeksi form soal Afresto dan menerapkan 3-Tier Dynamic Readiness Handshake.
 */

let isExecutionHalted = false;

// ------------------------------------------------------------------------
// 1. UTILITY & READINESS HANDSHAKE ENGINE
// ------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

/**
 * Mem-parsing teks nama pelajaran menjadi Mata Pelajaran & Tingkat Kelas
 * Mendukung teks single-line maupun format multi-line tabel informasi evaluasi Afresto.
 */
function parseAcademicText(rawText) {
  if (!rawText) return null;
  const fullText = rawText.trim();

  // Pisahkan baris jika berupa teks bertingkat (judul mapel di baris 1, detail rombel di baris 2)
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const primaryLine = lines[0] || fullText;

  // 1. Deteksi Tingkat / Kelas dari seluruh teks
  let kelas = "";
  if (/\bXII\b/i.test(fullText) || /\bkelas\s*12\b/i.test(fullText) || /\b12\b/.test(fullText)) {
    kelas = "Fase F (Kelas 12 SMK/SMA)";
  } else if (/\bXI\b/i.test(fullText) || /\bkelas\s*11\b/i.test(fullText) || /\b11\b/.test(fullText)) {
    kelas = "Fase F (Kelas 11 SMK/SMA)";
  } else if (/\bX\b/i.test(fullText) || /\bkelas\s*10\b/i.test(fullText) || /\b10\b/.test(fullText)) {
    kelas = "Fase E (Kelas 10 SMK/SMA)";
  } else if (/\bIX\b/i.test(fullText) || /\b9\b/.test(fullText)) {
    kelas = "Kelas 9 SMP";
  } else if (/\bVIII\b/i.test(fullText) || /\b8\b/.test(fullText)) {
    kelas = "Kelas 8 SMP";
  } else if (/\bVII\b/i.test(fullText) || /\b7\b/.test(fullText)) {
    kelas = "Kelas 7 SMP";
  }

  // 2. Ekstrak dan Bersihkan Nama Mata Pelajaran dari baris utama
  let mapel = primaryLine
    .split('·')[0]                              // buang bagian setelah tanda titik tengah ·
    .replace(/\b\d{2}[-\/]\d{2}\b/g, '')       // hapus format tahun misal "26-27"
    .replace(/\b\d{4}[-\/]\d{4}\b/g, '')       // hapus format tahun misal "2026/2027"
    .replace(/\b(XII|XI|X|IX|VIII|VII)\b/gi, '') // hapus angka romawi kelas
    .replace(/\s+/g, ' ')
    .trim();

  if (mapel.length < 2) return null;

  return { raw: fullText, mapel, kelas };
}

/**
 * Mencari tabel info, dropdown, atau teks PELAJARAN di halaman aktif Afresto
 */
function detectAcademicInfoFromPage() {
  const pageText = document.body ? (document.body.innerText || document.body.textContent || "") : "";

  // 1. Ekstraksi langsung via Regex dari teks halaman (Pola Tabel INFORMASI EVALUASI)
  // Menangkap: "Pelajaran\nDasar Dasar Program Keahlian TJKT\nDasar Dasar Program Keahlian TJKT Dessy X 26-27"
  const pelajaranRegex = /Pelajaran\s*[:\n\r]\s*([^\n\r]+)(?:\r?\n+([^\n\r]+))?/i;
  const matchPelajaran = pageText.match(pelajaranRegex);
  if (matchPelajaran) {
    const line1 = matchPelajaran[1].trim();
    const line2 = (matchPelajaran[2] || "").trim();
    const combined = line1 + "\n" + line2;
    const parsed = parseAcademicText(combined);
    if (parsed && parsed.mapel) {
      chrome.storage.local.set({ afresto_detected_academic: parsed }).catch(() => {});
      return parsed;
    }
  }

  // 2. Ekstraksi via Regex dari teks sub-header TES
  // Menangkap: "Dasar Dasar Program Keahlian TJKT - Dasar Dasar Program Keahlian TJKT Dessy X 26-27 · ..."
  const subheaderRegex = /([^\n\r·]+?)\s*-\s*([^\n\r·]+?\b(X|XI|XII|\d{1,2})\b[^\n\r·]*?)\s*·/i;
  const matchSubheader = pageText.match(subheaderRegex);
  if (matchSubheader) {
    const combined = matchSubheader[1].trim() + "\n" + matchSubheader[2].trim();
    const parsed = parseAcademicText(combined);
    if (parsed && parsed.mapel) {
      chrome.storage.local.set({ afresto_detected_academic: parsed }).catch(() => {});
      return parsed;
    }
  }

  // 3. Cari dari elemen DOM tabel / label teks 'Pelajaran'
  const allLabels = Array.from(document.querySelectorAll('td, th, dt, label, b, strong, .title, div'));
  for (const label of allLabels) {
    const text = label.textContent.trim().toLowerCase();
    if (text === 'pelajaran' || text.startsWith('pelajaran')) {
      const valueEl = label.nextElementSibling || 
                      label.parentElement?.querySelector('td:last-child') || 
                      label.closest('tr')?.children[1];
      if (valueEl && valueEl !== label) {
        const parsed = parseAcademicText(valueEl.innerText || valueEl.textContent);
        if (parsed && parsed.mapel) {
          chrome.storage.local.set({ afresto_detected_academic: parsed }).catch(() => {});
          return parsed;
        }
      }
    }
  }

  // 4. Cari dari elemen <select> yang memiliki konteks 'PELAJARAN'
  const allSelects = Array.from(document.querySelectorAll('select'));
  for (const sel of allSelects) {
    const parentContainer = sel.closest('.form-group, div, tr') || sel.parentElement;
    const containerText = (parentContainer ? parentContainer.textContent : "") || "";
    const selName = (sel.name || "") + " " + (sel.id || "");

    if (containerText.toUpperCase().includes('PELAJARAN') || 
        containerText.toUpperCase().includes('MAPEL') ||
        selName.toLowerCase().includes('pelajaran') ||
        selName.toLowerCase().includes('mapel')) {
      
      const selectedOption = sel.options[sel.selectedIndex];
      if (selectedOption && selectedOption.text && !selectedOption.text.toLowerCase().includes('pilih')) {
        const parsed = parseAcademicText(selectedOption.text);
        if (parsed && parsed.mapel) {
          chrome.storage.local.set({ afresto_detected_academic: parsed }).catch(() => {});
          return parsed;
        }
      }
    }
  }

  return null;
}

// Pasang pendengar otomatis jika guru mengganti dropdown PELAJARAN di Afresto
document.addEventListener('change', (e) => {
  if (e.target && e.target.tagName === 'SELECT') {
    detectAcademicInfoFromPage();
  }
}, true);

/**
 * Memeriksa apakah halaman saat ini adalah halaman pembuatan soal Afresto
 */
function checkIsQuestionPage() {
  const currentUrl = (window.location.href || "").toLowerCase();

  // 1. Blacklist modul Afresto yang jelas bukan pembuatan soal
  const nonQuestionKeywords = ['jurnal', 'presensi', 'rekap', 'kalender', 'profil', 'dashboard', 'silabus', 'rpp'];
  if (nonQuestionKeywords.some(kw => currentUrl.includes(kw))) {
    return false;
  }

  // 2. Periksa apakah elemen form soal ada dan benar-benar terlihat di layar
  const iframe = findEditorIframe('pertanyaan');
  const typeGrid = document.querySelector('#akf-type-grid');

  const isIframeVisible = iframe && (iframe.offsetParent !== null || iframe.getBoundingClientRect().height > 0);
  const isGridVisible = typeGrid && (typeGrid.offsetParent !== null || typeGrid.getBoundingClientRect().height > 0);

  return Boolean(isIframeVisible || isGridVisible);
}

/**
 * Memeriksa apakah tab Afresto saat ini sedang membuka halaman form input Materi
 */
function checkIsMateriPage() {
  const currentUrl = (window.location.href || "").toLowerCase();
  const pageText = (document.body ? (document.body.innerText || document.body.textContent || "") : "").toLowerCase();

  // 1. Sinyal Teks Visual Kuat di Halaman (Berdasarkan DOM Nyata Afresto)
  const hasMateriHeader = pageText.includes('form materi') || 
                          pageText.includes('tambah materi') || 
                          pageText.includes('artikel materi') ||
                          pageText.includes('tambah penugasan');

  // 2. Sinyal Tombol / Elemen Spesifik Materi
  const btnKetik = Array.from(document.querySelectorAll('button, a, .btn, span, div')).some(el => {
    const t = (el.textContent || "").trim().toLowerCase();
    return t.includes('ketik isi artikel') || t.includes('buka editor');
  });

  // 3. Sinyal Input Judul (placeholder: "nama / judul materi" atau name/id)
  const hasJudulInput = Boolean(
    document.querySelector('input[placeholder*="judul materi" i]') ||
    document.querySelector('input[placeholder*="nama / judul" i]') ||
    document.querySelector('input[placeholder*="judul" i]') ||
    document.getElementById('nama') ||
    document.querySelector('input[name="nama"]') ||
    document.getElementById('judul') ||
    document.querySelector('input[name="judul"]') ||
    document.querySelector('input[name="nama_materi"]')
  );

  // 4. Sinyal Form Konten / Froala / Textarea
  const hasKontenEditor = Boolean(
    document.querySelector('.fr-element') ||
    document.querySelector('.note-editable') ||
    document.getElementById('konten') || 
    document.querySelector('textarea[name="konten"]') || 
    document.getElementById('konten_ifr') || 
    findEditorIframe('konten')
  );

  // 5. Sinyal URL
  const isMateriUrl = currentUrl.includes('/materi') || currentUrl.includes('/kbm');

  if (hasMateriHeader || btnKetik) return true;
  if (isMateriUrl && (hasJudulInput || hasKontenEditor)) return true;
  if (hasJudulInput && (btnKetik || hasKontenEditor)) return true;

  return false;
}

/**
 * Mencari elemen iframe TinyMCE dengan strategi fallback adaptif (ID, Name, Class)
 */
function findEditorIframe(target) {
  if (!target) return null;

  // 1. Jika sudah element DOM
  if (target instanceof Element) return target;

  // 2. Jika nama/selector mengandung 'pertanyaan'
  if (typeof target === 'string' && target.toLowerCase().includes('pertanyaan')) {
    return document.querySelector('#pertanyaan_ifr') ||
           document.querySelector('iframe[name="pertanyaan_ifr"]') ||
           document.querySelector('iframe[id*="pertanyaan"]') ||
           document.querySelector('iframe[name*="pertanyaan"]') ||
           document.querySelector('.mce-edit-area iframe');
  }

  // 2b. Jika nama/selector mengandung 'konten'
  if (typeof target === 'string' && target.toLowerCase().includes('konten')) {
    return document.querySelector('#konten_ifr') ||
           document.querySelector('iframe[name="konten_ifr"]') ||
           document.querySelector('iframe[id*="konten"]') ||
           document.querySelector('iframe[name*="konten"]');
  }

  // 3. Jika nama/selector mengandung 'pilihan'
  if (typeof target === 'string') {
    const match = target.match(/pilihan[-_]?([a-eA-E])/i);
    if (match) {
      const k = match[1].toLowerCase();
      return document.querySelector(`#pilihan-${k}_ifr`) ||
             document.querySelector(`#pilihan_${k}_ifr`) ||
             document.querySelector(`iframe[id*="pilihan-${k}"]`) ||
             document.querySelector(`iframe[id*="pilihan_${k}"]`) ||
             document.querySelector(`iframe[name*="pilihan-${k}"]`) ||
             document.querySelector(`iframe[name*="pilihan_${k}"]`);
    }
  }

  // 4. Selector CSS langsung biasa
  try {
    return document.querySelector(target);
  } catch (_) {
    return null;
  }
}

/**
 * 3-Tier Dynamic Readiness Handshake: Menunggu TinyMCE Editor 100% Siap
 */
async function waitForEditorReady(iframeSelector, timeout = 15000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (isExecutionHalted) throw new Error("Injeksi dibatalkan oleh pengguna.");

    const iframe = findEditorIframe(iframeSelector);
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        const isEditable = doc.body.getAttribute('contenteditable') === 'true';
        const isTinyLoaded = doc.body.classList.contains('mce-content-body');
        
        // Editor dianggap siap jika iframe dan body sudah contenteditable atau doc ready
        if (isEditable || isTinyLoaded || doc.readyState === 'complete') {
          return iframe;
        }
      }
    }
    await sleep(150);
  }
  throw new Error(`Timeout (${timeout}ms): Editor ${iframeSelector} belum siap di Afresto.`);
}

/**
 * Mendeteksi karakteristik skrip bahasa untuk tata letak tipografi presisi
 * Mendukung Bahasa Arab (RTL), Bahasa Jepang (CJK), dan Aksara Jawa
 */
function detectScriptTypography(text) {
  if (!text || typeof text !== "string") return { dir: "ltr", isArabic: false, extraStyle: "" };

  // 1. Deteksi Bahasa Arab (Unicode Arabic, Arabic Supplement, Extended-A)
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)) {
    return {
      dir: "rtl",
      isArabic: true,
      extraStyle: "direction: rtl; text-align: right; font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 16px; line-height: 1.85;"
    };
  }

  // 2. Deteksi Bahasa Jepang (Hiragana, Katakana, Kanji)
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    return {
      dir: "ltr",
      isArabic: false,
      extraStyle: "font-family: 'Hiragino Sans', 'Noto Sans JP', 'Meiryo', sans-serif; font-size: 14.5px; line-height: 1.7;"
    };
  }

  // 3. Deteksi Aksara Jawa
  if (/[\uA980-\uA9DF]/.test(text)) {
    return {
      dir: "ltr",
      isArabic: false,
      extraStyle: "font-family: 'Noto Sans Javanese', 'Yogya', system-ui, sans-serif; font-size: 16px; line-height: 1.9;"
    };
  }

  return { dir: "ltr", isArabic: false, extraStyle: "" };
}

/**
 * Menulis teks HTML ke dalam iframe TinyMCE dengan dispatching events
 * Mendukung penyematan gambar biner Base64, diagram vektor SVG, dan tipografi Multi-Bahasa (Arab RTL, Jepang, Jawa, Eropa)
 */
async function setTinyMceContent(iframeSelector, text, imagePayload = null) {
  const iframe = await waitForEditorReady(iframeSelector);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc || !doc.body) {
    throw new Error(`Dokumen editor ${iframeSelector} tidak dapat diakses.`);
  }
  const body = doc.body;

  const scriptMeta = detectScriptTypography(text);

  // Atur arah dan perataan body TinyMCE agar kursor dan aliran teks sinkron
  body.setAttribute('dir', scriptMeta.dir);
  body.style.direction = scriptMeta.dir;
  if (scriptMeta.isArabic) {
    body.style.textAlign = 'right';
  } else {
    body.style.textAlign = 'left';
  }

  let formattedHtml = "";

  // Jika ada payload gambar (Base64, URL, atau SVG)
  if (imagePayload && typeof imagePayload === "object") {
    if (imagePayload.base64 || imagePayload.url) {
      const src = imagePayload.base64 || imagePayload.url;
      formattedHtml += `<p style="text-align: center; margin: 10px 0 14px 0;"><img src="${src}" alt="Ilustrasi Asesmen" style="max-width: 100%; max-height: 400px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); display: inline-block;" /></p>`;
    } else if (imagePayload.svg) {
      formattedHtml += `<div style="text-align: center; margin: 10px 0 14px 0; max-width: 100%; overflow-x: auto;">${imagePayload.svg}</div>`;
    }
  } else if (typeof imagePayload === "string" && imagePayload.startsWith("data:image")) {
    formattedHtml += `<p style="text-align: center; margin: 10px 0 14px 0;"><img src="${imagePayload}" alt="Ilustrasi Asesmen" style="max-width: 100%; max-height: 400px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); display: inline-block;" /></p>`;
  }

  const pStyleAttr = scriptMeta.extraStyle ? ` style="${scriptMeta.extraStyle}"` : "";
  const hasHtmlTags = /<\/?(?:table|tr|th|td|img|sub|sup|span|p|div|b|i|u|br|strong|em)\b/i.test(text);

  if (hasHtmlTags) {
    if (text.includes('<table')) {
      formattedHtml += text.replace(/\n/g, '<br>').replace(/<br>\s*(<(?:tbody|thead|tr|th|td|table|\/table|\/tbody|\/thead)\b)/gi, '$1').replace(/(<\/(?:tr|th|td|table|tbody|thead)>)\s*<br>/gi, '$1');
    } else {
      formattedHtml += `<p dir="${scriptMeta.dir}"${pStyleAttr}>${text.replace(/\n/g, '<br>')}</p>`;
    }
  } else {
    formattedHtml += `<p dir="${scriptMeta.dir}"${pStyleAttr}>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }
  body.innerHTML = formattedHtml;

  // Memicu event agar internal state Afresto / TinyMCE mendeteksi perubahan data
  body.dispatchEvent(new Event('input', { bubbles: true }));
  body.dispatchEvent(new Event('change', { bubbles: true }));
  body.dispatchEvent(new Event('blur', { bubbles: true }));

  // Sinkronkan juga ke textarea tersembunyi form jika ada (misal #pertanyaan atau #pilihan-a)
  try {
    const rawId = iframe.id ? iframe.id.replace(/_ifr$/, '') : null;
    if (rawId) {
      const textarea = document.getElementById(rawId);
      if (textarea) {
        textarea.value = formattedHtml;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  } catch (_) {}

  // Pasang auto-sync real-time ke textarea agar saat guru mengetik/mengubah manual, textarea tersembunyi langsung ter-update
  if (!body._hasAfrestoSyncListener) {
    body._hasAfrestoSyncListener = true;
    const syncToTextarea = () => {
      try {
        const rawId = iframe.id ? iframe.id.replace(/_ifr$/, '') : null;
        if (rawId) {
          const textarea = document.getElementById(rawId);
          if (textarea) {
            textarea.value = body.innerHTML;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      } catch (_) {}
    };
    body.addEventListener('input', syncToTextarea);
    body.addEventListener('keyup', syncToTextarea);
    body.addEventListener('paste', syncToTextarea);
    body.addEventListener('change', syncToTextarea);
    body.addEventListener('blur', syncToTextarea);
  }
}

/**
 * Sinkronkan seluruh konten iframe TinyMCE yang ada di halaman ke textarea tersembunyi
 * Memastikan tidak ada alert 'opsi belum diisi' baik saat auto inject maupun saat guru input manual
 */
function syncAllTinyMceToTextareas() {
  try {
    const iframes = document.querySelectorAll('iframe[id$="_ifr"]');
    iframes.forEach(iframe => {
      const rawId = iframe.id ? iframe.id.replace(/_ifr$/, '') : null;
      if (!rawId) return;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      const textarea = document.getElementById(rawId);
      if (doc && doc.body && textarea) {
        textarea.disabled = false;
        textarea.removeAttribute('disabled');
        textarea.value = doc.body.innerHTML;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    if (typeof window !== 'undefined' && window.tinyMCE && typeof window.tinyMCE.triggerSave === 'function') {
      window.tinyMCE.triggerSave();
    }
  } catch (_) {}
}

// Pasang capture listener global pada window agar tombol Simpan / Submit selalu memicu sinkronisasi TinyMCE
if (typeof window !== 'undefined' && !window._afrestoSyncHandlerAttached) {
  window._afrestoSyncHandlerAttached = true;
  window.addEventListener('click', (e) => {
    const target = e.target;
    if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.classList?.contains('btn'))) {
      const text = (target.textContent || target.value || '').toLowerCase();
      if (text.includes('simpan') || text.includes('tambah') || text.includes('submit')) {
        syncAllTinyMceToTextareas();
      }
    }
  }, true);
}

// ------------------------------------------------------------------------
// 2. PERGANTIAN TIPE SOAL (#akf-type-grid)
// ------------------------------------------------------------------------

async function switchQuestionType(targetType) {
  const typeGrid = document.querySelector('#akf-type-grid');
  if (!typeGrid) return;

  let labelToFind = "";
  switch (targetType) {
    case "PG":
      labelToFind = "Pilihan Ganda";
      break;
    case "PG_KOMPLEKS":
      labelToFind = "PG Kompleks";
      break;
    case "BENAR_SALAH":
      labelToFind = "Benar / Salah";
      break;
    case "MENCOCOKKAN":
      labelToFind = "Mencocokkan";
      break;
    case "ISIAN":
      labelToFind = "Isian Singkat";
      break;
    case "URAIAN":
      labelToFind = "Uraian";
      break;
  }

  // Cari kartu tipe soal langsung dari .akf-type-card di dalam #akf-type-grid
  const cards = Array.from(typeGrid.querySelectorAll('.akf-type-card, div'));
  const targetCard = cards.find(c => {
    const lbl = c.querySelector('.akf-type-lbl');
    const text = (lbl ? lbl.textContent : c.textContent).trim().toLowerCase();
    return text.includes(labelToFind.toLowerCase());
  });

  if (targetCard) {
    // Di Afresto, kartu aktif ditandai secara presisi dengan class 'akf-type-selected'
    if (targetCard.classList.contains('akf-type-selected')) {
      return; // Sudah aktif, tidak perlu re-trigger klik
    }

    targetCard.click();
    await sleep(500); // Beri waktu UI Afresto untuk merender field tipe terkait
  }
}

// ------------------------------------------------------------------------
// 3. INJEKTOR PER BUTIR SOAL
// ------------------------------------------------------------------------

async function injectSingleQuestion(soal) {
  if (isExecutionHalted) throw new Error("Injeksi dibatalkan.");

  // 1. Samakan Tipe Soal
  if (soal.tipe) {
    await switchQuestionType(soal.tipe);
  }

  // 2. Isi Teks Pertanyaan & Ilustrasi Gambar jika ada
  const imagePayload = {
    base64: soal.gambar_base64 || null,
    url: soal.gambar_url || null,
    svg: soal.gambar_svg || null
  };
  await setTinyMceContent('#pertanyaan_ifr', soal.pertanyaan, imagePayload);

  // 3. Penanganan Khusus Berdasarkan Tipe Soal
  if (soal.tipe === "PG") {
    // 1. Set jumlah opsi ke 5 (atau 4 jika butir soal terdeteksi hanya 4 opsi) jika ada dropdown #pilihan_jml (CSP-Safe)
    const selectJml = document.getElementById('pilihan_jml') || document.querySelector('select[name="pilihan_jml"], select#pilihan_jml');
    const optCount = Object.keys(soal.opsi || {}).length;
    const targetJml = (optCount === 4) ? '4' : '5';
    const targetCount = parseInt(targetJml, 10);
    if (selectJml) {
      const matchOpt = Array.from(selectJml.options || []).find(o => o.value === targetJml || o.value.includes(targetJml) || o.text.includes(targetJml));
      if (matchOpt) {
        selectJml.value = matchOpt.value;
        Array.from(selectJml.options || []).forEach(o => o.selected = (o === matchOpt));
      } else {
        selectJml.value = targetJml;
      }
      selectJml.dispatchEvent(new Event('input', { bubbles: true }));
      selectJml.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Pastikan seluruh kontainer opsi A s.d. E aktif, terlihat, dan atribut disabled dihapus total
    for (let i = 0; i < 12; i++) {
      const label = String.fromCharCode(97 + i);
      const card = document.getElementById(`opsi-${label}`);
      if (card) {
        if (i < targetCount) {
          card.style.display = 'block';
          card.querySelectorAll('input, select, textarea, button').forEach(el => {
            el.disabled = false;
            el.removeAttribute('disabled');
          });
        } else {
          card.style.display = 'none';
        }
      }
    }
    await sleep(250);

    // 2. Isi Opsi A s.d. E (Dual-Write: Textarea Asli + TinyMCE Iframe)
    const opsiKeys = targetCount === 4 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd', 'e'];
    for (const k of opsiKeys) {
      const upper = k.toUpperCase();
      const text = soal.opsi?.[upper] || "";
      // Tulis langsung ke textarea underlying sebagai jaring pengaman utama saat form submit
      const textarea = document.getElementById(`pilihan-${k}`) ||
                       document.getElementById(`pilihan_${k}`) ||
                       document.querySelector(`textarea[name="pilihan[${k}]"]`) ||
                       document.querySelector(`textarea[name="pilihan_${k}"]`);
      if (textarea) {
        textarea.disabled = false;
        textarea.removeAttribute('disabled');
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const iframe = findEditorIframe(`pilihan-${k}`);
      if (iframe) {
        await setTinyMceContent(iframe, text);
      }
    }

    // 3. Pilih Kunci Jawaban PG (Direct DOM & 100% CSP-Safe)
    await sleep(250);
    let keyLetter = 'a';
    if (soal.kunci) {
      const m = soal.kunci.toString().match(/[A-Ea-e]/);
      if (m) keyLetter = m[0].toLowerCase();
    }

    // Pastikan kartu opsi kunci terlihat dan aktif
    const targetCard = document.getElementById(`opsi-${keyLetter}`);
    if (targetCard) {
      targetCard.style.display = 'block';
      targetCard.querySelectorAll('input, select, textarea').forEach(el => {
        el.disabled = false;
        el.removeAttribute('disabled');
      });
    }

    // Centang input radio asli Afresto secara langsung (hapus disabled agar ikut terkirim di POST)
    const radioBtn = document.getElementById(`kunci-${keyLetter}`) ||
                     document.querySelector(`input[name="kunci"][value="${keyLetter}"]`) ||
                     document.querySelector(`input[name="kunci"][value="${keyLetter.toUpperCase()}"]`);
    if (radioBtn) {
      radioBtn.disabled = false;
      radioBtn.removeAttribute('disabled');
      radioBtn.checked = true;
      radioBtn.dispatchEvent(new Event('input', { bubbles: true }));
      radioBtn.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Terapkan visual state Afresto (seperti fungsi internal _pgState)
    opsiKeys.forEach(l => {
      const card = document.getElementById(`opsi-${l}`);
      if (card) {
        card.classList.remove('pg-neutral', 'pg-kunci', 'pg-salah');
        card.classList.add(l === keyLetter ? 'pg-kunci' : 'pg-salah');
      }
    });

    // 4. JARING PENGAMAN TIER-3 FORM LEVEL: Pastikan input hidden 'kunci' & 'pilihan_jml' terpasang di form
    const radioEl = document.querySelector('input[name="kunci"]');
    const targetForm = (radioEl && radioEl.form) || document.querySelector('form[action*="kbm/evaluasi_akm_soal"]');
    if (targetForm) {
      let hiddenKunci = targetForm.querySelector('input[type="hidden"]#afresto_injected_kunci');
      if (!hiddenKunci) {
        hiddenKunci = document.createElement('input');
        hiddenKunci.type = 'hidden';
        hiddenKunci.id = 'afresto_injected_kunci';
        hiddenKunci.name = 'kunci';
        targetForm.appendChild(hiddenKunci);
      }
      hiddenKunci.value = keyLetter;

      let hiddenJml = targetForm.querySelector('input[type="hidden"]#afresto_injected_pilihan_jml');
      if (!hiddenJml) {
        hiddenJml = document.createElement('input');
        hiddenJml.type = 'hidden';
        hiddenJml.id = 'afresto_injected_pilihan_jml';
        hiddenJml.name = 'pilihan_jml';
        targetForm.appendChild(hiddenJml);
      }
      hiddenJml.value = targetJml;
    }

    // 5. PRE-SUBMISSION INTEGRITY GUARD: Validasi kesiapan sebelum submit
    const isRadioChecked = radioBtn ? radioBtn.checked : false;
    const anyChecked = document.querySelector('input[name="kunci"]:checked');
    if (!isRadioChecked && !anyChecked) {
      throw new Error(`Kunci jawaban [${keyLetter.toUpperCase()}] belum terpilih di formulir Afresto. Opsi pilihan tidak mencukupi atau radio kunci tidak ditemukan.`);
    }

    // 6. Sinkronkan seluruh konten TinyMCE ke textarea form Afresto
    syncAllTinyMceToTextareas();
  } 
  else if (soal.tipe === "PG_KOMPLEKS") {
    // 1. Set jumlah opsi ke 5
    const selectJml = document.getElementById('pilihan_jml');
    const optCount = Object.keys(soal.opsi || {}).length;
    const targetJml = (optCount === 4) ? '4' : '5';
    const targetCount = parseInt(targetJml, 10);
    if (selectJml) {
      selectJml.value = targetJml;
      for (let i = 0; i < 12; i++) {
        const label = String.fromCharCode(97 + i);
        const card = document.getElementById(`opsi-${label}`);
        if (card) card.style.display = (i < targetCount) ? 'block' : 'none';
      }
      selectJml.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(250);
    }

    // 2. Isi Opsi A s.d. E
    const opsiKeys = targetCount === 4 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd', 'e'];
    for (const k of opsiKeys) {
      const upper = k.toUpperCase();
      const text = soal.opsi?.[upper] || "";
      if (document.querySelector(`#pilihan-${k}_ifr`)) {
        await setTinyMceContent(`#pilihan-${k}_ifr`, text);
      }
    }

    // 3. Pilih Multi-Kunci (Direct DOM & 100% CSP-Safe)
    await sleep(250);
    const keysArray = Array.isArray(soal.kunci) ? soal.kunci : [soal.kunci];
    const targetLetters = keysArray.map(k => {
      const m = k.toString().match(/[A-Ea-e]/);
      return m ? m[0].toLowerCase() : null;
    }).filter(Boolean);

    opsiKeys.forEach(l => {
      const isCorrect = targetLetters.includes(l);
      const chk = document.getElementById(`kunci_tingkat-${l}`);
      if (chk) {
        chk.checked = isCorrect;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const card = document.getElementById(`opsi-${l}`);
      if (card) {
        card.classList.remove('pg-neutral', 'pg-kunci', 'pg-salah');
        card.classList.add(isCorrect ? 'pg-kunci' : 'pg-salah');
      }
    });

    // 4. Sinkronkan seluruh konten TinyMCE ke textarea form Afresto
    syncAllTinyMceToTextareas();
  } 
  else if (soal.tipe === "BENAR_SALAH") {
    // 1. Tentukan jumlah opsi pernyataan berdasarkan data soal (default 4 atau panjang opsi)
    const targetCount = Math.max(2, Object.keys(soal.opsi || {}).length || 4);
    const selectJml = document.getElementById('pilihan_jml');
    if (selectJml) {
      selectJml.value = String(targetCount);
      for (let i = 0; i < 12; i++) {
        const label = String.fromCharCode(97 + i);
        const card = document.getElementById(`opsi-${label}`);
        if (card) card.style.display = (i < targetCount) ? 'block' : 'none';
        const fieldBs = document.getElementById(`field_kunci_benar_salah-${label}`);
        if (fieldBs) fieldBs.style.display = (i < targetCount) ? 'block' : 'none';
      }
      selectJml.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(350);
    }

    // 2. Isi Pernyataan (A, B, C, D, dst)
    const opsiKeys = ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, targetCount);
    for (const k of opsiKeys) {
      const upper = k.toUpperCase();
      const text = soal.opsi?.[upper];
      if (text && document.querySelector(`#pilihan-${k}_ifr`)) {
        await setTinyMceContent(`#pilihan-${k}_ifr`, text);
      }
    }

    // 3. Set Status Benar/Salah (Direct Hidden Input & 100% CSP-Safe)
    await sleep(250);
    if (typeof soal.kunci === "object") {
      for (const [key, status] of Object.entries(soal.kunci)) {
        const m = key.match(/[A-Fa-f]/);
        if (!m) continue;
        const kLower = m[0].toLowerCase();
        const isBenar = status.toString().toLowerCase().includes('benar') || status === true || status === 1;

        // Set hidden input native Afresto: 1 = Benar, 2 = Salah
        const hiddenInput = document.getElementById(`kunci_benar_salah-${kLower}`);
        if (hiddenInput) {
          hiddenInput.value = isBenar ? "1" : "2";
          hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Update styling visual tombol aktif
        const btnBenar = document.querySelector(`#field_kunci_benar_salah-${kLower} .pg-bs-benar`);
        const btnSalah = document.querySelector(`#field_kunci_benar_salah-${kLower} .pg-bs-salah`);
        if (btnBenar && btnSalah) {
          if (isBenar) {
            btnBenar.classList.add('pg-bs-active');
            btnSalah.classList.remove('pg-bs-active');
          } else {
            btnSalah.classList.add('pg-bs-active');
            btnBenar.classList.remove('pg-bs-active');
          }
        }
      }
    }
  } 
  else if (soal.tipe === "MENCOCOKKAN") {
    await sleep(350);
    const pairs = Array.isArray(soal.pasangan) ? soal.pasangan : [];
    const count = pairs.length > 0 ? pairs.length : 2;

    // 1. Sinkronkan jumlah pilihan kiri dan kanan Afresto
    const selKiri = document.getElementById('pilihan_jml_kiri');
    if (selKiri) {
      selKiri.value = String(count);
      for (let i = 1; i <= 12; i++) {
        const el = document.getElementById(`opsi-kiri${i}`);
        if (el) el.style.display = (i <= count) ? '' : 'none';
      }
      selKiri.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const selKanan = document.getElementById('pilihan_jml_kanan');
    if (selKanan) {
      selKanan.value = String(count);
      for (let i = 0; i < 12; i++) {
        const label = String.fromCharCode(97 + i);
        const el = document.getElementById(`opsi-kanan${label}`);
        if (el) el.style.display = (i < count) ? '' : 'none';
      }
      selKanan.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Beri jeda agar fungsi native Afresto change_kunci selesai mengisi opsi dropdown id-jodoh
    await sleep(400);

    // 2. Tulis konten teks ke TinyMCE Editor Kiri dan Kanan, serta set dropdown Kunci Jawaban
    for (let i = 0; i < count; i++) {
      const num = i + 1; // 1, 2, 3...
      const letter = String.fromCharCode(97 + i); // a, b, c...
      const pair = pairs[i] || {};

      // Isi editor premis (Kiri)
      if (pair.kiri && document.querySelector(`#pilihan-kiri-${num}_ifr`)) {
        await setTinyMceContent(`#pilihan-kiri-${num}_ifr`, pair.kiri);
      }

      // Isi editor respon/jawaban (Kanan)
      if (pair.kanan && document.querySelector(`#pilihan-kanan-${letter}_ifr`)) {
        await setTinyMceContent(`#pilihan-kanan-${letter}_ifr`, pair.kanan);
      }

      // Set Kunci Jawaban Jodoh (Dropdown: id-jodoh-1 -> 'a', id-jodoh-2 -> 'b', dst)
      const selJodoh = document.getElementById(`id-jodoh-${num}`);
      if (selJodoh) {
        // Jika soal memiliki pemetaan kunci khusus, gunakan; jika default berurutan: pair 1 -> opsi A ('a')
        let targetKey = letter;
        if (soal.kunci && typeof soal.kunci === 'object' && soal.kunci[num]) {
          targetKey = String(soal.kunci[num]).trim().toLowerCase();
        }
        selJodoh.value = targetKey;
        selJodoh.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
  else if (soal.tipe === "ISIAN") {
    await sleep(200);
    const keys = Array.isArray(soal.kunci) ? soal.kunci : [soal.kunci];
    
    // Cari input kunci isian ke 1, 2, dst
    keys.forEach((val, idx) => {
      const num = idx + 1;
      const input = document.getElementById(`kunci_isian${num}`) ||
                    document.querySelector(`input[name="kunci_isian${num}"], input[name*="kunci_isian"][name*="${num}"]`) ||
                    document.querySelector(`input[aria-label*="kunci isian ke ${num}"], input[placeholder*="kunci isian ke ${num}"]`);
      if (input) {
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
  // Tipe URAIAN hanya butuh teks pertanyaan (sudah diisi di atas)

  return true;
}

// ------------------------------------------------------------------------
// 4. BATCH INJECTION LOOP (SIMPAN & SOAL BERIKUTNYA)
// ------------------------------------------------------------------------

async function runBatchInjection(questionsList, onProgress) {
  isExecutionHalted = false;
  const total = questionsList.length;

  for (let i = 0; i < total; i++) {
    if (isExecutionHalted) {
      onProgress({ status: "HALTED", current: i, total, message: "Proses dibatalkan." });
      return;
    }

    const currentSoal = questionsList[i];
    const currentIndex = i + 1;
    const isLast = (currentIndex === total);

    onProgress({
      status: "INJECTING",
      current: currentIndex,
      total,
      tipe: currentSoal.tipe,
      message: `Mengisi soal #${currentIndex} (${currentSoal.tipe})...`
    });

    // 1. Suntikkan Butir Soal ke Halaman
    await injectSingleQuestion(currentSoal);
    await sleep(500);

    // Pastikan seluruh iframe TinyMCE tersinkronisasi ke textarea form sebelum klik Simpan
    syncAllTinyMceToTextareas();

    // 2. Simpan dan Transisi
    if (!isLast) {
      onProgress({
        status: "SAVING",
        current: currentIndex,
        total,
        message: `Menyimpan soal #${currentIndex} & memuat form berikutnya...`
      });

      // Cari tombol 'Simpan & Soal Berikutnya'
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const nextBtn = buttons.find(b => b.textContent.includes('Simpan & Soal Berikutnya'));

      if (!nextBtn) {
        throw new Error("Tombol 'Simpan & Soal Berikutnya' tidak ditemukan di halaman!");
      }

      syncAllTinyMceToTextareas();
      nextBtn.click();

      // Notifikasi bahwa butir soal ini telah tersimpan di Afresto
      onProgress({
        status: "ITEM_SAVED",
        current: currentIndex,
        total,
        soalId: currentSoal.id,
        message: `Soal #${currentIndex} (${currentSoal.tipe}) berhasil disimpan di Afresto!`
      });

      // 3. Dynamic Readiness Handshake: Tunggu transisi selesai dan editor pertanyaan kosong / siap lagi
      await sleep(1500); // Buffer awal penyimpanan AJAX
      await waitForEditorReady('#pertanyaan_ifr', 15000);
      await sleep(300);
    } else {
      // Soal Terakhir: Klik Simpan Biasa jika ada
      onProgress({
        status: "FINALIZING",
        current: currentIndex,
        total,
        message: `Menyimpan soal terakhir (#${currentIndex})...`
      });

      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const saveBtn = buttons.find(b => b.textContent.trim() === 'Simpan' || b.textContent.includes('Simpan Soal'));
      if (saveBtn) {
        syncAllTinyMceToTextareas();
        saveBtn.click();
      }

      // Notifikasi bahwa butir soal terakhir berhasil disimpan
      onProgress({
        status: "ITEM_SAVED",
        current: currentIndex,
        total,
        soalId: currentSoal.id,
        message: `Soal #${currentIndex} (${currentSoal.tipe}) berhasil disimpan di Afresto!`
      });
    }
  }

  onProgress({
    status: "COMPLETED",
    current: total,
    total,
    message: `Semua ${total} soal berhasil diinputkan ke Afresto!`
  });
}

// ------------------------------------------------------------------------
// 4.6. INJEKSI FORM MATERI & BAHAN AJAR AFRESTO (FROALA + DOM UNIVERSAL)
// ------------------------------------------------------------------------

async function injectLearningMaterial(data) {
  if (!data) throw new Error("Data materi kosong.");

  let injectedElements = [];

  // 1. INJEKSI JUDUL MATERI (Multi-Selector Fallback)
  const inputTitle = document.querySelector('input[placeholder*="nama / judul" i]') ||
                     document.querySelector('input[placeholder*="judul materi" i]') ||
                     document.querySelector('input[placeholder*="judul" i]') ||
                     document.getElementById('nama') ||
                     document.querySelector('input[name="nama"]') ||
                     document.getElementById('judul') ||
                     document.querySelector('input[name="judul"]') ||
                     document.querySelector('input[name="nama_materi"]') ||
                     document.querySelector('input[name="title"]') ||
                     document.querySelector('input[placeholder*="Nama" i]');

  if (inputTitle && data.judul) {
    inputTitle.focus();
    inputTitle.value = data.judul;
    inputTitle.dispatchEvent(new Event('input', { bubbles: true }));
    inputTitle.dispatchEvent(new Event('change', { bubbles: true }));
    inputTitle.blur();
    injectedElements.push("Judul Materi");
  }

  // 2. BUKA EDITOR ARTIKEL JIKA BELUM TERBUKA
  const btnKetik = Array.from(document.querySelectorAll('button, a, .btn, span, div')).find(el => {
    const t = (el.textContent || "").trim().toLowerCase();
    return t.includes('ketik isi artikel') || t.includes('buka editor');
  });

  const artikelSection = btnKetik?.closest('section, div, .card, .form-group') || 
                         Array.from(document.querySelectorAll('section, div, .card, .form-group')).find(s => {
                           const txt = (s.textContent || "").toLowerCase();
                           return txt.includes('artikel materi') || txt.includes('ketik isi artikel');
                         });

  let kontenFr = artikelSection ? artikelSection.querySelector('.fr-element, .fr-view') : null;

  // Jika tombol Ketik Isi Artikel ada dan editor khusus artikel belum ada di dalam bloknya, klik tombolnya!
  if (btnKetik && !kontenFr) {
    try {
      btnKetik.click();
      await sleep(400);
    } catch (e) {}
  }

  // 3. INJEKSI KONTEN ARTIKEL (FROALA / TINYMCE / TEXTAREA)
  const kontenSuccess = setRichTextEditorValue('konten', data.konten);
  if (kontenSuccess) injectedElements.push("Konten Artikel");

  // 4. PENUGASAN CHECKBOX (#penugasan / 'TAMBAH PENUGASAN')
  const checkPenugasan = document.getElementById('penugasan') || 
                         document.querySelector('input[name="penugasan"]') ||
                         document.querySelector('input[name*="tugas"]') ||
                         Array.from(document.querySelectorAll('input[type="checkbox"]')).find(cb => {
                           const parent = cb.closest('div, tr, label, .form-group') || cb.parentElement;
                           return parent?.textContent?.toLowerCase().includes('penugasan');
                         });

  if (checkPenugasan) {
    const shouldCheck = Boolean(data.denganPenugasan || (data.pertanyaan && data.pertanyaan.trim().length > 0));
    if (checkPenugasan.checked !== shouldCheck) {
      checkPenugasan.checked = shouldCheck;
      checkPenugasan.dispatchEvent(new Event('change', { bubbles: true }));
      checkPenugasan.dispatchEvent(new Event('click', { bubbles: true }));
      await sleep(350);
    }
  }

  // 5. INJEKSI PERTANYAAN TUGAS SISWA (DIFORMAT RAPI DENGAN DAFTAR BERURUTAN & KODE TER-ESCAPE)
  if (data.pertanyaan && data.pertanyaan.trim().length > 0) {
    const formattedQuestions = formatQuestionsAsHtml(data.pertanyaan);
    const tugasSuccess = setRichTextEditorValue('pertanyaan', formattedQuestions);
    if (tugasSuccess) injectedElements.push("Pertanyaan Tugas");
  }

  // 6. AKSES ROMBEL GLOBAL (#ikut_global)
  const checkIkutGlobal = document.getElementById('ikut_global') || document.querySelector('input[name="ikut_global"]');
  if (checkIkutGlobal && data.ikutGlobal !== false) {
    checkIkutGlobal.checked = true;
    checkIkutGlobal.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 7. JADWAL MATERI MULAI
  const inputMulai = document.getElementById('materi_mulai_global') || 
                     document.querySelector('input[name="materi_mulai_global"]') ||
                     document.getElementById('materi_mulai') || 
                     document.querySelector('input[name="materi_mulai"]');
  if (inputMulai && data.materiMulai) {
    inputMulai.value = data.materiMulai;
    inputMulai.dispatchEvent(new Event('input', { bubbles: true }));
    inputMulai.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 8. JADWAL MATERI DITUTUP
  const inputTutup = document.getElementById('materi_ditutup_global') || 
                     document.querySelector('input[name="materi_ditutup_global"]') ||
                     document.getElementById('materi_ditutup') || 
                     document.querySelector('input[name="materi_ditutup"]');
  if (inputTutup) {
    inputTutup.value = data.materiDitutup || "";
    inputTutup.dispatchEvent(new Event('input', { bubbles: true }));
    inputTutup.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 9. BATAS PENUGASAN
  const inputLimit = document.getElementById('limit_penugasan_global') || 
                     document.querySelector('input[name="limit_penugasan_global"]') ||
                     document.getElementById('limit_penugasan') || 
                     document.querySelector('input[name="limit_penugasan"]');
  if (inputLimit && data.limitPenugasan) {
    inputLimit.value = data.limitPenugasan;
    inputLimit.dispatchEvent(new Event('input', { bubbles: true }));
    inputLimit.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Visual highlight efek pada form agar guru melihat perubahan langsung di halaman Afresto
  const targetHighlight = document.querySelector('.fr-element, #konten, input[name="nama"], #nama, input[name="judul"]');
  if (targetHighlight) {
    targetHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetHighlight.style.transition = 'box-shadow 0.3s ease';
    targetHighlight.style.boxShadow = '0 0 0 4px #10b981';
    setTimeout(() => {
      targetHighlight.style.boxShadow = '';
    }, 2500);
  }

  return {
    success: true,
    injectedElements,
    judul: data.judul,
    materiMulai: data.materiMulai,
    limitPenugasan: data.limitPenugasan
  };
}

/**
 * Memformat teks pertanyaan tugas menjadi HTML rapi, berurutan, dan aman dari tag koding
 */
function formatQuestionsAsHtml(rawText) {
  if (!rawText) return "";

  // Pecah pertanyaan berdasarkan nomor (1., 2., 3., dst.)
  const regex = /(?:^|\n|\s*)([1-9]\d*[\.\)])\s*([\s\S]*?)(?=(?:\n\s*[1-9]\d*[\.\)]|\s+[1-9]\d*[\.\)]|$))/g;
  const items = [];
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const num = match[1];
    const text = match[2].trim();
    if (text) {
      items.push({ num, text });
    }
  }

  if (items.length > 0) {
    const listHtml = items.map(it => {
      // Escape tag HTML seperti <article>, <div>, <h1>, </tag> agar tampil sebagai teks kode yang aman dan terbaca
      const escaped = it.text
        .replace(/&/g, '&amp;')
        .replace(/<(\/?[a-zA-Z0-9_-]+)>/g, '<code>&lt;$1&gt;</code>');
      return `<li style="margin-bottom: 12px; font-size: 14px; line-height: 1.6; color: #1e293b; font-weight: normal;">${escaped}</li>`;
    }).join('\n');

    return `<ol style="margin: 0; padding-left: 22px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; color: #1e293b;">\n${listHtml}\n</ol>`;
  }

  // Fallback jika tidak terdeteksi penomoran
  const escaped = rawText
    .replace(/&/g, '&amp;')
    .replace(/<(\/?[a-zA-Z0-9_-]+)>/g, '<code>&lt;$1&gt;</code>')
    .replace(/\n/g, '<br>');
  return `<p style="font-size: 14px; line-height: 1.6; color: #1e293b; margin: 0;">${escaped}</p>`;
}

/**
 * Injektor Universal untuk Editor Konten & Tugas (Mendukung Froala, TinyMCE, Summernote, ContentEditable, dan Textarea)
 */
function setRichTextEditorValue(targetType, htmlContent) {
  if (!htmlContent) return false;

  let injected = false;

  // A. FROALA EDITOR (.fr-element / contenteditable)
  const frElements = Array.from(document.querySelectorAll('.fr-element, .fr-view[contenteditable="true"]'));
  if (frElements.length > 0) {
    let targetFr = null;
    if (targetType === 'konten') {
      // Prioritaskan fr-element di dalam kontainer 'artikel materi'
      targetFr = frElements.find(el => {
        const parentText = (el.closest('section, div, .form-group, .card')?.textContent || "").toLowerCase();
        return (parentText.includes('artikel') || parentText.includes('isi')) && !parentText.includes('pertanyaan untuk siswa');
      }) || frElements[0];
    } else if (targetType === 'pertanyaan') {
      // Prioritaskan fr-element di dalam kontainer 'pertanyaan' atau 'tugas'
      targetFr = frElements.find(el => {
        const parentText = (el.closest('section, div, .form-group, .card')?.textContent || "").toLowerCase();
        return parentText.includes('pertanyaan') || parentText.includes('tugas');
      }) || (frElements.length > 1 ? frElements[frElements.length - 1] : frElements[0]);
    }

    if (targetFr) {
      targetFr.focus();
      // Reset styling abnormal
      targetFr.style.fontSize = "14px";
      targetFr.style.lineHeight = "1.6";
      targetFr.style.fontWeight = "normal";
      targetFr.style.color = "#1e293b";

      targetFr.innerHTML = htmlContent;
      targetFr.classList.remove('fr-placeholder');

      const frBox = targetFr.closest('.fr-box') || targetFr.parentElement;
      if (frBox) {
        // Sembunyikan placeholder bawaan Froala
        frBox.querySelectorAll('.fr-placeholder').forEach(p => {
          p.style.display = 'none';
        });

        // Hitung ulang karakter untuk counter Froala
        const counter = frBox.querySelector('.fr-counter, [class*="counter"]');
        if (counter) {
          const charLen = targetFr.textContent?.length || 0;
          counter.textContent = `Characters : ${charLen}`;
        }

        // Sinkronisasi ke hidden textarea terdekat di dalam form
        const nearbyTextarea = frBox.parentElement?.querySelector('textarea') || 
                               frBox.querySelector('textarea') ||
                               frBox.previousElementSibling;
        if (nearbyTextarea && nearbyTextarea.tagName === 'TEXTAREA') {
          nearbyTextarea.value = htmlContent;
          nearbyTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          nearbyTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      targetFr.dispatchEvent(new Event('input', { bubbles: true }));
      targetFr.dispatchEvent(new Event('change', { bubbles: true }));
      targetFr.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));
      targetFr.blur();
      injected = true;
    }
  }

  // B. TINYMCE IFRAME (Jika halaman menggunakan TinyMCE)
  const iframe = findEditorIframe(targetType);
  if (iframe) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        doc.body.innerHTML = htmlContent;
        doc.body.dispatchEvent(new Event('input', { bubbles: true }));
        doc.body.dispatchEvent(new Event('change', { bubbles: true }));
        injected = true;
      }
    } catch (e) {}
  }

  // C. SUMMERNOTE EDITOR (.note-editable)
  const noteEditables = Array.from(document.querySelectorAll('.note-editable'));
  if (noteEditables.length > 0) {
    const targetNote = (targetType === 'konten') ? noteEditables[0] : (noteEditables[1] || noteEditables[0]);
    if (targetNote) {
      targetNote.innerHTML = htmlContent;
      targetNote.dispatchEvent(new Event('input', { bubbles: true }));
      targetNote.dispatchEvent(new Event('change', { bubbles: true }));
      injected = true;
    }
  }

  // D. TEXTAREA FORM STANDAR (Fallback & Sinkronisasi Cadangan)
  const selector = (targetType === 'konten')
    ? '#konten, textarea[name="konten"], textarea[name="isi"], textarea[name="artikel"], #isi'
    : '#pertanyaan, textarea[name="pertanyaan"], textarea[name="tugas"]';
  
  const textareas = Array.from(document.querySelectorAll(selector));
  textareas.forEach(t => {
    t.value = htmlContent;
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.dispatchEvent(new Event('change', { bubbles: true }));
    injected = true;
  });

  return injected;
}

// ------------------------------------------------------------------------
// 5. MESSAGE LISTENER DARI SIDE PANEL
// ------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "CHECK_PAGE_STATUS") {
    const isSoal = checkIsQuestionPage();
    const isMateri = checkIsMateriPage();
    const detected = detectAcademicInfoFromPage();
    const alertDanger = document.querySelector('.alert-danger, .alert-error, .alert-warning')?.textContent?.trim() || null;
    const countMatch = document.body?.innerText?.match(/Soal tersimpan saat ini ::\s*(\d+)/i);
    const savedCount = countMatch ? parseInt(countMatch[1]) : null;
    sendResponse({ 
      isSoalPage: isSoal, 
      isMateriPage: isMateri,
      url: window.location.href, 
      detectedAcademic: detected,
      pageAlert: alertDanger,
      savedCount: savedCount
    });
  } 
  else if (message.action === "SYNC_ACADEMIC_INFO") {
    const detected = detectAcademicInfoFromPage();
    sendResponse({ success: Boolean(detected && detected.mapel), detected });
  } 
  else if (message.action === "INJECT_MATERI") {
    injectLearningMaterial(message.data)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  else if (message.action === "INJECT_SINGLE") {
    injectSingleQuestion(message.soal)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  } 
  else if (message.action === "INJECT_SINGLE_AND_SUBMIT") {
    const { soal, isLast } = message;
    injectSingleQuestion(soal)
      .then(async () => {
        await sleep(500);

        // 1. Temukan form evaluasi soal yang valid (hindari form eperangkat SSO)
        const radio = document.querySelector('input[name="kunci"]');
        const form = (radio && radio.form) || document.querySelector('form[action*="kbm/evaluasi_akm_soal"]');

        // 2. Jaring Pengaman Ekstra Kunci & Pilihan Jml pada Form Level
        if (form && soal.tipe === "PG") {
          let keyLetter = 'a';
          if (soal.kunci) {
            const m = soal.kunci.toString().match(/[A-Ea-e]/);
            if (m) keyLetter = m[0].toLowerCase();
          }
          const targetJml = (Object.keys(soal.opsi || {}).length === 4) ? '4' : '5';

          let inputKunci = form.querySelector('input[type="hidden"]#afresto_injected_kunci');
          if (!inputKunci) {
            inputKunci = document.createElement('input');
            inputKunci.type = 'hidden';
            inputKunci.id = 'afresto_injected_kunci';
            inputKunci.name = 'kunci';
            form.appendChild(inputKunci);
          }
          inputKunci.value = keyLetter;

          let inputJml = form.querySelector('input[type="hidden"]#afresto_injected_pilihan_jml');
          if (!inputJml) {
            inputJml = document.createElement('input');
            inputJml.type = 'hidden';
            inputJml.id = 'afresto_injected_pilihan_jml';
            inputJml.name = 'pilihan_jml';
            form.appendChild(inputJml);
          }
          inputJml.value = targetJml;
        }

        // 3. Pastikan input hidden 'tambah' terpasang agar backend Afresto menerima POST['tambah']
        if (!isLast && form) {
          let inputTambah = form.querySelector('input[name="tambah"]');
          if (!inputTambah) {
            inputTambah = document.createElement('input');
            inputTambah.type = 'hidden';
            inputTambah.name = 'tambah';
            inputTambah.value = 'true';
            form.appendChild(inputTambah);
          }
        }

        // 3. Kirim respon sukses ke Sidepanel SEBELUM submit form agar message channel aman
        sendResponse({ success: true, soalId: soal.id });

        await sleep(400);

        // 4. Klik tombol simpan native Afresto (sinkronkan editor TinyMCE terlebih dahulu)
        syncAllTinyMceToTextareas();
        if (!isLast) {
          const nextBtn = document.querySelector('button[name="tambah"]') ||
                          Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => b.textContent.includes('Simpan & Soal Berikutnya'));
          if (nextBtn) {
            nextBtn.click();
          } else if (form) {
            form.submit();
          }
        } else {
          const saveBtn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => b.textContent.trim() === 'Simpan' || b.textContent.includes('Simpan Soal'));
          if (saveBtn) {
            saveBtn.click();
          } else if (form) {
            form.submit();
          }
        }
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
  else if (message.action === "START_BATCH") {
    runBatchInjection(message.questions, (progress) => {
      // Kirim telemetri progres real-time ke Side Panel
      chrome.runtime.sendMessage({ action: "BATCH_PROGRESS", progress }).catch(() => {});
    })
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  } 
  else if (message.action === "STOP_BATCH") {
    isExecutionHalted = true;
    sendResponse({ success: true });
  }
  else if (message.action === "OPEN_MAIN_QC_STUDIO") {
    openMainPageQcStudioModal();
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "CLOSE_MAIN_QC_STUDIO") {
    closeMainPageQcStudioModal();
    sendResponse({ success: true });
    return true;
  }
  return true;
});

// ------------------------------------------------------------------------
// 6. MAIN PAGE QC STUDIO MODAL
// ------------------------------------------------------------------------

let afrestoMainQcModal = null;

function injectMainPageModalStyles() {
  if (document.getElementById('afresto-qc-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'afresto-qc-modal-styles';
  style.textContent = `
    /* Modal QC Studio Fullscreen di Halaman Utama Afresto */
    #afresto-qc-studio-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: afrestoOverlayFade 0.22s ease-out;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }

    #afresto-qc-studio-overlay.hidden {
      display: none !important;
    }

    .afresto-qc-card {
      width: 95vw;
      height: 94vh;
      max-width: 1480px;
      max-height: 980px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: afrestoCardPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .afresto-qc-header {
      padding: 10px 18px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .afresto-qc-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .afresto-qc-header-icon {
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .afresto-qc-header-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }

    .afresto-qc-header-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      line-height: 1.2;
    }

    .afresto-qc-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .afresto-qc-btn-tab {
      padding: 5px 12px;
      font-size: 11.5px;
      font-weight: 600;
      color: #2563eb;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .afresto-qc-btn-tab:hover {
      background: #dbeafe;
    }

    .afresto-qc-btn-close {
      padding: 4px 10px;
      font-size: 16px;
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      cursor: pointer;
      line-height: 1;
      transition: all 0.15s ease;
    }
    .afresto-qc-btn-close:hover {
      background: #fee2e2;
      color: #dc2626;
      border-color: #fca5a5;
    }

    .afresto-qc-body {
      flex: 1;
      width: 100%;
      height: 100%;
      padding: 0;
      margin: 0;
      overflow: hidden;
      background: #fafaf9;
    }

    .afresto-qc-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    @keyframes afrestoOverlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes afrestoCardPop {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function openMainPageQcStudioModal() {
  injectMainPageModalStyles();

  let overlay = document.getElementById('afresto-qc-studio-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'afresto-qc-studio-overlay';
    const previewUrl = chrome.runtime.getURL('preview/preview.html');

    overlay.innerHTML = `
      <div class="afresto-qc-card" id="afresto-qc-card">
        <div class="afresto-qc-header">
          <div class="afresto-qc-header-left">
            <span class="afresto-qc-header-icon">🖥️</span>
            <div>
              <h3 class="afresto-qc-header-title">Studio Simulasi & Sandbox QC Guru</h3>
              <p class="afresto-qc-header-subtitle">Uji coba interaktif siswa, telaah kunci AI, dan cetak naskah ujian</p>
            </div>
          </div>
          <div class="afresto-qc-header-actions">
            <button type="button" class="afresto-qc-btn-tab" id="afresto-qc-btn-newtab" title="Buka di tab browser terpisah">
              <span>↗</span> Tab Penuh
            </button>
            <button type="button" class="afresto-qc-btn-close" id="afresto-qc-btn-close" title="Tutup Studio QC">&times;</button>
          </div>
        </div>
        <div class="afresto-qc-body">
          <iframe id="afresto-qc-iframe" class="afresto-qc-iframe" src="${previewUrl}" title="Studio QC Afresto"></iframe>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnClose = overlay.querySelector('#afresto-qc-btn-close');
    const btnNewTab = overlay.querySelector('#afresto-qc-btn-newtab');

    if (btnClose) {
      btnClose.addEventListener('click', closeMainPageQcStudioModal);
    }

    if (btnNewTab) {
      btnNewTab.addEventListener('click', () => {
        window.open(previewUrl, '_blank');
      });
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeMainPageQcStudioModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
        closeMainPageQcStudioModal();
      }
    });
  } else {
    overlay.classList.remove('hidden');
    const iframe = overlay.querySelector('#afresto-qc-iframe');
    if (iframe) {
      iframe.src = chrome.runtime.getURL('preview/preview.html');
    }
  }

  afrestoMainQcModal = overlay;
}

function closeMainPageQcStudioModal() {
  const overlay = document.getElementById('afresto-qc-studio-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    const iframe = overlay.querySelector('#afresto-qc-iframe');
    if (iframe) {
      iframe.src = 'about:blank';
    }
  }
}

console.log("Afresto AI Assistant Content Script aktif.");
