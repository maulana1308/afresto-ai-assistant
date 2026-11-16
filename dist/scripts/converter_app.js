/**
 * Copyright (c) 2026 Maulana Ibrahim
 * Built by : Maulana Ibrahim
 */
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

  function compressImageForOcr(dataUrl, maxWidth = 1280, quality = 0.85) {
    return new Promise((resolve) => {
      if (typeof dataUrl !== 'string' || dataUrl.length <= 180000) {
        return resolve(dataUrl);
      }
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const origW = img.naturalWidth || img.width;
            const origH = img.naturalHeight || img.height;
            if (!origW || !origH) return resolve(dataUrl);
            const scale = origW > maxWidth ? maxWidth / origW : 1;
            const targetW = Math.max(1, Math.round(origW * scale));
            const targetH = Math.max(1, Math.round(origH * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed && compressed.length < dataUrl.length ? compressed : dataUrl);
          } catch (_) {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch (_) {
        resolve(dataUrl);
      }
    });
  }

  async function extractBenarSalahViaBackend(dataUrl, questionText) {
    const optimizedUrl = await compressImageForOcr(dataUrl);
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
        body: JSON.stringify({ dataUrl: optimizedUrl, questionText })
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
    const gemini = new window.AfrestoBridge.GeminiService(apiKey, 'gemini-3.6-flash');
    return gemini.extractBenarSalahFromImage(optimizedUrl, questionText);
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

  function getQuestionImages(q) {
    if (!q) return [];
    if (Array.isArray(q.gambar_list) && q.gambar_list.length > 0) {
      return q.gambar_list.filter(Boolean);
    }
    return q.gambar_base64 ? [q.gambar_base64] : [];
  }

  function getPendingImageBsIndices() {
    const idxs = [];
    questions.forEach((q, i) => {
      if (q.tipe === 'BENAR_SALAH' && Object.keys(q.opsi || {}).length < 2 && getQuestionImages(q).length > 0) {
        idxs.push(i);
      }
    });
    return idxs;
  }

  async function extractAllImagesForQuestion(q) {
    const imgs = getQuestionImages(q);
    if (imgs.length === 0) {
      throw new Error('Tidak ada gambar pernyataan yang dapat dibaca.');
    }
    const mergedOpsi = {};
    const mergedKunci = {};
    const existingKeys = q.kunci && typeof q.kunci === 'object' && !Array.isArray(q.kunci) ? q.kunci : {};
    let stmtIdx = 0;
    for (const imgUrl of imgs) {
      const extracted = await extractBenarSalahViaBackend(imgUrl, q.pertanyaan || '');
      const entries = Object.entries(extracted?.opsi || {}).sort(([a], [b]) => a.localeCompare(b));
      for (const [origKey, text] of entries) {
        if (stmtIdx >= 10) break;
        const char = String.fromCharCode(65 + stmtIdx);
        mergedOpsi[char] = text;
        mergedKunci[char] = (extracted.kunci && extracted.kunci[origKey]) || existingKeys[char] || 'Benar';
        stmtIdx += 1;
      }
    }
    if (Object.keys(mergedOpsi).length === 0) {
      throw new Error('AI tidak menemukan baris pernyataan pada gambar tersebut.');
    }
    return { opsi: mergedOpsi, kunci: mergedKunci };
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
          const imgs = getQuestionImages(q);
          const draftKeysCount = Object.keys(q.kunci || {}).length;
          const draftOpsiCount = Object.keys(q._draftBsOpsi || {}).length;
          const rowCount = Math.min(10, Math.max(2, q._manualBsCount || 0, draftKeysCount, draftOpsiCount));
          const rowsHtml = Array.from({ length: rowCount }, (_, rIdx) => {
            const letter = String.fromCharCode(65 + rIdx);
            const draftVal = (q._draftBsOpsi && q._draftBsOpsi[letter]) ?? (q.opsi && q.opsi[letter]) ?? '';
            const ansVal = (q._draftBsKunci && q._draftBsKunci[letter]) ?? (q.kunci && q.kunci[letter]) ?? (rIdx % 2 === 0 ? 'Benar' : 'Salah');
            return `
              <div class="bs-edit-row${rowCount > 2 ? ' has-remove' : ''}">
                <input type="text" class="bs-input-text" data-idx="${idx}" data-letter="${letter}" value="${escapeHtml(draftVal)}" placeholder="Ketik Pernyataan ${rIdx + 1}">
                <select class="bs-input-ans" data-idx="${idx}" data-letter="${letter}">
                  <option value="Benar" ${ansVal === 'Benar' ? 'selected' : ''}>Benar (v)</option>
                  <option value="Salah" ${ansVal === 'Salah' ? 'selected' : ''}>Salah (v)</option>
                </select>
                ${rowCount > 2 ? `<button type="button" class="btn btn-secondary btn-sm btn-remove-bs-row" data-idx="${idx}" data-letter="${letter}" title="Hapus baris">&times;</button>` : ''}
              </div>`;
          }).join('');
          bodyHtml = `
            <div class="img-ref-box">
              ${imgs.map((imgUrl, imIdx) => `<img src="${imgUrl}" alt="Gambar pernyataan soal #${idx + 1} (${imIdx + 1}/${imgs.length})">`).join('')}
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                <strong style="font-size:12.5px;">Isi pernyataan Benar/Salah (disimpan ke tabel Afresto Next):</strong>
                ${imgs.length > 0 ? `<button type="button" class="btn btn-secondary btn-sm btn-ocr-single" data-idx="${idx}">🔍 Baca ${imgs.length > 1 ? imgs.length + ' Gambar Ini' : 'Gambar Ini'} (AI)</button>` : ''}
              </div>
              <div class="bs-editor-rows">
                ${rowsHtml}
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:4px;">
                  ${rowCount < 10 ? `<button type="button" class="btn btn-secondary btn-sm btn-add-bs-row" data-idx="${idx}">+ Tambah Pernyataan</button>` : '<span></span>'}
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

    function syncManualBsDraft(i) {
      const qObj = questions[i];
      if (!qObj) return [];
      const inputs = Array.from(questionsContainer.querySelectorAll(`.bs-input-text[data-idx="${i}"]`));
      const draftOpsi = {};
      const draftKunci = {};
      inputs.forEach(inp => {
        const l = inp.getAttribute('data-letter');
        const sel = questionsContainer.querySelector(`.bs-input-ans[data-idx="${i}"][data-letter="${l}"]`);
        draftOpsi[l] = inp.value.trim();
        draftKunci[l] = sel ? sel.value : 'Benar';
      });
      qObj._draftBsOpsi = draftOpsi;
      qObj._draftBsKunci = draftKunci;
      qObj._manualBsCount = inputs.length;
      return inputs.map(inp => inp.getAttribute('data-letter'));
    }

    questionsContainer.querySelectorAll('.btn-add-bs-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.currentTarget.getAttribute('data-idx'));
        const letters = syncManualBsDraft(i);
        if (letters.length < 10) {
          questions[i]._manualBsCount = letters.length + 1;
          renderPreview();
        }
      });
    });

    questionsContainer.querySelectorAll('.btn-remove-bs-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.currentTarget.getAttribute('data-idx'));
        const removeL = e.currentTarget.getAttribute('data-letter');
        const letters = syncManualBsDraft(i).filter(l => l !== removeL);
        const nextOpsi = {};
        const nextKunci = {};
        letters.forEach((oldL, newIdx) => {
          const newL = String.fromCharCode(65 + newIdx);
          nextOpsi[newL] = questions[i]._draftBsOpsi[oldL] || '';
          nextKunci[newL] = questions[i]._draftBsKunci[oldL] || 'Benar';
        });
        questions[i]._draftBsOpsi = nextOpsi;
        questions[i]._draftBsKunci = nextKunci;
        questions[i]._manualBsCount = Math.max(2, letters.length);
        renderPreview();
      });
    });

    questionsContainer.querySelectorAll('.btn-apply-bs').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.currentTarget.getAttribute('data-idx'));
        const letters = syncManualBsDraft(i);
        const nonEmptyLetters = letters.filter(l => (questions[i]._draftBsOpsi[l] || '').trim().length > 0);
        if (nonEmptyLetters.length < 2) {
          showAlert(`Isi minimal 2 teks pernyataan untuk soal #${i + 1} terlebih dahulu.`, 'warn');
          return;
        }
        const finalOpsi = {};
        const finalKunci = {};
        nonEmptyLetters.forEach((oldL, idxPos) => {
          const newL = String.fromCharCode(65 + idxPos);
          finalOpsi[newL] = questions[i]._draftBsOpsi[oldL];
          finalKunci[newL] = questions[i]._draftBsKunci[oldL] || 'Benar';
        });
        questions[i].opsi = finalOpsi;
        questions[i].kunci = finalKunci;
        questions[i]._ocrExtracted = true;
        questions[i].gambar_base64 = null;
        questions[i].gambar_list = null;
        delete questions[i]._draftBsOpsi;
        delete questions[i]._draftBsKunci;
        delete questions[i]._manualBsCount;
        showAlert(`${nonEmptyLetters.length} pernyataan soal #${i + 1} berhasil diubah ke tabel Benar/Salah teks.`, 'ok');
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
          const extracted = await extractAllImagesForQuestion(questions[i]);
          questions[i].opsi = extracted.opsi;
          questions[i].kunci = extracted.kunci;
          questions[i]._ocrExtracted = true;
          questions[i].gambar_base64 = null;
          questions[i].gambar_list = null;
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
          const imgCnt = getQuestionImages(questions[i]).length;
          target.textContent = `🔍 Baca ${imgCnt > 1 ? imgCnt + ' Gambar Ini' : 'Gambar Ini'} (AI)`;
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
    const concurrency = Math.min(serverOcrAvailable ? 3 : 2, pendingIdxs.length);
    let cursor = 0;
    let completed = 0;
    let firstErr = null;
    btnOcrAllBs.textContent = `⏳ Membaca ${pendingIdxs.length} gambar paralel...`;

    try {
      const workers = Array.from({ length: concurrency }, async () => {
        while (!firstErr) {
          const pos = cursor++;
          if (pos >= pendingIdxs.length) break;
          const idx = pendingIdxs[pos];
          try {
            const extracted = await extractAllImagesForQuestion(questions[idx]);
            questions[idx].opsi = extracted.opsi;
            questions[idx].kunci = extracted.kunci;
            questions[idx]._ocrExtracted = true;
            questions[idx].gambar_base64 = null;
            questions[idx].gambar_list = null;
            completed += 1;
            btnOcrAllBs.textContent = `⏳ Membaca gambar (${completed}/${pendingIdxs.length} selesai)...`;
          } catch (err) {
            if (!firstErr) firstErr = err;
            break;
          }
        }
      });
      await Promise.all(workers);
      if (firstErr) throw firstErr;
      showAlert(`Selesai membaca ${pendingIdxs.length} gambar Benar/Salah. Siap diunduh ke format Afresto Next.`, 'ok');
      renderPreview();
    } catch (err) {
      if (completed > 0) renderPreview();
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
