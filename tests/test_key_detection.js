import assert from 'node:assert';
import { parseQuestionsDirectly } from '../scripts/docx_parser.js';

console.log('=== TEST SUITE: RAGAM FORMAT KUNCI JAWABAN GURU ===');

// 1. OPSI DI-BOLD
const rawBoldLetter = `
1. Siapakah presiden pertama Indonesia?
**A.** Ir. Soekarno
B. Moh. Hatta
C. Soeharto
D. B.J. Habibie
E. Gus Dur
`;
const qBold = parseQuestionsDirectly(rawBoldLetter);
assert.strictEqual(qBold[0].kunci, 'A', 'Kunci harus A dari opsi bold **A.**');
console.log('✔ Test 1: Opsi huruf di-bold (**A.**) -> Kunci = A');

const rawBoldText = `
1. Siapakah presiden pertama Indonesia?
A. **Ir. Soekarno**
B. Moh. Hatta
C. Soeharto
D. B.J. Habibie
E. Gus Dur
`;
const qBoldText = parseQuestionsDirectly(rawBoldText);
assert.strictEqual(qBoldText[0].kunci, 'A', 'Kunci harus A dari isi teks opsi bold');
console.log('✔ Test 2: Isi teks opsi di-bold (A. **Soekarno**) -> Kunci = A');

// 2. KUNCI SETELAH SOAL DENGAN VARIASI FORMAT
const rawKeyAfter = `
1. Ibukota Indonesia saat ini adalah...
A. Surabaya
B. Bandung
C. Jakarta
D. Medan
E. Semarang
Kunci Jawaban: C
`;
const qKeyAfter = parseQuestionsDirectly(rawKeyAfter);
assert.strictEqual(qKeyAfter[0].kunci, 'C', 'Kunci harus C dari tulisan Kunci Jawaban: C');
console.log('✔ Test 3: Tulisan Kunci Jawaban: C -> Kunci = C');

const rawKeyBold = `
1. Ibukota Jawa Barat adalah...
A. Surabaya
B. Bandung
C. Jakarta
D. Medan
**Kunci:** B
`;
const qKeyBold = parseQuestionsDirectly(rawKeyBold);
assert.strictEqual(qKeyBold[0].kunci, 'B', 'Kunci harus B dari **Kunci:** B');
console.log('✔ Test 4: Tulisan **Kunci:** B -> Kunci = B');

const rawKeyParen = `
1. Ibukota Jawa Tengah adalah...
A. Surabaya
B. Bandung
C. Semarang
D. Medan
Kunci: (C)
`;
const qKeyParen = parseQuestionsDirectly(rawKeyParen);
assert.strictEqual(qKeyParen[0].kunci, 'C', 'Kunci harus C dari Kunci: (C)');
console.log('✔ Test 5: Tulisan Kunci: (C) -> Kunci = C');

const rawKeyDot = `
1. Ibukota Jawa Timur adalah...
A. Surabaya
B. Bandung
C. Semarang
D. Medan
KUNCI JAWABAN : A.
`;
const qKeyDot = parseQuestionsDirectly(rawKeyDot);
assert.strictEqual(qKeyDot[0].kunci, 'A', 'Kunci harus A dari KUNCI JAWABAN : A.');
console.log('✔ Test 6: Tulisan KUNCI JAWABAN : A. -> Kunci = A');

const rawJawaban = `
1. Lambang unsur oksigen adalah...
A. H
B. O
C. N
D. C
Jawaban: B
`;
const qJawaban = parseQuestionsDirectly(rawJawaban);
assert.strictEqual(qJawaban[0].kunci, 'B', 'Kunci harus B dari Jawaban: B');
console.log('✔ Test 7: Tulisan Jawaban: B -> Kunci = B');

const rawParenQuestion = `
1. Lambang unsur emas adalah.... (C)
A. Ag
B. Fe
C. Au
D. Cu
`;
const qParenQ = parseQuestionsDirectly(rawParenQuestion);
assert.strictEqual(qParenQ[0].kunci, 'C', 'Kunci harus C dari kunci kurung di pertanyaan (C)');
console.log('✔ Test 8: Kunci di akhir baris pertanyaan (... adalah (C)) -> Kunci = C');

// 3. DAFTAR KUNCI JAWABAN DI BAWAH (SEMUA KUNCI DI BAWAH)
const rawKeysBottomVertical = `
1. Pertanyaan pertama
A. Opsi 1
B. Opsi 2
C. Opsi 3
D. Opsi 4

2. Pertanyaan kedua
A. Opsi 1
B. Opsi 2
C. Opsi 3
D. Opsi 4

KUNCI JAWABAN:
1. B
2. D
`;
const qKeysBottomVert = parseQuestionsDirectly(rawKeysBottomVertical);
assert.strictEqual(qKeysBottomVert[0].kunci, 'B', 'Soal 1 kunci B');
assert.strictEqual(qKeysBottomVert[1].kunci, 'D', 'Soal 2 kunci D');
console.log('✔ Test 9: Daftar kunci vertikal di bawah (1. B, 2. D) -> Berhasil');

const rawKeysBottomHorizontal = `
1. Pertanyaan 1
A. Opsi 1
B. Opsi 2
C. Opsi 3
D. Opsi 4

2. Pertanyaan 2
A. Opsi 1
B. Opsi 2
C. Opsi 3
D. Opsi 4

3. Pertanyaan 3
A. Opsi 1
B. Opsi 2
C. Opsi 3
D. Opsi 4

**DAFTAR KUNCI JAWABAN**
1. C   2. A   3. D
`;
const qKeysBottomHoriz = parseQuestionsDirectly(rawKeysBottomHorizontal);
assert.strictEqual(qKeysBottomHoriz[0].kunci, 'C', 'Soal 1 kunci C dari horizontal');
assert.strictEqual(qKeysBottomHoriz[1].kunci, 'A', 'Soal 2 kunci A dari horizontal');
assert.strictEqual(qKeysBottomHoriz[2].kunci, 'D', 'Soal 3 kunci D dari horizontal');
console.log('✔ Test 10: Daftar kunci horizontal di bawah (1. C   2. A   3. D) -> Berhasil');

const rawKeysBottomTable = `
1. Pertanyaan 1
A. Opsi 1
B. Opsi 2
C. Opsi 3
D. Opsi 4

2. Pertanyaan 2
A. Opsi 1
B. Opsi 2
C. Opsi 3
D. Opsi 4

KUNCI JAWABAN:
| 1 | B |
| 2 | C |
`;
const qKeysBottomTable = parseQuestionsDirectly(rawKeysBottomTable);
assert.strictEqual(qKeysBottomTable[0].kunci, 'B', 'Soal 1 kunci B dari tabel kunci');
assert.strictEqual(qKeysBottomTable[1].kunci, 'C', 'Soal 2 kunci C dari tabel kunci');
console.log('✔ Test 11: Tabel kunci jawaban di bawah (| 1 | B |) -> Berhasil');
