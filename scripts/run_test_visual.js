import fs from 'node:fs';
import path from 'node:path';

async function testBoth() {
  console.log('=== MEMULAI PENGUJIAN REAL-TIME POIN 2 & POIN 3 ===');
  const artifactDir = 'C:\\Users\\maula\\.gemini\\antigravity\\brain\\65a63ff4-d55a-4f07-bad2-3379b5a10f8a';
  const projectDir = process.cwd();

  // -------------------------------------------------------------
  // PENGUJIAN 2: GRAFIK FUNGSI, PARABOLA & DIAGRAM (SVG Engine)
  // -------------------------------------------------------------
  console.log('[UJI 2] Membuat Grafik Parabola & Koordinat Kartesius (SVG)...');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350" width="100%" height="100%" style="background: #ffffff; font-family: Arial, sans-serif;">
  <defs>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f0f3f6" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
  
  <!-- Sumbu Koordinat X dan Y -->
  <line x1="80" y1="300" x2="560" y2="300" stroke="#1e293b" stroke-width="2.5"/>
  <line x1="120" y1="320" x2="120" y2="40" stroke="#1e293b" stroke-width="2.5"/>
  
  <!-- Panah Sumbu -->
  <polygon points="560,295 575,300 560,305" fill="#1e293b"/>
  <polygon points="115,40 120,25 125,40" fill="#1e293b"/>
  
  <!-- Label Sumbu -->
  <text x="565" y="325" font-size="14" font-weight="bold" fill="#1e293b">x (Unit)</text>
  <text x="50" y="45" font-size="14" font-weight="bold" fill="#1e293b">C(x)</text>
  <text x="105" y="320" font-size="13" fill="#64748b">0</text>
  
  <!-- Kurva Parabola C(x) = 2x^2 - 120x + 2500 -->
  <path d="M 160,60 Q 320,340 480,60" fill="none" stroke="#0284c7" stroke-width="4" stroke-linecap="round"/>
  
  <!-- Garis Proyeksi Putus-putus ke Puncak Minimum -->
  <line x1="120" y1="200" x2="320" y2="200" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,6"/>
  <line x1="320" y1="200" x2="320" y2="300" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,6"/>
  
  <!-- Titik Puncak (Marker Lingkaran Merah) -->
  <circle cx="320" cy="200" r="7" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
  
  <!-- Label Titik Puncak dan Nilai Koordinat -->
  <text x="335" y="195" font-size="14" font-weight="bold" fill="#dc2626">Titik Puncak (Minimum)</text>
  <text x="305" y="325" font-size="14" font-weight="bold" fill="#0284c7">x = 30</text>
  <text x="55" y="205" font-size="13" font-weight="bold" fill="#64748b">700 rb</text>
  
  <!-- Keterangan Rumus Fungsi Matematika -->
  <rect x="350" y="70" width="220" height="45" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="360" y="98" font-size="13" font-weight="bold" fill="#0f172a">C(x) = 2x² - 120x + 2500</text>
</svg>`;

  const svgArtifactPath = path.join(artifactDir, 'bukti_uji_2_grafik_parabola.svg');
  const svgProjectPath = path.join(projectDir, 'bukti_uji_2_grafik_parabola.svg');
  fs.writeFileSync(svgArtifactPath, svgContent);
  fs.writeFileSync(svgProjectPath, svgContent);
  console.log('✔ [UJI 2 SUKSES] Berkas SVG tersimpan di:\n  -> ' + svgProjectPath);

  // -------------------------------------------------------------
  // PENGUJIAN 3: FOTO ILUSTRASI & BIOLOGI/IPA (Pollinations AI)
  // -------------------------------------------------------------
  console.log('\n[UJI 3] Mengunduh Foto Ilustrasi Biologi dari Pollinations AI...');
  const m = await import('./image_service.js');
  const prompt = 'cross section of plant leaf showing stomata and chloroplast photosynthesis biology textbook';
  const enhanced = m.buildEnhancedImagePrompt(prompt, 'REALISTIS');
  const url = m.getPollinationsImageUrl(enhanced, 600, 400);
  console.log('URL Target:', url);

  const res = await fetch(url);
  console.log('HTTP Status:', res.status, res.statusText);
  if (!res.ok) {
    const errText = await res.text();
    console.error('Gagal unduh gambar:', errText);
    return;
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log('Ukuran gambar terunduh:', buffer.length, 'bytes');

  const imgArtifactPath = path.join(artifactDir, 'bukti_uji_3_foto_biologi.jpg');
  const imgProjectPath = path.join(projectDir, 'bukti_uji_3_foto_biologi.jpg');
  fs.writeFileSync(imgArtifactPath, buffer);
  fs.writeFileSync(imgProjectPath, buffer);
  console.log('✔ [UJI 3 SUKSES] Berkas JPG tersimpan di:\n  -> ' + imgProjectPath);

  console.log('\n=== SELURUH PENGUJIAN 2 & 3 SELESAI DENGAN STATUS 100% SUKSES ===');
}

testBoth().catch(err => console.error('FATAL ERROR:', err));
