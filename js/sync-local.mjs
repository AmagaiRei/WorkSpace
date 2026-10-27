#!/usr/bin/env node
//! Синхронизация лабораторных из публичного репозитория WorkSpace в локальную папку.
//! Без токена и без зависимостей (нужен Node.js 18+).
//!
//! node js/sync-local.mjs             — скачать новое и изменённое
//! node js/sync-local.mjs --dry-run   — только показать, что изменится
//!
//! Локальная структура: <localDir>/<название предмета>/lab-01/файлы лабораторной.

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  writeFile,
  lstat,
  realpath,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "sync.config.json");
const CONCURRENCY = 4;
const RETRIES = 3;
const SUBJECTS_PATH = "data/subjects.json";

export function gitBlobSha(buffer) {
  return createHash("sha1")
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest("hex");
}

export async function loadConfig(file = CONFIG_PATH) {
  let raw;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    throw new Error(
      `Нет файла ${path.basename(file)}.\n` +
        "Скопируй sync.config.example.json в sync.config.json и укажи localDir.",
    );
  }
  const config = {
    owner: "AmagaiRei",
    repo: "WorkSpace",
    branch: "main",
    include: ["data/labs/"],
    apiBase: "https://api.github.com",
    rawBase: "https://raw.githubusercontent.com",
    ...JSON.parse(raw),
  };
  if (!config.localDir || /ПУТЬ|PATH/.test(config.localDir)) {
    throw new Error("В sync.config.json не заполнено поле localDir.");
  }
  const expanded = config.localDir.replace(/^~(?=$|[\\/])/, os.homedir());
  if (!path.isAbsolute(expanded)) {
    throw new Error(
      "localDir должен быть абсолютным путём (например, D:\\Study\\WorkSpace).",
    );
  }
  config.localDir = path.resolve(expanded);
  if (
    !Array.isArray(config.include) ||
    !config.include.length ||
    config.include.some((x) => typeof x !== "string")
  ) {
    throw new Error("Поле include должно быть непустым массивом путей.");
  }
  return config;
}

async function fetchRetry(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { "User-Agent": "workspace-sync", ...options.headers },
        signal: AbortSignal.timeout(300_000),
      });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} для ${url}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < RETRIES)
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  throw lastError;
}

async function listRemoteFiles(config) {
  // Репозиторий публичный: для чтения не используем GITHUB_TOKEN,
  // чтобы случайный недействительный токен из окружения не вызывал HTTP 401.
  const headers = { Accept: "application/vnd.github+json" };
  const repoApi = `${config.apiBase}/repos/${config.owner}/${config.repo}`;
  const ref = await (
    await fetchRetry(
      `${repoApi}/git/ref/heads/${encodeURIComponent(config.branch)}`,
      { headers },
    )
  ).json();
  const commitSha = ref.object.sha;
  const tree = await (
    await fetchRetry(`${repoApi}/git/trees/${commitSha}?recursive=1`, {
      headers,
    })
  ).json();
  if (tree.truncated)
    console.warn(
      "⚠ Дерево репозитория усечено GitHub — часть файлов может быть пропущена.",
    );

  const subjectUrl = `${config.rawBase}/${config.owner}/${config.repo}/${commitSha}/${SUBJECTS_PATH}`;
  const subjectsJson = await (await fetchRetry(subjectUrl)).json();
  const subjectNames = new Map(
    (subjectsJson.subjects || []).map((subject) => [subject.id, subject.title]),
  );
  const files = tree.tree.filter(
    (item) =>
      item.type === "blob" &&
      config.include.some((prefix) => item.path.startsWith(prefix)),
  );
  return { commitSha, files, subjectNames };
}

function safeSubjectFolder(name) {
  const cleaned = String(name || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  return cleaned && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(cleaned)
    ? cleaned
    : "Предмет";
}

function localRelativePath(repoPath, subjectNames) {
  const match = repoPath.match(/^data\/labs\/([^/]+)\/(lab-\d+)(?:\/(.*))?$/);
  if (!match) return null;
  const [, subjectId, labFolder, rest = ""] = match;
  const subjectFolder = safeSubjectFolder(
    subjectNames.get(subjectId) || subjectId,
  );
  return [subjectFolder, labFolder, ...rest.split("/").filter(Boolean)].join(
    "/",
  );
}

function safeTarget(localDir, relativePath) {
  const parts = relativePath.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Небезопасный путь: ${relativePath}`);
  }
  const target = path.resolve(localDir, ...parts);
  if (target !== localDir && !target.startsWith(localDir + path.sep)) {
    throw new Error(`Небезопасный путь в репозитории: ${relativePath}`);
  }
  return target;
}

async function assertNoSymlinkEscape(localDir, target) {
  let current = localDir;
  const relative = path.relative(localDir, path.dirname(target));
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) {
        const actual = await realpath(current);
        if (actual !== localDir && !actual.startsWith(localDir + path.sep)) {
          throw new Error(
            `Символическая ссылка выходит за пределы localDir: ${current}`,
          );
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      break;
    }
  }
}

async function localSha(file) {
  try {
    return gitBlobSha(await readFile(file));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function mapLimit(items, limit, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

export async function sync(config, { dryRun = false, log = console.log } = {}) {
  const { commitSha, files, subjectNames } = await listRemoteFiles(config);
  const mapped = files
    .map((item) => ({
      ...item,
      relativePath: localRelativePath(item.path, subjectNames),
    }))
    .filter((item) => item.relativePath);
  log(
    `Репозиторий ${config.owner}/${config.repo}@${config.branch} (${commitSha.slice(0, 7)}): лабораторных файлов ${mapped.length}`,
  );

  const stats = { downloaded: 0, skipped: 0, failed: 0, bytes: 0 };
  const toDownload = [];
  for (const item of mapped) {
    const target = safeTarget(config.localDir, item.relativePath);
    await assertNoSymlinkEscape(config.localDir, target);
    if ((await localSha(target)) === item.sha) stats.skipped += 1;
    else toDownload.push({ ...item, target });
  }

  if (dryRun) {
    for (const item of toDownload)
      log(`  + ${item.relativePath}  ←  ${item.path}`);
    log(
      `Пробный запуск: скачалось бы ${toDownload.length}, актуально ${stats.skipped}.`,
    );
    return { ...stats, wouldDownload: toDownload.length };
  }

  await mapLimit(toDownload, CONCURRENCY, async (item) => {
    try {
      const url = `${config.rawBase}/${config.owner}/${config.repo}/${commitSha}/${item.path.split("/").map(encodeURIComponent).join("/")}`;
      const body = Buffer.from(await (await fetchRetry(url)).arrayBuffer());
      if (gitBlobSha(body) !== item.sha)
        throw new Error(
          "контрольная сумма не совпала (файл повреждён при загрузке)",
        );
      await assertNoSymlinkEscape(config.localDir, item.target);
      await mkdir(path.dirname(item.target), { recursive: true });
      const temp = `${item.target}.part`;
      await writeFile(temp, body);
      await rename(temp, item.target);
      stats.downloaded += 1;
      stats.bytes += body.length;
      log(`  ↓ ${item.relativePath} (${(body.length / 1024).toFixed(1)} КБ)`);
    } catch (error) {
      stats.failed += 1;
      console.error(`  ✗ ${item.relativePath}: ${error.message}`);
    }
  });

  log(
    `Готово: скачано ${stats.downloaded}, актуально ${stats.skipped}, ошибок ${stats.failed}.`,
  );
  return stats;
}

async function main() {
  try {
    const config = await loadConfig();
    console.log(`Локальная папка: ${config.localDir}`);
    const stats = await sync(config, {
      dryRun: process.argv.includes("--dry-run"),
    });
    process.exitCode = stats.failed ? 1 : 0;
  } catch (error) {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
