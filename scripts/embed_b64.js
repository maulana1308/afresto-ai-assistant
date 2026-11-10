import fs from 'node:fs';
import path from 'node:path';

const artifactDir = 'C:\\Users\\maula\\.gemini\\antigravity\\brain\\65a63ff4-d55a-4f07-bad2-3379b5a10f8a';
const jpgPath = path.join(artifactDir, 'bukti_uji_3_foto_biologi.jpg');
const jpgBuffer = fs.readFileSync(jpgPath);
const base64Data = 'data:image/jpeg;base64,' + jpgBuffer.toString('base64');

const htmlPath = path.join(artifactDir, 'soal_preview_widget.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace('src="bukti_uji_3_foto_biologi.jpg"', `src="${base64Data}"`);

fs.writeFileSync(htmlPath, html);
console.log('Success! Total size of widget: ' + html.length + ' bytes');
