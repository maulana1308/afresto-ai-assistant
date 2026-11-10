/**
 * Afresto AI Assistant - Studio Simulasi & Sandbox QC Guru Controller
 * Mengatur interaksi pengerjaan siswa (test-drive), verifikasi kunci AI, 1-click safeguards,
 * regenerasi butir tunggal (single-item regenerate), ekspor PDF, dan injeksi ke Afresto.
 */

import { GeminiService, ALLOWED_MODELS } from '../scripts/gemini.js';
import { parseDocx } from '../scripts/docx_parser.js';
import {
  downloadImageAsBase64,
  localFileToBase64,
  buildEnhancedImagePrompt,
  getPollinationsImageUrl
} from '../scripts/image_service.js';

// State Studio
let questions = [];
let studentAnswers = {};
let verificationResults = {};
let activeMode = 'testdrive'; // 'testdrive' | 'editor'
let userApiKey = '';
let selectedModel = 'gemini-3.5-flash-lite';
let activeImageIndex = -1;
let academicInfo = null;

// Elemen DOM Utama
let btnModeTestdrive = null;
let btnModeEditor = null;
let testdriveDashboard = null;
let editorToolbar = null;
let questionsContainer = null;

let badgeMapel = null;
let badgeKelas = null;
let badgeTotalSoal = null;

let kopMapel = null;
let kopKelas = null;
let kopHariTanggal = null;
let kopWaktu = null;

let statAnswered = null;
let statTotal = null;
let statPercentage = null;
let statScore = null;
let statMatchCount = null;
let statCorrectPill = null;
let statMismatchPill = null;

let btnCheckAllAnswers = null;
let btnResetAnswers = null;
let btnPrintPdf = null;
let btnSaveChanges = null;
let btnInjectToAfresto = null;
let btnToggleTheme = null;
let themeIcon = null;

let checkPrintKeys = null;
let checkShowExplanations = null;
let answerKeySection = null;
let keyMatrixTbody = null;
let previewFileInput = null;
let toastContainer = null;
let btnImportDocxStudio = null;
let inputDocxStudio = null;

function bindDomElements() {
  if (typeof document === 'undefined') return;
  btnModeTestdrive = document.getElementById('btn-mode-testdrive');
  btnModeEditor = document.getElementById('btn-mode-editor');
  testdriveDashboard = document.getElementById('testdrive-dashboard');
  editorToolbar = document.getElementById('editor-toolbar');
  questionsContainer = document.getElementById('questions-container');

  badgeMapel = document.getElementById('badge-mapel');
  badgeKelas = document.getElementById('badge-kelas');
  badgeTotalSoal = document.getElementById('badge-total-soal');

  kopMapel = document.getElementById('kop-mapel');
  kopKelas = document.getElementById('kop-kelas');
  kopHariTanggal = document.getElementById('kop-hari-tanggal');
  kopWaktu = document.getElementById('kop-waktu');

  statAnswered = document.getElementById('stat-answered');
  statTotal = document.getElementById('stat-total');
  statPercentage = document.getElementById('stat-percentage');
  statScore = document.getElementById('stat-score');
  statMatchCount = document.getElementById('stat-match-count');
  statCorrectPill = document.getElementById('stat-correct-pill');
  statMismatchPill = document.getElementById('stat-mismatch-pill');

  btnCheckAllAnswers = document.getElementById('btn-check-all-answers');
  btnResetAnswers = document.getElementById('btn-reset-answers');
  btnPrintPdf = document.getElementById('btn-print-pdf');
  btnSaveChanges = document.getElementById('btn-save-changes');
  btnInjectToAfresto = document.getElementById('btn-inject-to-afresto');
  btnToggleTheme = document.getElementById('btn-toggle-theme');
  themeIcon = document.getElementById('theme-icon');

  checkPrintKeys = document.getElementById('check-print-keys');
  checkShowExplanations = document.getElementById('check-show-explanations');
  answerKeySection = document.getElementById('answer-key-section');
  keyMatrixTbody = document.getElementById('key-matrix-tbody');
  previewFileInput = document.getElementById('preview-file-input');
  toastContainer = document.getElementById('toast-container');
  btnImportDocxStudio = document.getElementById('btn-import-docx-studio');
  inputDocxStudio = document.getElementById('input-docx-studio');
}

// --------------------------------------------------------------------------
// 1. INISIALISASI & PERSISTENSI PENYIMPANAN
// --------------------------------------------------------------------------

async function init() {
  bindDomElements();
  setupTheme();
  setupEventListeners();

  // Muat data dari chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get([
      'last_questions',
      'gemini_api_key',
      'gemini_model',
      'afresto_detected_academic',
      'preview_kop_settings'
    ]);

    if (data.gemini_api_key) userApiKey = data.gemini_api_key;
    if (data.gemini_model) selectedModel = data.gemini_model;
    if (data.afresto_detected_academic) academicInfo = data.afresto_detected_academic;

    if (Array.isArray(data.last_questions) && data.last_questions.length > 0) {
      questions = data.last_questions;
    } else {
      questions = [];
    }

    // Terapkan KOP Sekolah jika pernah disimpan
    if (data.preview_kop_settings) {
      applyKopSettings(data.preview_kop_settings);
    } else if (academicInfo) {
      if (academicInfo.mapel) kopMapel.textContent = academicInfo.mapel;
      if (academicInfo.kelas) kopKelas.textContent = academicInfo.kelas;
    }
  }

  updateMetadataHeader();
  renderQuestions();
  renderKeyMatrix();
  updateDashboardStats();
  setupLiveStorageSync();
}

// --------------------------------------------------------------------------
// 1b. SINKRONISASI REAKTIF DUA ARAH (LIVE SYNC DARI SIDEPANEL KE QC STUDIO)
// --------------------------------------------------------------------------
function setupLiveStorageSync() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.last_questions && changes.last_questions.newValue) {
          const newQs = changes.last_questions.newValue;
          if (JSON.stringify(newQs) !== JSON.stringify(questions)) {
            questions = newQs;
            renderQuestions();
            renderKeyMatrix();
            updateDashboardStats();
            updateMetadataHeader();
            showToast('⚡ QC Studio tersinkronisasi otomatis dengan perubahan terbaru!', 'info');
          }
        }
        if (changes.preview_kop_settings && changes.preview_kop_settings.newValue) {
          applyKopSettings(changes.preview_kop_settings.newValue);
        }
        if (changes.app_theme && changes.app_theme.newValue) {
          applyTheme(changes.app_theme.newValue);
        }
      }
    });
  }
}

function setupTheme() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['app_theme']).then(res => {
      const theme = res.app_theme || 'paper';
      applyTheme(theme);
    }).catch(() => {});
  }
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-paper');
    if (themeIcon) themeIcon.textContent = '🌙';
  } else {
    document.body.classList.add('theme-paper');
    document.body.classList.remove('theme-dark');
    if (themeIcon) themeIcon.textContent = '☀️';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.contains('theme-dark');
  const newTheme = isDark ? 'paper' : 'dark';
  applyTheme(newTheme);
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ app_theme: newTheme });
  }
}

function updateMetadataHeader() {
  const mapel = (academicInfo && academicInfo.mapel) || (kopMapel && kopMapel.textContent.trim()) || 'Mata Pelajaran';
  const kelas = (academicInfo && academicInfo.kelas) || (kopKelas && kopKelas.textContent.trim()) || 'Fase E / Kelas 10';
  
  if (badgeMapel) badgeMapel.textContent = `📚 ${mapel}`;
  if (badgeKelas) badgeKelas.textContent = `🎓 ${kelas}`;
  if (badgeTotalSoal) badgeTotalSoal.textContent = `📝 ${questions.length} Butir Soal`;

  if (statTotal) statTotal.textContent = String(questions.length);
}

function applyKopSettings(settings) {
  if (settings.mapel && kopMapel) kopMapel.textContent = settings.mapel;
  if (settings.kelas && kopKelas) kopKelas.textContent = settings.kelas;
  if (settings.waktu && kopWaktu) kopWaktu.textContent = settings.waktu;
  if (settings.hariTanggal && kopHariTanggal) kopHariTanggal.textContent = settings.hariTanggal;
}

// --------------------------------------------------------------------------
// 2. DETEKSI SKRIP TIPOGRAFI MULTILINGUAL (ARAB, JEPANG, JAWA)
// --------------------------------------------------------------------------

function detectScriptClass(text) {
  if (!text) return "";
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const cjkRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  const javaneseRegex = /[\uA980-\uA9DF]/;

  if (arabicRegex.test(text)) return "q-rtl";
  if (cjkRegex.test(text)) return "q-cjk";
  if (javaneseRegex.test(text)) return "q-javanese";
  return "";
}

// --------------------------------------------------------------------------
// 3. RENDERING KARTU BUTIR SOAL & MODE INTERAKTIF
// --------------------------------------------------------------------------

function renderQuestions() {
  if (!questionsContainer) return;
  questionsContainer.innerHTML = '';

  if (questions.length === 0) {
    questionsContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <p style="font-size: 40px; margin-bottom: 12px;">📭</p>
        <h3 style="font-size: 16px; margin-bottom: 6px; color: var(--text-primary);">Belum Ada Paket Soal yang Dimuat</h3>
        <p style="font-size: 12.5px; max-width: 440px; margin: 0 auto;">
          Silakan buka Side Panel Afresto AI Assistant dan generate paket soal terlebih dahulu, lalu klik tombol <strong>Studio Simulasi QC</strong>.
        </p>
      </div>
    `;
    return;
  }

  questions.forEach((q, index) => {
    const card = document.createElement('article');
    card.className = 'q-studio-card';
    card.id = `q-card-${index}`;

    // Status class
    const result = verificationResults[index];
    if (result) {
      if (result.matched) card.classList.add('status-verified');
      else card.classList.add('status-mismatch');
    }

    const scriptClass = detectScriptClass(q.pertanyaan);
    const tipeClass = `q-type-${(q.tipe || 'pg').toLowerCase()}`;
    const tipeLabel = formatTipeLabel(q.tipe);

    // 1. Header Card
    let headerHtml = `
      <div class="q-studio-header">
        <div class="q-studio-badge-group">
          <span class="q-num-pill">${index + 1}</span>
          <span class="q-type-badge ${tipeClass}">${tipeLabel}</span>
          <span class="q-kognitif-badge">${escapeHtml(q.level_kognitif || 'C4 Analisis')}</span>
        </div>
        <div class="q-studio-card-actions no-print">
          <button class="btn btn-ghost btn-xs btn-regen-item" data-index="${index}" title="Buat ulang hanya butir soal ini via AI Gemini">
            <span>🔄</span> Buat Ulang Butir
          </button>
          <button class="btn btn-ghost btn-xs btn-edit-item" data-index="${index}" title="Edit teks dan opsi soal secara langsung">
            <span>✏️</span> Edit
          </button>
          <button class="btn btn-ghost btn-xs btn-delete-item" data-index="${index}" title="Hapus butir soal dari paket" style="color: var(--accent-ruby);">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;

    // 2. Stimulus & Gambar / SVG
    let imageHtml = '';
    if (q.gambar_base64 || q.gambar_url) {
      const src = q.gambar_base64 || q.gambar_url;
      imageHtml = `
        <div class="q-studio-image-box">
          <img src="${src}" alt="Ilustrasi Soal ${index + 1}" class="q-studio-image">
          <div class="q-image-control-bar no-print">
            <button class="btn btn-secondary btn-xs btn-change-img" data-index="${index}">📁 Ganti Gambar</button>
            <button class="btn btn-ghost btn-xs btn-remove-img" data-index="${index}">🗑️ Hapus Gambar</button>
          </div>
        </div>
      `;
    } else if (q.gambar_svg) {
      imageHtml = `
        <div class="q-studio-image-box">
          <div class="q-studio-svg-container">${q.gambar_svg}</div>
          <div class="q-image-control-bar no-print">
            <button class="btn btn-ghost btn-xs btn-remove-img" data-index="${index}">🗑️ Hapus Diagram</button>
          </div>
        </div>
      `;
    }

    // 3. Narasi Pertanyaan
    let bodyHtml = `
      <div class="q-studio-body ${scriptClass}" id="q-body-${index}">
        ${renderSafeHtml(q.pertanyaan || '')}
      </div>
    `;

    // 4. Area Opsi Interaktif Pengerjaan Siswa
    let optionsHtml = renderInteractiveOptions(q, index);

    // 5. Feedback Panel & 1-Click Safeguard
    let feedbackHtml = renderFeedbackPanel(q, index);

    card.innerHTML = headerHtml + imageHtml + bodyHtml + optionsHtml + feedbackHtml;
    questionsContainer.appendChild(card);
  });

  attachCardEventListeners();
}

function formatTipeLabel(tipe) {
  switch ((tipe || '').toUpperCase()) {
    case 'PG': return 'Pilihan Ganda';
    case 'PG_KOMPLEKS': return 'PG Kompleks';
    case 'BENAR_SALAH': return 'Benar / Salah';
    case 'MENCOCOKKAN': return 'Mencocokkan';
    case 'ISIAN': return 'Isian Singkat';
    case 'URAIAN': return 'Uraian / Essay';
    default: return tipe || 'Pilihan Ganda';
  }
}

// --------------------------------------------------------------------------
// 4. INTERACTIVE OPTIONS ENGINE PER TIPE SOAL
// --------------------------------------------------------------------------

function renderInteractiveOptions(q, qIndex) {
  const tipe = (q.tipe || 'PG').toUpperCase();
  const currentAnswer = studentAnswers[qIndex];

  // 1. Pilihan Ganda (Single Choice)
  if (tipe === 'PG') {
    const opsiKeys = ['A', 'B', 'C', 'D', 'E'];
    const optionsList = (q.opsi && typeof q.opsi === 'object') ? q.opsi : {};
    
    let items = opsiKeys.map(key => {
      const text = optionsList[key];
      if (!text) return '';
      const isSelected = currentAnswer === key;
      const scriptClass = detectScriptClass(text);
      return `
        <div class="testdrive-option-item ${isSelected ? 'selected' : ''}" data-qindex="${qIndex}" data-type="PG" data-key="${key}">
          <span class="testdrive-key-letter">${key}</span>
          <div class="testdrive-option-text ${scriptClass}" id="q-${qIndex}-opt-${key}">${renderSafeHtml(text)}</div>
        </div>
      `;
    }).join('');

    return `<div class="interactive-options-list">${items}</div>`;
  }

  // 2. PG Kompleks (Multi Choice)
  if (tipe === 'PG_KOMPLEKS') {
    const opsiKeys = ['A', 'B', 'C', 'D', 'E'];
    const optionsList = (q.opsi && typeof q.opsi === 'object') ? q.opsi : {};
    const selectedArr = Array.isArray(currentAnswer) ? currentAnswer : [];

    let items = opsiKeys.map(key => {
      const text = optionsList[key];
      if (!text) return '';
      const isSelected = selectedArr.includes(key);
      const scriptClass = detectScriptClass(text);
      return `
        <div class="testdrive-option-item ${isSelected ? 'selected' : ''}" data-qindex="${qIndex}" data-type="PG_KOMPLEKS" data-key="${key}">
          <span class="testdrive-key-letter">${isSelected ? '✓' : key}</span>
          <div class="testdrive-option-text ${scriptClass}" id="q-${qIndex}-opt-${key}">${renderSafeHtml(text)}</div>
        </div>
      `;
    }).join('');

    return `<div class="interactive-options-list">${items}</div>`;
  }

  // 3. Benar / Salah (Matrix Table)
  if (tipe === 'BENAR_SALAH') {
    const opsiKeys = ['A', 'B', 'C', 'D'];
    const optionsList = (q.opsi && typeof q.opsi === 'object') ? q.opsi : {};
    const bsAnswer = (typeof currentAnswer === 'object' && currentAnswer !== null) ? currentAnswer : {};

    let rows = opsiKeys.map(key => {
      const text = optionsList[key];
      if (!text) return '';
      const studentChoice = bsAnswer[key] || '';
      const isBenar = studentChoice.toLowerCase() === 'benar';
      const isSalah = studentChoice.toLowerCase() === 'salah';

      return `
        <tr>
          <td><span class="key-badge-mono">${key}</span></td>
          <td class="bs-statement-text">${renderSafeHtml(text)}</td>
          <td style="width: 140px; text-align: center;">
            <div class="bs-btn-group">
              <button class="bs-toggle-btn ${isBenar ? 'active-benar' : ''}" data-qindex="${qIndex}" data-key="${key}" data-val="Benar">Benar</button>
              <button class="bs-toggle-btn ${isSalah ? 'active-salah' : ''}" data-qindex="${qIndex}" data-key="${key}" data-val="Salah">Salah</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table class="interactive-bs-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">No</th>
            <th>Pernyataan / Argumen</th>
            <th style="width: 140px; text-align: center;">Pilihan Siswa</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // 4. Mencocokkan (Premise & Match Dropdown)
  if (tipe === 'MENCOCOKKAN') {
    const pairs = Array.isArray(q.pasangan) ? q.pasangan : [];
    const matchAnswers = (typeof currentAnswer === 'object' && currentAnswer !== null) ? currentAnswer : {};
    
    // Kumpulkan seluruh target jawaban kanan untuk opsi dropdown
    const allTargets = pairs.map(p => p.kanan).filter(Boolean);

    let rows = pairs.map((pair, pIndex) => {
      const selectedVal = matchAnswers[pIndex] || '';
      const optionsHtml = ['<option value="">-- Pilih Pasangan Cocok --</option>']
        .concat(allTargets.map(t => `<option value="${escapeHtml(t)}" ${selectedVal === t ? 'selected' : ''}>${escapeHtml(t)}</option>`))
        .join('');

      return `
        <tr>
          <td class="match-premise-col">${escapeHtml(pair.kiri || '')}</td>
          <td class="match-target-col">
            <select class="match-select" data-qindex="${qIndex}" data-pairindex="${pIndex}">
              ${optionsHtml}
            </select>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table class="interactive-match-table">
        <thead>
          <tr>
            <th>Pernyataan / Konsep Asal</th>
            <th>Pasangan Jawaban Siswa</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // 5. Isian Singkat
  if (tipe === 'ISIAN') {
    const val = typeof currentAnswer === 'string' ? currentAnswer : '';
    return `
      <input type="text" 
             class="interactive-input-box text-input-student" 
             data-qindex="${qIndex}" 
             placeholder="Ketik jawaban singkat siswa di sini untuk menguji..." 
             value="${escapeHtml(val)}">
    `;
  }

  // 6. Uraian / Essay
  if (tipe === 'URAIAN') {
    const val = typeof currentAnswer === 'string' ? currentAnswer : '';
    return `
      <textarea class="interactive-input-box textarea-student" 
                data-qindex="${qIndex}" 
                placeholder="Ketik uraian jawaban siswa di sini untuk menguji rubrik...">${escapeHtml(val)}</textarea>
    `;
  }

  return '';
}

// --------------------------------------------------------------------------
// 5. FEEDBACK VERIFIKASI KUNCI & 1-CLICK SAFEGUARDS
// --------------------------------------------------------------------------

function renderFeedbackPanel(q, qIndex) {
  const result = verificationResults[qIndex];
  if (!result) return '';

  const isMatched = result.matched;
  const pillClass = isMatched ? 'match' : 'mismatch';
  const pillText = isMatched ? '🟢 Jawaban Anda Cocok dengan Kunci AI' : '⚠️ Jawaban Anda Berbeda dengan Kunci AI';

  let formattedKey = formatOfficialKey(q);

  let explanationHtml = '';
  if (q.pembahasan) {
    explanationHtml = `
      <div class="feedback-explanation">
        <strong>Pembahasan / Rasionalisasi Kunci:</strong> ${escapeHtml(q.pembahasan)}
      </div>
    `;
  }

  // Tombol Safeguard: "Jadikan Jawaban Saya Sebagai Kunci"
  let safeguardBtnHtml = '';
  if (!isMatched && studentAnswers[qIndex] !== undefined) {
    safeguardBtnHtml = `
      <button class="btn-set-key" data-index="${qIndex}">
        📌 Jadikan Jawaban Saya Sebagai Kunci Resmi
      </button>
    `;
  }

  return `
    <div class="q-studio-feedback-panel no-print">
      <div class="feedback-status-row">
        <span class="feedback-pill ${pillClass}">${pillText}</span>
        <div class="safeguard-action-row">
          ${safeguardBtnHtml}
        </div>
      </div>
      <div class="feedback-details">
        <div><strong>Kunci Resmi AI:</strong> <span class="feedback-ai-key">${formattedKey}</span></div>
        <div><strong>Jawaban Siswa Anda:</strong> <span>${formatStudentAnswer(studentAnswers[qIndex], q.tipe)}</span></div>
        ${explanationHtml}
      </div>
    </div>
  `;
}

function formatOfficialKey(q) {
  const tipe = (q.tipe || 'PG').toUpperCase();
  if (tipe === 'PG') return `Opsi [ ${q.kunci || '-'} ]`;
  if (tipe === 'PG_KOMPLEKS') {
    const k = Array.isArray(q.kunci) ? q.kunci.join(', ') : String(q.kunci || '-');
    return `Opsi [ ${k} ]`;
  }
  if (tipe === 'BENAR_SALAH') {
    if (typeof q.kunci === 'object' && q.kunci !== null) {
      return Object.entries(q.kunci).map(([k, v]) => `${k}:${v}`).join(' | ');
    }
    return String(q.kunci || '-');
  }
  if (tipe === 'MENCOCOKKAN') {
    if (Array.isArray(q.pasangan)) {
      return q.pasangan.map((p, i) => `${i + 1}. ${p.kiri} ➔ ${p.kanan}`).join('<br>');
    }
    return String(q.kunci || '-');
  }
  if (tipe === 'ISIAN') {
    if (Array.isArray(q.kunci)) return q.kunci.join(' / ');
    return String(q.kunci || '-');
  }
  if (tipe === 'URAIAN') {
    return escapeHtml(String(q.kunci || 'Rubrik penskoran terbuka'));
  }
  return String(q.kunci || '-');
}

function formatStudentAnswer(ans, tipe) {
  if (ans === undefined || ans === null || ans === '') return '<em>(Belum Dijawab)</em>';
  const t = (tipe || 'PG').toUpperCase();
  if (t === 'PG') return `Opsi [ ${ans} ]`;
  if (t === 'PG_KOMPLEKS') {
    return Array.isArray(ans) ? `Opsi [ ${ans.join(', ')} ]` : String(ans);
  }
  if (t === 'BENAR_SALAH') {
    if (typeof ans === 'object') {
      return Object.entries(ans).map(([k, v]) => `${k}:${v}`).join(' | ');
    }
    return String(ans);
  }
  if (t === 'MENCOCOKKAN') {
    if (typeof ans === 'object') {
      return Object.entries(ans).map(([k, v]) => `Pasangan ${Number(k) + 1}: ${v}`).join(' | ');
    }
    return String(ans);
  }
  return escapeHtml(String(ans));
}

// --------------------------------------------------------------------------
// 6. LOGIKA EVALUASI VERIFIKASI JAWABAN (TEST-DRIVE VALIDATOR)
// --------------------------------------------------------------------------

function evaluateAnswer(q, studentAnswer) {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
    return { answered: false, matched: false };
  }

  const tipe = (q.tipe || 'PG').toUpperCase();

  // 1. PG
  if (tipe === 'PG') {
    const s = String(studentAnswer).trim().toUpperCase();
    const k = String(q.kunci || '').trim().toUpperCase();
    return { answered: true, matched: s === k };
  }

  // 2. PG Kompleks
  if (tipe === 'PG_KOMPLEKS') {
    const sArr = Array.isArray(studentAnswer) 
      ? studentAnswer.map(x => String(x).trim().toUpperCase()).sort() 
      : [];
    
    let kArr = [];
    if (Array.isArray(q.kunci)) {
      kArr = q.kunci.map(x => String(x).trim().toUpperCase()).sort();
    } else {
      kArr = String(q.kunci || '').split(/[\s,]+/).map(x => x.trim().toUpperCase()).filter(Boolean).sort();
    }

    const matched = (sArr.length > 0 && JSON.stringify(sArr) === JSON.stringify(kArr));
    return { answered: sArr.length > 0, matched };
  }

  // 3. Benar / Salah
  if (tipe === 'BENAR_SALAH') {
    if (typeof studentAnswer !== 'object' || studentAnswer === null) {
      return { answered: false, matched: false };
    }
    const opsiKeys = ['A', 'B', 'C', 'D'];
    const validKeys = opsiKeys.filter(k => q.opsi && q.opsi[k]);
    const answeredCount = validKeys.filter(k => studentAnswer[k]).length;
    if (answeredCount === 0) return { answered: false, matched: false };

    let allMatched = true;
    for (const key of validKeys) {
      const studentVal = (studentAnswer[key] || '').toLowerCase();
      let keyVal = '';
      if (typeof q.kunci === 'object' && q.kunci !== null) {
        keyVal = (q.kunci[key] || '').toLowerCase();
      } else {
        keyVal = String(q.kunci || '').toLowerCase();
      }
      if (studentVal !== keyVal) {
        allMatched = false;
        break;
      }
    }

    return { answered: answeredCount >= validKeys.length, matched: allMatched };
  }

  // 4. Mencocokkan
  if (tipe === 'MENCOCOKKAN') {
    if (typeof studentAnswer !== 'object' || studentAnswer === null) {
      return { answered: false, matched: false };
    }
    const pairs = Array.isArray(q.pasangan) ? q.pasangan : [];
    if (pairs.length === 0) return { answered: false, matched: false };

    const answeredCount = Object.values(studentAnswer).filter(Boolean).length;
    if (answeredCount === 0) return { answered: false, matched: false };

    let allMatched = true;
    pairs.forEach((pair, idx) => {
      const selected = (studentAnswer[idx] || '').trim().toLowerCase();
      const expected = (pair.kanan || '').trim().toLowerCase();
      if (selected !== expected) allMatched = false;
    });

    return { answered: answeredCount >= pairs.length, matched: allMatched };
  }

  // 5. Isian Singkat
  if (tipe === 'ISIAN') {
    const normalizeText = (t) => String(t || '').trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').replace(/\s+/g, ' ');
    const s = normalizeText(studentAnswer);
    if (!s) return { answered: false, matched: false };

    let matched = false;
    if (Array.isArray(q.kunci)) {
      matched = q.kunci.some(k => normalizeText(k) === s);
    } else {
      matched = normalizeText(q.kunci) === s;
    }
    return { answered: true, matched };
  }

  // 6. Uraian / Essay
  if (tipe === 'URAIAN') {
    const s = String(studentAnswer).trim();
    const answered = s.length >= 10; // Cukup ada jawaban minimal
    return { answered, matched: true }; // Uraian bersifat evaluasi kualitatif
  }

  return { answered: false, matched: false };
}

function checkAllAnswers() {
  verificationResults = {};
  let answeredCount = 0;
  let matchCount = 0;

  questions.forEach((q, index) => {
    const studentAns = studentAnswers[index];
    const res = evaluateAnswer(q, studentAns);
    verificationResults[index] = res;
    if (res.answered) answeredCount++;
    if (res.matched) matchCount++;
  });

  renderQuestions();
  updateDashboardStats();

  const mismatchCount = questions.length - matchCount;
  if (mismatchCount > 0) {
    showToast(`⚠️ Ditemukan ${mismatchCount} butir dengan kunci berbeda. Anda dapat menggunakan tombol "Jadikan Jawaban Saya Sebagai Kunci" untuk mengoreksinya.`, 'warning');
  } else {
    showToast(`🎉 Luar biasa! Seluruh ${questions.length} butir soal terverifikasi 100% cocok dengan kunci AI!`, 'success');
  }
}

function resetAnswers() {
  studentAnswers = {};
  verificationResults = {};
  renderQuestions();
  updateDashboardStats();
  showToast('Jawaban simulasi siswa berhasil direset.', 'info');
}

function updateDashboardStats() {
  const total = questions.length;
  let answeredCount = 0;
  let matchCount = 0;
  let mismatchCount = 0;

  questions.forEach((q, index) => {
    const res = verificationResults[index];
    if (res) {
      if (res.answered) answeredCount++;
      if (res.matched) matchCount++;
      else mismatchCount++;
    } else if (studentAnswers[index] !== undefined && studentAnswers[index] !== '') {
      answeredCount++;
    }
  });

  const percent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const score = total > 0 ? Math.round((matchCount / total) * 100) : 0;

  if (statAnswered) statAnswered.textContent = String(answeredCount);
  if (statTotal) statTotal.textContent = String(total);
  if (statPercentage) statPercentage.textContent = `(${percent}%)`;

  if (statScore) statScore.textContent = String(score);
  if (statMatchCount) statMatchCount.textContent = `(${matchCount} Cocok)`;

  if (statCorrectPill) statCorrectPill.textContent = `${matchCount} ✓ Tepat`;
  if (statMismatchPill) statMismatchPill.textContent = `${mismatchCount} ⚠️ Meleset`;
}

// --------------------------------------------------------------------------
// 7. LAMPIRAN KUNCI JAWABAN & PEMBAHASAN RESMI (PRINT APPENDIX)
// --------------------------------------------------------------------------

function renderKeyMatrix() {
  if (!keyMatrixTbody) return;
  keyMatrixTbody.innerHTML = '';

  questions.forEach((q, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center; font-weight: 700;">${index + 1}</td>
      <td><strong>${formatTipeLabel(q.tipe)}</strong></td>
      <td><span class="q-kognitif-badge">${escapeHtml(q.level_kognitif || 'HOTS')}</span></td>
      <td><span class="key-badge-mono">${formatOfficialKey(q)}</span></td>
      <td style="line-height: 1.5; color: var(--text-secondary);">${escapeHtml(q.pembahasan || q.kunci || '-')}</td>
    `;
    keyMatrixTbody.appendChild(tr);
  });
}

// --------------------------------------------------------------------------
// 8. ALAT PENYELAMAT CACAT: 1-CLICK SAFEGUARDS & TARGETED REGENERATE
// --------------------------------------------------------------------------

function setAnswerAsOfficialKey(qIndex) {
  const q = questions[qIndex];
  const myAns = studentAnswers[qIndex];

  if (myAns === undefined || myAns === null || myAns === '') {
    showToast('Pilih atau ketik jawaban Anda terlebih dahulu sebelum menjadikannya kunci.', 'warning');
    return;
  }

  // Terapkan koreksi kunci berdasarkan tipe soal
  const tipe = (q.tipe || 'PG').toUpperCase();
  if (tipe === 'PG') {
    q.kunci = String(myAns).toUpperCase();
  } else if (tipe === 'PG_KOMPLEKS') {
    q.kunci = Array.isArray(myAns) ? myAns : [String(myAns)];
  } else if (tipe === 'BENAR_SALAH') {
    q.kunci = Object.assign({}, myAns);
  } else if (tipe === 'MENCOCOKKAN') {
    // Susun ringkasan kunci baru
    if (typeof myAns === 'object' && Array.isArray(q.pasangan)) {
      q.pasangan.forEach((p, idx) => {
        if (myAns[idx]) p.kanan = myAns[idx];
      });
    }
  } else if (tipe === 'ISIAN') {
    q.kunci = [String(myAns).trim()];
  } else if (tipe === 'URAIAN') {
    q.kunci = String(myAns).trim();
  }

  // Perbarui hasil evaluasi untuk butir ini secara otomatis menjadi match (hijau)
  verificationResults[qIndex] = { answered: true, matched: true };

  // Simpan ke storage lokal
  saveQuestionsToStorage();

  // Re-render
  renderQuestions();
  renderKeyMatrix();
  updateDashboardStats();

  showToast(`✓ Kunci jawaban butir #${qIndex + 1} berhasil dikoreksi menjadi pilihan Anda!`, 'success');
}

async function singleTargetedRegenerate(qIndex) {
  const oldQ = questions[qIndex];
  if (!userApiKey) {
    showToast('Kunci Gemini API belum diatur. Silakan atur di Side Panel terlebih dahulu.', 'warning');
    return;
  }

  const card = document.getElementById(`q-card-${qIndex}`);
  if (card) {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
  }

  showToast(`Sedang membuat ulang butir #${qIndex + 1} via Gemini (${selectedModel})...`, 'info');

  try {
    const gemini = new GeminiService(userApiKey, selectedModel);
    const mapel = (academicInfo && academicInfo.mapel) || (kopMapel && kopMapel.textContent.trim()) || 'Umum';
    const kelas = (academicInfo && academicInfo.kelas) || (kopKelas && kopKelas.textContent.trim()) || 'Fase E';

    const promptText = `Anda adalah Asisten Guru Ahli Asesmen Kurikulum Merdeka.
Tugas Anda: Buat SATU BUTIR SOAL PENGGANTI (1 BUTIR SAJA) untuk menggantikan butir soal yang cacat.
Mata Pelajaran: ${mapel}
Tingkat / Kelas: ${kelas}
Tipe Soal yang WAJIB DIBUAT: ${oldQ.tipe || 'PG'}
Level Kognitif yang WAJIB: ${oldQ.level_kognitif || 'C4 (Analisis)'}
Format Jawaban: JSON MURNI sesuai schema "soal_list" dengan tepat 1 elemen.`;

    const generatedBatch = await gemini.generateBatch({
      mapel,
      kelas,
      materi: `Pengganti Soal ${oldQ.tipe} Butir #${qIndex + 1}`,
      tipeList: [{ tipe: oldQ.tipe || 'PG', count: 1 }],
      kognitif: oldQ.level_kognitif || 'HOTS',
      customPrompt: promptText,
      includeImage: Boolean(oldQ.gambar_base64 || oldQ.gambar_url || oldQ.gambar_svg)
    });

    if (Array.isArray(generatedBatch) && generatedBatch.length > 0) {
      const newQ = generatedBatch[0];
      newQ.id = oldQ.id; // Pertahankan ID asli
      questions[qIndex] = newQ;

      // Reset jawaban siswa untuk butir ini
      delete studentAnswers[qIndex];
      delete verificationResults[qIndex];

      await saveQuestionsToStorage();
      renderQuestions();
      renderKeyMatrix();
      updateDashboardStats();

      showToast(`✨ Butir #${qIndex + 1} berhasil diperbarui dengan soal baru yang segar!`, 'success');
    } else {
      throw new Error('AI tidak mengembalikan butir soal yang valid.');
    }
  } catch (err) {
    console.error('Gagal regenerasi butir tunggal:', err);
    showToast(`Gagal membuat ulang butir: ${err.message}`, 'warning');
    if (card) {
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
    }
  }
}

function deleteQuestionItem(qIndex) {
  if (confirm(`Apakah Anda yakin ingin menghapus butir soal #${qIndex + 1}?`)) {
    questions.splice(qIndex, 1);
    
    // Perbarui renumbering id
    questions.forEach((q, idx) => {
      q.id = idx + 1;
    });

    // Reset temporary answers
    studentAnswers = {};
    verificationResults = {};

    saveQuestionsToStorage();
    updateMetadataHeader();
    renderQuestions();
    renderKeyMatrix();
    updateDashboardStats();

    showToast(`Butir soal berhasil dihapus. Tersisa ${questions.length} butir.`, 'info');
  }
}

// --------------------------------------------------------------------------
// 9. SIMPAN, CETAK PDF & INJEKSI AFRESTO
// --------------------------------------------------------------------------

async function saveQuestionsToStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({
      last_questions: questions,
      preview_kop_settings: {
        mapel: kopMapel ? kopMapel.textContent.trim() : '',
        kelas: kopKelas ? kopKelas.textContent.trim() : '',
        waktu: kopWaktu ? kopWaktu.textContent.trim() : '',
        hariTanggal: kopHariTanggal ? kopHariTanggal.textContent.trim() : ''
      }
    });
  }
}

function handlePrintPdf() {
  const shouldPrintKeys = checkPrintKeys ? checkPrintKeys.checked : true;
  if (!shouldPrintKeys && answerKeySection) {
    answerKeySection.classList.add('no-print');
  } else if (answerKeySection) {
    answerKeySection.classList.remove('no-print');
  }

  window.print();
}

async function injectToAfresto() {
  await saveQuestionsToStorage();

  if (typeof chrome === 'undefined' || !chrome.tabs) {
    showToast('Ekstensi tidak berjalan di lingkungan browser Chrome.', 'warning');
    return;
  }

  showToast('Memeriksa tab formulir Afresto aktif...', 'info');

  chrome.tabs.query({ url: '*://*.afresto.id/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      chrome.tabs.update(activeTab.id, { active: true }, () => {
        if (chrome.windows && activeTab.windowId) {
          chrome.windows.update(activeTab.windowId, { focused: true });
        }
        showToast('Beralih ke tab Afresto. Anda dapat langsung mengklik tombol "🚀 Input Otomatis" di Side Panel.', 'success');
      });
    } else {
      showToast('Tab portal Afresto sekolah belum terbuka. Silakan buka halaman formulir soal Afresto Anda di browser.', 'warning');
    }
  });
}

// --------------------------------------------------------------------------
// 10. ATTACH EVENT LISTENERS
// --------------------------------------------------------------------------

function setupEventListeners() {
  // Mode switcher
  if (btnModeTestdrive) {
    btnModeTestdrive.addEventListener('click', () => switchMode('testdrive'));
  }
  if (btnModeEditor) {
    btnModeEditor.addEventListener('click', () => switchMode('editor'));
  }

  // Dashboard actions
  if (btnCheckAllAnswers) {
    btnCheckAllAnswers.addEventListener('click', checkAllAnswers);
  }
  if (btnResetAnswers) {
    btnResetAnswers.addEventListener('click', resetAnswers);
  }

  // Top actions
  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', handlePrintPdf);
  }
  if (btnSaveChanges) {
    btnSaveChanges.addEventListener('click', async () => {
      await saveQuestionsToStorage();
      showToast('✓ Seluruh perubahan paket soal berhasil disimpan!', 'success');
    });
  }
  if (btnInjectToAfresto) {
    btnInjectToAfresto.addEventListener('click', injectToAfresto);
  }
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', toggleTheme);
  }

  // Import Word (.docx) di Studio
  if (btnImportDocxStudio && inputDocxStudio) {
    btnImportDocxStudio.addEventListener('click', () => {
      inputDocxStudio.click();
    });

    inputDocxStudio.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!userApiKey) {
        showToast('Kunci Gemini API belum diatur. Silakan simpan di Side Panel terlebih dahulu.', 'warning');
        inputDocxStudio.value = '';
        return;
      }

      showToast(`Membaca dokumen Word: ${file.name}...`, 'info');

      try {
        const arrayBuf = await file.arrayBuffer();
        const docxResult = await parseDocx(arrayBuf);

        showToast(`Menganalisis & menstrukturkan ${docxResult.stats.paragraphCount} paragraf via Gemini...`, 'info');

        const gemini = new GeminiService(userApiKey, selectedModel);
        const structured = await gemini.structureDocxQuestions(docxResult.rawText, docxResult.images);

        const newQuestions = structured.soal_list || [];
        if (newQuestions.length === 0) {
          throw new Error('Tidak ada butir soal yang berhasil dikenali di dokumen.');
        }

        questions = newQuestions;
        studentAnswers = {};
        verificationResults = {};

        if (structured.detected_mapel && kopMapel) kopMapel.textContent = structured.detected_mapel;
        if (structured.detected_kelas && kopKelas) kopKelas.textContent = structured.detected_kelas;

        await saveQuestionsToStorage();
        updateMetadataHeader();
        renderQuestions();
        renderKeyMatrix();
        updateDashboardStats();

        showToast(`🎉 Sukses mengimpor ${questions.length} butir soal dari Word ke Studio!`, 'success');
      } catch (err) {
        console.error('Gagal impor Word di Studio:', err);
        showToast(`Gagal impor dokumen: ${err.message}`, 'warning');
      } finally {
        inputDocxStudio.value = '';
      }
    });
  }

  // File replacement input
  if (previewFileInput) {
    previewFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && activeImageIndex >= 0 && activeImageIndex < questions.length) {
        try {
          const b64 = await localFileToBase64(file);
          questions[activeImageIndex].gambar_base64 = b64;
          questions[activeImageIndex].gambar_url = '';
          questions[activeImageIndex].gambar_svg = '';
          await saveQuestionsToStorage();
          renderQuestions();
          showToast(`Gambar butir #${activeImageIndex + 1} berhasil diganti.`, 'success');
        } catch (err) {
          showToast('Gagal memuat berkas gambar.', 'warning');
        }
      }
      previewFileInput.value = '';
    });
  }
}

function switchMode(mode) {
  activeMode = mode;
  if (mode === 'testdrive') {
    btnModeTestdrive.classList.add('active');
    btnModeTestdrive.setAttribute('aria-selected', 'true');
    btnModeEditor.classList.remove('active');
    btnModeEditor.setAttribute('aria-selected', 'false');

    testdriveDashboard.classList.remove('hidden');
    editorToolbar.classList.add('hidden');
  } else {
    btnModeEditor.classList.add('active');
    btnModeEditor.setAttribute('aria-selected', 'true');
    btnModeTestdrive.classList.remove('active');
    btnModeTestdrive.setAttribute('aria-selected', 'false');

    editorToolbar.classList.remove('hidden');
    testdriveDashboard.classList.add('hidden');
  }
}

function attachCardEventListeners() {
  // 1. Pilihan Ganda & PG Kompleks click listener
  const optionItems = document.querySelectorAll('.testdrive-option-item');
  optionItems.forEach(item => {
    item.addEventListener('click', () => {
      const qIndex = parseInt(item.getAttribute('data-qindex'), 10);
      const type = item.getAttribute('data-type');
      const key = item.getAttribute('data-key');

      if (type === 'PG') {
        studentAnswers[qIndex] = key;
        // Re-render hanya butir ini untuk performa instan
        const parentList = item.closest('.interactive-options-list');
        parentList.querySelectorAll('.testdrive-option-item').forEach(el => {
          el.classList.remove('selected');
        });
        item.classList.add('selected');
      } else if (type === 'PG_KOMPLEKS') {
        let current = Array.isArray(studentAnswers[qIndex]) ? studentAnswers[qIndex] : [];
        if (current.includes(key)) {
          current = current.filter(k => k !== key);
          item.classList.remove('selected');
          item.querySelector('.testdrive-key-letter').textContent = key;
        } else {
          current.push(key);
          current.sort();
          item.classList.add('selected');
          item.querySelector('.testdrive-key-letter').textContent = '✓';
        }
        studentAnswers[qIndex] = current;
      }

      updateDashboardStats();
    });
  });

  // 2. Benar / Salah Toggle Buttons
  const bsButtons = document.querySelectorAll('.bs-toggle-btn');
  bsButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const qIndex = parseInt(btn.getAttribute('data-qindex'), 10);
      const key = btn.getAttribute('data-key');
      const val = btn.getAttribute('data-val');

      if (typeof studentAnswers[qIndex] !== 'object' || studentAnswers[qIndex] === null) {
        studentAnswers[qIndex] = {};
      }
      studentAnswers[qIndex][key] = val;

      const group = btn.closest('.bs-btn-group');
      group.querySelectorAll('.bs-toggle-btn').forEach(b => {
        b.classList.remove('active-benar', 'active-salah');
      });

      if (val === 'Benar') btn.classList.add('active-benar');
      else btn.classList.add('active-salah');

      updateDashboardStats();
    });
  });

  // 3. Mencocokkan Dropdown Change
  const matchSelects = document.querySelectorAll('.match-select');
  matchSelects.forEach(select => {
    select.addEventListener('change', () => {
      const qIndex = parseInt(select.getAttribute('data-qindex'), 10);
      const pIndex = parseInt(select.getAttribute('data-pairindex'), 10);

      if (typeof studentAnswers[qIndex] !== 'object' || studentAnswers[qIndex] === null) {
        studentAnswers[qIndex] = {};
      }
      studentAnswers[qIndex][pIndex] = select.value;
      updateDashboardStats();
    });
  });

  // 4. Isian Singkat Text Input
  const textInputs = document.querySelectorAll('.text-input-student');
  textInputs.forEach(input => {
    input.addEventListener('input', () => {
      const qIndex = parseInt(input.getAttribute('data-qindex'), 10);
      studentAnswers[qIndex] = input.value;
      updateDashboardStats();
    });
  });

  // 5. Uraian Textarea
  const textareas = document.querySelectorAll('.textarea-student');
  textareas.forEach(ta => {
    ta.addEventListener('input', () => {
      const qIndex = parseInt(ta.getAttribute('data-qindex'), 10);
      studentAnswers[qIndex] = ta.value;
      updateDashboardStats();
    });
  });

  // 6. Tombol "Jadikan Jawaban Saya Sebagai Kunci"
  const setKeyBtns = document.querySelectorAll('.btn-set-key');
  setKeyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const qIndex = parseInt(btn.getAttribute('data-index'), 10);
      setAnswerAsOfficialKey(qIndex);
    });
  });

  // 7. Tombol "Buat Ulang Butir"
  const regenBtns = document.querySelectorAll('.btn-regen-item');
  regenBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const qIndex = parseInt(btn.getAttribute('data-index'), 10);
      singleTargetedRegenerate(qIndex);
    });
  });

  // 8. Tombol "Hapus Butir"
  const delBtns = document.querySelectorAll('.btn-delete-item');
  delBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const qIndex = parseInt(btn.getAttribute('data-index'), 10);
      deleteQuestionItem(qIndex);
    });
  });

  // 9. Tombol "Edit Butir" (Inline Edit Mode)
  const editBtns = document.querySelectorAll('.btn-edit-item');
  editBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const qIndex = parseInt(btn.getAttribute('data-index'), 10);
      toggleInlineEdit(qIndex, btn);
    });
  });

  // 10. Ganti & Hapus Gambar
  const changeImgBtns = document.querySelectorAll('.btn-change-img');
  changeImgBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeImageIndex = parseInt(btn.getAttribute('data-index'), 10);
      if (previewFileInput) previewFileInput.click();
    });
  });

  const removeImgBtns = document.querySelectorAll('.btn-remove-img');
  removeImgBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const qIndex = parseInt(btn.getAttribute('data-index'), 10);
      if (confirm('Hapus gambar/diagram dari butir soal ini?')) {
        questions[qIndex].gambar_base64 = '';
        questions[qIndex].gambar_url = '';
        questions[qIndex].gambar_svg = '';
        saveQuestionsToStorage();
        renderQuestions();
        showToast('Gambar berhasil dihapus.', 'info');
      }
    });
  });
}

function toggleInlineEdit(qIndex, btn) {
  const bodyEl = document.getElementById(`q-body-${qIndex}`);
  const isEditing = bodyEl && bodyEl.getAttribute('contenteditable') === 'true';

  if (!isEditing) {
    if (bodyEl) {
      bodyEl.setAttribute('contenteditable', 'true');
      bodyEl.focus();
    }
    btn.innerHTML = '<span>💾</span> Selesai';
    btn.classList.add('btn-primary');
    showToast(`Mode edit aktif pada butir #${qIndex + 1}. Klik langsung pada teks pertanyaan.`, 'info');
  } else {
    if (bodyEl) {
      bodyEl.removeAttribute('contenteditable');
      questions[qIndex].pertanyaan = bodyEl.innerText.trim();
    }
    btn.innerHTML = '<span>✏️</span> Edit';
    btn.classList.remove('btn-primary');
    saveQuestionsToStorage();
    renderKeyMatrix();
    showToast(`✓ Perubahan butir #${qIndex + 1} berhasil disimpan.`, 'success');
  }
}

// --------------------------------------------------------------------------
// 11. TOAST NOTIFICATION SYSTEM
// --------------------------------------------------------------------------

function showToast(message, type = 'info') {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  else if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 4000);
}

function renderSafeHtml(text) {
  if (!text) return '';
  if (/<\/?(?:table|tr|th|td|img|sub|sup|span|p|div|b|i|u|br|strong|em)\b/i.test(text)) {
    return String(text).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
                       .replace(/on\w+="[^"]*"/gi, '')
                       .replace(/on\w+='[^']*'/gi, '');
  }
  return escapeHtml(text);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Eksekusi inisialisasi saat DOM siap
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

// Ekspor untuk pengujian QC
export {
  evaluateAnswer,
  formatOfficialKey,
  formatStudentAnswer,
  detectScriptClass,
  questions,
  studentAnswers
};
