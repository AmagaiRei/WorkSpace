//! Публикация лабораторной в GitHub ОДНИМ коммитом через Git Data API:
//! blobs → tree → commit → обновление ref (без force).
//! Если ветка успела уйти вперёд, GitHub вернёт 422 — тогда читаем состояние заново и повторяем.

import {
  SUBJECTS_PATH,
  labFolder,
  pad2,
  planFiles,
  buildLabEntry,
  addLabToText,
  buildEditPlan,
  replaceLabInText,
} from "./admin-model.js";

const API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 60_000;
const UPLOAD_CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;

export class GitHubError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GitHubError";
    this.code = code;
  }
}

async function api(token, repo, path, { method = "GET", body } = {}) {
  if (!token) {
    throw new GitHubError(
      "NO_TOKEN",
      "Нет токена: сохрани или разблокируй его.",
    );
  }
  let response;
  try {
    response = await fetch(`${API}/repos/${repo.owner}/${repo.name}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GitHubError(
      "NETWORK",
      "Нет связи с GitHub. Проверь интернет и повтори — ничего не потеряно.",
    );
  }
  if (response.ok) return response.status === 204 ? null : response.json();

  const detail = (await response.json().catch(() => ({}))).message ?? "";
  if (response.status === 401) {
    throw new GitHubError(
      "BAD_TOKEN",
      "Токен недействителен или истёк. Создай новый.",
    );
  }
  if (response.status === 403) {
    if (response.headers.get("x-ratelimit-remaining") === "0") {
      throw new GitHubError(
        "RATE_LIMIT",
        "Лимит запросов GitHub исчерпан. Подожди и повтори.",
      );
    }
    throw new GitHubError(
      "NO_ACCESS",
      "У токена нет прав на запись. Нужен доступ Contents: Read and write к этому репозиторию.",
    );
  }
  if (response.status === 404) {
    throw new GitHubError(
      "NO_ACCESS",
      "Репозиторий или ветка не найдены, либо токен не имеет к ним доступа.",
    );
  }
  if (response.status === 422 && /fast.?forward/i.test(detail)) {
    throw new GitHubError("CONFLICT", "Ветка изменилась во время загрузки.");
  }
  throw new GitHubError(
    "API",
    `GitHub ответил ${response.status}: ${detail || "без пояснения"}`,
  );
}

/** Проверка токена до сохранения: репозиторий виден и запись разрешена. */
export async function verifyToken(token, repo) {
  const info = await api(token, repo, "");
  if (info.permissions && info.permissions.push === false) {
    throw new GitHubError(
      "NO_ACCESS",
      "Токен видит репозиторий, но писать в него не может. Добавь право Contents: Read and write.",
    );
  }
}

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

const decodeBase64Utf8 = (b64) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );

async function mapLimit(items, limit, worker) {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        await worker(items[index], index);
      }
    },
  );
  await Promise.all(runners);
}

async function attemptPublish(ctx, blobCache) {
  const { token, repo, draft, planned, onProgress } = ctx;
  const branch = repo.branch ?? "main";

  onProgress("Читаю состояние репозитория…");
  const ref = await api(token, repo, `/git/ref/heads/${branch}`);
  const headSha = ref.object.sha;
  const headCommit = await api(token, repo, `/git/commits/${headSha}`);
  const baseTreeSha = headCommit.tree.sha;
  const tree = await api(token, repo, `/git/trees/${baseTreeSha}?recursive=1`);
  if (tree.truncated) {
    throw new GitHubError(
      "API",
      "Репозиторий слишком большой для проверки дерева.",
    );
  }

  const folder = labFolder(draft.subjectId, draft.id);
  if (tree.tree.some((item) => item.path.startsWith(`${folder}/`))) {
    throw new GitHubError(
      "EXISTS",
      `Папка ${folder} уже существует в репозитории. Выбери другой номер.`,
    );
  }

  // !Актуальный subjects.json берём из ТОЙ ЖЕ ревизии, к которой будем добавлять коммит
  const subjectsItem = tree.tree.find((item) => item.path === SUBJECTS_PATH);
  if (!subjectsItem)
    throw new GitHubError("API", `В репозитории нет ${SUBJECTS_PATH}.`);
  const blob = await api(token, repo, `/git/blobs/${subjectsItem.sha}`);
  const originalText = decodeBase64Utf8(blob.content);
  let newSubjectsText;
  try {
    newSubjectsText = addLabToText(
      originalText,
      draft.subjectId,
      buildLabEntry(draft, planned),
    );
  } catch (error) {
    if (error.code === "EXISTS") throw new GitHubError("EXISTS", error.message);
    if (error instanceof SyntaxError) {
      throw new GitHubError(
        "API",
        "subjects.json в репозитории не читается как JSON.",
      );
    }
    throw error;
  }

  const entries = [...planned.entries()].filter(
    ([path]) => !blobCache.has(path),
  );
  let done = 0;
  await mapLimit(entries, UPLOAD_CONCURRENCY, async ([path, file]) => {
    const created = await api(token, repo, "/git/blobs", {
      method: "POST",
      body: { content: await fileToBase64(file), encoding: "base64" },
    });
    blobCache.set(path, created.sha);
    done += 1;
    onProgress(`Загружаю файлы: ${done} из ${entries.length}…`);
  });

  onProgress("Обновляю subjects.json…");
  const subjectsBlob = await api(token, repo, "/git/blobs", {
    method: "POST",
    body: { content: newSubjectsText, encoding: "utf-8" },
  });

  onProgress("Создаю коммит…");
  const newTree = await api(token, repo, "/git/trees", {
    method: "POST",
    body: {
      base_tree: baseTreeSha,
      tree: [
        ...[...planned.keys()].map((path) => ({
          path,
          mode: "100644",
          type: "blob",
          sha: blobCache.get(path),
        })),
        {
          path: SUBJECTS_PATH,
          mode: "100644",
          type: "blob",
          sha: subjectsBlob.sha,
        },
      ],
    },
  });
  const message =
    `Add lab ${pad2(draft.id)} (${draft.subjectId}): ${draft.title.trim()}`.slice(
      0,
      72,
    );
  const commit = await api(token, repo, "/git/commits", {
    method: "POST",
    body: { message, tree: newTree.sha, parents: [headSha] },
  });

  // !force:false — GitHub откажет, если ветка ушла вперёд (защита от потери чужих правок)
  await api(token, repo, `/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: { sha: commit.sha, force: false },
  });

  return {
    commitSha: commit.sha,
    commitUrl: `https://github.com/${repo.owner}/${repo.name}/commit/${commit.sha}`,
    entry: buildLabEntry(draft, planned),
    fileCount: planned.size,
  };
}

export async function publishLab({
  token,
  repo,
  draft,
  onProgress = () => {},
}) {
  if (!repo?.owner || !repo?.name) {
    throw new GitHubError(
      "API",
      "В subjects.json нет блока repo (owner, name).",
    );
  }
  const planned = planFiles(draft);
  const blobCache = new Map(); // !путь → sha блоба: при повторе не грузим файлы заново
  const ctx = { token, repo, draft, planned, onProgress };

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await attemptPublish(ctx, blobCache);
    } catch (error) {
      if (error.code !== "CONFLICT" || attempt >= MAX_ATTEMPTS) {
        if (error.code === "CONFLICT") {
          throw new GitHubError(
            "CONFLICT",
            "Ветка постоянно меняется (другой коммит или деплой). Повтори через минуту.",
          );
        }
        throw error;
      }
      onProgress(
        `Ветка изменилась, повторяю (${attempt + 1} из ${MAX_ATTEMPTS})…`,
      );
    }
  }
}

/* ---------- Редактирование: тоже один коммит ---------- */

async function attemptEdit(ctx, blobCache) {
  const { token, repo, draft, onProgress } = ctx;
  const branch = repo.branch ?? "main";

  onProgress("Читаю состояние репозитория…");
  const ref = await api(token, repo, `/git/ref/heads/${branch}`);
  const headSha = ref.object.sha;
  const headCommit = await api(token, repo, `/git/commits/${headSha}`);
  const baseTreeSha = headCommit.tree.sha;
  const tree = await api(token, repo, `/git/trees/${baseTreeSha}?recursive=1`);
  if (tree.truncated) {
    throw new GitHubError(
      "API",
      "Репозиторий слишком большой для проверки дерева.",
    );
  }

  const subjectsItem = tree.tree.find((item) => item.path === SUBJECTS_PATH);
  if (!subjectsItem)
    throw new GitHubError("API", `В репозитории нет ${SUBJECTS_PATH}.`);
  const blob = await api(token, repo, `/git/blobs/${subjectsItem.sha}`);
  const originalText = decodeBase64Utf8(blob.content);

  // !Исходную запись берём из репозитория, а не из страницы: она могла устареть
  let parsed;
  try {
    parsed = JSON.parse(originalText.replace(/^\uFEFF/, ""));
  } catch {
    throw new GitHubError(
      "API",
      "subjects.json в репозитории не читается как JSON.",
    );
  }
  const original = parsed.subjects
    ?.find((s) => s.id === draft.subjectId)
    ?.labs.find((lab) => Number(lab.id) === draft.id);
  if (!original) {
    throw new GitHubError(
      "MISSING",
      `Лабораторная ${pad2(draft.id)} не найдена в репозитории — возможно, её уже удалили.`,
    );
  }

  const folder = labFolder(draft.subjectId, draft.id);
  const blobs = tree.tree.filter((item) => item.type === "blob");
  const existing = new Set(blobs.map((item) => item.path));
  const existingInFolder = blobs
    .map((item) => item.path)
    .filter((path) => path.startsWith(`${folder}/`));

  const plan = buildEditPlan(draft, original, existingInFolder);
  if (!plan.changed)
    throw new GitHubError("NO_CHANGES", "Изменений нет — нечего сохранять.");

  let newSubjectsText;
  try {
    newSubjectsText = replaceLabInText(
      originalText,
      draft.subjectId,
      plan.entry,
    );
  } catch (error) {
    if (error.code === "MISSING")
      throw new GitHubError("MISSING", error.message);
    throw error;
  }

  const entries = [...plan.upload.entries()].filter(
    ([path]) => !blobCache.has(path),
  );
  let done = 0;
  await mapLimit(entries, UPLOAD_CONCURRENCY, async ([path, file]) => {
    const created = await api(token, repo, "/git/blobs", {
      method: "POST",
      body: { content: await fileToBase64(file), encoding: "base64" },
    });
    blobCache.set(path, created.sha);
    done += 1;
    onProgress(`Загружаю файлы: ${done} из ${entries.length}…`);
  });

  onProgress("Обновляю subjects.json…");
  const subjectsBlob = await api(token, repo, "/git/blobs", {
    method: "POST",
    body: { content: newSubjectsText, encoding: "utf-8" },
  });

  onProgress("Создаю коммит…");
  // !sha: null в дереве = удалить файл; удаляем только то, что реально есть в репозитории
  const removals = [...plan.remove]
    .filter((path) => existing.has(path))
    .map((path) => ({ path, mode: "100644", type: "blob", sha: null }));
  const newTree = await api(token, repo, "/git/trees", {
    method: "POST",
    body: {
      base_tree: baseTreeSha,
      tree: [
        ...[...plan.upload.keys()].map((path) => ({
          path,
          mode: "100644",
          type: "blob",
          sha: blobCache.get(path),
        })),
        ...removals,
        {
          path: SUBJECTS_PATH,
          mode: "100644",
          type: "blob",
          sha: subjectsBlob.sha,
        },
      ],
    },
  });
  const message =
    `Edit lab ${pad2(draft.id)} (${draft.subjectId}): ${plan.entry.title}`.slice(
      0,
      72,
    );
  const commit = await api(token, repo, "/git/commits", {
    method: "POST",
    body: { message, tree: newTree.sha, parents: [headSha] },
  });
  await api(token, repo, `/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: { sha: commit.sha, force: false },
  });

  return {
    commitUrl: `https://github.com/${repo.owner}/${repo.name}/commit/${commit.sha}`,
    entry: plan.entry,
    uploaded: plan.upload.size,
    removed: removals.length,
  };
}

export async function publishEdit({
  token,
  repo,
  draft,
  onProgress = () => {},
}) {
  if (!repo?.owner || !repo?.name) {
    throw new GitHubError(
      "API",
      "В subjects.json нет блока repo (owner, name).",
    );
  }
  const blobCache = new Map();
  const ctx = { token, repo, draft, onProgress };

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await attemptEdit(ctx, blobCache);
    } catch (error) {
      if (error.code !== "CONFLICT") throw error;
      if (attempt >= MAX_ATTEMPTS) {
        throw new GitHubError(
          "CONFLICT",
          "Ветка постоянно меняется (другой коммит или деплой). Повтори через минуту.",
        );
      }
      onProgress(
        `Ветка изменилась, повторяю (${attempt + 1} из ${MAX_ATTEMPTS})…`,
      );
    }
  }
}
