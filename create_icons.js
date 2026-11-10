/**
 * Generator Ikon PNG Murni (Pure Node.js - Zero Dependency)
 * Membuat ikon bergradien biru elektrik dengan simbol kilat di tengahnya.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(size) {
  const width = size;
  const height = size;

  // Buffer raw pixel (RGBA: 4 bytes per pixel) + 1 byte filter per scanline
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    rawData[rowStart] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 4;

      // Hitung jarak dari pusat untuk efek sudut membulat (rounded rect)
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;
      const cornerDist = Math.max(Math.abs(nx), Math.abs(ny));

      // Gradien background: Deep Blue (#0284c7) ke Cyan (#38bdf8)
      const grad = (x + y) / (width + height);
      let r = Math.round(2 + grad * 54);
      let g = Math.round(132 + grad * 57);
      let b = Math.round(199 + grad * 49);
      let a = 255;

      // Rounded corner cutoff
      if (Math.abs(nx) > 0.8 && Math.abs(ny) > 0.8) {
        const dx = Math.abs(nx) - 0.8;
        const dy = Math.abs(ny) - 0.8;
        if (dx * dx + dy * dy > 0.04) {
          a = 0;
        }
      }

      // Gambarkan simbol kilat / aksen di tengah (warna putih keemasan)
      const cx = x / width;
      const cy = y / height;
      if (a > 0) {
        // Area kilat sederhana
        const isLightning = (
          (cy >= 0.25 && cy <= 0.55 && cx >= 0.45 - (cy - 0.25) * 0.3 && cx <= 0.65 - (cy - 0.25) * 0.3) ||
          (cy >= 0.45 && cy <= 0.75 && cx >= 0.35 + (cy - 0.45) * 0.3 && cx <= 0.55 + (cy - 0.45) * 0.3)
        );
        if (isLightning) {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  // Kompresi IDAT data
  const compressed = zlib.deflateSync(rawData);

  // Buat file PNG lengkap
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.slice(4, len + 8));
  chunk.writeUInt32BE(crc >>> 0, len + 8);
  return chunk;
}

// Implementasi CRC32 murni
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuf = createPng(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuf);
  console.log(`Berhasil membuat icon${size}.png (${pngBuf.length} bytes)`);
});
