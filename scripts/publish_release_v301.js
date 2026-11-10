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

async function publishReleaseV301() {
  console.log("=== MEMULAI PUBLIKASI / UPDATE RELEASE GITHUB v3.0.1 ===");
  const token = await getGitHubToken();
  if (!token) throw new Error("Token GitHub tidak ditemukan di credential helper.");

  const owner = "maulana1308";
  const repo = "afresto-ai-assistant";
  const tag = "v3.0.1";

  // Check if release already exists
  let releaseData = null;
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'Antigravity-Agent'
    }
  });

  if (getRes.ok) {
    releaseData = await getRes.json();
    console.log(`Release ${tag} sudah ada (ID: ${releaseData.id})`);
  } else {
    console.log(`Membuat release baru untuk ${tag}...`);
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Antigravity-Agent',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tag_name: tag,
        name: "Afresto AI Assistant v3.0.1",
        body: `### 🌟 Rilis v3.0.1 (Official Neutral Mascot & Core Polish)
- **Maskot Resmi Afresto HD (Squirrel/Fox):** Karakter tupai/rubah ceria bernuansa hijau & emas dengan logo Afresto dan pose thumbs up.
- **Auto-Save & Form Draft Recovery:** Menghilangkan keharusan mengetik ulang materi/soal saat berpindah tab atau tidak sengaja tertutup.
- **Pencegahan Font Explosion di Froala LMS:** Perbaikan injeksi HTML agar badge nomor dan styling soal tidak meledak di editor Froala Afresto.
- **Indikator Real-Time Injeksi:** Toast notifikasi langsung di halaman Afresto CBT saat injeksi soal/materi berhasil masuk.
- **Sistem Updater Terintegrasi:** Berkas zip rilis resmi tersedia langsung di GitHub Releases.`,
        draft: false,
        prerelease: false
      })
    });
    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(`Gagal membuat release: ${JSON.stringify(err)}`);
    }
    releaseData = await createRes.json();
    console.log(`✔ Release ${tag} berhasil dibuat! URL: ${releaseData.html_url}`);
  }

  const uploadUrlBase = releaseData.upload_url.split('{')[0];
  const filesToUpload = [
    { name: "Afresto_AI_Assistant_latest.zip", path: path.resolve("Afresto_AI_Assistant_latest.zip") },
    { name: "Afresto_AI_Assistant_v3.0.1.zip", path: path.resolve("Afresto_AI_Assistant_v3.0.1.zip") }
  ];

  // If assets exist on release, delete first to replace with new ones
  if (releaseData.assets && releaseData.assets.length > 0) {
    for (const asset of releaseData.assets) {
      if (filesToUpload.some(f => f.name === asset.name)) {
        console.log(`Menghapus asset lama ${asset.name} (ID: ${asset.id})...`);
        await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Antigravity-Agent'
          }
        });
      }
    }
  }

  for (const file of filesToUpload) {
    if (!fs.existsSync(file.path)) {
      console.warn(`File ${file.path} tidak ditemukan, lewati.`);
      continue;
    }
    const fileBytes = fs.readFileSync(file.path);
    console.log(`Mengunggah asset ${file.name} (${(fileBytes.length / 1024).toFixed(1)} KB)...`);

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

  console.log("⭐ RELEASE v3.0.1 & ZIP PACKAGES BERHASIL DI-UPDATE DI GITHUB!");
}

publishReleaseV301().catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
