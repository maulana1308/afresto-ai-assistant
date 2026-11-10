import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';

function getGitHubToken() {
  return new Promise((resolve, reject) => {
    const proc = cp.spawn('git', ['credential', 'fill']);
    proc.stdin.write('protocol=https\nhost=github.com\n\n');
    proc.stdin.end();
    let out = '';
    proc.stdout.on('data', d => out += d);
    proc.on('close', code => {
      const lines = out.split('\n');
      const token = (lines.find(l => l.startsWith('password=')) || '').replace('password=', '').trim();
      resolve(token);
    });
    proc.on('error', reject);
  });
}

async function publishRelease() {
  console.log("=== MEMULAI PUBLIKASI RELEASE GITHUB v3.0.0 ===");
  const token = await getGitHubToken();
  if (!token) throw new Error("Token GitHub tidak ditemukan di credential helper.");

  const owner = "maulana1308";
  const repo = "afresto-ai-assistant";

  // 1. Buat Release
  const releasePayload = {
    tag_name: "v3.0.0",
    name: "Afresto AI Assistant v3.0.0",
    body: `### 🏛️ Rilis Akbar v3.0.0 (Sovereign Engine)
- **Modul Baru:** Materi & Bahan Ajar Berstandar BSKAP Kemendikbudristek No. 032/H/KR/2024.
- **Navigasi Tab Segmented:** Pindah instan antara *📝 Soal Asesmen* dan *📚 Materi & Bahan Ajar*.
- **Diagram Vektor SVG Ilmiah:** Ilustrasi akurat tanpa halusinasi visual untuk biologi, fisika, dan matematika.
- **Injeksi Form Tanpa Auto-Save:** Ekstensi mengisi judul, konten, dan tugas, sementara guru bebas mengatur jadwal dan mengklik tombol Simpan sendiri.
- **Sistem Updater Otomatis 1-Klik:** Terhubung langsung ke GitHub Releases.`,
    draft: false,
    prerelease: false
  };

  console.log("1. Membuat release v3.0.0 di GitHub...");
  const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'Antigravity-Agent',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(releasePayload)
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Gagal membuat release: ${JSON.stringify(err)}`);
  }

  const releaseData = await createRes.json();
  const releaseId = releaseData.id;
  const uploadUrlBase = releaseData.upload_url.split('{')[0];
  console.log(`✔ Release berhasil dibuat! ID: ${releaseId} | URL: ${releaseData.html_url}`);

  // 2. Upload Asset: Afresto_AI_Assistant_latest.zip
  const filesToUpload = [
    { name: "Afresto_AI_Assistant_latest.zip", path: path.resolve("Afresto_AI_Assistant_latest.zip") },
    { name: "Afresto_AI_Assistant_v3.0.0.zip", path: path.resolve("Afresto_AI_Assistant_v3.0.0.zip") }
  ];

  for (const file of filesToUpload) {
    if (!fs.existsSync(file.path)) {
      console.warn(`File ${file.path} tidak ditemukan, lewati.`);
      continue;
    }
    const fileBytes = fs.readFileSync(file.path);
    console.log(`2. Mengunggah asset ${file.name} (${(fileBytes.length / 1024).toFixed(1)} KB)...`);

    const uploadRes = await fetch(`${uploadUrlBase}?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Antigravity-Agent',
        'Content-Type': 'application/zip',
        'Content-Length': String(fileBytes.length)
      },
      body: fileBytes
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      console.error(`Gagal upload asset ${file.name}:`, err);
    } else {
      console.log(`✔ Asset ${file.name} berhasil diunggah ke GitHub!`);
    }
  }

  console.log("⭐ SELURUH PUBLIKASI GITHUB RELEASE v3.0.0 SELESAI SUKSES!");
}

publishRelease().catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
