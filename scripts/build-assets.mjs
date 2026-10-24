// Шифрует фото из assets/ паролем в assets.enc.js (PBKDF2 → AES-GCM).
// Без пароля сцену не открыть даже из исходников на GitHub.
// Запуск:  node scripts/build-assets.mjs "новый пароль"
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Та же нормализация, что на странице: дата в любой записи → «7 мая»
await import(pathToFileURL(join(root, 'password.js')).href);
const { normalizePassword } = globalThis;

if (!process.argv[2]) {
  console.error('Укажи пароль: node scripts/build-assets.mjs "пароль"');
  process.exit(1);
}
const password = normalizePassword(process.argv[2]);

const NAMES = ['eye', 'lily-pink', 'lily-white', 'lily-red', 'lily-magenta'];
const assets = {};
for (const n of NAMES) {
  assets[n] = 'data:image/jpeg;base64,' + readFileSync(join(root, 'assets', `${n}.jpg`)).toString('base64');
}

const ITER = 250000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
);
const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(assets)));

const b64 = u8 => Buffer.from(u8).toString('base64');
writeFileSync(join(root, 'assets.enc.js'),
  `// Сгенерировано scripts/build-assets.mjs — фото, зашифрованные паролем\n` +
  `window.ENC = { iter: ${ITER}, salt: '${b64(salt)}', iv: '${b64(iv)}', data: '${b64(new Uint8Array(data))}' };\n`);
console.log('assets.enc.js готов');
