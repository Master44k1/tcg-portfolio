// Kopiert die Texterkennung (Tesseract) nach public/ocr, damit sie ohne fremdes CDN und offline läuft.
import { cp, mkdir } from 'node:fs/promises';

const nm = new URL('../node_modules/', import.meta.url);
const out = new URL('../public/ocr/', import.meta.url);
await mkdir(out, { recursive: true });
await cp(new URL('tesseract.js/dist/worker.min.js', nm), new URL('worker.min.js', out));
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) {
  await cp(new URL(`tesseract.js-core/${f}`, nm), new URL(f, out));
}
for (const lang of ['eng', 'deu']) {
  await cp(new URL(`@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`, nm), new URL(`${lang}.traineddata.gz`, out));
}
console.log('Texterkennung nach public/ocr kopiert');
