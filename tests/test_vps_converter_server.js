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

console.log('\n⭐ SEMUA TEST VPS CONVERTER SERVER 100% PASS!');
