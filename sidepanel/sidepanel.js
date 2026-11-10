/**
 * Afresto AI Assistant - Side Panel Controller
 * Mengatur interaksi pengguna, panggilan Gemini API, soft warning, dan auto-loop injeksi.
 */

import { GeminiService, ALLOWED_MODELS } from '../scripts/gemini.js';
import { parseDocx } from '../scripts/docx_parser.js';
import { validateQuestionCompleteness } from '../scripts/question_validator.js';
import {
  IMAGE_STYLES,
  buildEnhancedImagePrompt,
  getPollinationsImageUrl,
  downloadImageAsBase64,
  localFileToBase64,
  generateFallbackSvg
} from '../scripts/image_service.js';

// State Aplikasi
let currentQuestions = [];
let isBatchRunning = false;
let userApiKey = "";
let selectedModel = "gemini-3.5-flash-lite";
let activeImageCardIndex = -1;
let parsedDocxData = null;

// Elemen DOM
const btnToggleSettings = document.getElementById('btn-toggle-settings');
const settingsPanel = document.getElementById('settings-panel');
const inputApiKey = document.getElementById('input-api-key');
const btnToggleKeyVis = document.getElementById('btn-toggle-key-visibility');
const selectModel = document.getElementById('select-model');
const btnTestKey = document.getElementById('btn-test-key');
const btnSaveKey = document.getElementById('btn-save-key');
const settingsAlert = document.getElementById('settings-alert');

const btnToggleTheme = document.getElementById('btn-toggle-theme');
const themeIcon = document.getElementById('theme-icon');
const parameterSummaryBar = document.getElementById('parameter-summary-bar');
const parameterFormBody = document.getElementById('parameter-form-body');
const btnExpandForm = document.getElementById('btn-expand-form');
const summaryMapelKelas = document.getElementById('summary-mapel-kelas');
const summaryComposition = document.getElementById('summary-composition');

// Elemen Tab Pemilihan Sumber Soal & Ingesti Word (.docx)
const tabSourceAi = document.getElementById('tab-source-ai');
const tabSourceDocx = document.getElementById('tab-source-docx');
const aiGeneratorFields = document.getElementById('ai-generator-fields');
const docxIngestionContainer = document.getElementById('docx-ingestion-container');
const docxDropBox = document.getElementById('docx-drop-box');
const inputDocxFile = document.getElementById('input-docx-file');
const docxSummaryBox = document.getElementById('docx-summary-box');
const docxFilename = document.getElementById('docx-filename');
const docxFilesize = document.getElementById('docx-filesize');
const btnCancelDocx = document.getElementById('btn-cancel-docx');
const docxStatParagraf = document.getElementById('docx-stat-paragraf');
const docxStatTabel = document.getElementById('docx-stat-tabel');
const docxStatGambar = document.getElementById('docx-stat-gambar');
const docxStatSoal = document.getElementById('docx-stat-soal');
const checkDocxUseAi = document.getElementById('check-docx-use-ai');
const docxAlert = document.getElementById('docx-alert');
const btnConvertDocx = document.getElementById('btn-convert-docx');

const pageStatusBanner = document.getElementById('page-status-banner');
const pageStatusText = document.getElementById('page-status-text');

const inputMapel = document.getElementById('input-mapel');
const selectKelas = document.getElementById('select-kelas');
const btnSyncAcademic = document.getElementById('btn-sync-academic');
const detectedAcademicBadge = document.getElementById('detected-academic-badge');
const detectedText = document.getElementById('detected-text');
const inputTp = document.getElementById('input-tp');
const tpSoftWarning = document.getElementById('tp-soft-warning');
const inputMateri = document.getElementById('input-materi');
const inputPrompt = document.getElementById('input-prompt');
const selectKognitif = document.getElementById('select-kognitif');

const checkIncludeImage = document.getElementById('check-include-image');
const imageStyleContainer = document.getElementById('image-style-container');
const selectImageStyle = document.getElementById('select-image-style');
const inputReplaceImage = document.getElementById('input-replace-image');

const checkPg = document.getElementById('check-pg');
const qtyPg = document.getElementById('qty-pg');
const checkPgKompleks = document.getElementById('check-pg-kompleks');
const qtyPgKompleks = document.getElementById('qty-pg-kompleks');
const checkBenarSalah = document.getElementById('check-benar-salah');
const qtyBenarSalah = document.getElementById('qty-benar-salah');
const checkMencocokkan = document.getElementById('check-mencocokkan');
const qtyMencocokkan = document.getElementById('qty-mencocokkan');
const checkIsian = document.getElementById('check-isian');
const qtyIsian = document.getElementById('qty-isian');
const checkUraian = document.getElementById('check-uraian');
const qtyUraian = document.getElementById('qty-uraian');

const btnGenerate = document.getElementById('btn-generate');
const resultsSection = document.getElementById('results-section');
const resultsCountBadge = document.getElementById('results-count-badge');
const btnOpenPreview = document.getElementById('btn-open-preview');
const btnLaunchStudioBanner = document.getElementById('btn-launch-studio-banner');
const btnSortType = document.getElementById('btn-sort-type');
const btnShuffle = document.getElementById('btn-shuffle');
const btnClearPlaylist = document.getElementById('btn-clear-playlist');
const btnResetStatus = document.getElementById('btn-reset-status');
const btnAutoInputAll = document.getElementById('btn-auto-input-all');
const btnStopInjection = document.getElementById('btn-stop-injection');
const progressBox = document.getElementById('injection-progress-container');
const progressStatusLabel = document.getElementById('progress-status-label');
const progressPercentage = document.getElementById('progress-percentage');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressDetail = document.getElementById('progress-detail');
const questionsListContainer = document.getElementById('questions-list');

// Elemen Navigasi Cepat / Shortcut Nomor Soal (Sticky Hover)
const questionNavBar = document.getElementById('question-nav-bar');
const questionNavGrid = document.getElementById('question-nav-grid');
const qNavCount = document.getElementById('q-nav-count');
const btnToggleQNav = document.getElementById('btn-toggle-q-nav');
const qNavToggleIcon = document.getElementById('q-nav-toggle-icon');
const btnScrollTop = document.getElementById('btn-scroll-top');

const apiKeyStatusBadge = document.getElementById('api-key-status-badge');

// Status aktif generator soal (mencegah klik injeksi otomatis sebelum semua soal siap)
let isGenerating = false;

// ------------------------------------------------------------------------
// 1. SISTEM PERSISTENSI OTOMATIS FORM SOAL ASESMEN & KUNCI API
// ------------------------------------------------------------------------

async function saveSoalFormState() {
  const state = {
    mapel: inputMapel?.value || "",
    kelas: selectKelas?.value || "",
    tp: inputTp?.value || "",
    materi: inputMateri?.value || "",
    prompt: inputPrompt?.value || "",
    kognitif: selectKognitif?.value || "C2",
    includeImage: checkIncludeImage ? checkIncludeImage.checked : true,
    imageStyle: selectImageStyle?.value || "AUTO",
    checkPg: checkPg ? checkPg.checked : true,
    qtyPg: qtyPg?.value || "5",
    checkPgKompleks: checkPgKompleks ? checkPgKompleks.checked : false,
    qtyPgKompleks: qtyPgKompleks?.value || "3",
    checkBenarSalah: checkBenarSalah ? checkBenarSalah.checked : false,
    qtyBenarSalah: qtyBenarSalah?.value || "2",
    checkMencocokkan: checkMencocokkan ? checkMencocokkan.checked : false,
    qtyMencocokkan: qtyMencocokkan?.value || "2",
    checkIsian: checkIsian ? checkIsian.checked : false,
    qtyIsian: qtyIsian?.value || "2",
    checkUraian: checkUraian ? checkUraian.checked : false,
    qtyUraian: qtyUraian?.value || "1"
  };
  await chrome.storage.local.set({ afresto_soal_form_state: state });
}

async function restoreSoalFormState() {
  const data = await chrome.storage.local.get('afresto_soal_form_state');
  if (!data.afresto_soal_form_state) return;
  const s = data.afresto_soal_form_state;
  if (inputMapel && s.mapel !== undefined && !inputMapel.value) inputMapel.value = s.mapel;
  if (selectKelas && s.kelas !== undefined) selectKelas.value = s.kelas;
  if (inputTp && s.tp !== undefined) inputTp.value = s.tp;
  if (inputMateri && s.materi !== undefined) inputMateri.value = s.materi;
  if (inputPrompt && s.prompt !== undefined) inputPrompt.value = s.prompt;
  if (selectKognitif && s.kognitif !== undefined) selectKognitif.value = s.kognitif;
  if (checkIncludeImage && s.includeImage !== undefined) {
    checkIncludeImage.checked = s.includeImage;
    if (imageStyleContainer) imageStyleContainer.style.display = s.includeImage ? 'block' : 'none';
  }
  if (selectImageStyle && s.imageStyle !== undefined) selectImageStyle.value = s.imageStyle;
  if (checkPg && s.checkPg !== undefined) checkPg.checked = s.checkPg;
  if (qtyPg && s.qtyPg !== undefined) qtyPg.value = s.qtyPg;
  if (checkPgKompleks && s.checkPgKompleks !== undefined) checkPgKompleks.checked = s.checkPgKompleks;
  if (qtyPgKompleks && s.qtyPgKompleks !== undefined) qtyPgKompleks.value = s.qtyPgKompleks;
  if (checkBenarSalah && s.checkBenarSalah !== undefined) checkBenarSalah.checked = s.checkBenarSalah;
  if (qtyBenarSalah && s.qtyBenarSalah !== undefined) qtyBenarSalah.value = s.qtyBenarSalah;
  if (checkMencocokkan && s.checkMencocokkan !== undefined) checkMencocokkan.checked = s.checkMencocokkan;
  if (qtyMencocokkan && s.qtyMencocokkan !== undefined) qtyMencocokkan.value = s.qtyMencocokkan;
  if (checkIsian && s.checkIsian !== undefined) checkIsian.checked = s.checkIsian;
  if (qtyIsian && s.qtyIsian !== undefined) qtyIsian.value = s.qtyIsian;
  if (checkUraian && s.checkUraian !== undefined) checkUraian.checked = s.checkUraian;
  if (qtyUraian && s.qtyUraian !== undefined) qtyUraian.value = s.qtyUraian;
}

function setupSoalAutoSave() {
  const textInputs = [inputMapel, selectKelas, inputTp, inputMateri, inputPrompt, selectKognitif, selectImageStyle, qtyPg, qtyPgKompleks, qtyBenarSalah, qtyMencocokkan, qtyIsian, qtyUraian];
  textInputs.forEach(el => {
    if (el) {
      el.addEventListener('input', saveSoalFormState);
      el.addEventListener('change', saveSoalFormState);
    }
  });
  const checkInputs = [checkIncludeImage, checkPg, checkPgKompleks, checkBenarSalah, checkMencocokkan, checkIsian, checkUraian];
  checkInputs.forEach(chk => {
    if (chk) {
      chk.addEventListener('change', saveSoalFormState);
    }
  });
}

async function initSettings() {
  // Inisialisasi Tema (Default: Warm Paper)
  const themeData = await chrome.storage.local.get(['app_theme']);
  const currentTheme = themeData.app_theme || 'warm';
  applyTheme(currentTheme);

  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      const isDark = document.body.classList.contains('theme-dark');
      const newTheme = isDark ? 'warm' : 'dark';
      applyTheme(newTheme);
      chrome.storage.local.set({ app_theme: newTheme });
    });
  }

  // Toggle Ciut / Bentangkan Banner Maskot Hero
  const mascotBanner = document.getElementById('mascot-hero-banner');
  const btnToggleHeroBanner = document.getElementById('btn-toggle-hero-banner');
  const bannerToggleIcon = document.getElementById('banner-toggle-icon');

  if (mascotBanner && btnToggleHeroBanner) {
    chrome.storage.local.get(['banner_collapsed']).then(data => {
      if (data.banner_collapsed) {
        mascotBanner.classList.add('collapsed');
        if (bannerToggleIcon) bannerToggleIcon.textContent = '▼';
      }
    });

    btnToggleHeroBanner.addEventListener('click', () => {
      const isCollapsed = mascotBanner.classList.toggle('collapsed');
      if (bannerToggleIcon) {
        bannerToggleIcon.textContent = isCollapsed ? '▼' : '▲';
      }
      chrome.storage.local.set({ banner_collapsed: isCollapsed });
    });
  }

  // Toggle Ciut / Bentangkan Grid Shortcut Nomor Soal
  if (btnToggleQNav && questionNavGrid && qNavToggleIcon) {
    btnToggleQNav.addEventListener('click', () => {
      const isCollapsed = questionNavGrid.classList.toggle('collapsed');
      qNavToggleIcon.textContent = isCollapsed ? '▼' : '▲';
      btnToggleQNav.title = isCollapsed ? 'Bentangkan shortcut soal' : 'Ciutkan shortcut soal';
    });
  }

  // Tombol Kembali ke Paling Atas (Smooth Scroll to Top)
  if (btnScrollTop) {
    btnScrollTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (btnExpandForm) {
    btnExpandForm.addEventListener('click', () => {
      if (parameterFormBody && parameterSummaryBar) {
        parameterFormBody.classList.remove('hidden');
        parameterSummaryBar.classList.add('hidden');
      }
    });
  }

  if (checkIncludeImage && imageStyleContainer) {
    checkIncludeImage.addEventListener('change', () => {
      if (checkIncludeImage.checked) {
        imageStyleContainer.classList.remove('hidden');
      } else {
        imageStyleContainer.classList.add('hidden');
      }
    });
  }

  if (inputReplaceImage) {
    inputReplaceImage.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file || activeImageCardIndex < 0 || activeImageCardIndex >= currentQuestions.length) return;
      try {
        const base64 = await localFileToBase64(file);
        currentQuestions[activeImageCardIndex].gambar_base64 = base64;
        currentQuestions[activeImageCardIndex].gambar_svg = null;
        currentQuestions[activeImageCardIndex].butuh_gambar = true;
        await chrome.storage.local.set({ last_questions: currentQuestions });
        renderQuestionsList();
      } catch (err) {
        alert("Gagal membaca berkas gambar: " + err.message);
      } finally {
        inputReplaceImage.value = "";
      }
    });
  }

  const data = await chrome.storage.local.get(['gemini_api_key', 'gemini_model', 'last_questions']);
  if (data.gemini_api_key) {
    userApiKey = data.gemini_api_key;
    inputApiKey.value = userApiKey;
    // Lakukan verifikasi senyap untuk mengupdate badge status
    verifyKeyStatus(userApiKey, data.gemini_model || selectedModel);
  } else {
    // Tampilkan panel pengaturan jika kunci belum pernah diisi
    settingsPanel.classList.remove('hidden');
    updateKeyBadge("Belum Diisi", "neutral");
  }

  const storedModel = (data.gemini_model || "").replace(/^models\//, "").trim();
  if (!ALLOWED_MODELS.includes(storedModel)) {
    selectedModel = "gemini-3.5-flash-lite";
    await chrome.storage.local.set({ gemini_model: selectedModel });
  } else {
    selectedModel = storedModel;
  }
  selectModel.value = selectedModel;

  if (data.last_questions && Array.isArray(data.last_questions) && data.last_questions.length > 0) {
    currentQuestions = data.last_questions;
    currentQuestions.forEach((q, idx) => {
      if (q.originalIndex === undefined) {
        const parsedId = parseInt(String(q.id).replace(/\D/g, ''), 10);
        q.originalIndex = (!isNaN(parsedId) && parsedId > 0 && parsedId <= data.last_questions.length) ? parsedId : (idx + 1);
      }
    });
    renderQuestionsList();
    collapseParameterForm();
  }

  // Periksa apakah ada data mata pelajaran & kelas yang pernah terdeteksi sebelumnya
  const storedAcademic = await chrome.storage.local.get('afresto_detected_academic');
  if (storedAcademic && storedAcademic.afresto_detected_academic) {
    applyDetectedAcademic(storedAcademic.afresto_detected_academic);
  }

  // Pulihkan seluruh parameter form Soal Asesmen dan aktifkan auto-save
  await restoreSoalFormState();
  setupSoalAutoSave();

  checkActiveTabStatus();
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (btnToggleTheme) btnToggleTheme.title = "Ganti ke Mode Kertas Hangat (Siang Hari)";
  } else {
    document.body.classList.remove('theme-dark');
    if (themeIcon) themeIcon.textContent = '☀️';
    if (btnToggleTheme) btnToggleTheme.title = "Ganti ke Mode Dark Slate (Malam Hari)";
  }
}

function collapseParameterForm() {
  if (parameterSummaryBar && parameterFormBody && currentQuestions.length > 0) {
    const mapel = inputMapel ? inputMapel.value.trim() || "Mata Pelajaran Umum" : "Mata Pelajaran Umum";
    const kelas = selectKelas ? selectKelas.value || "Tingkat Umum" : "Tingkat Umum";
    if (summaryMapelKelas) {
      summaryMapelKelas.textContent = `${mapel} · ${kelas}`;
    }
    
    const parts = [];
    if (checkPg && checkPg.checked) parts.push(`${qtyPg.value} PG`);
    if (checkPgKompleks && checkPgKompleks.checked) parts.push(`${qtyPgKompleks.value} PGK`);
    if (checkBenarSalah && checkBenarSalah.checked) parts.push(`${qtyBenarSalah.value} B/S`);
    if (checkMencocokkan && checkMencocokkan.checked) parts.push(`${qtyMencocokkan.value} Jodoh`);
    if (checkIsian && checkIsian.checked) parts.push(`${qtyIsian.value} Isian`);
    if (checkUraian && checkUraian.checked) parts.push(`${qtyUraian.value} Uraian`);
    
    if (summaryComposition) {
      const typeSummary = parts.length > 0 ? parts.join(', ') : 'Paket Soal';
      summaryComposition.textContent = `${typeSummary} (${currentQuestions.length} Butir Soal Terkunci)`;
    }
    parameterFormBody.classList.add('hidden');
    parameterSummaryBar.classList.remove('hidden');
  }
}

function applyDetectedAcademic(detected) {
  if (!detected || !detected.mapel) return;

  // Auto-fill jika input mapel masih kosong atau sebelumnya diisi otomatis
  if (!inputMapel.value.trim() || inputMapel.dataset.autoFilled === "true") {
    inputMapel.value = detected.mapel;
    inputMapel.dataset.autoFilled = "true";
  }

  if (detected.kelas) {
    const options = Array.from(selectKelas.options);
    const matched = options.find(opt => 
      opt.value.toLowerCase().includes(detected.kelas.toLowerCase()) || 
      opt.textContent.toLowerCase().includes(detected.kelas.toLowerCase())
    );
    if (matched) {
      selectKelas.value = matched.value;
    }
  }

  // Tampilkan badge informatif
  if (detectedAcademicBadge && detectedText) {
    detectedText.textContent = `${detected.mapel} — ${detected.kelas || "Umum"}`;
    detectedAcademicBadge.classList.remove('hidden');
  }
}

async function verifyKeyStatus(key, model) {
  updateKeyBadge("Memeriksa...", "checking");
  const gemini = new GeminiService(key, model);
  const result = await gemini.testConnection();
  if (result.success) {
    updateKeyBadge("🟢 Terhubung", "success");
    if (result.models && result.models.length > 0) {
      populateModelSelect(result.models);
    }
  } else {
    updateKeyBadge("🔴 Tidak Terhubung", "error");
  }
}

function populateModelSelect(onlineModels) {
  if (!onlineModels || !Array.isArray(onlineModels) || onlineModels.length === 0) return;
  const flashModels = onlineModels.filter(m => m.includes("flash"));
  if (flashModels.length === 0) return;

  const currentVal = selectModel.value;
  selectModel.innerHTML = "";
  flashModels.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    let label = m;
    if (m === "gemini-3.8-flash") label = "Gemini 3.8 Flash (Paling Cerdas & Mutakhir)";
    else if (m === "gemini-3.6-flash") label = "Gemini 3.6 Flash (Sangat Cepat & Andal)";
    else if (m === "gemini-3.5-flash-lite") label = "Gemini 3.5 Flash-Lite (Super Ringan & Cepat)";
    else if (m === "gemini-2.5-flash") label = "Gemini 2.5 Flash (Stabil)";
    else if (m === "gemini-2.0-flash") label = "Gemini 2.0 Flash (Standar Produksi)";
    opt.textContent = label;
    selectModel.appendChild(opt);
  });

  if (flashModels.includes(currentVal)) {
    selectModel.value = currentVal;
  } else if (flashModels.includes(selectedModel)) {
    selectModel.value = selectedModel;
  } else {
    selectModel.value = flashModels[0];
    selectedModel = flashModels[0];
  }
}

function updateKeyBadge(text, state) {
  if (!apiKeyStatusBadge) return;
  apiKeyStatusBadge.textContent = text;
  if (state === "success") {
    apiKeyStatusBadge.style.background = "rgba(16, 185, 129, 0.2)";
    apiKeyStatusBadge.style.color = "#34d399";
  } else if (state === "error") {
    apiKeyStatusBadge.style.background = "rgba(244, 63, 94, 0.2)";
    apiKeyStatusBadge.style.color = "#fda4af";
  } else if (state === "checking") {
    apiKeyStatusBadge.style.background = "rgba(245, 158, 11, 0.2)";
    apiKeyStatusBadge.style.color = "#fbbf24";
  } else {
    apiKeyStatusBadge.style.background = "rgba(148, 163, 184, 0.2)";
    apiKeyStatusBadge.style.color = "#94a3b8";
  }
}

// ------------------------------------------------------------------------
// 2. DETEKSI STATUS HALAMAN AFRESTO
// ------------------------------------------------------------------------

let currentActiveModule = 'soal'; // 'soal' | 'materi'

async function checkActiveTabStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      updateStatusBanner(false, "Tidak ada tab aktif.");
      return;
    }

    const tabUrl = (tab.url || "").toLowerCase();
    const isMateriTab = (currentActiveModule === 'materi');
    const standbyText = isMateriTab
      ? "Standby: Buka menu KBM → Materi Pembelajaran di Afresto."
      : "Standby: Buka menu Evaluasi → Buat Evaluasi AKM → Tulis Soal Baru.";

    // 1. Cek apakah tab berada di domain Afresto
    if (!tabUrl.includes("afresto.id")) {
      updateStatusBanner(false, "Standby: Buka portal Afresto di tab browser.");
      return;
    }

    // 2. Filter instan berdasarkan URL: modul non-operasional langsung set Standby sesuai modul yang sedang aktif
    const nonOperationalModules = ['jurnal', 'presensi', 'rekap', 'kalender', 'profil', 'dashboard', 'silabus', 'rpp'];
    if (nonOperationalModules.some(m => tabUrl.includes(m))) {
      updateStatusBanner(false, standbyText);
      return;
    }

    // 3. Tanya content script untuk verifikasi fisik form di DOM
    chrome.tabs.sendMessage(tab.id, { action: "CHECK_PAGE_STATUS" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        // Self-healing auto-inject jika tab belum reload setelah ekstensi di-update
        if (tabUrl.includes("afresto.id") && chrome.scripting && chrome.scripting.executeScript) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/injector.js']
          }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: "CHECK_PAGE_STATUS" }, (retryRes) => {
                if (retryRes) {
                  processPageStatus(retryRes, isMateriTab, standbyText);
                } else {
                  updateStatusBanner(false, standbyText);
                }
              });
            }, 200);
          }).catch(() => {
            updateStatusBanner(false, standbyText);
          });
          return;
        }
        updateStatusBanner(false, standbyText);
        return;
      }

      processPageStatus(res, isMateriTab, standbyText);
    });
  } catch (err) {
    updateStatusBanner("waiting", "Menghubungkan ke tab...");
  }
}

function processPageStatus(res, isMateriTab, standbyText) {
  if (res.detectedAcademic) {
    applyDetectedAcademic(res.detectedAcademic);
  }

  if (isMateriTab) {
    // --- LOGIKA STATUS ADAPTIF KETIKA DI TAB MATERI & BAHAN AJAR ---
    if (res.isMateriPage) {
      updateStatusBanner("active", "Terhubung: Halaman Input Materi Afresto Aktif!");
      updateMateriPageDetection(res.detectedAcademic);
    } else if (res.isSoalPage) {
      updateStatusBanner("prep", "Halaman Soal Terdeteksi. Buka menu KBM → Materi jika ingin mengisi bahan ajar.");
    } else if (res.detectedAcademic && res.detectedAcademic.mapel) {
      updateStatusBanner("prep", `Mode Persiapan: Mapel ${res.detectedAcademic.mapel} Terdeteksi! (Buka menu Materi untuk input)`);
    } else {
      updateStatusBanner("waiting", standbyText);
    }
  } else {
    // --- LOGIKA STATUS ADAPTIF KETIKA DI TAB SOAL ASESMEN ---
    if (res.isSoalPage) {
      updateStatusBanner("active", "Terhubung: Halaman Input Soal Afresto Aktif!");
    } else if (res.isMateriPage) {
      updateStatusBanner("prep", "Halaman Materi Terdeteksi. Buka menu Evaluasi → Butir Soal jika ingin input soal.");
    } else if (res.detectedAcademic && res.detectedAcademic.mapel) {
      updateStatusBanner("prep", `Mode Persiapan: Mapel ${res.detectedAcademic.mapel} Terdeteksi! (Buka 'Butir Soal' untuk input)`);
    } else {
      updateStatusBanner("waiting", standbyText);
    }
  }
}

function updateStatusBanner(state, message) {
  pageStatusText.textContent = message;
  if (state === true || state === "active") {
    pageStatusBanner.className = "status-banner status-active";
  } else if (state === "prep") {
    pageStatusBanner.className = "status-banner status-prep";
  } else {
    pageStatusBanner.className = "status-banner status-waiting";
  }
}

// Handler Tombol Sinkronisasi Manual dengan Self-Healing Auto-Injeksi
if (btnSyncAcademic) {
  btnSyncAcademic.addEventListener('click', async () => {
    btnSyncAcademic.disabled = true;
    btnSyncAcademic.textContent = "🔄 Memindai...";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      alert("Tidak ada tab browser aktif.");
      btnSyncAcademic.disabled = false;
      btnSyncAcademic.textContent = "🔄 Sinkronkan Data";
      return;
    }

    const requestSync = () => {
      chrome.tabs.sendMessage(tab.id, { action: "SYNC_ACADEMIC_INFO" }, (res) => {
        if (chrome.runtime.lastError) {
          // Jika tab belum di-refresh setelah ekstensi di-reload, suntikkan script secara dinamis
          if (chrome.scripting && chrome.scripting.executeScript) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['scripts/injector.js']
            }).then(() => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: "SYNC_ACADEMIC_INFO" }, (retryRes) => {
                  btnSyncAcademic.disabled = false;
                  btnSyncAcademic.textContent = "🔄 Sinkronkan Data";
                  if (retryRes && retryRes.detected) {
                    applyDetectedAcademic(retryRes.detected);
                  } else {
                    alert("Data mata pelajaran belum terbaca di halaman ini. Silakan tekan F5 (Refresh) pada tab Afresto Anda sekali.");
                  }
                });
              }, 200);
            }).catch(() => {
              btnSyncAcademic.disabled = false;
              btnSyncAcademic.textContent = "🔄 Sinkronkan Data";
              alert("Koneksi ke tab Afresto terputus. Silakan tekan F5 (Refresh) pada tab Afresto Anda.");
            });
            return;
          }

          btnSyncAcademic.disabled = false;
          btnSyncAcademic.textContent = "🔄 Sinkronkan Data";
          alert("Koneksi ke tab Afresto terputus. Silakan tekan F5 (Refresh) pada tab Afresto Anda.");
          return;
        }

        btnSyncAcademic.disabled = false;
        btnSyncAcademic.textContent = "🔄 Sinkronkan Data";

        if (res && res.detected) {
          applyDetectedAcademic(res.detected);
        } else {
          alert("Data mata pelajaran belum terbaca di halaman ini. Silakan tekan F5 (Refresh) pada tab Afresto Anda sekali.");
        }
      });
    };

    requestSync();
  });
}

// ------------------------------------------------------------------------
// 3. LOGIKA SOFT WARNING TUJUAN PEMBELAJARAN (TP)
// ------------------------------------------------------------------------

function checkTpSoftWarning() {
  const tpVal = inputTp.value.trim();
  const materiVal = inputMateri.value.trim();
  const promptVal = inputPrompt.value.trim();

  // Jika TP kosong namun guru mulai mengisi Materi atau Prompt Tambahan
  if (tpVal.length === 0 && (materiVal.length > 0 || promptVal.length > 0)) {
    tpSoftWarning.classList.remove('hidden');
  } else {
    tpSoftWarning.classList.add('hidden');
  }
}

inputTp.addEventListener('input', checkTpSoftWarning);
inputMateri.addEventListener('input', checkTpSoftWarning);
inputPrompt.addEventListener('input', checkTpSoftWarning);

// ------------------------------------------------------------------------
// 4. HANDLERS PENGATURAN KUNCI GEMINI (BYOK)
// ------------------------------------------------------------------------

btnToggleSettings.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

btnToggleKeyVis.addEventListener('click', () => {
  if (inputApiKey.type === 'password') {
    inputApiKey.type = 'text';
    btnToggleKeyVis.textContent = '🔒';
  } else {
    inputApiKey.type = 'password';
    btnToggleKeyVis.textContent = '👁️';
  }
});

btnTestKey.addEventListener('click', async () => {
  const key = inputApiKey.value.trim();
  if (!key) {
    showSettingsAlert("Masukkan API Key terlebih dahulu!", false);
    updateKeyBadge("Belum Diisi", "neutral");
    return;
  }

  btnTestKey.disabled = true;
  btnTestKey.textContent = "Menguji...";
  updateKeyBadge("Menguji...", "checking");

  const gemini = new GeminiService(key, selectModel.value);
  const result = await gemini.testConnection();

  if (result.success && result.models && result.models.length > 0) {
    populateModelSelect(result.models);
  }

  showSettingsAlert(result.message, result.success);
  updateKeyBadge(result.success ? "🟢 Terhubung" : "🔴 Gagal", result.success ? "success" : "error");

  btnTestKey.disabled = false;
  btnTestKey.textContent = "🔍 Tes Koneksi";
});

btnSaveKey.addEventListener('click', async () => {
  const key = inputApiKey.value.trim();
  if (!key) {
    showSettingsAlert("Kunci API tidak boleh kosong!", false);
    updateKeyBadge("Belum Diisi", "neutral");
    return;
  }

  btnSaveKey.disabled = true;
  btnSaveKey.textContent = "Memverifikasi...";
  updateKeyBadge("Memverifikasi...", "checking");

  // Otomatis uji koneksi saat tombol simpan diklik
  const gemini = new GeminiService(key, selectModel.value);
  const result = await gemini.testConnection();

  if (result.success) {
    if (result.models && result.models.length > 0) {
      populateModelSelect(result.models);
    }

    userApiKey = key;
    selectedModel = selectModel.value;

    await chrome.storage.local.set({
      gemini_api_key: userApiKey,
      gemini_model: selectedModel
    });

    updateKeyBadge("🟢 Terhubung", "success");
    showSettingsAlert("✅ Kunci API Valid & Berhasil Disimpan Permanen!", true);
    setTimeout(() => settingsPanel.classList.add('hidden'), 2000);
  } else {
    updateKeyBadge("🔴 Gagal", "error");
    showSettingsAlert(`${result.message}. Mohon periksa kembali API Key Anda.`, false);
  }

  btnSaveKey.disabled = false;
  btnSaveKey.textContent = "💾 Simpan Kunci";
});

function showSettingsAlert(msg, isSuccess) {
  settingsAlert.textContent = msg;
  settingsAlert.className = isSuccess ? "alert alert-success" : "alert alert-error";
  settingsAlert.classList.remove('hidden');
}

// ------------------------------------------------------------------------
// 4.5. TAB PEMILIHAN SUMBER SOAL: BUAT AI VS UPLOAD WORD (.DOCX)
// ------------------------------------------------------------------------

function applySwitchSource(targetMode) {
  if (targetMode === 'ai') {
    tabSourceAi.classList.add('active');
    tabSourceAi.setAttribute('aria-selected', 'true');
    tabSourceDocx.classList.remove('active');
    tabSourceDocx.setAttribute('aria-selected', 'false');

    if (aiGeneratorFields) aiGeneratorFields.classList.remove('hidden');
    if (docxIngestionContainer) docxIngestionContainer.classList.add('hidden');
  } else {
    tabSourceDocx.classList.add('active');
    tabSourceDocx.setAttribute('aria-selected', 'true');
    tabSourceAi.classList.remove('active');
    tabSourceAi.setAttribute('aria-selected', 'false');

    if (docxIngestionContainer) docxIngestionContainer.classList.remove('hidden');
    if (aiGeneratorFields) aiGeneratorFields.classList.add('hidden');
  }
}

function requestSwitchSource(targetMode) {
  const isCurrentlyAi = tabSourceAi.classList.contains('active');
  const isCurrentlyDocx = tabSourceDocx.classList.contains('active');

  if ((targetMode === 'ai' && isCurrentlyAi) || (targetMode === 'docx' && isCurrentlyDocx)) {
    return;
  }

  // Jika playlist berisi soal, beri peringatan konfirmasi sebelum beralih
  if (currentQuestions && currentQuestions.length > 0) {
    const modal = document.getElementById('modal-switch-mode-confirm');
    const countEl = document.getElementById('switch-modal-count');
    if (modal) {
      if (countEl) countEl.textContent = `${currentQuestions.length} butir soal`;
      modal.setAttribute('data-target-mode', targetMode);
      modal.classList.remove('hidden');
      return;
    }
  }

  applySwitchSource(targetMode);
}

if (tabSourceAi && tabSourceDocx) {
  tabSourceAi.addEventListener('click', () => requestSwitchSource('ai'));
  tabSourceDocx.addEventListener('click', () => requestSwitchSource('docx'));
}

// Modal Konfirmasi Proteksi Playlist Handlers
const modalSwitchConfirm = document.getElementById('modal-switch-mode-confirm');
const btnCloseSwitchModal = document.getElementById('btn-close-switch-modal');
const btnSwitchCancel = document.getElementById('btn-switch-cancel');
const btnSwitchClearPlaylist = document.getElementById('btn-switch-clear-playlist');
const btnSwitchKeepPlaylist = document.getElementById('btn-switch-keep-playlist');

if (btnCloseSwitchModal) {
  btnCloseSwitchModal.addEventListener('click', () => modalSwitchConfirm?.classList.add('hidden'));
}
if (btnSwitchCancel) {
  btnSwitchCancel.addEventListener('click', () => modalSwitchConfirm?.classList.add('hidden'));
}
if (btnSwitchKeepPlaylist) {
  btnSwitchKeepPlaylist.addEventListener('click', () => {
    const targetMode = modalSwitchConfirm?.getAttribute('data-target-mode') || 'ai';
    modalSwitchConfirm?.classList.add('hidden');
    applySwitchSource(targetMode);
  });
}
if (btnSwitchClearPlaylist) {
  btnSwitchClearPlaylist.addEventListener('click', async () => {
    const targetMode = modalSwitchConfirm?.getAttribute('data-target-mode') || 'ai';
    currentQuestions = [];
    await chrome.storage.local.set({ last_questions: [] });
    renderQuestionsList();
    if (resultsSection) resultsSection.classList.add('hidden');
    modalSwitchConfirm?.classList.add('hidden');
    applySwitchSource(targetMode);
    showToast('Daftar antrean soal berhasil dikosongkan.', 'info');
  });
}

// Handler Tombol Unduh Template Resmi DOCX
const btnDownloadTemplate = document.getElementById('btn-download-template');
if (btnDownloadTemplate) {
  btnDownloadTemplate.addEventListener('click', () => {
    try {
      const templateUrl = chrome.runtime.getURL('TEMPLATE_SOAL_AFRESTO.docx');
      const a = document.createElement('a');
      a.href = templateUrl;
      a.download = 'TEMPLATE_SOAL_AFRESTO.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Mengunduh template naskah Word resmi Afresto...', 'info');
    } catch (e) {
      console.warn('Fallback download template via fetch:', e);
      window.open('TEMPLATE_SOAL_AFRESTO.docx', '_blank');
    }
  });
}

// Handler Tombol Unduh Buku Panduan PDF Resmi
const btnDownloadGuide = document.getElementById('btn-download-guide');
if (btnDownloadGuide) {
  btnDownloadGuide.addEventListener('click', () => {
    try {
      const guideUrl = chrome.runtime.getURL('PANDUAN_TUTORIAL_AFRESTO_AI.pdf');
      const a = document.createElement('a');
      a.href = guideUrl;
      a.download = 'PANDUAN_TUTORIAL_AFRESTO_AI.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Mengunduh buku panduan PDF resmi Afresto AI...', 'info');
    } catch (e) {
      console.warn('Fallback download guide via fetch:', e);
      window.open('PANDUAN_TUTORIAL_AFRESTO_AI.pdf', '_blank');
    }
  });
}

// ------------------------------------------------------------------------
// 4.6. ZONA UPLOAD & DRAG-AND-DROP BERKAS WORD (.DOCX)
// ------------------------------------------------------------------------

if (docxDropBox && inputDocxFile) {
  docxDropBox.addEventListener('click', () => {
    inputDocxFile.click();
  });

  docxDropBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    docxDropBox.classList.add('drag-over');
  });

  docxDropBox.addEventListener('dragleave', () => {
    docxDropBox.classList.remove('drag-over');
  });

  docxDropBox.addEventListener('drop', (e) => {
    e.preventDefault();
    docxDropBox.classList.remove('drag-over');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleDocxFileSelected(file);
  });

  inputDocxFile.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleDocxFileSelected(file);
  });
}

if (btnCancelDocx) {
  btnCancelDocx.addEventListener('click', () => {
    resetDocxUpload();
  });
}

function resetDocxUpload() {
  parsedDocxData = null;
  if (inputDocxFile) inputDocxFile.value = '';
  if (docxSummaryBox) docxSummaryBox.classList.add('hidden');
  if (docxDropBox) docxDropBox.classList.remove('hidden');
  if (docxAlert) docxAlert.classList.add('hidden');
}

async function handleDocxFileSelected(file) {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    showDocxAlert("Format berkas harus berupa Microsoft Word (.docx).", false);
    return;
  }

  try {
    showDocxAlert("Membaca dan mem-parsing dokumen secara lokal...", true);
    const arrayBuffer = await file.arrayBuffer();
    const result = await parseDocx(arrayBuffer);

    parsedDocxData = result;

    if (docxFilename) docxFilename.textContent = file.name;
    if (docxFilesize) docxFilesize.textContent = `${Math.round(file.size / 1024)} KB`;

    if (docxStatParagraf) docxStatParagraf.textContent = String(result.stats.paragraphCount);
    if (docxStatTabel) docxStatTabel.textContent = String(result.stats.tableCount);
    if (docxStatGambar) docxStatGambar.textContent = String(result.stats.imageCount);
    if (docxStatSoal) docxStatSoal.textContent = String(result.stats.detectedQuestionsCount || 0);

    if (docxDropBox) docxDropBox.classList.add('hidden');
    if (docxSummaryBox) docxSummaryBox.classList.remove('hidden');

    const qCount = result.stats.detectedQuestionsCount || 0;
    showDocxAlert(`✓ Berhasil membaca dokumen! Terdeteksi ${qCount} butir soal, ${result.stats.paragraphCount} paragraf & ${result.stats.tableCount} tabel.`, true);
  } catch (err) {
    console.error("Gagal membaca DOCX:", err);
    showDocxAlert(`Gagal membaca berkas Word: ${err.message}`, false);
    resetDocxUpload();
  }
}

function showDocxAlert(msg, isSuccess) {
  if (!docxAlert) return;
  docxAlert.textContent = msg;
  docxAlert.className = isSuccess ? "alert alert-success" : "alert alert-error";
  docxAlert.classList.remove('hidden');
}

/**
 * Notifikasi Toast Ringan untuk Side Panel (CSP-Safe & Non-blocking)
 */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('sidepanel-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'sidepanel-toast-container';
    toastContainer.style.cssText = 'position: fixed; bottom: 65px; left: 12px; right: 12px; z-index: 9999; display: flex; flex-direction: column; gap: 6px; pointer-events: none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? '#16a34a' : (type === 'warning' ? '#d97706' : (type === 'error' ? '#dc2626' : '#2563eb'));
  const icon = type === 'success' ? '✓' : (type === 'warning' ? '⚠️' : (type === 'error' ? '⛔' : 'ℹ️'));

  toast.style.cssText = `background: ${bg}; color: #ffffff; padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 8px; pointer-events: auto; animation: fadeIn 0.2s ease-out; transition: opacity 0.25s, transform 0.25s;`;
  toast.innerHTML = `<span>${icon}</span><span style="flex:1; line-height: 1.35;">${String(message).replace(/</g, '&lt;')}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 280);
  }, 3500);
}

// ------------------------------------------------------------------------
// 4.7. KONVERSI NASKAH WORD KE PLAYLIST SOAL (DIRECT & AI ENGINE)
// ------------------------------------------------------------------------

if (btnConvertDocx) {
  btnConvertDocx.addEventListener('click', async () => {
    if (!parsedDocxData || !parsedDocxData.rawText) {
      showDocxAlert("Belum ada dokumen Word yang dimuat.", false);
      return;
    }

    const useAi = checkDocxUseAi ? checkDocxUseAi.checked : false;

    // METODE 1: IMPOR LANGSUNG 100% PERSIS KATA DEMI KATA (DEFAULT & REKOMENDASI)
    if (!useAi) {
      const directList = parsedDocxData.directQuestions || [];
      if (directList.length === 0) {
        showDocxAlert("Pola butir soal tidak terdeteksi otomatis. Silakan centang 'Gunakan AI Gemini' di atas untuk restrukturisasi cerdas.", false);
        return;
      }

      directList.forEach((q, idx) => {
        if (q.originalIndex === undefined) {
          const parsedId = parseInt(String(q.id).replace(/\D/g, ''), 10);
          q.originalIndex = (!isNaN(parsedId) && parsedId > 0 && parsedId <= directList.length) ? parsedId : (idx + 1);
        }
      });
      currentQuestions = directList;
      await chrome.storage.local.set({ last_questions: currentQuestions });

      renderQuestionsList();
      if (resultsSection) resultsSection.classList.remove('hidden');
      collapseParameterForm(`Impor Word: ${directList.length} Soal Persis Asli`);

      showDocxAlert(`🎉 Sukses mengimpor ${directList.length} butir soal 100% persis teks Word asli ke playlist!`, true);
      resultsSection.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // METODE 2: RESTRUKTURISASI CERDAS VIA GEMINI (JIKA DICENTANG OLEH GURU)
    if (!userApiKey) {
      settingsPanel.classList.remove('hidden');
      showSettingsAlert("Silakan simpan Kunci Gemini API Anda terlebih dahulu jika ingin menggunakan AI!", false);
      return;
    }

    const btnText = btnConvertDocx.querySelector('.btn-text');
    const spinner = btnConvertDocx.querySelector('.spinner');
    btnConvertDocx.disabled = true;
    if (btnText) btnText.textContent = "Sedang Menstrukturkan via Gemini...";
    if (spinner) spinner.classList.remove('hidden');

    try {
      const gemini = new GeminiService(userApiKey, selectedModel);
      const structuredResult = await gemini.structureDocxQuestions(parsedDocxData.rawText, parsedDocxData.images);

      if (structuredResult.detected_mapel && inputMapel && !inputMapel.value.trim()) {
        inputMapel.value = structuredResult.detected_mapel;
      }
      if (structuredResult.detected_kelas && selectKelas) {
        selectKelas.value = structuredResult.detected_kelas;
      }

      const newSoalList = structuredResult.soal_list || [];
      if (newSoalList.length === 0) {
        throw new Error("AI tidak menemukan butir soal yang dapat dikenali dalam dokumen ini.");
      }

      // Masukkan soal ke dalam playlist
      newSoalList.forEach((q, idx) => {
        if (q.originalIndex === undefined) {
          const parsedId = parseInt(String(q.id).replace(/\D/g, ''), 10);
          q.originalIndex = (!isNaN(parsedId) && parsedId > 0 && parsedId <= newSoalList.length) ? parsedId : (idx + 1);
        }
      });
      currentQuestions = newSoalList;
      await chrome.storage.local.set({ last_questions: currentQuestions });

      // Render playlist & ciutkan accordion
      renderQuestionsList();
      if (resultsSection) resultsSection.classList.remove('hidden');
      collapseParameterForm(`Ingesti Word (AI): ${newSoalList.length} Butir Soal Terbaca`);

      showDocxAlert(`🎉 Berhasil mengimpor ${newSoalList.length} butir soal via Gemini ke playlist!`, true);

      // Gulir mulus ke playlist
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error("Gagal mengonversi Word via AI:", err);
      showDocxAlert(`Gagal menstrukturkan soal: ${err.message}`, false);
    } finally {
      btnConvertDocx.disabled = false;
      if (btnText) btnText.textContent = "⚡ Impor Soal ke Playlist";
      if (spinner) spinner.classList.add('hidden');
    }
  });
}

// ------------------------------------------------------------------------
// 5. GENERATE SOAL VIA GEMINI API
// ------------------------------------------------------------------------

btnGenerate.addEventListener('click', async () => {
  if (!userApiKey) {
    settingsPanel.classList.remove('hidden');
    showSettingsAlert("Silakan simpan Kunci Gemini API Anda terlebih dahulu!", false);
    return;
  }

  // Hitung distribusi tipe soal yang dipilih
  const distribusi = {
    PG: checkPg.checked ? Number(qtyPg.value) || 0 : 0,
    PG_KOMPLEKS: checkPgKompleks.checked ? Number(qtyPgKompleks.value) || 0 : 0,
    BENAR_SALAH: checkBenarSalah.checked ? Number(qtyBenarSalah.value) || 0 : 0,
    MENCOCOKKAN: checkMencocokkan && checkMencocokkan.checked ? Number(qtyMencocokkan.value) || 0 : 0,
    ISIAN: checkIsian.checked ? Number(qtyIsian.value) || 0 : 0,
    URAIAN: checkUraian.checked ? Number(qtyUraian.value) || 0 : 0
  };

  const totalQty = Object.values(distribusi).reduce((a, b) => a + b, 0);
  if (totalQty === 0) {
    alert("Pilih minimal satu tipe soal dengan jumlah lebih dari 0!");
    return;
  }

  setGenerateLoading(true);

  // Bagi pembuatan soal menjadi tugas bertahap (micro-batches per tipe)
  // Menjamin butir soal yang selesai langsung masuk playlist secara progresif
  const tasks = [];
  for (const [type, qty] of Object.entries(distribusi)) {
    let remaining = Number(qty);
    while (remaining > 0) {
      const take = Math.min(remaining, 3); // Maksimal 3 butir per batch agar respons cepat (<12 detik) & progresif
      tasks.push({ type, qty: take });
      remaining -= take;
    }
  }

  const initialCount = currentQuestions.length;
  let successCount = 0;
  let failedTaskError = null;

  try {
    let activeModel = (selectedModel || "").replace(/^models\//, "").trim();
    if (!ALLOWED_MODELS.includes(activeModel)) {
      activeModel = "gemini-3.8-flash";
    }
    const gemini = new GeminiService(userApiKey, activeModel);

    for (let tIndex = 0; tIndex < tasks.length; tIndex++) {
      const task = tasks[tIndex];
      const friendlyTypeName = task.type.replace('_', ' ');

      const btnText = btnGenerate.querySelector('.btn-text');
      let elapsedSec = 0;
      let currentStatusPrefix = `Merancang ${task.qty} butir ${friendlyTypeName} (${tIndex + 1}/${tasks.length})`;

      const updateBtnDisplay = () => {
        if (btnText) {
          btnText.textContent = `${currentStatusPrefix} [${elapsedSec}s]...`;
        }
      };
      updateBtnDisplay();

      const timerInterval = setInterval(() => {
        elapsedSec++;
        updateBtnDisplay();
      }, 1000);

      try {
        const isImageRequested = checkIncludeImage ? checkIncludeImage.checked : false;
        const chosenStyle = selectImageStyle ? selectImageStyle.value : "AUTO";

        const chunkQuestions = await gemini.generateQuestions({
          mapel: inputMapel.value.trim(),
          kelas: selectKelas.value,
          materiPokok: inputMateri.value.trim(),
          tujuanPembelajaran: inputTp.value.trim(),
          customPrompt: inputPrompt.value.trim(),
          tingkatKognitif: selectKognitif.value,
          distribusiTipe: { [task.type]: task.qty },
          includeImage: isImageRequested,
          imageStyle: chosenStyle
        }, (statusMsg) => {
          currentStatusPrefix = statusMsg;
          updateBtnDisplay();
        });

        clearInterval(timerInterval);

        if (chunkQuestions && chunkQuestions.length > 0) {
          // Proses download ilustrasi gambar AI atau fallback SVG jika diperlukan
          for (let qIdx = 0; qIdx < chunkQuestions.length; qIdx++) {
            const q = chunkQuestions[qIdx];

            // 1. Jika Gemini sudah menyediakan kode diagram SVG presisi (kurva, geometri, diagram teknik), prioritaskan SVG
            if (q.gambar_svg && typeof q.gambar_svg === "string" && q.gambar_svg.includes('<svg')) {
              q.butuh_gambar = true;
              continue;
            }

            // 2. Evaluasi apakah butir soal ini memang relevan membutuhkan gambar
            const promptHasImage = (inputPrompt.value || "").toLowerCase().match(/\b(gambar|foto|ilustrasi|sketsa)\b/);
            const questionNeedsVisual = q.butuh_gambar || (isImageRequested && (q.gambar_prompt || promptHasImage)) || false;

            if (questionNeedsVisual) {
              const tpContext = (inputTp && inputTp.value.trim()) ? inputTp.value.trim() : "";
              const rawPrompt = q.gambar_prompt || (tpContext ? `${tpContext}: ${q.pertanyaan.substring(0, 80)}` : `${inputMateri.value.trim()} ${q.pertanyaan.substring(0, 80)}`);
              const enhancedPrompt = buildEnhancedImagePrompt(rawPrompt, chosenStyle);
              const imgUrl = getPollinationsImageUrl(enhancedPrompt, 540, 360);

              if (btnText) {
                btnText.textContent = `Mengunduh ilustrasi gambar AI (#${qIdx + 1})...`;
              }

              try {
                const base64 = await downloadImageAsBase64(imgUrl, 60000, (statusMsg) => {
                  if (btnText) {
                    btnText.textContent = `${statusMsg} (#${qIdx + 1})`;
                  }
                });
                q.gambar_base64 = base64;
                q.butuh_gambar = true;
              } catch (imgErr) {
                console.warn(`Gagal mengunduh gambar AI untuk butir #${qIdx + 1}:`, imgErr);
                // Hanya gunakan fallback SVG jika pertanyaan eksplisit meminta siswa memperhatikan gambar
                const promptRefersToVisual = /perhatikan\s+(?:gambar|diagram|grafik|tabel|bagan|ilustrasi)|berdasarkan\s+(?:gambar|diagram|grafik)/i.test(q.pertanyaan || "");
                if (promptRefersToVisual) {
                  let svgSubject = tpContext || inputMateri.value.trim() || inputMapel.value.trim() || "Diagram Konsep";
                  svgSubject = svgSubject.replace(/\b(?:buatkan|buat|soal|matematika|jenjang|sma|smk|smp|sd)\b/gi, '').trim() || "Ilustrasi Materi";
                  q.gambar_svg = generateFallbackSvg(svgSubject, "Silakan unggah ilustrasi naskah melalui tombol Ganti File");
                  q.butuh_gambar = true;
                } else {
                  // Jika soal tidak wajib gambar visual, bersihkan agar tidak muncul placeholder kosong
                  q.gambar_base64 = null;
                  q.gambar_svg = null;
                  q.butuh_gambar = false;
                }
              }
            } else {
              // Soal perhitungan / konseptual murni tanpa kebutuhan gambar
              q.gambar_base64 = null;
              q.gambar_svg = null;
              q.butuh_gambar = false;
            }
          }

          // Tambahkan metadata ID unik, status awal READY, dan nomor urut asli awal
          const startIdx = currentQuestions.length;
          const tagged = chunkQuestions.map((q, qIdx) => ({
            ...q,
            originalIndex: q.originalIndex !== undefined ? q.originalIndex : (startIdx + qIdx + 1),
            id: `q_${Date.now()}_${tIndex}_${qIdx}_${Math.random().toString(36).substr(2, 4)}`,
            status: "READY"
          }));

          currentQuestions.push(...tagged);
          successCount += tagged.length;

          // SEGERA SIMPAN KE STORAGE & TAMPILKAN KE PLAYLIST SECARA LIVE!
          await chrome.storage.local.set({ last_questions: currentQuestions });
          collapseParameterForm();
          renderQuestionsList();
        }

        // Jeda nafas anti-burst (1.2 - 1.7 detik) antar-batch agar tidak terkena limit RPM Free Tier
        if (tIndex < tasks.length - 1) {
          const cooldownMs = 1200 + Math.floor(Math.random() * 500);
          await new Promise(resolve => setTimeout(resolve, cooldownMs));
        }
      } catch (err) {
        clearInterval(timerInterval);
        console.error(`Gagal pada batch ${task.type}:`, err);
        failedTaskError = err;
        // Hentikan sisa batch, namun soal yang telah berhasil tetap tersimpan aman di playlist
        break;
      }
    }

    if (failedTaskError) {
      if (successCount > 0) {
        alert(`⚠️ ${successCount} butir soal berhasil masuk ke Daftar Soal!\n\nNamun pembuatan butir berikutnya terhenti karena kendala server/antrean: ${failedTaskError.message}.\n\nJangan khawatir: ${successCount} butir soal yang sudah ada di Daftar Soal tetap aman dan siap Anda inputkan sekarang.`);
      } else {
        alert("Gagal men-generate soal: " + failedTaskError.message);
      }
    }
  } finally {
    setGenerateLoading(false);
  }
});

function setGenerateLoading(isLoading) {
  isGenerating = isLoading;
  const btnText = btnGenerate.querySelector('.btn-text');
  const spinner = btnGenerate.querySelector('.spinner');
  btnGenerate.disabled = isLoading;

  if (isLoading) {
    btnText.textContent = "Sedang Merancang Butir Soal...";
    spinner.classList.remove('hidden');
    // Kunci tombol input otomatis selama proses perancangan soal berjalan
    if (btnAutoInputAll) {
      btnAutoInputAll.disabled = true;
      btnAutoInputAll.className = "btn btn-secondary btn-block btn-lg";
      btnAutoInputAll.textContent = "⏳ Sedang Merancang Soal (Input Otomatis Dikunci)...";
    }
  } else {
    btnText.textContent = "✨ Generate Paket Soal via Gemini";
    spinner.classList.add('hidden');
    // Perbarui kembali status dan tombol input otomatis setelah selesai
    renderQuestionsList();
  }
}

// ------------------------------------------------------------------------
// 6.0 QUICK QUESTION NAVIGATOR (SHORTCUT NOMOR SOAL HOVER)
// ------------------------------------------------------------------------

function renderQuestionNavigator(questions) {
  if (!questionNavBar || !questionNavGrid) return;

  if (!questions || questions.length === 0) {
    questionNavBar.classList.add('hidden');
    return;
  }

  questionNavBar.classList.remove('hidden');
  if (qNavCount) {
    qNavCount.textContent = String(questions.length);
  }

  questionNavGrid.innerHTML = '';

  questions.forEach((q, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'q-nav-btn';
    btn.setAttribute('data-nav-index', String(index));
    const isInjected = (q.status === 'INJECTED');
    if (isInjected) {
      btn.classList.add('injected');
    }
    const hasVisual = !!(q.gambar_base64 || q.gambar_url || q.gambar_svg || (q.pertanyaan && (q.pertanyaan.includes('<table') || q.pertanyaan.includes('<img'))));
    if (hasVisual) {
      btn.classList.add('has-visual');
    }

    btn.title = `Soal #${index + 1} (${q.tipe || 'PG'}) - ${isInjected ? 'Sudah Terinput di Afresto' : 'Siap Diinput'}`;
    btn.textContent = `${index + 1}${isInjected ? '✓' : ''}`;

    btn.addEventListener('click', () => {
      const targetCard = document.getElementById(`q_card_${index}`);
      if (targetCard) {
        // Hitung offset sticky header agar kartu tidak tertutup header yang melayang
        const stickyHeader = document.getElementById('sticky-top-container');
        const headerOffset = stickyHeader ? (stickyHeader.offsetHeight + 10) : 80;
        const elementPosition = targetCard.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });

        // Flash pulse highlight pada kartu target
        targetCard.classList.remove('q-card-focused');
        void targetCard.offsetWidth; // Trigger DOM reflow
        targetCard.classList.add('q-card-focused');
        setTimeout(() => {
          targetCard.classList.remove('q-card-focused');
        }, 1800);
      }
    });

    questionNavGrid.appendChild(btn);
  });
}

// ------------------------------------------------------------------------
// 5.9. PRE-FLIGHT AUTO-CHECKER ENGINE (VALIDASI KELENGKAPAN BUTIR SOAL)
// ------------------------------------------------------------------------

function runPreflightAutoChecker() {
  const preflightBox = document.getElementById('preflight-status-box');
  const preflightIcon = document.getElementById('preflight-icon');
  const preflightTitle = document.getElementById('preflight-title');
  const preflightSub = document.getElementById('preflight-sub');

  if (!preflightBox) return { validCount: 0, invalidCount: 0 };

  if (!currentQuestions || currentQuestions.length === 0) {
    preflightBox.classList.add('hidden');
    return { validCount: 0, invalidCount: 0 };
  }

  let invalidCount = 0;
  const invalidDetails = [];

  currentQuestions.forEach((q, idx) => {
    const check = validateQuestionCompleteness(q, idx);
    q.validation = check;
    if (!check.isValid) {
      invalidCount++;
      invalidDetails.push(`No. ${idx + 1} (${check.issues.join(', ')})`);
    }
  });

  preflightBox.classList.remove('hidden');

  if (invalidCount === 0) {
    preflightBox.className = "preflight-status-box preflight-all-valid";
    if (preflightIcon) preflightIcon.textContent = "✅";
    if (preflightTitle) preflightTitle.textContent = `Semua ${currentQuestions.length} Butir Soal Valid (Siap Input)`;
    if (preflightSub) preflightSub.textContent = "Seluruh opsi, kunci jawaban, dan struktur soal lengkap dan memenuhi syarat sistem Afresto.";
  } else {
    preflightBox.className = "preflight-status-box preflight-has-issues";
    if (preflightIcon) preflightIcon.textContent = "⚠️";
    if (preflightTitle) preflightTitle.textContent = `${invalidCount} dari ${currentQuestions.length} Butir Soal Perlu Diperiksa`;
    if (preflightSub) preflightSub.textContent = `Ditemukan opsi/kunci belum lengkap pada: ${invalidDetails.slice(0, 2).join('; ')}${invalidDetails.length > 2 ? '...' : ''}. Klik "✏️ Edit" pada butir terkait untuk melengkapi sebelum input.`;
  }

  return { validCount: currentQuestions.length - invalidCount, invalidCount };
}

// ------------------------------------------------------------------------
// 6. RENDER DAFTAR SOAL & SORTING
// ------------------------------------------------------------------------

function renderQuestionsList() {
  if (!currentQuestions || currentQuestions.length === 0) {
    resultsSection.classList.add('hidden');
    renderQuestionNavigator([]);
    return;
  }

  resultsSection.classList.remove('hidden');

  const total = currentQuestions.length;
  const injectedCount = currentQuestions.filter(q => q.status === "INJECTED").length;
  const pendingCount = total - injectedCount;

  resultsCountBadge.textContent = `${total} Butir (${pendingCount} Siap Input, ${injectedCount} Terinput)`;

  if (isGenerating) {
    btnAutoInputAll.disabled = true;
    btnAutoInputAll.textContent = "⏳ Sedang Merancang Soal (Input Otomatis Dikunci)...";
    btnAutoInputAll.className = "btn btn-secondary btn-block btn-lg";
  } else if (pendingCount === 0) {
    btnAutoInputAll.disabled = true;
    btnAutoInputAll.textContent = "🎉 Seluruh Butir Soal Telah Terinput di Afresto";
    btnAutoInputAll.className = "btn btn-secondary btn-block btn-lg";
  } else {
    btnAutoInputAll.disabled = false;
    btnAutoInputAll.textContent = `🚀 Input Otomatis ${pendingCount} Soal Tersisa ke Afresto`;
    btnAutoInputAll.className = "btn btn-success btn-block btn-lg";
  }

  // Perbarui tombol shortcut nomor soal di floating header
  renderQuestionNavigator(currentQuestions);

  // Jalankan Pre-Flight Auto Checker untuk validasi kelengkapan butir soal
  runPreflightAutoChecker();

  questionsListContainer.innerHTML = "";

  currentQuestions.forEach((q, index) => {
    // Pastikan nomor urut asli (originalIndex) selalu tersimpan agar fitur Urut & Reset bekerja presisi
    if (q.originalIndex === undefined) {
      q.originalIndex = index + 1;
    }
    // Generate unique ID jika belum ada
    if (!q.id) {
      q.id = `q_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`;
    }
    if (!q.status) {
      q.status = "READY";
    }

    const card = document.createElement('div');
    card.id = `q_card_${index}`;
    const isInjected = (q.status === "INJECTED");
    card.className = isInjected ? "q-card q-card-injected" : "q-card";

    // Header kartu
    let badgeClass = "q-badge-pg";
    if (q.tipe === "PG_KOMPLEKS") badgeClass = "q-badge-pg-kompleks";
    if (q.tipe === "BENAR_SALAH") badgeClass = "q-badge-benar-salah";
    if (q.tipe === "MENCOCOKKAN") badgeClass = "q-badge-mencocokkan";
    if (q.tipe === "ISIAN") badgeClass = "q-badge-isian";
    if (q.tipe === "URAIAN") badgeClass = "q-badge-uraian";

    let contentHtml = "";
    if (q.tipe === "MENCOCOKKAN" && Array.isArray(q.pasangan) && q.pasangan.length > 0) {
      contentHtml = `<div class="q-pairs-grid">` +
        q.pasangan.map((p, idx) => `
          <div class="q-pair-row">
            <div class="q-pair-left"><strong>${idx + 1}.</strong> ${p.kiri}</div>
            <div class="q-pair-arrow">⇄</div>
            <div class="q-pair-right"><strong>${String.fromCharCode(65 + idx)}.</strong> ${p.kanan}</div>
          </div>
        `).join("") +
        `</div>`;
    } else if (q.tipe === "BENAR_SALAH" && q.opsi && Object.keys(q.opsi).length > 0) {
      contentHtml = `
        <table class="q-bs-table">
          <thead>
            <tr>
              <th>Pernyataan</th>
              <th class="col-b" title="Benar">B</th>
              <th class="col-s" title="Salah">S</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(q.opsi).map(([optKey, optText]) => {
              let isB = false;
              let isS = false;
              if (q.kunci && typeof q.kunci === "object") {
                const val = String(q.kunci[optKey] || "").toUpperCase();
                if (val === "BENAR" || val === "B" || val === "1") isB = true;
                else if (val === "SALAH" || val === "S" || val === "2") isS = true;
              }
              return `
                <tr>
                  <td><strong>[${optKey}]</strong> ${optText}</td>
                  <td class="col-check ${isB ? 'checked-b' : 'unchecked'}">${isB ? '●' : '○'}</td>
                  <td class="col-check ${isS ? 'checked-s' : 'unchecked'}">${isS ? '●' : '○'}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `;
    } else if (q.opsi && Object.keys(q.opsi).length > 0) {
      contentHtml = `<div class="q-options">` +
        Object.entries(q.opsi).map(([optKey, optText]) => {
          let isCorrect = false;
          if (q.tipe === "PG" && q.kunci === optKey) isCorrect = true;
          if (q.tipe === "PG_KOMPLEKS" && Array.isArray(q.kunci) && q.kunci.includes(optKey)) isCorrect = true;
          const optIsArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(optText || "");
          const optScriptClass = optIsArabic ? "q-rtl" : "";
          return `<div class="q-option-item ${isCorrect ? 'correct' : ''} ${optScriptClass}"><span class="q-opt-key">${optKey}.</span><span class="q-opt-text">${optText}</span></div>`;
        }).join("") +
        `</div>`;
    }

    let kunciDisplay = "";
    if (q.tipe === "PG") kunciDisplay = `Kunci: ${q.kunci}`;
    else if (q.tipe === "PG_KOMPLEKS") kunciDisplay = `Kunci: ${Array.isArray(q.kunci) ? q.kunci.join(", ") : q.kunci}`;
    else if (q.tipe === "BENAR_SALAH" && typeof q.kunci === "object") {
      kunciDisplay = `Kunci: ` + Object.entries(q.kunci).map(([k, v]) => `${k}:${v}`).join(", ");
    }
    else if (q.tipe === "MENCOCOKKAN") kunciDisplay = `Kunci: ${q.kunci || "Relasi Pasangan Sesuai Baris"}`;
    else if (q.tipe === "ISIAN") kunciDisplay = `Kunci: ${Array.isArray(q.kunci) ? q.kunci.join(" / ") : q.kunci}`;
    else if (q.tipe === "URAIAN") kunciDisplay = `Rubrik: ${q.kunci || "Terlampir"}`;

    const statusPill = isInjected
      ? `<span class="badge-status-injected" title="Soal ini telah tersimpan di Afresto">✅ Terinput di Afresto</span>`
      : `<span class="badge-status-ready">🟢 Siap Diinput</span>`;

    const check = q.validation || validateQuestionCompleteness(q, index);
    q.validation = check;
    let validationBadge = "";
    let singleBtnHtml = "";

    const hasVisual = !!(q.gambar_base64 || q.gambar_url || q.gambar_svg || (q.pertanyaan && q.pertanyaan.includes('<img')));
    const visualTag = hasVisual ? `<span class="q-image-badge">🖼️ Bergambar</span>` : ``;

    // Render Preview Gambar AI atau Diagram SVG jika ada
    let imageHtml = "";
    if (q.gambar_base64 || q.gambar_url) {
      const src = q.gambar_base64 || q.gambar_url;
      imageHtml = `
        <div class="q-card-image-box">
          <img src="${src}" alt="Ilustrasi Butir #${index + 1}" loading="lazy">
          <div class="q-card-image-actions">
            <span class="q-image-badge">🎨 Gambar AI</span>
            <div class="img-actions-left">
              <button type="button" class="btn-img-action btn-regen-img" data-index="${index}" title="Buat ulang gambar AI ini">Buat Ulang 🎨</button>
              <button type="button" class="btn-img-action btn-replace-img" data-index="${index}" title="Ganti dengan file gambar sendiri dari laptop">Ganti File 📁</button>
              <button type="button" class="btn-img-action btn-del-img" data-index="${index}" title="Hapus gambar ini">🗑️</button>
            </div>
          </div>
        </div>
      `;
    } else if (q.gambar_svg) {
      imageHtml = `
        <div class="q-card-image-box">
          <div class="q-card-svg-box">${q.gambar_svg}</div>
          <div class="q-card-image-actions">
            <span class="q-image-badge">📊 Diagram Vektor (SVG)</span>
            <div class="img-actions-left">
              <button type="button" class="btn-img-action btn-replace-img" data-index="${index}" title="Ganti dengan file gambar sendiri dari laptop">Ganti File 📁</button>
              <button type="button" class="btn-img-action btn-del-img" data-index="${index}" title="Hapus diagram ini">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }

    if (!check.isValid) {
      validationBadge = `<span class="badge-invalid-warning" title="${check.issues.join(' | ')}">⚠️ ${check.issues[0]}</span>`;
      singleBtnHtml = `
        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="font-size: 10px; color: var(--accent-rose); font-weight: 600;">⚠️ Opsi belum lengkap</span>
          <button class="btn-xs btn-primary btn-edit-q" data-index="${index}" title="Lengkapi butir ini agar dapat diinput">✏️ Lengkapi</button>
        </div>
      `;
    } else {
      singleBtnHtml = `
        <div style="display: flex; gap: 4px; align-items: center;">
          ${!hasVisual ? `<button class="btn-xs btn-outline btn-add-img" data-index="${index}" title="Tambahkan ilustrasi gambar pada butir ini">🖼️ +Gambar</button>` : ''}
          <button class="btn-xs btn-outline btn-edit-q" data-index="${index}" title="Edit butir soal ini sebelum diinput">✏️ Edit</button>
          <button class="btn-xs btn-ghost btn-inject-fill" data-index="${index}" title="Suntikkan butir ini ke form tanpa simpan">⚡ Isi Form</button>
          <button class="btn-xs btn-primary btn-inject-save" data-index="${index}" title="Isi form dan langsung simpan ke Afresto">💾 Simpan</button>
          ${isInjected ? `<button class="btn-xs btn-secondary btn-reset-single" data-index="${index}" title="Ubah status kembali ke Siap Input">🔄</button>` : ''}
        </div>
      `;
    }

    const isArabicQuestion = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(q.pertanyaan || "");
    const isJapaneseQuestion = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(q.pertanyaan || "");
    const isJavaneseQuestion = /[\uA980-\uA9DF]/.test(q.pertanyaan || "");

    let scriptClass = "";
    if (isArabicQuestion) scriptClass = "q-rtl";
    else if (isJapaneseQuestion) scriptClass = "q-cjk";
    else if (isJavaneseQuestion) scriptClass = "q-javanese";

    let kognitifBadgeClass = "badge-kognitif-hots";
    const lvl = (q.level_kognitif || "").toUpperCase();
    if (lvl.startsWith("C1") || lvl.startsWith("C2") || lvl.includes("LOTS")) {
      kognitifBadgeClass = "badge-kognitif-lots";
    } else if (lvl.startsWith("C3") || lvl.includes("MOTS")) {
      kognitifBadgeClass = "badge-kognitif-mots";
    } else {
      kognitifBadgeClass = "badge-kognitif-hots";
    }

    let stimulusHtml = "";
    if (q.stimulus) {
      const startVal = q.stimulus_range_start || (index + 1);
      const endVal = q.stimulus_range_end || (index + 1);
      stimulusHtml = `
        <div class="q-stimulus-box">
          <div class="q-stimulus-header">
            <span class="q-stimulus-title">📖 Teks Bacaan / Wacana Terdeteksi</span>
            <span class="q-stimulus-badge">Stimulus Soal</span>
          </div>
          <div class="q-stimulus-actions">
            <span class="q-stimulus-label">Terapkan bacaan ini ke soal:</span>
            <div class="q-stimulus-inputs">
              <span class="stim-range-txt">No.</span>
              <input type="number" class="input-stim-range input-stim-start" data-index="${index}" value="${startVal}" min="1" max="${total}">
              <span class="stim-range-txt">s.d.</span>
              <input type="number" class="input-stim-range input-stim-end" data-index="${index}" value="${endVal}" min="1" max="${total}">
              <button type="button" class="btn-xs btn-outline btn-apply-stimulus" data-index="${index}" title="Salin otomatis teks bacaan ini ke butir soal #${startVal} s.d. #${endVal}">
                🚀 Terapkan
              </button>
            </div>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="q-header">
        <div class="q-tags">
          <span class="q-badge ${badgeClass}">${q.tipe}</span>
          <span class="badge ${kognitifBadgeClass}">${q.level_kognitif || "C4 (Analisis)"}</span>
          ${visualTag}
          ${statusPill}
          ${validationBadge}
        </div>
        <div class="q-actions-group">
          <span class="q-number-tag">#${index + 1}</span>
          <button class="btn-delete-q" data-index="${index}" title="Hapus butir soal #${index + 1} dari daftar" aria-label="Hapus soal #${index + 1}">🗑️</button>
        </div>
      </div>
      ${imageHtml}
      ${stimulusHtml}
      <div class="q-body ${scriptClass}">${q.pertanyaan}</div>
      ${contentHtml}
      <div class="q-footer">
        <span class="q-key-info">${kunciDisplay}</span>
        ${singleBtnHtml}
      </div>
    `;

    questionsListContainer.appendChild(card);
  });

  // Event listener tombol 'Buat Ulang Gambar' (Regenerate Image)
  document.querySelectorAll('.btn-regen-img').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      const q = currentQuestions[idx];
      const custom = prompt("Deskripsi gambar (kosongkan untuk buat ulang otomatis):", q.gambar_prompt || "");
      if (custom === null) return; // Batal

      btn.textContent = "⏳ Memproses...";
      btn.disabled = true;
      try {
        const tpContext = (inputTp && inputTp.value.trim()) ? inputTp.value.trim() : "";
        const rawPrompt = custom.trim() || q.gambar_prompt || (tpContext ? `${tpContext}: ${q.pertanyaan.substring(0, 70)}` : `${inputMateri.value} ${q.pertanyaan.substring(0, 70)}`);
        const chosenStyle = selectImageStyle ? selectImageStyle.value : "AUTO";
        const enhanced = buildEnhancedImagePrompt(rawPrompt, chosenStyle);
        const url = getPollinationsImageUrl(enhanced, 540, 360);
        const base64 = await downloadImageAsBase64(url, 60000, (msg) => { btn.textContent = msg; });
        q.gambar_base64 = base64;
        q.gambar_svg = null;
        q.gambar_prompt = rawPrompt;
        q.butuh_gambar = true;
        await chrome.storage.local.set({ last_questions: currentQuestions });
        renderQuestionsList();
      } catch (err) {
        alert("Gagal membuat ulang gambar: " + err.message);
        renderQuestionsList();
      }
    });
  });

  // Event listener tombol '+Gambar' (Tambah Gambar AI Baru pada butir tanpa gambar)
  document.querySelectorAll('.btn-add-img').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      const q = currentQuestions[idx];
      const custom = prompt("Deskripsi gambar yang diinginkan (kosongkan untuk buat otomatis dari soal):", q.gambar_prompt || "");
      if (custom === null) return; // Batal

      btn.textContent = "⏳ Memproses...";
      btn.disabled = true;
      try {
        const tpContext = (inputTp && inputTp.value.trim()) ? inputTp.value.trim() : "";
        const rawPrompt = custom.trim() || q.gambar_prompt || (tpContext ? `${tpContext}: ${q.pertanyaan.substring(0, 80)}` : `${inputMateri.value} ${q.pertanyaan.substring(0, 80)}`);
        const chosenStyle = selectImageStyle ? selectImageStyle.value : "AUTO";
        const enhanced = buildEnhancedImagePrompt(rawPrompt, chosenStyle);
        const url = getPollinationsImageUrl(enhanced, 540, 360);
        const base64 = await downloadImageAsBase64(url, 60000, (msg) => { btn.textContent = msg; });
        q.gambar_base64 = base64;
        q.gambar_svg = null;
        q.gambar_prompt = rawPrompt;
        q.butuh_gambar = true;
        await chrome.storage.local.set({ last_questions: currentQuestions });
        renderQuestionsList();
      } catch (err) {
        alert("Gagal menambahkan gambar: " + err.message);
        renderQuestionsList();
      }
    });
  });

  // Event listener tombol 'Ganti Gambar Sendiri'
  document.querySelectorAll('.btn-replace-img').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeImageCardIndex = Number(e.currentTarget.getAttribute('data-index'));
      if (inputReplaceImage) inputReplaceImage.click();
    });
  });

  // Event listener tombol 'Hapus Gambar'
  document.querySelectorAll('.btn-del-img').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      if (confirm("Hapus ilustrasi gambar dari butir soal ini?")) {
        currentQuestions[idx].gambar_base64 = null;
        currentQuestions[idx].gambar_url = null;
        currentQuestions[idx].gambar_svg = null;
        currentQuestions[idx].butuh_gambar = false;
        await chrome.storage.local.set({ last_questions: currentQuestions });
        renderQuestionsList();
      }
    });
  });

  // Event listener tombol '⚡ Isi Form' (hanya mengisi tanpa submit)
  document.querySelectorAll('.btn-inject-fill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      injectSingleQuestionDirect(currentQuestions[idx]);
    });
  });

  // Event listener tombol '💾 Simpan' (mengisi form DAN langsung klik Simpan)
  document.querySelectorAll('.btn-inject-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      injectAndSubmitSingleDirect(currentQuestions[idx]);
    });
  });

  // Event listener tombol '🔄' (reset status 1 butir ke READY)
  document.querySelectorAll('.btn-reset-single').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      currentQuestions[idx].status = "READY";
      chrome.storage.local.set({ last_questions: currentQuestions });
      renderQuestionsList();
    });
  });

  // Event listener tombol 'Terapkan Stimulus Bacaan ke Rentang Soal'
  document.querySelectorAll('.btn-apply-stimulus').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      const card = document.getElementById(`q_card_${idx}`);
      if (!card) return;

      const inputStart = card.querySelector('.input-stim-start');
      const inputEnd = card.querySelector('.input-stim-end');
      if (!inputStart || !inputEnd) return;

      const startNum = parseInt(inputStart.value, 10);
      const endNum = parseInt(inputEnd.value, 10);

      if (isNaN(startNum) || isNaN(endNum) || startNum < 1 || endNum > currentQuestions.length || startNum > endNum) {
        alert(`Rentang nomor soal tidak valid! Harap masukkan angka antara 1 dan ${currentQuestions.length}.`);
        return;
      }

      const sourceQ = currentQuestions[idx];
      const stimText = sourceQ.stimulus;
      if (!stimText) return;

      let appliedCount = 0;
      for (let k = startNum - 1; k <= endNum - 1; k++) {
        const targetQ = currentQuestions[k];
        if (!targetQ) continue;

        targetQ.stimulus = stimText;

        // Jika pertanyaan target belum memuat teks bacaan ini, sematkan ke awal pertanyaan
        if (!targetQ.pertanyaan.includes(stimText)) {
          targetQ.pertanyaan = `${stimText}\n\n${targetQ.pertanyaan}`.trim();
          appliedCount++;
        }
      }

      sourceQ.stimulus_range_start = startNum;
      sourceQ.stimulus_range_end = endNum;

      await chrome.storage.local.set({ last_questions: currentQuestions });
      renderQuestionsList();
      alert(`🎉 Berhasil menerapkan teks bacaan ke Soal #${startNum} s.d. #${endNum} (${appliedCount} butir diselaraskan)!`);
    });
  });

  // Pasang event listener untuk tombol edit per butir dari playlist
  document.querySelectorAll('.btn-edit-q').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      openEditQuestionModal(idx);
    });
  });

  // Pasang event listener untuk tombol hapus per butir dari playlist
  document.querySelectorAll('.btn-delete-q').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      currentQuestions.splice(idx, 1);
      chrome.storage.local.set({ last_questions: currentQuestions });
      renderQuestionsList();
    });
  });
}

// ------------------------------------------------------------------------
// MODAL EDIT BUTIR SOAL
// ------------------------------------------------------------------------

function openEditQuestionModal(idx) {
  const q = currentQuestions[idx];
  if (!q) return;

  const modal = document.getElementById('modal-edit-question');
  const title = document.getElementById('modal-edit-title');
  const idxInput = document.getElementById('edit-q-index');
  const tipeSelect = document.getElementById('edit-q-tipe');
  const levelSelect = document.getElementById('edit-q-level-kognitif');
  const soalInput = document.getElementById('edit-q-pertanyaan');
  const optContainer = document.getElementById('edit-q-options-container');
  const optWrapper = document.getElementById('edit-q-options-wrapper');
  const kunciInput = document.getElementById('edit-q-kunci');
  const pembInput = document.getElementById('edit-q-pembahasan');

  idxInput.value = idx;
  title.textContent = `✏️ Edit Butir Soal #${idx + 1}`;
  tipeSelect.value = q.tipe || 'PG';
  if (levelSelect) {
    levelSelect.value = q.level_kognitif || 'C4 (Analisis)';
  }
  soalInput.value = q.pertanyaan || '';
  pembInput.value = q.pembahasan || '';

  function renderOptionsEditor(currentTipe) {
    optContainer.innerHTML = '';
    if (currentTipe === 'PG' || currentTipe === 'PG_KOMPLEKS') {
      optWrapper.classList.remove('hidden');
      const letters = ['A', 'B', 'C', 'D', 'E'];
      letters.forEach(letter => {
        const val = (q.opsi && q.opsi[letter]) ? q.opsi[letter] : '';
        const row = document.createElement('div');
        row.className = 'opt-edit-row';
        row.innerHTML = `
          <span class="opt-edit-label">${letter}.</span>
          <textarea class="form-control edit-opt-val" data-letter="${letter}" rows="2" placeholder="Teks atau tabel HTML opsi ${letter}...">${val}</textarea>
        `;
        optContainer.appendChild(row);
      });
      if (typeof q.kunci === 'string') kunciInput.value = q.kunci;
      else if (Array.isArray(q.kunci)) kunciInput.value = q.kunci.join(', ');
      else kunciInput.value = 'A';
    } else if (currentTipe === 'BENAR_SALAH') {
      optWrapper.classList.remove('hidden');
      const letters = Object.keys(q.opsi || {});
      const list = letters.length > 0 ? letters : ['A', 'B', 'C', 'D', 'E'];
      list.forEach(letter => {
        const val = (q.opsi && q.opsi[letter]) ? q.opsi[letter] : '';
        let bsVal = 'Benar';
        if (q.kunci && typeof q.kunci === 'object' && q.kunci[letter]) bsVal = q.kunci[letter];
        const row = document.createElement('div');
        row.className = 'opt-edit-row';
        row.innerHTML = `
          <span class="opt-edit-label">${letter}.</span>
          <textarea class="form-control edit-opt-val" data-letter="${letter}" rows="2" style="flex:1;">${val}</textarea>
          <select class="form-control edit-bs-val" data-letter="${letter}" style="width:90px;">
            <option value="Benar" ${bsVal === 'Benar' ? 'selected' : ''}>Benar</option>
            <option value="Salah" ${bsVal === 'Salah' ? 'selected' : ''}>Salah</option>
          </select>
        `;
        optContainer.appendChild(row);
      });
      kunciInput.value = typeof q.kunci === 'object' ? JSON.stringify(q.kunci) : 'Lihat kolom B/S';
    } else if (currentTipe === 'MENCOCOKKAN') {
      optWrapper.classList.remove('hidden');
      const pairs = Array.isArray(q.pasangan) && q.pasangan.length > 0
        ? q.pasangan
        : [{ kiri: '', kanan: '' }, { kiri: '', kanan: '' }];
      pairs.forEach((p, pIdx) => {
        const row = document.createElement('div');
        row.className = 'opt-edit-row';
        row.innerHTML = `
          <span class="opt-edit-label">${pIdx + 1}.</span>
          <input type="text" class="form-control edit-pair-kiri" placeholder="Premis (Kiri)" value="${p.kiri || ''}" style="flex:1;">
          <span style="padding-top:6px;">⇄</span>
          <input type="text" class="form-control edit-pair-kanan" placeholder="Respon (Kanan)" value="${p.kanan || ''}" style="flex:1;">
        `;
        optContainer.appendChild(row);
      });
      kunciInput.value = typeof q.kunci === 'string' ? q.kunci : pairs.map((_, i) => `${i + 1}-${i + 1}`).join(', ');
    } else {
      // ISIAN / URAIAN
      optWrapper.classList.add('hidden');
      if (Array.isArray(q.kunci)) kunciInput.value = q.kunci.join(' / ');
      else kunciInput.value = q.kunci || '';
    }
  }

  renderOptionsEditor(tipeSelect.value);
  tipeSelect.onchange = () => renderOptionsEditor(tipeSelect.value);

  modal.classList.remove('hidden');
}

function closeEditQuestionModal() {
  const modal = document.getElementById('modal-edit-question');
  if (modal) modal.classList.add('hidden');
}

function saveEditedQuestion() {
  const modal = document.getElementById('modal-edit-question');
  const idx = Number(document.getElementById('edit-q-index').value);
  const q = currentQuestions[idx];
  if (!q) return;

  const tipe = document.getElementById('edit-q-tipe').value;
  const levelSelect = document.getElementById('edit-q-level-kognitif');
  const pertanyaan = document.getElementById('edit-q-pertanyaan').value.trim();
  const pembahasan = document.getElementById('edit-q-pembahasan').value.trim();
  const kunciRaw = document.getElementById('edit-q-kunci').value.trim();

  q.tipe = tipe;
  if (levelSelect) {
    q.level_kognitif = levelSelect.value;
  }
  q.pertanyaan = pertanyaan;
  q.pembahasan = pembahasan;

  if (tipe === 'PG' || tipe === 'PG_KOMPLEKS') {
    const newOpsi = {};
    document.querySelectorAll('.edit-opt-val').forEach(area => {
      const letter = area.getAttribute('data-letter');
      if (letter) newOpsi[letter] = area.value.trim();
    });
    q.opsi = newOpsi;
    if (tipe === 'PG_KOMPLEKS') {
      q.kunci = kunciRaw.split(/[\s,]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
    } else {
      q.kunci = kunciRaw.toUpperCase();
    }
    delete q.pasangan;
  } else if (tipe === 'BENAR_SALAH') {
    const newOpsi = {};
    const newKunci = {};
    document.querySelectorAll('.edit-opt-val').forEach(area => {
      const letter = area.getAttribute('data-letter');
      if (letter) newOpsi[letter] = area.value.trim();
    });
    document.querySelectorAll('.edit-bs-val').forEach(sel => {
      const letter = sel.getAttribute('data-letter');
      if (letter) newKunci[letter] = sel.value;
    });
    q.opsi = newOpsi;
    q.kunci = newKunci;
    delete q.pasangan;
  } else if (tipe === 'MENCOCOKKAN') {
    const pairs = [];
    const kiriInputs = document.querySelectorAll('.edit-pair-kiri');
    const kananInputs = document.querySelectorAll('.edit-pair-kanan');
    kiriInputs.forEach((kiriIn, i) => {
      const kiri = kiriIn.value.trim();
      const kanan = kananInputs[i] ? kananInputs[i].value.trim() : '';
      if (kiri || kanan) pairs.push({ kiri, kanan });
    });
    q.pasangan = pairs;
    q.kunci = kunciRaw || pairs.map((_, i) => `${i + 1}-${i + 1}`).join(', ');
    q.opsi = {};
  } else if (tipe === 'ISIAN') {
    q.opsi = {};
    delete q.pasangan;
    q.kunci = kunciRaw.split(/[\/,]+/).map(x => x.trim()).filter(Boolean);
  } else {
    // URAIAN
    q.opsi = {};
    delete q.pasangan;
    q.kunci = kunciRaw;
  }

  q.status = 'READY'; // Reset status ke Siap Diinput agar guru bisa langsung menyuntikkan hasil revisi
  chrome.storage.local.set({ last_questions: currentQuestions });
  renderQuestionsList();
  closeEditQuestionModal();
}

// ------------------------------------------------------------------------
// 7. SORTING, SHUFFLE, PREVIEW STUDIO & CLEAR PLAYLIST
// ------------------------------------------------------------------------

// Elemen Modal Studio Preview QC In-Page
const modalQcStudio = document.getElementById('modal-qc-studio');
const btnCloseQcModal = document.getElementById('btn-close-qc-modal');
const iframeQcStudio = document.getElementById('iframe-qc-studio');

async function launchStudioPreview() {
  const targetUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL('preview/preview.html')
    : '../preview/preview.html';

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ last_questions: currentQuestions }).catch(() => {});
  }

  // Buka Studio QC di Halaman Utama (Main Page Afresto) agar leluasa di layar desktop penuh
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: "OPEN_MAIN_QC_STUDIO" }, (res) => {
          if (chrome.runtime.lastError || !res?.success) {
            // Jika tab aktif bukan halaman web Afresto, buka di tab browser baru
            chrome.tabs.create({ url: targetUrl });
          }
        });
        return;
      }
    } catch (e) {
      console.warn("Gagal menghubungi tab aktif untuk membuka modal utama:", e);
    }
    chrome.tabs.create({ url: targetUrl });
  } else {
    window.open(targetUrl, '_blank');
  }
}

function openQcStudioModal(targetUrl) {
  if (modalQcStudio && iframeQcStudio) {
    iframeQcStudio.src = targetUrl;
    modalQcStudio.classList.remove('hidden');
  } else if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: targetUrl });
  } else {
    window.open(targetUrl, '_blank');
  }
}

function closeStudioQcModal() {
  if (modalQcStudio) {
    modalQcStudio.classList.add('hidden');
  }
  if (iframeQcStudio) {
    iframeQcStudio.src = 'about:blank';
  }
  // Sinkronisasi data terbaru jika guru melakukan revisi di Studio
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['last_questions']).then(res => {
      if (res && Array.isArray(res.last_questions)) {
        currentQuestions = res.last_questions;
        renderQuestionsList();
      }
    }).catch(() => {});
  }
}

if (btnCloseQcModal) {
  btnCloseQcModal.addEventListener('click', closeStudioQcModal);
}

if (modalQcStudio) {
  modalQcStudio.addEventListener('click', (e) => {
    if (e.target === modalQcStudio) {
      closeStudioQcModal();
    }
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modalQcStudio && !modalQcStudio.classList.contains('hidden')) {
      closeStudioQcModal();
    }
  }
});

if (btnOpenPreview) {
  btnOpenPreview.addEventListener('click', launchStudioPreview);
}

if (btnLaunchStudioBanner) {
  btnLaunchStudioBanner.addEventListener('click', launchStudioPreview);
}

// Sinkronisasi otomatis dua arah saat ada perubahan di Studio Preview
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.last_questions) {
      currentQuestions = changes.last_questions.newValue || [];
      renderQuestionsList();
    }
  });
}

btnSortType.addEventListener('click', () => {
  // Kembalikan ke posisi urutan semula ketika diinputkan awal (1..N)
  currentQuestions.sort((a, b) => {
    const idxA = a.originalIndex !== undefined ? a.originalIndex : (parseInt(String(a.id).replace(/\D/g, ''), 10) || 0);
    const idxB = b.originalIndex !== undefined ? b.originalIndex : (parseInt(String(b.id).replace(/\D/g, ''), 10) || 0);
    return idxA - idxB;
  });
  chrome.storage.local.set({ last_questions: currentQuestions });
  renderQuestionsList();
});

btnShuffle.addEventListener('click', () => {
  // Pastikan originalIndex terpatri sebelum playlist diacak
  currentQuestions.forEach((q, idx) => {
    if (q.originalIndex === undefined) {
      q.originalIndex = idx + 1;
    }
  });
  for (let i = currentQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentQuestions[i], currentQuestions[j]] = [currentQuestions[j], currentQuestions[i]];
  }
  chrome.storage.local.set({ last_questions: currentQuestions });
  renderQuestionsList();
});

if (btnClearPlaylist) {
  btnClearPlaylist.addEventListener('click', () => {
    if (!currentQuestions || currentQuestions.length === 0) return;
    if (confirm("Kosongkan seluruh daftar antrean soal?")) {
      currentQuestions = [];
      chrome.storage.local.set({ last_questions: [] });
      if (parameterFormBody && parameterSummaryBar) {
        parameterFormBody.classList.remove('hidden');
        parameterSummaryBar.classList.add('hidden');
      }
      renderQuestionsList();
    }
  });
}

if (btnResetStatus) {
  btnResetStatus.addEventListener('click', () => {
    if (!currentQuestions || currentQuestions.length === 0) return;
    currentQuestions.forEach(q => {
      q.status = "READY";
    });
    // Kembalikan urutan soal ke urutan nomor aslinya (1..N)
    currentQuestions.sort((a, b) => {
      const idxA = a.originalIndex !== undefined ? a.originalIndex : (parseInt(String(a.id).replace(/\D/g, ''), 10) || 0);
      const idxB = b.originalIndex !== undefined ? b.originalIndex : (parseInt(String(b.id).replace(/\D/g, ''), 10) || 0);
      return idxA - idxB;
    });
    // Reset status progress bar injeksi
    if (progressBox) progressBox.classList.add('hidden');
    if (progressBarFill) progressBarFill.style.width = '0%';
    if (progressPercentage) progressPercentage.textContent = '0%';
    if (progressStatusLabel) progressStatusLabel.textContent = 'Siap Diinput';
    if (progressDetail) progressDetail.textContent = 'Menunggu antrean...';

    chrome.storage.local.set({ last_questions: currentQuestions });
    renderQuestionsList();
  });
}

// ------------------------------------------------------------------------
// 8. EKSEKUSI INJEKSI DOM (SINGLE & BATCH AUTO-LOOP)
// ------------------------------------------------------------------------

async function injectSingleQuestionDirect(soal) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    alert("Tidak ada tab browser aktif!");
    return;
  }

  // Pre-check apakah berada di halaman formulir soal Afresto
  chrome.tabs.sendMessage(tab.id, { action: "CHECK_PAGE_STATUS" }, (res) => {
    if (chrome.runtime.lastError || !res?.isSoalPage) {
      alert("⚠️ Formulir soal belum terbuka!\n\nSilakan buka menu Evaluasi → Butir Soal → 'Tulis Soal Baru' di tab Afresto terlebih dahulu.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "INJECT_SINGLE", soal }, (injectRes) => {
      if (chrome.runtime.lastError || !injectRes?.success) {
        alert("Gagal menginput soal: " + (injectRes?.error || chrome.runtime.lastError?.message || "Pastikan form soal sudah siap."));
      } else {
        renderQuestionsList();
      }
    });
  });
}

async function injectAndSubmitSingleDirect(soal) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    alert("Tidak ada tab browser aktif!");
    return;
  }

  // Pre-check apakah berada di halaman formulir soal Afresto
  chrome.tabs.sendMessage(tab.id, { action: "CHECK_PAGE_STATUS" }, (res) => {
    if (chrome.runtime.lastError || !res?.isSoalPage) {
      alert("⚠️ Formulir soal belum terbuka!\n\nSilakan buka menu Evaluasi → Butir Soal → 'Tulis Soal Baru' di tab Afresto terlebih dahulu.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { 
      action: "INJECT_SINGLE_AND_SUBMIT", 
      soal,
      isLast: false 
    }, (injectRes) => {
      if (chrome.runtime.lastError || !injectRes?.success) {
        alert("Gagal menginput & menyimpan soal: " + (injectRes?.error || chrome.runtime.lastError?.message || "Pastikan Anda di halaman soal Afresto."));
      } else {
        soal.status = "INJECTED";
        chrome.storage.local.set({ last_questions: currentQuestions });
        renderQuestionsList();
      }
    });
  });
}

async function sendTabMessageAsync(tabId, message, timeout = 25000) {
  return new Promise((resolve, reject) => {
    let hasResolved = false;
    const timer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error("Timeout komunikasi dengan tab Afresto."));
      }
    }, timeout);

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (hasResolved) return;
      hasResolved = true;
      clearTimeout(timer);

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

async function waitForAfrestoTabReady(tabId, timeout = 20000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (!isBatchRunning) throw new Error("Injeksi dibatalkan oleh pengguna.");

    try {
      const tabInfo = await chrome.tabs.get(tabId);
      if (tabInfo && tabInfo.status === 'complete') {
        const statusRes = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tabId, { action: "CHECK_PAGE_STATUS" }, (res) => {
            if (chrome.runtime.lastError) {
              resolve(null);
            } else {
              resolve(res);
            }
          });
        });

        if (statusRes && statusRes.isSoalPage) {
          if (statusRes.pageAlert) {
            throw new Error(`Afresto menolak formulir: "${statusRes.pageAlert}". Mohon periksa kembali form.`);
          }
          return true; // Form soal siap menerima injeksi berikutnya!
        }
      }
    } catch (err) {
      if (err.message && err.message.includes("menolak formulir")) {
        throw err;
      }
    }

    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error("Formulir soal Afresto belum siap atau tidak ditemukan.");
}

async function runStepByStepAutoInjection() {
  if (isGenerating) {
    alert("Harap tunggu hingga seluruh proses merancang soal selesai terlebih dahulu!");
    return;
  }

  const pendingCount = currentQuestions.filter(q => q.status !== "INJECTED").length;
  if (pendingCount === 0) {
    alert("Semua butir soal di daftar antrean sudah terinput ke Afresto!");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    alert("Buka halaman tulis soal di portal Afresto terlebih dahulu!");
    return;
  }

  // Pre-flight check: Pastikan tab saat ini benar-benar di halaman form soal Afresto
  const initialStatus = await new Promise(resolve => {
    chrome.tabs.sendMessage(tab.id, { action: "CHECK_PAGE_STATUS" }, res => {
      resolve(chrome.runtime.lastError ? null : res);
    });
  });

  if (!initialStatus || !initialStatus.isSoalPage) {
    alert("⚠️ Formulir input soal Afresto belum terbuka!\n\nSilakan klik menu: Evaluasi → Butir Soal → 'Tulis Soal Baru' di tab Afresto Anda terlebih dahulu.");
    return;
  }

  isBatchRunning = true;
  btnAutoInputAll.classList.add('hidden');
  btnStopInjection.classList.remove('hidden');
  progressBox.classList.remove('hidden');

  const totalQuestions = currentQuestions.length;

  try {
    while (isBatchRunning) {
      // 1. Cari soal berikutnya yang statusnya belum INJECTED dan lolos validasi Pre-Flight
      const pendingIndex = currentQuestions.findIndex(q => q.status !== "INJECTED" && (!q.validation || q.validation.isValid));
      if (pendingIndex === -1) {
        const invalidRemaining = currentQuestions.filter(q => q.status !== "INJECTED" && q.validation && !q.validation.isValid);
        if (invalidRemaining.length > 0) {
          showToast(`Injeksi selesai. ${invalidRemaining.length} butir dilewati karena opsi/kunci belum lengkap.`, 'warning');
        }
        break; // Seluruh soal valid berhasil diinjeksi
      }

      const currentSoal = currentQuestions[pendingIndex];
      const injectedCount = currentQuestions.filter(q => q.status === "INJECTED").length;
      const currentNumber = injectedCount + 1;
      const isLast = (currentQuestions.filter(q => q.status !== "INJECTED").length === 1);

      // Highlight kartu yang sedang aktif disuntikkan
      const activeCardEl = document.getElementById(`q_card_${pendingIndex}`);
      if (activeCardEl) {
        activeCardEl.classList.add('q-card-injecting');
        activeCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      updateProgressUi(currentNumber, totalQuestions, `Mengisi soal #${currentNumber} (${currentSoal.tipe})...`);

      // 2. Ambil tab aktif lagi untuk memastikan tab ID tetap valid
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!currentTab || !currentTab.id) {
        throw new Error("Tab Afresto tidak terdeteksi aktif.");
      }

      // 3. Pastikan tab dan content script siap
      await waitForAfrestoTabReady(currentTab.id, 20000);

      // Buffer sejenak agar iframe TinyMCE terpasang sempurna
      await new Promise(r => setTimeout(r, 600));

      if (!isBatchRunning) break;

      // 4. Kirim instruksi INJECT_SINGLE_AND_SUBMIT
      const response = await sendTabMessageAsync(currentTab.id, {
        action: "INJECT_SINGLE_AND_SUBMIT",
        soal: currentSoal,
        isLast: isLast
      }, 25000);

      if (!response || !response.success) {
        throw new Error(response?.error || "Gagal menyuntikkan soal ke form.");
      }

      // KUNCI PERBAIKAN BUG DUPLIKASI:
      // Begitu tombol Simpan di Afresto berhasil diklik, data soal ini sudah terkirim ke server Afresto.
      // Langsung tandai INJECTED detik ini juga agar jika user menghentikan proses, soal ini tidak akan terulang!
      currentSoal.status = "INJECTED";
      await chrome.storage.local.set({ last_questions: currentQuestions });
      renderQuestionsList();

      if (isLast) {
        updateProgressUi(totalQuestions, totalQuestions, "🎉 Seluruh butir soal berhasil disimpan di Afresto!");
        break;
      } else {
        updateProgressUi(currentNumber, totalQuestions, `Menyimpan soal #${currentNumber}... Menunggu formulir berikutnya...`);
        // Tunggu 2 detik untuk proses POST reload dari server Afresto
        await new Promise(r => setTimeout(r, 2000));

        // Jika user klik tombol Hentikan tepat saat transisi form, hentikan loop dengan damai
        if (!isBatchRunning) {
          progressDetail.textContent = `Proses injeksi dihentikan. Soal #${currentNumber} telah tersimpan aman di Afresto.`;
          break;
        }

        // Verifikasi bahwa halaman baru sudah siap
        try {
          await waitForAfrestoTabReady(currentTab.id, 20000);
        } catch (waitErr) {
          if (!isBatchRunning) {
            progressDetail.textContent = `Proses injeksi dihentikan. Soal #${currentNumber} telah tersimpan aman di Afresto.`;
            break;
          }
          if (waitErr.message && waitErr.message.includes("menolak formulir")) {
            currentSoal.status = "READY";
            await chrome.storage.local.set({ last_questions: currentQuestions });
            renderQuestionsList();
          }
          throw waitErr;
        }
      }
    }
  } catch (err) {
    console.error("Injeksi step-by-step terhenti:", err);
    progressDetail.textContent = `Injeksi terhenti: ${err.message}`;
    alert(`⚠️ Injeksi terhenti: ${err.message}`);
  } finally {
    isBatchRunning = false;
    document.querySelectorAll('.q-card-injecting').forEach(el => el.classList.remove('q-card-injecting'));
    btnAutoInputAll.classList.remove('hidden');
    btnStopInjection.classList.add('hidden');
    renderQuestionsList();
  }
}

btnAutoInputAll.addEventListener('click', runStepByStepAutoInjection);

btnStopInjection.addEventListener('click', async () => {
  isBatchRunning = false;
  document.querySelectorAll('.q-card-injecting').forEach(el => el.classList.remove('q-card-injecting'));
  btnAutoInputAll.classList.remove('hidden');
  btnStopInjection.classList.add('hidden');
  progressDetail.textContent = "Proses injeksi dihentikan. Soal terakhir yang terkirim tetap aman dan tidak akan terduplikasi.";
  renderQuestionsList();
});

// Listener telemetri progres dari content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "BATCH_PROGRESS" && message.progress) {
    const p = message.progress;
    updateProgressUi(p.current, p.total, p.message);

    // Update status butir soal yang tersimpan ke INJECTED
    if (p.status === "ITEM_SAVED" && p.soalId) {
      const target = currentQuestions.find(q => q.id === p.soalId);
      if (target) {
        target.status = "INJECTED";
        chrome.storage.local.set({ last_questions: currentQuestions });
        renderQuestionsList();
      }
    }
  }
});

function updateProgressUi(current, total, message) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  progressPercentage.textContent = `${pct}%`;
  progressBarFill.style.width = `${pct}%`;
  progressStatusLabel.textContent = `Soal ${current} dari ${total}`;
  progressDetail.textContent = message;

  if (pct === 100) {
    setTimeout(() => {
      progressDetail.textContent = "🎉 Selesai! Seluruh butir soal berhasil disimpan di Afresto.";
    }, 500);
  }
}

// --- Pengecekan Versi Pembaruan Otomatis (Update Checker) ---
async function checkAppUpdate() {
  try {
    const stored = await chrome.storage.local.get(['custom_update_check_url', 'dismissed_update_version']);
    const checkUrl = stored.custom_update_check_url || 'https://raw.githubusercontent.com/maulana1308/afresto-ai-assistant/main/version.json';

    // Jika masih default placeholder sekolahanda.com, jangan fetch
    if (!checkUrl || checkUrl.includes('sekolahanda.com')) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const resp = await fetch(checkUrl, { cache: 'no-cache', signal: controller.signal });
    clearTimeout(timeoutId);

    if (!resp.ok) return;
    const data = await resp.json();

    if (!data || !data.version) return;
    const currentVersion = (chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest().version : '3.0.0';

    if (stored.dismissed_update_version === data.version) return;

    if (isNewerVersion(data.version, currentVersion)) {
      const banner = document.getElementById('app-update-banner');
      const titleEl = document.getElementById('update-banner-title');
      const descEl = document.getElementById('update-banner-desc');
      if (banner && titleEl && descEl) {
        titleEl.textContent = `Versi Baru (v${data.version}) Tersedia!`;
        if (data.changelog) {
          descEl.innerHTML = `${data.changelog}<br>Jalankan <code>UPDATE_APLIKASI.bat</code> di folder Anda, lalu klik Refresh (🔄).`;
        }
        banner.classList.remove('hidden');

        const btnDismiss = document.getElementById('btn-dismiss-update');
        if (btnDismiss) {
          btnDismiss.onclick = () => {
            banner.classList.add('hidden');
            chrome.storage.local.set({ dismissed_update_version: data.version });
          };
        }
      }
    }
  } catch (e) {
    // Silent fail jika offline atau jaringan tidak tersedia
  }
}

function isNewerVersion(latest, current) {
  const parse = v => String(v).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const [lMaj = 0, lMin = 0, lPat = 0] = parse(latest);
  const [cMaj = 0, cMin = 0, cPat = 0] = parse(current);
  if (lMaj > cMaj) return true;
  if (lMaj === cMaj && lMin > cMin) return true;
  if (lMaj === cMaj && lMin === cMin && lPat > cPat) return true;
  return false;
}

// ------------------------------------------------------------------------
// 9. MODUL NAVIGASI TABS & FITUR MATERI PEMBELAJARAN
// ------------------------------------------------------------------------

let currentLearningMaterial = null;

// Helper: Format Tanggal & Waktu Afresto (yyyy-mm-dd hh:ii)
function formatAfrestoDateTime(d) {
  if (!d) return "";
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return "";
  const pad = (n) => String(n).padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const mins = pad(dateObj.getMinutes());
  return `${year}-${month}-${day} ${hours}:${mins}`;
}

// Helper: Hitung Batas Akhir Tugas (yyyy-mm-dd 23:59)
function calculateAfrestoDeadline(baseDate, daysAhead) {
  const d = new Date(baseDate && baseDate.getTime ? baseDate.getTime() : (baseDate ? new Date(baseDate).getTime() : Date.now()));
  d.setDate(d.getDate() + daysAhead);
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day} 23:59`;
}

// Helper: Tampilkan Pratinjau Materi Pembelajaran
function displayLearningMaterialPreview(mat) {
  if (!mat) return;
  const prevJudul = document.getElementById('preview-materi-judul');
  const prevKonten = document.getElementById('preview-materi-konten');
  const prevTugasCont = document.getElementById('preview-materi-tugas-container');
  const prevTugas = document.getElementById('preview-materi-tugas');
  const prevMulai = document.getElementById('preview-jadwal-mulai');
  const prevTutup = document.getElementById('preview-jadwal-tutup');
  const prevLimit = document.getElementById('preview-jadwal-limit');
  const materiResultsSection = document.getElementById('materi-results-section');

  if (prevJudul) prevJudul.textContent = mat.judul || "-";
  if (prevKonten) prevKonten.innerHTML = mat.konten_html || "-";
  
  const qText = mat.penugasan?.pertanyaan || (mat.denganPenugasan && mat.pertanyaan) || "";
  if (qText) {
    if (prevTugas) prevTugas.textContent = qText;
    if (prevTugasCont) prevTugasCont.classList.remove('hidden');
  } else {
    if (prevTugasCont) prevTugasCont.classList.add('hidden');
  }

  if (prevMulai) prevMulai.textContent = mat.materiMulai || "-";
  if (prevTutup) prevTutup.textContent = mat.materiDitutup || "Tanpa Batas";
  if (prevLimit) prevLimit.textContent = mat.limitPenugasan || "-";

  if (materiResultsSection) {
    materiResultsSection.classList.remove('hidden');
  }
}

// Inisialisasi Modul Navigasi & Materi
function initMateriModule() {
  const tabModuleSoal = document.getElementById('tab-module-soal');
  const tabModuleMateri = document.getElementById('tab-module-materi');
  const moduleSoalWrapper = document.getElementById('module-soal-wrapper');
  const moduleMateriWrapper = document.getElementById('module-materi-wrapper');

  const inputMateriMapel = document.getElementById('input-materi-mapel');
  const selectMateriKelas = document.getElementById('select-materi-kelas');
  const selectMateriGaya = document.getElementById('select-materi-gaya');
  const inputMateriTopik = document.getElementById('input-materi-topik');
  const inputMateriCustom = document.getElementById('input-materi-custom');
  const checkMateriIncludeImage = document.getElementById('check-materi-include-image');
  const selectMateriImageStyle = document.getElementById('select-materi-image-style');
  const materiImageStyleContainer = document.getElementById('materi-image-style-container');
  const checkMateriPenugasan = document.getElementById('check-materi-penugasan');
  const checkMateriIkutGlobal = document.getElementById('check-materi-ikut-global');

  const inputMateriMulai = document.getElementById('input-materi-mulai');
  const btnMateriMulaiSekarang = document.getElementById('btn-materi-mulai-sekarang');
  const inputMateriDitutup = document.getElementById('input-materi-ditutup');
  const checkMateriTanpaTutup = document.getElementById('check-materi-tanpa-tutup');
  const sectionMateriLimit = document.getElementById('section-materi-limit');
  const inputMateriLimit = document.getElementById('input-materi-limit');
  const btnDeadline3 = document.getElementById('btn-materi-deadline-3');
  const btnDeadline7 = document.getElementById('btn-materi-deadline-7');
  const btnDeadline14 = document.getElementById('btn-materi-deadline-14');

  const btnSyncMateri = document.getElementById('btn-sync-materi');
  const btnGenerateMateri = document.getElementById('btn-generate-materi');
  const materiAlert = document.getElementById('materi-alert');
  const materiResultsSection = document.getElementById('materi-results-section');
  const btnInjectMateri = document.getElementById('btn-inject-materi');
  const btnClearMateriDraft = document.getElementById('btn-clear-materi-draft');

  // Inisialisasi Tanggal Awal jika belum ada
  if (inputMateriMulai && !inputMateriMulai.value) {
    inputMateriMulai.value = formatAfrestoDateTime(new Date());
  }
  if (inputMateriLimit && !inputMateriLimit.value) {
    inputMateriLimit.value = calculateAfrestoDeadline(new Date(), 7);
  }

  // Simpan State Form Materi ke chrome.storage.local
  function saveMateriFormState() {
    const state = {
      mapel: inputMateriMapel?.value || "",
      kelas: selectMateriKelas?.value || "",
      gaya: selectMateriGaya?.value || "",
      topik: inputMateriTopik?.value || "",
      custom: inputMateriCustom?.value || "",
      includeImage: checkMateriIncludeImage ? checkMateriIncludeImage.checked : true,
      imageStyle: selectMateriImageStyle?.value || "AUTO",
      penugasan: checkMateriPenugasan ? checkMateriPenugasan.checked : true,
      ikutGlobal: checkMateriIkutGlobal ? checkMateriIkutGlobal.checked : true,
      mulai: inputMateriMulai?.value || "",
      ditutup: inputMateriDitutup?.value || "",
      tanpaTutup: checkMateriTanpaTutup ? checkMateriTanpaTutup.checked : true,
      limit: inputMateriLimit?.value || ""
    };
    chrome.storage.local.set({ afresto_materi_form_state: state });
  }

  // Pulihkan State Form Materi & Draft Terakhir
  chrome.storage.local.get(['afresto_materi_form_state', 'afresto_last_learning_material', 'afresto_active_module']).then((data) => {
    if (data.afresto_materi_form_state) {
      const s = data.afresto_materi_form_state;
      if (inputMateriMapel && s.mapel !== undefined && s.mapel) inputMateriMapel.value = s.mapel;
      if (selectMateriKelas && s.kelas !== undefined && s.kelas) selectMateriKelas.value = s.kelas;
      if (selectMateriGaya && s.gaya !== undefined && s.gaya) selectMateriGaya.value = s.gaya;
      if (inputMateriTopik && s.topik !== undefined) inputMateriTopik.value = s.topik;
      if (inputMateriCustom && s.custom !== undefined) inputMateriCustom.value = s.custom;
      if (checkMateriIncludeImage && s.includeImage !== undefined) {
        checkMateriIncludeImage.checked = s.includeImage;
        if (materiImageStyleContainer) {
          materiImageStyleContainer.style.display = s.includeImage ? 'block' : 'none';
        }
      }
      if (selectMateriImageStyle && s.imageStyle !== undefined) selectMateriImageStyle.value = s.imageStyle;
      if (checkMateriPenugasan && s.penugasan !== undefined) {
        checkMateriPenugasan.checked = s.penugasan;
        if (sectionMateriLimit) {
          sectionMateriLimit.style.display = s.penugasan ? 'block' : 'none';
        }
      }
      if (checkMateriIkutGlobal && s.ikutGlobal !== undefined) checkMateriIkutGlobal.checked = s.ikutGlobal;
      if (inputMateriMulai && s.mulai) inputMateriMulai.value = s.mulai;
      if (checkMateriTanpaTutup && s.tanpaTutup !== undefined) {
        checkMateriTanpaTutup.checked = s.tanpaTutup;
        if (s.tanpaTutup) {
          inputMateriDitutup.disabled = true;
          inputMateriDitutup.value = "(Buka terus tanpa batas waktu)";
          inputMateriDitutup.style.background = "var(--bg-surface-elevated)";
          inputMateriDitutup.style.color = "var(--text-muted)";
        } else {
          inputMateriDitutup.disabled = false;
          if (s.ditutup) inputMateriDitutup.value = s.ditutup;
          inputMateriDitutup.style.background = "var(--bg-surface)";
          inputMateriDitutup.style.color = "var(--text-primary)";
        }
      }
      if (inputMateriLimit && s.limit) inputMateriLimit.value = s.limit;
    }

    if (data.afresto_last_learning_material) {
      currentLearningMaterial = data.afresto_last_learning_material;
      displayLearningMaterialPreview(currentLearningMaterial);
    }

    if (data.afresto_active_module === 'materi') {
      switchModuleTab('materi');
    }
  });

  // Pasang Auto-Save pada Form Materi
  const materiFormElements = [inputMateriMapel, selectMateriKelas, selectMateriGaya, inputMateriTopik, inputMateriCustom, selectMateriImageStyle, inputMateriMulai, inputMateriDitutup, inputMateriLimit];
  materiFormElements.forEach(el => {
    if (el) {
      el.addEventListener('input', saveMateriFormState);
      el.addEventListener('change', saveMateriFormState);
    }
  });
  const materiCheckElements = [checkMateriIncludeImage, checkMateriPenugasan, checkMateriIkutGlobal, checkMateriTanpaTutup];
  materiCheckElements.forEach(chk => {
    if (chk) {
      chk.addEventListener('change', saveMateriFormState);
    }
  });

  // Tombol Hapus Draft Materi
  if (btnClearMateriDraft) {
    btnClearMateriDraft.addEventListener('click', async () => {
      currentLearningMaterial = null;
      await chrome.storage.local.remove('afresto_last_learning_material');
      if (materiResultsSection) materiResultsSection.classList.add('hidden');
      showToast("Draft materi berhasil dihapus.", "info");
    });
  }

  // Tab Switcher dengan Persistensi
  function switchModuleTab(mode) {
    currentActiveModule = mode;
    chrome.storage.local.set({ afresto_active_module: mode });
    if (mode === 'materi') {
      if (tabModuleMateri) {
        tabModuleMateri.classList.add('active');
        tabModuleMateri.setAttribute('aria-selected', 'true');
      }
      if (tabModuleSoal) {
        tabModuleSoal.classList.remove('active');
        tabModuleSoal.setAttribute('aria-selected', 'false');
      }
      if (moduleMateriWrapper) moduleMateriWrapper.classList.remove('hidden');
      if (moduleSoalWrapper) moduleSoalWrapper.classList.add('hidden');
    } else {
      if (tabModuleSoal) {
        tabModuleSoal.classList.add('active');
        tabModuleSoal.setAttribute('aria-selected', 'true');
      }
      if (tabModuleMateri) {
        tabModuleMateri.classList.remove('active');
        tabModuleMateri.setAttribute('aria-selected', 'false');
      }
      if (moduleSoalWrapper) moduleSoalWrapper.classList.remove('hidden');
      if (moduleMateriWrapper) moduleMateriWrapper.classList.add('hidden');
    }
    // Segera perbarui status banner agar langsung sesuai dengan konteks tab yang aktif
    checkActiveTabStatus();
  }

  if (tabModuleSoal) tabModuleSoal.addEventListener('click', () => switchModuleTab('soal'));
  if (tabModuleMateri) tabModuleMateri.addEventListener('click', () => switchModuleTab('materi'));

  // Mulai Sekarang
  if (btnMateriMulaiSekarang) {
    btnMateriMulaiSekarang.addEventListener('click', () => {
      inputMateriMulai.value = formatAfrestoDateTime(new Date());
      saveMateriFormState();
    });
  }

  // Checkbox Tanpa Tutup
  if (checkMateriTanpaTutup) {
    checkMateriTanpaTutup.addEventListener('change', () => {
      if (checkMateriTanpaTutup.checked) {
        inputMateriDitutup.disabled = true;
        inputMateriDitutup.value = "(Buka terus tanpa batas waktu)";
        inputMateriDitutup.style.background = "var(--bg-surface-elevated)";
        inputMateriDitutup.style.color = "var(--text-muted)";
      } else {
        inputMateriDitutup.disabled = false;
        inputMateriDitutup.value = calculateAfrestoDeadline(new Date(), 30);
        inputMateriDitutup.style.background = "var(--bg-surface)";
        inputMateriDitutup.style.color = "var(--text-primary)";
      }
      saveMateriFormState();
    });
  }

  // Toggle Penugasan
  if (checkMateriPenugasan) {
    checkMateriPenugasan.addEventListener('change', () => {
      if (sectionMateriLimit) {
        sectionMateriLimit.style.display = checkMateriPenugasan.checked ? 'block' : 'none';
      }
      saveMateriFormState();
    });
  }

  // Toggle Opsi Gambar Materi
  if (checkMateriIncludeImage && materiImageStyleContainer) {
    checkMateriIncludeImage.addEventListener('change', () => {
      materiImageStyleContainer.style.display = checkMateriIncludeImage.checked ? 'block' : 'none';
      saveMateriFormState();
    });
  }

  // Deadline Presets
  if (btnDeadline3) {
    btnDeadline3.addEventListener('click', () => {
      inputMateriLimit.value = calculateAfrestoDeadline(new Date(), 3);
      saveMateriFormState();
    });
  }
  if (btnDeadline7) {
    btnDeadline7.addEventListener('click', () => {
      inputMateriLimit.value = calculateAfrestoDeadline(new Date(), 7);
      saveMateriFormState();
    });
  }
  if (btnDeadline14) {
    btnDeadline14.addEventListener('click', () => {
      inputMateriLimit.value = calculateAfrestoDeadline(new Date(), 14);
      saveMateriFormState();
    });
  }

  // Sinkronisasi Data Mapel
  if (btnSyncMateri) {
    btnSyncMateri.addEventListener('click', async () => {
      btnSyncMateri.textContent = "🔄 Memindai...";
      btnSyncMateri.disabled = true;

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          btnSyncMateri.textContent = "🔄 Sinkronkan";
          btnSyncMateri.disabled = false;
          return;
        }

        const applyResult = (res) => {
          btnSyncMateri.textContent = "🔄 Sinkronkan";
          btnSyncMateri.disabled = false;
          if (res && res.detected && res.detected.mapel) {
            inputMateriMapel.value = res.detected.mapel;
            if (res.detected.kelas) selectMateriKelas.value = res.detected.kelas;
            saveMateriFormState();
            checkActiveTabStatus();
          }
        };

        chrome.tabs.sendMessage(tab.id, { action: "SYNC_ACADEMIC_INFO" }, (res) => {
          if (chrome.runtime.lastError) {
            if (chrome.scripting && chrome.scripting.executeScript) {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['scripts/injector.js']
              }).then(() => {
                setTimeout(() => {
                  chrome.tabs.sendMessage(tab.id, { action: "SYNC_ACADEMIC_INFO" }, applyResult);
                }, 200);
              }).catch(() => {
                btnSyncMateri.textContent = "🔄 Sinkronkan";
                btnSyncMateri.disabled = false;
              });
              return;
            }
          }
          applyResult(res);
        });
      } catch (e) {
        btnSyncMateri.textContent = "🔄 Sinkronkan";
        btnSyncMateri.disabled = false;
      }
    });
  }

  // Generate Materi AI
  if (btnGenerateMateri) {
    btnGenerateMateri.addEventListener('click', async () => {
      const mapel = inputMateriMapel ? inputMateriMapel.value.trim() : "";
      const kelas = selectMateriKelas ? selectMateriKelas.value : "Kelas 8 SMP";
      const topik = inputMateriTopik ? inputMateriTopik.value.trim() : "";
      const gaya = selectMateriGaya ? selectMateriGaya.value : "Komprehensif & Kasus";
      const denganPenugasan = checkMateriPenugasan ? checkMateriPenugasan.checked : true;
      const instruksiKhusus = inputMateriCustom ? inputMateriCustom.value.trim() : "";

      if (!userApiKey) {
        materiAlert.textContent = "Kunci API Gemini belum diisi. Buka panel pengaturan di atas.";
        materiAlert.className = "alert alert-error";
        materiAlert.classList.remove('hidden');
        settingsPanel.classList.remove('hidden');
        return;
      }

      if (!topik) {
        materiAlert.textContent = "Topik / Materi Pokok wajib diisi!";
        materiAlert.className = "alert alert-error";
        materiAlert.classList.remove('hidden');
        inputMateriTopik.focus();
        return;
      }

      const includeImage = checkMateriIncludeImage ? checkMateriIncludeImage.checked : true;
      const imageStyle = selectMateriImageStyle ? selectMateriImageStyle.value : "AUTO";

      materiAlert.classList.add('hidden');
      btnGenerateMateri.disabled = true;
      btnGenerateMateri.querySelector('.btn-text').textContent = "⏳ Sedang Merancang Materi Pembelajaran...";
      btnGenerateMateri.querySelector('.spinner').classList.remove('hidden');

      try {
        const gemini = new GeminiService(userApiKey, selectedModel);
        const result = await gemini.generateLearningMaterial({
          mapel,
          kelas,
          topik,
          gaya,
          denganPenugasan,
          instruksiKhusus,
          includeImage,
          imageStyle
        }, (statusText) => {
          btnGenerateMateri.querySelector('.btn-text').textContent = "⏳ " + statusText;
        });

        let finalHtml = result.konten_html;
        let imageTagHtml = "";

        if (includeImage && result.butuh_gambar) {
          btnGenerateMateri.querySelector('.btn-text').textContent = "🎨 Memproses gambar ilustrasi...";
          if (result.gambar_svg && result.gambar_svg.includes('<svg')) {
            imageTagHtml = `
<figure class="materi-visual-figure" style="text-align: center; margin: 16px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
  <div style="max-width: 100%; overflow-x: auto;">
    ${result.gambar_svg}
  </div>
  ${result.gambar_caption ? `<figcaption style="font-size: 11px; color: #64748b; margin-top: 6px; font-style: italic;">Gambar: ${result.gambar_caption}</figcaption>` : ''}
</figure>`;
          } else if (result.gambar_prompt) {
            const selectedStyleObj = IMAGE_STYLES[result.gambar_gaya] || IMAGE_STYLES.REALISTIS;
            const enhancedPrompt = buildEnhancedImagePrompt(result.gambar_prompt, selectedStyleObj);
            const imgUrl = getPollinationsImageUrl(enhancedPrompt, 600, 360);
            
            let base64 = "";
            try {
              base64 = await downloadImageAsBase64(imgUrl, 60000, (statusMsg) => {
                btnGenerateMateri.querySelector('.btn-text').textContent = "⏳ " + statusMsg;
              });
            } catch (e) {
              console.warn("Gagal mengunduh gambar AI dari server eksternal, beralih ke diagram SVG:", e);
              base64 = null;
            }

            if (base64) {
              imageTagHtml = `
<figure class="materi-visual-figure" style="text-align: center; margin: 16px 0;">
  <img src="${base64}" alt="${result.gambar_caption || 'Ilustrasi Materi'}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); border: 1px solid #e2e8f0;" />
  ${result.gambar_caption ? `<figcaption style="font-size: 11px; color: #64748b; margin-top: 6px; font-style: italic;">Gambar: ${result.gambar_caption}</figcaption>` : ''}
</figure>`;
            } else {
              const fallbackSvg = generateFallbackSvg(result.judul, result.gambar_caption || "Diagram Konsep Materi Pembelajaran");
              imageTagHtml = `
<figure class="materi-visual-figure" style="text-align: center; margin: 16px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
  <div style="max-width: 100%; overflow-x: auto;">
    ${fallbackSvg}
  </div>
  ${result.gambar_caption ? `<figcaption style="font-size: 11px; color: #64748b; margin-top: 6px; font-style: italic;">Gambar: ${result.gambar_caption}</figcaption>` : ''}
</figure>`;
            }
          }

          if (imageTagHtml) {
            const firstPIndex = finalHtml.indexOf('</p>');
            if (firstPIndex !== -1) {
              finalHtml = finalHtml.slice(0, firstPIndex + 4) + "\n" + imageTagHtml + "\n" + finalHtml.slice(firstPIndex + 4);
            } else {
              finalHtml = imageTagHtml + "\n" + finalHtml;
            }
          }
        }

        currentLearningMaterial = {
          ...result,
          konten_html: finalHtml,
          mapel,
          kelas,
          ikutGlobal: checkMateriIkutGlobal ? checkMateriIkutGlobal.checked : true,
          materiMulai: inputMateriMulai ? inputMateriMulai.value.trim() : "",
          materiDitutup: (checkMateriTanpaTutup && checkMateriTanpaTutup.checked) ? "" : (inputMateriDitutup ? inputMateriDitutup.value.trim() : ""),
          limitPenugasan: (denganPenugasan && inputMateriLimit) ? inputMateriLimit.value.trim() : ""
        };

        // Simpan rancangan materi ke storage secara persisten
        await chrome.storage.local.set({ afresto_last_learning_material: currentLearningMaterial });

        // Tampilkan Pratinjau
        displayLearningMaterialPreview(currentLearningMaterial);
        if (materiResultsSection) {
          materiResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (err) {
        materiAlert.textContent = "Gagal merancang materi: " + err.message;
        materiAlert.className = "alert alert-error";
        materiAlert.classList.remove('hidden');
      } finally {
        btnGenerateMateri.disabled = false;
        btnGenerateMateri.querySelector('.btn-text').textContent = "✨ Rancang Materi Pembelajaran via AI";
        btnGenerateMateri.querySelector('.spinner').classList.add('hidden');
      }
    });
  }

  // Injeksi Otomatis ke Halaman Afresto
  if (btnInjectMateri) {
    btnInjectMateri.addEventListener('click', async () => {
      if (!currentLearningMaterial) return;

      btnInjectMateri.disabled = true;
      btnInjectMateri.querySelector('.btn-text').textContent = "⏳ Menginputkan ke Form Afresto...";
      btnInjectMateri.querySelector('.spinner').classList.remove('hidden');

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) throw new Error("Tidak ada tab browser aktif.");

        const payload = {
          judul: currentLearningMaterial.judul,
          konten: currentLearningMaterial.konten_html,
          denganPenugasan: currentLearningMaterial.penugasan?.aktif,
          pertanyaan: currentLearningMaterial.penugasan?.pertanyaan || "",
          ikutGlobal: currentLearningMaterial.ikutGlobal,
          materiMulai: currentLearningMaterial.materiMulai,
          materiDitutup: currentLearningMaterial.materiDitutup,
          limitPenugasan: currentLearningMaterial.limitPenugasan
        };

        chrome.tabs.sendMessage(tab.id, { action: "INJECT_MATERI", data: payload }, (res) => {
          btnInjectMateri.disabled = false;
          btnInjectMateri.querySelector('.btn-text').textContent = "📋 Masukkan Konten ke Form Afresto";
          btnInjectMateri.querySelector('.spinner').classList.add('hidden');

          if (chrome.runtime.lastError || !res || !res.success) {
            alert("Gagal memasukkan materi: " + (res?.error || chrome.runtime.lastError?.message || "Pastikan Anda berada di halaman Form Materi Afresto."));
          } else {
            const detail = (res.injectedElements && res.injectedElements.length > 0)
              ? `Komponen yang berhasil diisi:\n• ${res.injectedElements.join('\n• ')}\n\n`
              : '';
            alert(`✅ Berhasil Dimasukkan ke Form Afresto!\n\n${detail}Silakan periksa kembali artikel di editor dan sesuaikan jadwal Anda langsung di halaman Afresto, lalu klik tombol 'Simpan' jika sudah selesai.`);
          }
        });
      } catch (err) {
        btnInjectMateri.disabled = false;
        btnInjectMateri.querySelector('.btn-text').textContent = "📋 Masukkan Konten ke Form Afresto";
        btnInjectMateri.querySelector('.spinner').classList.add('hidden');
        alert("Gagal: " + err.message);
      }
    });
  }
}

function updateMateriPageDetection(detected) {
  const badge = document.getElementById('materi-detected-badge');
  const text = document.getElementById('materi-detected-text');
  if (badge && text) {
    if (detected && detected.mapel) {
      text.textContent = `${detected.mapel} ${detected.kelas ? '• ' + detected.kelas : ''}`;
      badge.classList.remove('hidden');
    } else {
      text.textContent = "Formulir Materi Aktif";
      badge.classList.remove('hidden');
    }
  }
}

// Inisialisasi saat Side Panel dimuat
document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  initMateriModule();
  checkAppUpdate();

  // Event listener tombol-tombol Modal Edit Soal
  const btnCloseModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const btnSaveEdit = document.getElementById('btn-save-edit');
  const editModalOverlay = document.getElementById('modal-edit-question');

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeEditQuestionModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditQuestionModal);
  if (btnSaveEdit) btnSaveEdit.addEventListener('click', saveEditedQuestion);
  if (editModalOverlay) {
    editModalOverlay.addEventListener('click', (e) => {
      if (e.target === editModalOverlay) closeEditQuestionModal();
    });
  }

  // Sinkronisasi status halaman secara real-time saat tab berganti atau URL berubah
  if (chrome.tabs && chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(() => checkActiveTabStatus());
  }

  if (chrome.tabs && chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        checkActiveTabStatus();
      }
    });
  }

  // Heartbeat polling berkala (setiap 1.5 detik) agar selalu sinkron saat berpindah menu di Afresto
  setInterval(checkActiveTabStatus, 1500);

  // Periksa ulang saat jendela Side Panel mendapatkan fokus
  window.addEventListener('focus', checkActiveTabStatus);
});
