/**
 * Copyright (c) 2026 Maulana Ibrahim
 * Built by : Maulana Ibrahim
 */
/**
 * Server Mandiri Konverter Afresto Legacy -> Afresto Next untuk VPS Pribadi.
 * Nol dependensi npm eksternal (murni Node.js built-in >= 18).
 * Jalankan bersama bot WA / Discord Anda menggunakan PM2 + Nginx Reverse Proxy.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GeminiService } from '../../scripts/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STATIC_ROOT = path.resolve(__dirname, '../..');

export function loadDotEnvIfExists(envPath, targetEnv = process.env) {
  if (!envPath || !fs.existsSync(envPath)) return false;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val !== '' && !targetEnv[key]) {
      targetEnv[key] = val;
    }
  }
  return true;
}

export function loadConfiguredEnvFiles(localEnvPath, targetEnv = process.env) {
  loadDotEnvIfExists(localEnvPath, targetEnv);
  const extraRaw = String(targetEnv.EXTRA_ENV_FILES || targetEnv.ENV_FILE || '').trim();
  if (!extraRaw) return;
  for (const p of extraRaw.split(',').map(s => s.trim()).filter(Boolean)) {
    const resolved = path.isAbsolute(p) ? p : path.resolve(path.dirname(localEnvPath), p);
    loadDotEnvIfExists(resolved, targetEnv);
  }
}

function sha256Hex(str) {
  return crypto.createHash('sha256').update(String(str ?? ''), 'utf8').digest('hex');
}

function sha256Digest(str) {
  return crypto.createHash('sha256').update(String(str ?? ''), 'utf8').digest();
}

export function verifyPinTimingSafe(providedPin, expectedPin) {
  if (!expectedPin) return true;
  if (typeof providedPin !== 'string' || !providedPin) return false;
  return crypto.timingSafeEqual(sha256Digest(providedPin), sha256Digest(expectedPin));
}

function resolveClientIp(req) {
  const remote = String(req.socket?.remoteAddress || 'unknown');
  const isLoopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  if (isLoopback) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  }
  return remote;
}

function isOriginAllowed(req, allowedOrigins) {
  const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (secFetchSite === 'cross-site') return false;

  const origin = req.headers.origin;
  if (!origin) return true; // Permintaan same-origin atau non-CORS tidak mengirim header Origin
  try {
    const parsed = new URL(origin);
    if (allowedOrigins.length > 0) {
      return allowedOrigins.includes(parsed.origin);
    }
    const hostHeader = String(req.headers.host || '').toLowerCase();
    return Boolean(hostHeader) && parsed.host.toLowerCase() === hostHeader;
  } catch {
    return false;
  }
}

function createRateLimiter(maxRequests, windowMs) {
  const buckets = new Map();
  let opsSinceSweep = 0;

  return function allow(ip) {
    const now = Date.now();
    if (++opsSinceSweep >= 200) {
      opsSinceSweep = 0;
      for (const [k, b] of buckets.entries()) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }
    const existing = buckets.get(ip);
    if (!existing || existing.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: Math.max(0, maxRequests - 1) };
    }
    if (existing.count >= maxRequests) {
      return { allowed: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
    }
    existing.count += 1;
    return { allowed: true, remaining: Math.max(0, maxRequests - existing.count) };
  };
}

function createDailyQuotaGuard(dailyMax) {
  let dayKey = new Date().toISOString().slice(0, 10);
  let usedCount = 0;

  return function consumeDailyQuota() {
    if (!dailyMax || dailyMax <= 0) return true;
    const today = new Date().toISOString().slice(0, 10);
    if (today !== dayKey) {
      dayKey = today;
      usedCount = 0;
    }
    if (usedCount >= dailyMax) return false;
    usedCount += 1;
    return true;
  };
}

function createBoundedOcrCache(maxEntries = 200, ttlMs = 3600000) {
  const cache = new Map();

  return {
    get(key) {
      const hit = cache.get(key);
      if (!hit) return null;
      if (hit.expiresAt <= Date.now()) {
        cache.delete(key);
        return null;
      }
      return hit.value;
    },
    set(key, value) {
      if (cache.size >= maxEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
  };
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        const err = new Error('Ukuran payload melebihi batas maksimum.');
        err.statusCode = 413;
        req.destroy();
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        const err = new Error('Format JSON tidak valid.');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders
  });
  res.end(body);
}

function resolveRoutePath(rawUrl) {
  let pathname = '/';
  try {
    pathname = new URL(rawUrl || '/', 'http://localhost').pathname;
  } catch {
    return null;
  }
  if (pathname.includes('..') || pathname.includes('\0')) return null;

  if (pathname.endsWith('/api/health') || pathname === '/api/health') return '/api/health';
  if (pathname.endsWith('/api/ocr-bs') || pathname === '/api/ocr-bs') return '/api/ocr-bs';
  if (pathname.endsWith('/scripts/converter_bundle.js')) return '/scripts/converter_bundle.js';
  if (pathname.endsWith('/scripts/converter_app.js')) return '/scripts/converter_app.js';
  if (pathname === '/' || pathname.endsWith('/converter.html') || /^\/[^/.]+\/?$/.test(pathname)) {
    return '/converter.html';
  }
  return null;
}

export function parseGeminiKeyPool(customConfig = {}, envSource = process.env) {
  const fromArray = Array.isArray(customConfig.geminiKeys) ? customConfig.geminiKeys : [];
  const fromSingle = typeof customConfig.geminiKey === 'string' && customConfig.geminiKey.trim()
    ? [customConfig.geminiKey.trim()]
    : [];
  if (customConfig.geminiKeys !== undefined || customConfig.geminiKey !== undefined) {
    return [...new Set([...fromArray, ...fromSingle].map(k => String(k || '').trim()).filter(Boolean))];
  }
  const envMulti = String(envSource.GEMINI_API_KEYS || '')
    .split(/[\s,;]+/)
    .map(k => k.trim())
    .filter(Boolean);
  const envNumbered = Object.keys(envSource)
    .filter(k => /^GEMINI_(?:API_)?KEY_\d+$/i.test(k))
    .sort((a, b) => Number(a.match(/\d+$/)[0]) - Number(b.match(/\d+$/)[0]))
    .map(k => String(envSource[k] || '').trim())
    .filter(Boolean);
  const envSingle = String(envSource.GEMINI_API_KEY || '').trim();
  const merged = [...envMulti, ...envNumbered, ...(envSingle ? [envSingle] : [])];
  return [...new Set(merged)];
}

function createKeyRotator(keys) {
  let cursor = 0;
  const cooldownUntil = new Array(keys.length).fill(0);

  return {
    get size() {
      return keys.length;
    },
    async execute(fn) {
      if (keys.length === 0) {
        const err = new Error('Server belum dikonfigurasi dengan GEMINI_API_KEY / GEMINI_API_KEYS.');
        err.statusCode = 503;
        throw err;
      }

      const startIdx = cursor;
      const now = Date.now();

      let triedAny = false;
      for (let offset = 0; offset < keys.length; offset++) {
        const idx = (startIdx + offset) % keys.length;
        if (cooldownUntil[idx] > now) continue;

        triedAny = true;
        cursor = (idx + 1) % keys.length;
        try {
          return await fn(keys[idx], idx);
        } catch (err) {
          const msg = String(err?.message || '');
          const isAuthFail = err?.statusCode === 401 || err?.statusCode === 403 || /api key|401|403|key_invalid|expired/i.test(msg);
          const cooldownMs = isAuthFail ? 15 * 60 * 1000 : 3 * 60 * 1000;
          cooldownUntil[idx] = Date.now() + cooldownMs;
        }
      }

      const allExhausted = new Error(
        triedAny
          ? 'Seluruh rute API Key Gemini sementara mengalami limit atau gagal. Coba lagi nanti atau ketik manual.'
          : 'Seluruh rute API Key Gemini sedang dalam masa jeda kuota. Silakan ketik pernyataan manual atau coba beberapa menit lagi.'
      );
      allExhausted.statusCode = 503;
      throw allExhausted;
    }
  };
}

export function createConverterServer(customConfig = {}) {
  const staticRoot = path.resolve(customConfig.staticRoot || process.env.STATIC_ROOT || DEFAULT_STATIC_ROOT);
  const geminiKeys = parseGeminiKeyPool(customConfig);
  const geminiModel = customConfig.geminiModel || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const accessPin = customConfig.accessPin !== undefined ? customConfig.accessPin : (process.env.CONVERTER_ACCESS_PIN || '').trim();
  const maxBodyBytes = Number(customConfig.maxBodyBytes || process.env.MAX_BODY_BYTES || 6 * 1024 * 1024);
  const rateLimitMax = Number(customConfig.rateLimitMax || process.env.OCR_RATE_LIMIT_MAX || 15);
  const rateLimitWindowMs = Number(customConfig.rateLimitWindowMs || process.env.OCR_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const dailyGlobalMax = Number(
    customConfig.dailyGlobalMax !== undefined ? customConfig.dailyGlobalMax : (process.env.OCR_DAILY_GLOBAL_MAX || 300)
  );
  const allowedOrigins = Array.isArray(customConfig.allowedOrigins)
    ? customConfig.allowedOrigins
    : String(process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

  const keyRotator = createKeyRotator(geminiKeys);
  const ocrRunner = customConfig.ocrRunner || (async (dataUrl, questionText, activeKey) => {
    const gemini = new GeminiService(activeKey, geminiModel);
    return gemini.extractBenarSalahFromImage(dataUrl, questionText, {
      failFastOnQuota: keyRotator.size > 1,
      requestTimeoutMs: 15000
    });
  });

  const allowRate = createRateLimiter(rateLimitMax, rateLimitWindowMs);
  const consumeDailyQuota = createDailyQuotaGuard(dailyGlobalMax);
  const ocrCache = createBoundedOcrCache(200, 3600000);

  const staticWhitelist = {
    '/converter.html': { file: path.join(staticRoot, 'converter.html'), mime: 'text/html; charset=utf-8' },
    '/scripts/converter_bundle.js': { file: path.join(staticRoot, 'scripts', 'converter_bundle.js'), mime: 'application/javascript; charset=utf-8' },
    '/scripts/converter_app.js': { file: path.join(staticRoot, 'scripts', 'converter_app.js'), mime: 'application/javascript; charset=utf-8' }
  };

  return http.createServer(async (req, res) => {
    const route = resolveRoutePath(req.url);
    if (!route) {
      return sendJson(res, 404, { error: 'Halaman atau endpoint tidak ditemukan.' });
    }

    if (req.method === 'GET' && route === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        serverOcrAvailable: keyRotator.size > 0,
        keyPoolSize: keyRotator.size,
        requiresPin: Boolean(accessPin)
      });
    }

    if (req.method === 'GET' && staticWhitelist[route]) {
      const target = staticWhitelist[route];
      if (!fs.existsSync(target.file)) {
        return sendJson(res, 500, { error: 'Berkas antarmuka belum dibangun. Jalankan node scripts/build_converter_html.js.' });
      }
      const content = fs.readFileSync(target.file);
      res.writeHead(200, {
        'Content-Type': target.mime,
        'Cache-Control': route === '/converter.html' ? 'no-cache' : 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      });
      return res.end(content);
    }

    if (req.method === 'POST' && route === '/api/ocr-bs') {
      if (!isOriginAllowed(req, allowedOrigins)) {
        return sendJson(res, 403, { error: 'Permintaan lintas domain (cross-origin) tidak diizinkan.' });
      }
      if (keyRotator.size === 0) {
        return sendJson(res, 503, { error: 'Server belum dikonfigurasi dengan GEMINI_API_KEY / GEMINI_API_KEYS.' });
      }

      const providedPin = req.headers['x-access-pin'];
      if (!verifyPinTimingSafe(providedPin, accessPin)) {
        return sendJson(res, 401, { error: 'Kode akses PIN guru salah atau belum diisi.' });
      }

      const ip = resolveClientIp(req);
      const rate = allowRate(ip);
      if (!rate.allowed) {
        return sendJson(
          res,
          429,
          { error: `Terlalu banyak permintaan OCR dari perangkat Anda. Coba lagi dalam ${rate.retryAfterSec} detik.` },
          { 'Retry-After': String(rate.retryAfterSec) }
        );
      }

      const reqStartedAt = Date.now();
      try {
        const body = await readJsonBody(req, maxBodyBytes);
        const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl.trim() : '';
        const questionText = typeof body.questionText === 'string' ? body.questionText.slice(0, 2000) : '';

        if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(dataUrl)) {
          return sendJson(res, 400, { error: 'Format data gambar tidak valid (hanya mendukung PNG/JPG/WEBP/GIF base64).' });
        }

        // Cache deduplikasi berdasarkan hash gambar agar gambar identik tidak membuang kuota AI lagi
        const cacheKey = sha256Hex(`${dataUrl}|${questionText}`);
        const cached = ocrCache.get(cacheKey);
        if (cached) {
          console.log(`[OCR] cache=hit status=200 ms=${Date.now() - reqStartedAt}`);
          return sendJson(res, 200, cached);
        }

        if (!consumeDailyQuota()) {
          return sendJson(res, 429, {
            error: 'Kuota harian baca gambar AI server hari ini telah penuh. Anda tetap bisa mengetik pernyataan secara manual.'
          });
        }

        let usedKeySlot = -1;
        const extracted = await keyRotator.execute((activeKey, keyIdx) => {
          usedKeySlot = keyIdx + 1;
          return ocrRunner(dataUrl, questionText, activeKey, keyIdx);
        });
        ocrCache.set(cacheKey, extracted);
        console.log(`[OCR] cache=miss key=#${usedKeySlot}/${keyRotator.size} status=200 ms=${Date.now() - reqStartedAt}`);
        return sendJson(res, 200, extracted);
      } catch (err) {
        const status = err.statusCode || 502;
        console.log(`[OCR] cache=miss status=${status} ms=${Date.now() - reqStartedAt}`);
        return sendJson(res, status, { error: err.statusCode ? err.message : 'Gagal memproses OCR gambar di server.' });
      }
    }

    return sendJson(res, 405, { error: 'Metode HTTP tidak didukung.' });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  loadConfiguredEnvFiles(path.join(__dirname, '.env'));
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3845);
  const keyCount = parseGeminiKeyPool({}).length;
  const server = createConverterServer();
  server.listen(port, host, () => {
    console.log(`Afresto Next Converter Server aktif di http://${host}:${port} (Pool OCR: ${keyCount} API Key)`);
  });
}
