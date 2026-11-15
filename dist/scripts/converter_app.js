/**
 * Controller UI Konverter Mandiri (converter.html)
 * Bekerja baik saat dibuka langsung lewat file:// maupun dari dalam Ekstensi Chrome (MV3 CSP safe).
 */
(function () {
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const fileInfo = document.getElementById('file-info');
  const fileNameEl = document.getElementById('file-name');
  const statTotal = document.getElementById('stat-total');
  const statPg = document.getElementById('stat-pg');
  const statPgk = document.getElementById('stat-pgk');
  const statBs = document.getElementById('stat-bs');
  const apiKeySection = document.getElementById('api-key-section');
  const apiKeyInput = document.getElementById('api-key-input');
  const pinSection = document.getElementById('pin-section');
  const accessPinInput = document.getElementById('access-pin-input');
  const btnOcrAllBs = document.getElementById('btn-ocr-all-bs');
  const btnDownloadNext = document.getElementById('btn-download-next');
  const statusAlert = document.getElementById('status-alert');
  const emptyState = document.getElementById('empty-state');
  const questionsContainer = document.getElementById('questions-container');
  const bsPendingBadge = document.getElementById('bs-pending-badge');

  let loadedFileName = 'Bank_Soal';
  let questions = [];
  let serverOcrAvailable = false;
  let serverRequiresPin = false;

  try {
    if (window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['gemini_api_key', 'afresto_converter_preload'], (res) => {
        if (res && res.gemini_api_key) apiKeyInput.value = res.gemini_api_key;
        const preload = res && res.afresto_converter_preload;
        if (preload && Array.isArray(preload.questions) && preload.questions.length > 0 && questions.length === 0) {
          questions = preload.questions;
          loadedFileName = String(preload.fileName || 'Bank_Soal').replace(/\.docx$/i, '');
          fileNameEl.textContent = `${loadedFileName} (dari antrean Add-on)`;
          fileInfo.classList.remove('hidden');
          const pending = getPendingImageBsIndices();
          if (pending.length > 0) {
            showAlert(`Berhasil memuat ${questions.length} soal dari Add-on. Soal #${pending.map(x => x + 1).join(', #')} memiliki gambar Benar/Salah yang dapat dibaca via AI atau diketik manual.`, 'warn');
          } else {
            showAlert(`Berhasil memuat ${questions.length} soal dari Add-on. Klik "Unduh Word Afresto Next (.docx)".`, 'ok');
          }
          renderPreview();
          chrome.storage.local.remove('afresto_converter_preload');
        }
      });
    } else {
      const saved = localStorage.getItem('afresto_converter_api_key');
      if (saved) apiKeyInput.value = saved;
      const savedPin = sessionStorage.getItem('afresto_converter_pin');
      if (savedPin && accessPinInput) accessPinInput.value = savedPin;
    }
  } catch (e) {}

  if (accessPinInput) {
    accessPinInput.addEventListener('change', () => {
      try { sessionStorage.setItem('afresto_converter_pin', accessPinInput.value.trim()); } catch (e) {}
    });
  }

  // Deteksi otomatis backend proxy VPS saat dijalankan via http:// atau https://
  if (window.location && /^https?:$/i.test(window.location.protocol)) {
    fetch('./api/health', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(info => {
        if (info && info.serverOcrAvailable) {
          serverOcrAvailable = true;
          serverRequiresPin = Boolean(info.requiresPin);
        }
      })
      .catch(() => {});
  }

  async function extractBenarSalahViaBackend(dataUrl, questionText) {
    if (serverOcrAvailable) {
      const headers = { 'Content-Type': 'application/json' };
      const pinVal = accessPinInput ? accessPinInput.value.trim() : '';
      if (serverRequiresPin) {
        if (!pinVal) {
          if (pinSection) pinSection.classList.remove('hidden');
          if (accessPinInput) accessPinInput.focus();
          throw new Error('Masukkan Kode Akses Guru (PIN Server) terlebih dahulu.');
        }
        headers['x-access-pin'] = pinVal;
      }
      const resp = await fetch('./api/ocr-bs', {
        method: 'POST',
        headers,
        body: JSON.stringify({ dataUrl, questionText })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (resp.status === 401 && pinSection) {
          pinSection.classList.remove('hidden');
          if (accessPinInput) accessPinInput.focus();
        }
        throw new Error(json.error || `Server OCR error (${resp.status})`);
      }
      return json;
    }

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      if (apiKeySection) apiKeySection.classList.remove('hidden');
      apiKeyInput.focus();
      throw new Error('NEED_LOCAL_API_KEY');
    }
    const gemini = new window.AfrestoBridge.GeminiService(apiKey, 'gemini-2.5-flash');
    return gemini.extractBenarSalahFromImage(dataUrl, questionText);
  }

  apiKeyInput.addEventListener('change', () => {
    try {
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ gemini_api_key: apiKeyInput.value.trim() });
      } else {
        localStorage.setItem('afresto_converter_api_key', apiKeyInput.value.trim());
      }
    } catch (e) {}
  });

  function showAlert(msg, type) {
    statusAlert.textContent = msg;
    statusAlert.className = 'alert-box ' + (type === 'error' ? 'alert-error' : type === 'warn' ? 'alert-warn' : 'alert-ok');
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getPendingImageBsIndices() {
    const idxs = [];
    questions.forEach((q, i) => {
      if (q.tipe === 'BENAR_SALAH' && Object.keys(q.opsi || {}).length < 2 && q.gambar_base64) {
        idxs.push(i);
      }
    });
    return idxs;
  }

  function refreshStatsAndToolbar() {
    statTotal.textContent = String(questions.length);
    statPg.textContent = String(questions.filter(q => q.tipe === 'PG').length);
    statPgk.textContent = String(questions.filter(q => q.tipe === 'PG_KOMPLEKS').length);
    statBs.textContent = String(questions.filter(q => q.tipe === 'BENAR_SALAH').length);

    const pendingIdxs = getPendingImageBsIndices();
    if (pendingIdxs.length > 0) {
      bsPendingBadge.textContent = pendingIdxs.length + ' soal B/S perlu teks';
      bsPendingBadge.classList.remove('hidden');
      btnOcrAllBs.classList.remove('hidden');
    } else {
      bsPendingBadge.classList.add('hidden');
      btnOcrAllBs.classList.add('hidden');
    }
    btnDownloadNext.disabled = questions.length === 0;
  }

  function renderPreview() {
    refreshStatsAndToolbar();
    if (questions.length === 0) {
      emptyState.classList.remove('hidden');
      questionsContainer.classList.add('hidden');
      questionsContainer.innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');
    questionsContainer.classList.remove('hidden');

    questionsContainer.innerHTML = questions.map((q, idx) => {
      const tipe = String(q.tipe || 'PG').toUpperCase();
      const keySet = new Set(
        Array.isArray(q.kunci)
          ? q.kunci.map(k => String(k).toUpperCase())
          : String(q.kunci || '').split(/[\s,;]+/).map(k => k.trim().toUpperCase()).filter(Boolean)
      );

      let bodyHtml = '';
      if (tipe === 'PG' || tipe === 'PG_KOMPLEKS') {
        const opts = Object.entries(q.opsi || {}).sort(([a], [b]) => a.localeCompare(b));
        bodyHtml = `<ul class="q-opts">` + opts.map(([letter, text]) => {
          const isKey = keySet.has(letter.toUpperCase());
          return `<li class="q-opt ${isKey ? 'is-key' : ''}">${letter}. ${escapeHtml(text)}${isKey ? ' <strong>(Kunci)</strong>' : ''}</li>`;
        }).join('') + `</ul>`;
      } else if (tipe === 'MENCOCOKKAN') {
        const pairs = q.pasangan || [];
        bodyHtml = `<table class="bs-preview-table"><thead><tr><th>SOAL</th><th>JAWABAN</th></tr></thead><tbody>` +
          pairs.map((p, pi) => `<tr><td>${pi + 1}. ${escapeHtml(p.kiri)} <br><small>Kunci : ${escapeHtml(p.kunci || String.fromCharCode(65 + pi))}</small></td><td>${String.fromCharCode(65 + pi)}. ${escapeHtml(p.kanan)}</td></tr>`).join('') +
          `</tbody></table>`;
      } else if (tipe === 'BENAR_SALAH') {
        const entries = Object.entries(q.opsi || {});
        if (entries.length >= 2) {
          bodyHtml = `<table class="bs-preview-table"><thead><tr><th style="width:42px;">No</th><th>Pernyataan</th><th style="width:72px;">Benar</th><th style="width:72px;">Salah</th></tr></thead><tbody>` +
            entries.map(([letter, txt], rIdx) => {
              const isB = !/salah|false/i.test(String((q.kunci && q.kunci[letter]) || 'Benar'));
              return `<tr><td class="center">${rIdx + 1}</td><td>${escapeHtml(txt)}</td><td class="center">${isB ? 'v' : ''}</td><td class="center">${isB ? '' : 'v'}</td></tr>`;
            }).join('') +
            `</tbody></table>`;
        } else {
          const draftA = (q.opsi && q.opsi.A) || '';
          const draftB = (q.opsi && q.opsi.B) || '';
          const ansA = (q.kunci && q.kunci.A) || 'Benar';
          const ansB = (q.kunci && q.kunci.B) || 'Salah';
          bodyHtml = `
            <div class="img-ref-box">
              ${q.gambar_base64 ? `<img src="${q.gambar_base64}" alt="Gambar pernyataan soal #${idx + 1}">` : ''}
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                <strong style="font-size:12.5px;">Isi pernyataan Benar/Salah (disimpan ke tabel Afresto Next):</strong>
                ${q.gambar_base64 ? `<button type="button" class="btn btn-secondary btn-sm btn-ocr-single" data-idx="${idx}">🔍 Baca Gambar Ini (AI)</button>` : ''}
              </div>
              <div class="bs-editor-rows">
                <div class="bs-edit-row">
                  <input type="text" class="bs-input-text" data-idx="${idx}" data-letter="A" value="${escapeHtml(draftA)}" placeholder="Ketik Pernyataan 1 (dari gambar di atas)">
                  <select class="bs-input-ans" data-idx="${idx}" data-letter="A">
                    <option value="Benar" ${ansA === 'Benar' ? 'selected' : ''}>Benar (v)</option>
                    <option value="Salah" ${ansA === 'Salah' ? 'selected' : ''}>Salah (v)</option>
                  </select>
                </div>
                <div class="bs-edit-row">
                  <input type="text" class="bs-input-text" data-idx="${idx}" data-letter="B" value="${escapeHtml(draftB)}" placeholder="Ketik Pernyataan 2 (dari gambar di atas)">
                  <select class="bs-input-ans" data-idx="${idx}" data-letter="B">
                    <option value="Benar" ${ansB === 'Benar' ? 'selected' : ''}>Benar (v)</option>
                    <option value="Salah" ${ansB === 'Salah' ? 'selected' : ''}>Salah (v)</option>
                  </select>
                </div>
                <div style="display:flex; justify-content:flex-end;">
                  <button type="button" class="btn btn-ok btn-sm btn-apply-bs" data-idx="${idx}">Terapkan ke Tabel Afresto Next</button>
                </div>
              </div>
            </div>`;
        }
      }

      const isBsReady = tipe !== 'BENAR_SALAH' || Object.keys(q.opsi || {}).length >= 2;
      return `
        <article class="q-card">
          <div class="q-card-head">
            <div class="q-badges">
              <span class="badge">#${idx + 1}</span>
              <span class="badge">${escapeHtml(tipe)}</span>
              <span class="badge ${isBsReady ? 'badge-ok' : 'badge-warn'}">${isBsReady ? 'Siap Afresto Next' : 'Perlu Teks B/S'}</span>
            </div>
          </div>
          <div class="q-stem">${escapeHtml(String(q.pertanyaan || '').replace(/<[^>]+>/g, ''))}</div>
          ${bodyHtml}
        </article>
      `;
    }).join('');

    questionsContainer.querySelectorAll('.btn-apply-bs').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.currentTarget.getAttribute('data-idx'));
        const tA = questionsContainer.querySelector(`.bs-input-text[data-idx="${i}"][data-letter="A"]`).value.trim();
        const tB = questionsContainer.querySelector(`.bs-input-text[data-idx="${i}"][data-letter="B"]`).value.trim();
        const aA = questionsContainer.querySelector(`.bs-input-ans[data-idx="${i}"][data-letter="A"]`).value;
        const aB = questionsContainer.querySelector(`.bs-input-ans[data-idx="${i}"][data-letter="B"]`).value;
        if (!tA || !tB) {
          showAlert(`Isi kedua teks pernyataan untuk soal #${i + 1} terlebih dahulu.`, 'warn');
          return;
        }
        questions[i].opsi = { A: tA, B: tB };
        questions[i].kunci = { A: aA, B: aB };
        questions[i]._ocrExtracted = true;
        questions[i].gambar_base64 = null;
        showAlert(`Pernyataan soal #${i + 1} berhasil diubah ke tabel Benar/Salah teks.`, 'ok');
        renderPreview();
      });
    });

    questionsContainer.querySelectorAll('.btn-ocr-single').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget;
        const i = Number(target.getAttribute('data-idx'));
        target.disabled = true;
        target.textContent = '⏳ Membaca...';
        try {
          const extracted = await extractBenarSalahViaBackend(questions[i].gambar_base64, questions[i].pertanyaan || '');
          questions[i].opsi = extracted.opsi;
          questions[i].kunci = extracted.kunci;
          questions[i]._ocrExtracted = true;
          questions[i].gambar_base64 = null;
          showAlert(`Berhasil membaca pernyataan Benar/Salah soal #${i + 1} dari gambar.`, 'ok');
          renderPreview();
        } catch (err) {
          if (err.message === 'NEED_LOCAL_API_KEY') {
            showAlert('Masukkan Kunci API Gemini terlebih dahulu untuk membaca teks dari gambar secara otomatis.', 'warn');
          } else {
            if (!serverOcrAvailable && /api key|401|403|key_invalid/i.test(String(err.message || '')) && apiKeySection) {
              apiKeySection.classList.remove('hidden');
            }
            showAlert(`Gagal membaca gambar soal #${i + 1}: ${err.message}`, 'error');
          }
          target.disabled = false;
          target.textContent = '🔍 Baca Gambar Ini (AI)';
        }
      });
    });
  }

  async function handleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.docx')) {
      showAlert('Pilih berkas Microsoft Word berformat .docx.', 'error');
      return;
    }
    try {
      loadedFileName = file.name.replace(/\.docx$/i, '');
      const ab = await file.arrayBuffer();
      const res = await window.AfrestoBridge.parseDocx(ab);
      questions = res.directQuestions || [];
      fileNameEl.textContent = file.name;
      fileInfo.classList.remove('hidden');
      const pending = getPendingImageBsIndices();
      if (pending.length > 0) {
        showAlert(`Berhasil membaca ${questions.length} soal. Soal #${pending.map(x => x + 1).join(', #')} memiliki gambar Benar/Salah yang dapat dibaca via AI atau diketik manual sebelum unduh.`, 'warn');
      } else {
        showAlert(`Berhasil membaca ${questions.length} soal. Klik "Unduh Word Afresto Next (.docx)".`, 'ok');
      }
      renderPreview();
    } catch (err) {
      showAlert(`Gagal memproses .docx: ${err.message}`, 'error');
    }
  }

  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  btnOcrAllBs.addEventListener('click', async () => {
    const pendingIdxs = getPendingImageBsIndices();
    if (pendingIdxs.length === 0) return;

    btnOcrAllBs.disabled = true;
    const origText = btnOcrAllBs.textContent;
    try {
      for (let k = 0; k < pendingIdxs.length; k++) {
        const idx = pendingIdxs[k];
        btnOcrAllBs.textContent = `⏳ Membaca soal #${idx + 1} (${k + 1}/${pendingIdxs.length})...`;
        const extracted = await extractBenarSalahViaBackend(questions[idx].gambar_base64, questions[idx].pertanyaan || '');
        questions[idx].opsi = extracted.opsi;
        questions[idx].kunci = extracted.kunci;
        questions[idx]._ocrExtracted = true;
        questions[idx].gambar_base64 = null;
      }
      showAlert(`Selesai membaca ${pendingIdxs.length} gambar Benar/Salah. Siap diunduh ke format Afresto Next.`, 'ok');
      renderPreview();
    } catch (err) {
      if (err.message === 'NEED_LOCAL_API_KEY') {
        showAlert('Masukkan Kunci API Gemini terlebih dahulu untuk membaca semua gambar Benar/Salah.', 'warn');
      } else {
        if (!serverOcrAvailable && /api key|401|403|key_invalid/i.test(String(err.message || '')) && apiKeySection) {
          apiKeySection.classList.remove('hidden');
        }
        showAlert(`Proses OCR berhenti: ${err.message}`, 'error');
      }
    } finally {
      btnOcrAllBs.disabled = false;
      btnOcrAllBs.textContent = origText;
    }
  });

  btnDownloadNext.addEventListener('click', async () => {
    if (questions.length === 0) return;
    btnDownloadNext.disabled = true;
    const orig = btnDownloadNext.textContent;
    btnDownloadNext.textContent = '⏳ Menyusun .docx Afresto Next...';
    try {
      const { bytes, stats } = await window.AfrestoBridge.buildAfrestoNextDocx(questions);
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const mapelSlug = loadedFileName.replace(/[^a-zA-Z0-9_-]+/g, '_');
      a.href = url;
      a.download = `${mapelSlug}_Afresto_Next.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showAlert(`Berhasil mengunduh ${stats.total} soal ke ${mapelSlug}_Afresto_Next.docx`, 'ok');
    } catch (err) {
      showAlert(`Gagal membuat file .docx: ${err.message}`, 'error');
    } finally {
      btnDownloadNext.disabled = false;
      btnDownloadNext.textContent = orig;
    }
  });
})();
