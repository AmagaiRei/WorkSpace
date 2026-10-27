// ! Хранение GitHub-токена.
// ! В localStorage лежит только ШИФРОТЕКСТ (PBKDF2 → AES-GCM, ключ из парольной фразы).
// ! Расшифрованный токен живёт в переменной модуля и пропадает при закрытии вкладки.
// ! Парольную фразу нигде не сохраняем.

const STORAGE_KEY = "workspace-admin-token";
const PBKDF2_ITERATIONS = 210_000;
const TOKEN_PATTERN = /^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/;

let unlockedToken = null;

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

function subtle() {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Шифрование недоступно: открой сайт по HTTPS (GitHub Pages) или через localhost.",
    );
  }
  return globalThis.crypto.subtle;
}

async function deriveKey(passphrase, salt) {
  const material = await subtle().importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle().deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export const looksLikeToken = (value) => TOKEN_PATTERN.test(value.trim());
export const isUnlocked = () => unlockedToken !== null;
export const getToken = () => unlockedToken;

export function hasStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false; // !localStorage может быть заблокирован
  }
}

export async function save(token, passphrase) {
  const clean = token.trim();
  if (!looksLikeToken(clean)) {
    throw new Error("Это не похоже на токен GitHub (github_pat_… или ghp_…).");
  }
  if (passphrase.length < 8) {
    throw new Error("Парольная фраза — минимум 8 символов.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = new Uint8Array(
    await subtle().encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(clean),
    ),
  );
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        salt: toB64(salt),
        iv: toB64(iv),
        data: toB64(data),
      }),
    );
  } catch {
    throw new Error(
      "Не удалось записать в localStorage (хранилище заблокировано).",
    );
  }
  unlockedToken = clean;
}

export async function unlock(passphrase) {
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    stored = null;
  }
  if (!stored) throw new Error("Токен не сохранён.");
  try {
    const key = await deriveKey(passphrase, fromB64(stored.salt));
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: fromB64(stored.iv) },
      key,
      fromB64(stored.data),
    );
    unlockedToken = new TextDecoder().decode(plain);
  } catch {
    // !AES-GCM проверяет подлинность: неверная фраза = ошибка расшифровки
    throw new Error("Неверная парольная фраза.");
  }
}

export function lock() {
  unlockedToken = null;
}

export function forget() {
  unlockedToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // !нечего чистить
  }
}
