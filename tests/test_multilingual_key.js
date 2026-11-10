import assert from 'node:assert';
import { parseQuestionsDirectly } from '../scripts/docx_parser.js';

console.log('=== TEST SUITE: MULTILINGUAL KEY DETECTION (ENGLISH & OTHERS) ===');

// 1. ENGLISH: Answer: C
const rawEng1 = `
1. What is the biggest planet in our solar system?
A. Earth
B. Mars
C. Jupiter
D. Saturn
Answer: C
`;
const qEng1 = parseQuestionsDirectly(rawEng1);
assert.strictEqual(qEng1[0].kunci, 'C', 'Kunci harus C dari Answer: C');
console.log('✔ Test 1: Answer: C terdeteksi presisi');

// 2. ENGLISH: Ans: B
const rawEng2 = `
1. Who wrote "Romeo and Juliet"?
A. Charles Dickens
B. William Shakespeare
C. Mark Twain
D. Jane Austen
Ans: B
`;
const qEng2 = parseQuestionsDirectly(rawEng2);
assert.strictEqual(qEng2[0].kunci, 'B', 'Kunci harus B dari Ans: B');
console.log('✔ Test 2: Ans: B terdeteksi presisi');

// 3. ENGLISH: Correct Answer: D
const rawEng3 = `
1. What is the chemical formula for water?
A. CO2
B. NaCl
C. CH4
D. H2O
Correct Answer: D
`;
const qEng3 = parseQuestionsDirectly(rawEng3);
assert.strictEqual(qEng3[0].kunci, 'D', 'Kunci harus D dari Correct Answer: D');
console.log('✔ Test 3: Correct Answer: D terdeteksi presisi');

// 4. ENGLISH: **Answer Key:** A
const rawEng4 = `
1. Which ocean is the largest?
A. Pacific Ocean
B. Atlantic Ocean
C. Indian Ocean
D. Arctic Ocean
**Answer Key:** A
`;
const qEng4 = parseQuestionsDirectly(rawEng4);
assert.strictEqual(qEng4[0].kunci, 'A', 'Kunci harus A dari **Answer Key:** A');
console.log('✔ Test 4: **Answer Key:** A terdeteksi presisi');

// 5. ENGLISH: Bottom Answer Keys list
const rawEngBottom = `
1. Question 1
A. Option 1
B. Option 2
C. Option 3
D. Option 4

2. Question 2
A. Option 1
B. Option 2
C. Option 3
D. Option 4

ANSWER KEY:
1. B
2. D
`;
const qEngBottom = parseQuestionsDirectly(rawEngBottom);
assert.strictEqual(qEngBottom[0].kunci, 'B', 'Soal 1 kunci B dari daftar ANSWER KEY');
assert.strictEqual(qEngBottom[1].kunci, 'D', 'Soal 2 kunci D dari daftar ANSWER KEY');
console.log('✔ Test 5: Daftar ANSWER KEY di akhir naskah terpetakan sempurna');

// 6. TRUE / FALSE
const rawTf = `
1. Water boils at 100 degrees Celsius at sea level.
A. True
B. False
Answer: True
`;
const qTf = parseQuestionsDirectly(rawTf);
assert.strictEqual(qTf[0].kunci, 'Benar', 'True harus dinormalisasi menjadi Benar');
console.log('✔ Test 6: True/False ternormalisasi ke Benar/Salah');

// 7. ARABIC: الإجابة: A
const rawArab = `
1. مَا هُوَ اسْمُ هَذَا؟
A. كِتَابٌ
B. قَلَمٌ
C. بَابٌ
D. كُرْسِيٌّ
الإجابة: B
`;
const qArab = parseQuestionsDirectly(rawArab);
assert.strictEqual(qArab[0].kunci, 'B', 'Kunci harus B dari الإجابة: B');
console.log('✔ Test 7: Bahasa Arab الإجابة: B terdeteksi presisi');

// 8. FRENCH & GERMAN
const rawFr = `
1. Quelle est la capitale de la France?
A. Lyon
B. Marseille
C. Paris
D. Nice
Réponse: C
`;
const qFr = parseQuestionsDirectly(rawFr);
assert.strictEqual(qFr[0].kunci, 'C', 'Kunci harus C dari Réponse: C');
console.log('✔ Test 8: Bahasa Perancis Réponse: C terdeteksi presisi');
