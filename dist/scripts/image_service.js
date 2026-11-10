/**
 * Afresto AI Assistant - Multimodal Image Service
 * Mengelola pembuatan, kompresi, dan konversi gambar AI & SVG ke format Base64.
 * Integrasi engine gambar otomatis tanpa hambatan.
 */

export const IMAGE_STYLES = {
  AUTO: "AUTO",
  REALISTIS: "REALISTIS",
  KARTUN_3D: "KARTUN_3D",
  FLAT_2D: "FLAT_2D",
  DIAGRAM_TEKNIS: "DIAGRAM_TEKNIS"
};

/**
 * Menyusun prompt gambar yang konkret dan berlabuh (anti-abstrak)
 */
export function buildEnhancedImagePrompt(rawPrompt, style = "AUTO") {
  if (!rawPrompt || typeof rawPrompt !== "string") {
    rawPrompt = "educational subject study diagram or classroom scene";
  }

  // Bersihkan teks dari karakter yang merusak URL, rumus matematika, dan instruksi guru
  let promptText = rawPrompt
    .replace(/["\n\r\t]/g, " ")
    .replace(/\$[^$]+\$/g, " ") // Hapus rumus matematika LaTeX ($...$) agar AI gambar tidak menggambar coretan kertas!
    .replace(/\\times|\\frac|\\sqrt/gi, " ")
    .replace(/\b(?:buatkan|buat|soal|matematika|jenjang|sma|smk|smp|sd|pilihan\s+ganda|pg|kunci|jawaban)\b/gi, "")
    .replace(/\b(?:mata\s+pelajaran|mapel|soal\s+nomor\s+\d+)\b/gi, "")
    .replace(/[\\^_{}\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!promptText || promptText.length < 5) {
    promptText = "educational subject study diagram or classroom scene";
  }

  // Tambahkan kata kunci penguat gaya visual (Concrete Style Modifiers)
  let styleSuffix = "";
  switch (style) {
    case IMAGE_STYLES.REALISTIS:
      styleSuffix = ", realistic photography, natural documentary lighting, high quality educational photo, sharp focus, real life scene, no abstract shapes";
      break;
    case IMAGE_STYLES.KARTUN_3D:
      styleSuffix = ", 3D animated cartoon character style, Pixar inspired, smooth textures, friendly educational atmosphere, vibrant pastel colors, clean lighting";
      break;
    case IMAGE_STYLES.FLAT_2D:
      styleSuffix = ", 2D clean flat vector illustration, minimalist textbook style, clear outlines, modern educational graphic design, flat colors";
      break;
    case IMAGE_STYLES.DIAGRAM_TEKNIS:
      styleSuffix = ", technical schematic diagram, blueprint vector lines, engineering flowchart aesthetic, clear diagrammatic layout";
      break;
    default:
      styleSuffix = ", clear educational illustration, high quality, well-defined subject, realistic context, no abstract blur";
      break;
  }

  return `${promptText}${styleSuffix}`;
}

/**
 * Menghasilkan URL gambar AI dari Pollinations AI (FLUX / SDXL Engine)
 */
export function getPollinationsImageUrl(enhancedPrompt, width = 540, height = 360) {
  const encoded = encodeURIComponent(enhancedPrompt);
  const seed = Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
}

// State tracker waktu unduh terakhir Pollinations AI untuk mematuhi rate limit IP (1 gambar per 45 detik)
let lastPollinationsDownloadTime = 0;
export const POLLINATIONS_COOLDOWN_MS = 46000; // 46 detik agar aman dari batas 45s

export function getRemainingCooldownMs() {
  const elapsed = Date.now() - lastPollinationsDownloadTime;
  if (elapsed >= POLLINATIONS_COOLDOWN_MS) return 0;
  return POLLINATIONS_COOLDOWN_MS - elapsed;
}

export function resetCooldownTimer() {
  lastPollinationsDownloadTime = 0;
}

/**
 * Mengunduh gambar dari URL dan mengonversinya menjadi Base64 Data URL (data:image/jpeg;base64,...)
 * Mendukung Browser (FileReader / Blob) dan Node.js (ArrayBuffer / Buffer) untuk unit test.
 * Dilengkapi Smart Queue Delay otomatis untuk mencegah error HTTP 402 pada Pollinations AI.
 */
export async function downloadImageAsBase64(imageUrl, timeoutMs = 25000, onStatusUpdate = null) {
  // Jika URL mengarah ke Pollinations AI, periksa apakah perlu menunggu cooldown
  if (imageUrl && imageUrl.includes("pollinations.ai")) {
    const remaining = getRemainingCooldownMs();
    if (remaining > 0) {
      const waitSeconds = Math.ceil(remaining / 1000);
      for (let s = waitSeconds; s > 0; s--) {
        if (typeof onStatusUpdate === "function") {
          onStatusUpdate(`Menunggu jeda aman server gambar (${s} dtk)...`);
        }
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (typeof onStatusUpdate === "function") {
      onStatusUpdate("Mengunduh gambar...");
    }

    let response = await fetch(imageUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Accept": "image/jpeg,image/png,image/*"
      }
    });

    // Deteksi jika server merespons rate limit (HTTP 402/429 atau header Retry-After / Payment-Required)
    const isRateLimited = response.status === 402 || 
                          response.status === 429 || 
                          Boolean(response.headers.get("retry-after")) || 
                          response.headers.get("payment-required") === "true";

    if (isRateLimited && imageUrl.includes("pollinations.ai")) {
      const retryHeader = response.headers.get("retry-after");
      const retrySeconds = retryHeader ? parseInt(retryHeader, 10) : 45;
      const waitSec = Math.max(retrySeconds, 35);
      
      for (let s = waitSec; s > 0; s--) {
        if (typeof onStatusUpdate === "function") {
          onStatusUpdate(`Batas server tercapai. Mencoba ulang dalam (${s} dtk)...`);
        }
        await new Promise(res => setTimeout(res, 1000));
      }

      // Retry request sekali lagi
      response = await fetch(imageUrl, {
        method: "GET",
        headers: { "Accept": "image/jpeg,image/png,image/*" }
      });
    }

    if (!response.ok) {
      throw new Error(`Server gambar merespons HTTP ${response.status}`);
    }

    // Catat waktu sukses unduh
    if (imageUrl && imageUrl.includes("pollinations.ai")) {
      lastPollinationsDownloadTime = Date.now();
    }

    // Lingkungan Node.js (Unit Test)
    if (typeof Buffer !== "undefined" && typeof response.arrayBuffer === "function") {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = response.headers.get("content-type") || "image/jpeg";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }

    // Lingkungan Browser (Chrome Extension Sidepanel)
    const blob = await response.blob();
    return await blobToBase64(blob);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mengonversi Blob ke Base64 Data URL
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Mengonversi berkas lokal (File) yang dipilih guru dari laptop ke Base64 Data URL
 */
export function localFileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Berkas yang dipilih harus berupa gambar (JPG, PNG, WebP)."));
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error("Gagal membaca berkas gambar lokal."));
    reader.readAsDataURL(file);
  });
}

/**
 * Menghasilkan Diagram Vektor SVG Cadangan jika koneksi gambar gagal
 */
export function generateFallbackSvg(subjectTitle = "Ilustrasi Materi Asesmen", details = "Perhatikan data pendukung berikut") {
  // Bersihkan subjectTitle dari instruksi pembuatan naskah
  let cleanTitle = String(subjectTitle || "Ilustrasi Konsep Asesmen")
    .replace(/\b(?:buatkan|buat|soal|matematika|jenjang|sma|smk|smp|sd)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleanTitle) cleanTitle = "Diagram / Ilustrasi Materi";

  const safeTitle = escapeXml(cleanTitle.substring(0, 48));
  const safeDetails = escapeXml(details.substring(0, 75));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 220" width="100%" height="220" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; font-family: system-ui, -apple-system, sans-serif;">
    <defs>
      <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="540" height="220" fill="#ffffff"/>
    <rect width="540" height="220" fill="url(#gridPattern)"/>
    <rect x="18" y="18" width="504" height="184" rx="8" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>
    <rect x="230" y="36" width="80" height="46" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
    <path d="M 245 66 L 255 52 L 265 62 L 280 47 L 295 66 Z" fill="#93c5fd"/>
    <circle cx="282" cy="49" r="3.5" fill="#2563eb"/>
    <text x="270" y="112" font-size="14" font-weight="700" fill="#0f172a" text-anchor="middle">${safeTitle}</text>
    <text x="270" y="136" font-size="11.5" fill="#64748b" text-anchor="middle">${safeDetails}</text>
    <rect x="170" y="156" width="200" height="24" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="270" y="172" font-size="10.5" font-weight="500" fill="#475569" text-anchor="middle">📁 Unggah gambar naskah via Ganti File</text>
  </svg>`;
}

function escapeXml(unsafe) {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
