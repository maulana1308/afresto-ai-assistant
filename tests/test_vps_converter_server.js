/**
 * Copyright (c) 2026 Maulana Ibrahim
 * Built by : Maulana Ibrahim
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createConverterServer,
  verifyPinTimingSafe,
  loadConfiguredEnvFiles,
  parseGeminiKeyPool
} from '../deploy/vps-converter/server.mjs';
import { GeminiService } from '../scripts/gemini.js';

console.log('=== TEST SUITE: VPS CONVERTER SERVER & OCR PROXY SECURITY ===');

assert.strictEqual(verifyPinTimingSafe('2026', '2026'), true);
assert.strictEqual(verifyPinTimingSafe('2025', '2026'), false);
assert.strictEqual(verifyPinTimingSafe('', '2026'), false);
assert.strictEqual(verifyPinTimingSafe('', ''), true);
console.log('✔ Test 1: Verifikasi PIN timing-safe bekerja presisi');

const samplePngA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const samplePngB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wn4GBgYGBgQEAJ74EAYt1XccAAAAASUVORK5CYII=';
const samplePngC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAFUlEQVR42mNk+M/w/z8DEwMjIwMDAA6kBAQ8cV7sAAAAAElFTkSuQmCC';

const server1 = createConverterServer({
  geminiKey: 'SECRET_TEST_KEY_DO_NOT_LEAK',
  accessPin: '4321',
  rateLimitMax: 5,
  rateLimitWindowMs: 60000,
  ocrRunner: async () => ({
    opsi: { A: 'Adik mengantuk setelah minum obat.', B: 'Dinda membeli baju baru.' },
    kunci: { A: 'Benar', B: 'Benar' }
  })
});

await new Promise(resolve => server1.listen(0, '127.0.0.1', resolve));
const baseUrl1 = `http://127.0.0.1:${server1.address().port}`;

try {
  const healthRes = await fetch(`${baseUrl1}/api/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthJson = await healthRes.json();
  assert.deepStrictEqual(healthJson, { ok: true, serverOcrAvailable: true, keyPoolSize: 1, requiresPin: true });
  assert.strictEqual(healthRes.headers.get('x-content-type-options'), 'nosniff');

  const htmlRes = await fetch(`${baseUrl1}/`);
  assert.strictEqual(htmlRes.status, 200);
  const htmlBody = await htmlRes.text();
  assert.ok(htmlBody.includes('Konverter Soal: Afresto Legacy ke Afresto Next'));
  assert.ok(!htmlBody.includes('SECRET_TEST_KEY_DO_NOT_LEAK'), 'API key server tidak boleh bocor ke HTML!');
  console.log('✔ Test 2: Endpoint /api/health, static converter.html & security headers aman');

  const envRes = await fetch(`${baseUrl1}/deploy/vps-converter/.env`);
  assert.strictEqual(envRes.status, 404);
  const pkgRes = await fetch(`${baseUrl1}/../../package.json`);
  assert.strictEqual(pkgRes.status, 404);
  console.log('✔ Test 3: Path traversal & file sensitif diblokir (404)');

  const crossOriginRes = await fetch(`${baseUrl1}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://evil-site.example', 'x-access-pin': '4321' },
    body: JSON.stringify({ dataUrl: samplePngA })
  });
  assert.strictEqual(crossOriginRes.status, 403);

  const wrongPinRes = await fetch(`${baseUrl1}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-access-pin': '9999' },
    body: JSON.stringify({ dataUrl: samplePngA })
  });
  assert.strictEqual(wrongPinRes.status, 401);

  const badMimeRes = await fetch(`${baseUrl1}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-access-pin': '4321' },
    body: JSON.stringify({ dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' })
  });
  assert.strictEqual(badMimeRes.status, 400);
  console.log('✔ Test 4: Blokir cross-origin (403), PIN salah (401), dan MIME ilegal (400) lulus');
} finally {
  server1.close();
}

// Uji mode publik ("terima jadi" tanpa PIN): Cache SHA-256 + Global Daily Cap + Per-IP Rate Limit
let ocrInvokeCount = 0;
const serverPublic = createConverterServer({
  geminiKey: 'SECRET_TEST_KEY_DO_NOT_LEAK',
  accessPin: '',
  rateLimitMax: 5,
  rateLimitWindowMs: 60000,
  dailyGlobalMax: 2,
  ocrRunner: async (_url, qText) => {
    ocrInvokeCount += 1;
    return {
      opsi: { A: `Pernyataan ${qText || ocrInvokeCount}A`, B: `Pernyataan ${qText || ocrInvokeCount}B` },
      kunci: { A: 'Benar', B: 'Salah' }
    };
  }
});

await new Promise(resolve => serverPublic.listen(0, '127.0.0.1', resolve));
const baseUrlPub = `http://127.0.0.1:${serverPublic.address().port}`;
try {
  // 1. Call A1 (misses cache -> invokes Gemini #1)
  const res1 = await fetch(`${baseUrlPub}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: samplePngA, questionText: 'Q1' })
  });
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(ocrInvokeCount, 1);

  // 2. Call A1 again (hits SHA-256 cache -> does NOT invoke Gemini!)
  const res1Cached = await fetch(`${baseUrlPub}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: samplePngA, questionText: 'Q1' })
  });
  assert.strictEqual(res1Cached.status, 200);
  assert.strictEqual(ocrInvokeCount, 1, 'Gambar identik harus dilayani dari cache tanpa memanggil Gemini ulang');

  // 3. Call B (new image -> invokes Gemini #2, reaches dailyGlobalMax=2)
  const res2 = await fetch(`${baseUrlPub}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: samplePngB, questionText: 'Q2' })
  });
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(ocrInvokeCount, 2);

  // 4. Call C (distinct image -> blocked by dailyGlobalMax=2 -> 429)
  const resDailyBlocked = await fetch(`${baseUrlPub}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: samplePngC, questionText: 'Q3' })
  });
  assert.strictEqual(resDailyBlocked.status, 429);
  assert.strictEqual(ocrInvokeCount, 2);
  console.log('✔ Test 5: Cache SHA-256 hemat kuota + circuit breaker kuota harian (429) lulus');
} finally {
  serverPublic.close();
}

// Uji Pool Multi-Key 6 Gemini API Key (Round-Robin + Auto Failover + Cooldown tanpa bocor key)
const attemptLog = [];
const serverPool = createConverterServer({
  geminiKeys: ['KEY_1', 'KEY_2', 'KEY_3', 'KEY_4', 'KEY_5', 'KEY_6'],
  accessPin: '',
  rateLimitMax: 20,
  dailyGlobalMax: 50,
  ocrRunner: async (_url, _q, activeKey) => {
    attemptLog.push(activeKey);
    if (activeKey === 'KEY_1') throw new Error('429 Quota exceeded for KEY_1');
    if (activeKey === 'KEY_2') throw new Error('503 Service unavailable');
    return {
      opsi: { A: `Sukses via ${activeKey}`, B: 'Pernyataan kedua' },
      kunci: { A: 'Benar', B: 'Salah' }
    };
  }
});
await new Promise(resolve => serverPool.listen(0, '127.0.0.1', resolve));
const baseUrlPool = `http://127.0.0.1:${serverPool.address().port}`;
try {
  const hPool = await (await fetch(`${baseUrlPool}/api/health`)).json();
  assert.strictEqual(hPool.keyPoolSize, 6);

  // Request 1: coba KEY_1 (fail 429 -> cooldown) -> KEY_2 (fail 503 -> cooldown) -> failover sukses ke KEY_3!
  const p1 = await fetch(`${baseUrlPool}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: samplePngA, questionText: 'Pool1' })
  });
  assert.strictEqual(p1.status, 200);
  const p1Json = await p1.json();
  assert.strictEqual(p1Json.opsi.A, 'Sukses via KEY_3');

  // Request 2 (gambar B): pointer round-robin maju ke KEY_2 (masih cooldown -> dilewati!) -> langsung pakai KEY_3 atau KEY_4
  const p2 = await fetch(`${baseUrlPool}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: samplePngB, questionText: 'Pool2' })
  });
  assert.strictEqual(p2.status, 200);
  // Request 3 (gambar C): pastikan KEY_1 & KEY_2 yang sedang cooldown TIDAK dicoba ulang!
  const p3 = await fetch(`${baseUrlPool}/api/ocr-bs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: samplePngC, questionText: 'Pool3' })
  });
  assert.strictEqual(p3.status, 200);
  assert.strictEqual(attemptLog.filter(k => k === 'KEY_1').length, 1, 'KEY_1 yang cooldown tidak boleh dipanggil ulang');
  assert.strictEqual(attemptLog.filter(k => k === 'KEY_2').length, 1, 'KEY_2 yang cooldown tidak boleh dipanggil ulang');
  assert.ok(
    attemptLog.includes('KEY_3') && attemptLog.includes('KEY_4') && attemptLog.includes('KEY_5'),
    `Key sehat di pool harus terdistribusi merata, aktual: ${attemptLog.join(',')}`
  );
  console.log('✔ Test 6: Router 6 API Key Gemini (Round-Robin, Auto-Failover & Cooldown) lulus');
} finally {
  serverPool.close();
}

// Test 7: Pemuatan EXTRA_ENV_FILES dari direktori proyek Bot lain + GEMINI_API_KEY_1..6
const tmpEnvDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afresto-env-'));
try {
  const botEnvPath = path.join(tmpEnvDir, 'bot.env');
  const convEnvPath = path.join(tmpEnvDir, 'conv.env');
  fs.writeFileSync(botEnvPath, 'GEMINI_API_KEY_1=BOT_K1\nGEMINI_API_KEY_2=BOT_K2\nGEMINI_KEY_3=BOT_K3\n');
  fs.writeFileSync(convEnvPath, `GEMINI_API_KEY=\nEXTRA_ENV_FILES=${botEnvPath}\n`);
  const fakeEnv = {};
  loadConfiguredEnvFiles(convEnvPath, fakeEnv);
  const extractedPool = parseGeminiKeyPool({}, fakeEnv);
  assert.deepStrictEqual(extractedPool, ['BOT_K1', 'BOT_K2', 'BOT_K3']);
  console.log('✔ Test 7: Pembacaan otomatis pool key dari EXTRA_ENV_FILES proyek Bot lulus');
} finally {
  fs.rmSync(tmpEnvDir, { recursive: true, force: true });
}

// Test 8: Optimasi kecepatan OCR Gemini (zero-preflight /models, thinkingBudget:0 untuk 2.5, fail-fast 429 & cache per-key)
const realFetch = globalThis.fetch;
try {
  const fetchCalls = [];
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, init });
    if (String(url).includes('/v1beta/models?key=FAST_K1')) {
      return new Response(JSON.stringify({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }), { status: 200 });
    }
    if (String(url).includes('/v1beta/models?key=FAST_K2')) {
      return new Response(JSON.stringify({ models: [{ name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] }] }), { status: 200 });
    }
    if (String(url).includes('key=QUOTA_KEY')) {
      return new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 });
    }
    if (String(url).includes('gemini-2.5-flash:generateContent?key=FALLBACK_K')) {
      return new Response(JSON.stringify({ error: { message: 'This model models/gemini-2.5-flash is no longer available to new users' } }), { status: 404 });
    }
    if (String(url).includes('/v1beta/models?key=FALLBACK_K')) {
      return new Response(JSON.stringify({
        models: [
          { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent'] }
        ]
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: JSON.stringify({ statements: [{ teks: 'Pernyataan 1', nilai: 'Benar' }, { teks: 'Pernyataan 2', nilai: 'Salah' }] }) }]
        }
      }]
    }), { status: 200 });
  };

  // 8a. Direct call tanpa GET /models + thinkingBudget: 0 pada gemini-2.5-flash
  const fastSvc = new GeminiService('FAST_K1', 'gemini-2.5-flash');
  const fastOut = await fastSvc.extractBenarSalahFromImage(samplePngA, 'Cek cepat');
  assert.strictEqual(fastOut.count, 2);
  assert.strictEqual(fetchCalls.length, 1, 'Happy path harus langsung memanggil generateContent tanpa preflight GET /models');
  const sentBody = JSON.parse(fetchCalls[0].init.body);
  assert.deepStrictEqual(sentBody.generationConfig.thinkingConfig, { thinkingBudget: 0 });

  // 8b. gemini-2.0-flash tidak mengirim thinkingConfig
  const svc20 = new GeminiService('FAST_K2', 'gemini-2.0-flash');
  await svc20.extractBenarSalahFromImage(samplePngA, 'Tanpa thinking');
  const sentBody20 = JSON.parse(fetchCalls[1].init.body);
  assert.strictEqual(sentBody20.generationConfig.thinkingConfig, undefined);

  // 8c. failFastOnQuota melempar 429 pada percobaan pertama tanpa mencoba model cadangan
  const prevLen = fetchCalls.length;
  const quotaSvc = new GeminiService('QUOTA_KEY', 'gemini-2.5-flash');
  await assert.rejects(
    () => quotaSvc.extractBenarSalahFromImage(samplePngA, 'Limit', { failFastOnQuota: true }),
    (err) => err.statusCode === 429
  );
  assert.strictEqual(fetchCalls.length - prevLen, 1, 'failFastOnQuota harus langsung keluar di 429 untuk rotasi key instan');

  // 8d. Cache listAvailableModels terisolasi per API Key (multi-key tidak saling timpa)
  const m1First = await fastSvc.listAvailableModels();
  const m2First = await svc20.listAvailableModels();
  const beforeCachedReads = fetchCalls.length;
  const m1Second = await fastSvc.listAvailableModels();
  const m2Second = await svc20.listAvailableModels();
  assert.deepStrictEqual(m1First, ['gemini-2.5-flash']);
  assert.deepStrictEqual(m2First, ['gemini-2.0-flash']);
  assert.deepStrictEqual(m1Second, ['gemini-2.5-flash']);
  assert.deepStrictEqual(m2Second, ['gemini-2.0-flash']);
  assert.strictEqual(fetchCalls.length, beforeCachedReads, 'Pembacaan ulang 2 key berbeda harus hit cache tanpa fetch baru');

  // 8e. Jika primaryModel 2.5-flash kena 404, fallback wajib memilih gemini-3.6-flash SEBELUM 3.8-flash
  const fallbackBefore = fetchCalls.length;
  const fbSvc = new GeminiService('FALLBACK_K', 'gemini-2.5-flash');
  const fbRes = await fbSvc.extractBenarSalahFromImage(samplePngA, 'Fallback test');
  assert.strictEqual(fbRes.count, 2);
  const fbUrls = fetchCalls.slice(fallbackBefore).map(c => String(c.url));
  assert.ok(fbUrls.some(u => u.includes('gemini-3.6-flash:generateContent')), 'Wajib fallback ke gemini-3.6-flash');
  assert.ok(!fbUrls.some(u => u.includes('gemini-3.8-flash:generateContent')), 'Tidak boleh menyentuh gemini-3.8-flash sebelum 3.6-flash');
  console.log('✔ Test 8: Optimasi kecepatan OCR Gemini (direct call, thinkingBudget:0, fail-fast 429, fallback prioritas 3.6-flash & cache per-key) lulus');
} finally {
  globalThis.fetch = realFetch;
}

console.log('\n⭐ SEMUA TEST VPS CONVERTER SERVER 100% PASS!');
