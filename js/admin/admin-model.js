//! Чистая логика админки: проверка формы, пути файлов, слияние в subjects.json.
//! Здесь нет DOM и сети — модуль легко тестировать в Node.

export const SUBJECTS_PATH = "data/subjects.json";
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // base64 раздувает файл на ~33%
export const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

export const STATUSES = [
  { value: "done", label: "Сдано" },
  { value: "progress", label: "В работе" },
  { value: "todo", label: "Не начато" },
  { value: "idea", label: "Идея" },
];

// !Сборочный мусор не должен попадать в репозиторий вместе с кодом
const IGNORED_DIRS = new Set(["bin", "obj", ".vs", ".git", "node_modules"]);
const REPORT_EXT = [".docx", ".doc", ".pdf"];
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

export const pad2 = (n) => String(n).padStart(2, "0");

export const labFolder = (subjectId, id) =>
  `data/labs/${subjectId}/lab-${pad2(id)}`;

export const todayIso = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
}

export const extensionOf = (name) => {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
};

// !Один сегмент пути: убираем символы, которые ломают пути, и "." / ".."
export function sanitizeSegment(segment) {
  const clean = segment
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, "_");
  return clean === "" || clean === "." || clean === ".." ? "_" : clean;
}

export const sanitizeFileName = sanitizeSegment;

export function parseTags(text) {
  const seen = new Set();
  const tags = [];
  for (const raw of text.split(/[,;\n]/)) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

export function nextLabId(subject) {
  const ids = (subject?.labs ?? []).map((lab) => Number(lab.id) || 0);
  return Math.max(0, ...ids) + 1;
}

/**
 * Превращает FileList кода (файлы или папка) в [{path, file}] без мусора.
 * У выбранной папки webkitRelativePath = "Корень/src/A.cs" — корень отбрасываем.
 */
export function collectCodeFiles(files) {
  const result = [];
  let skipped = 0;
  for (const file of files) {
    const rel = file.webkitRelativePath
      ? file.webkitRelativePath.split("/").slice(1)
      : [file.name];
    if (rel.some((part) => IGNORED_DIRS.has(part.toLowerCase()))) {
      skipped += 1;
      continue;
    }
    result.push({ path: rel.map(sanitizeSegment).join("/"), file });
  }
  return { files: result, skipped };
}

export function validateDraft(draft, data) {
  const errors = [];
  const subject = data?.subjects?.find((s) => s.id === draft.subjectId);

  if (!subject) errors.push("Выбери предмет.");
  if (!Number.isInteger(draft.id) || draft.id < 1 || draft.id > 99) {
    errors.push("Номер лабораторной — целое число от 1 до 99.");
  } else if (subject?.labs.some((lab) => Number(lab.id) === draft.id)) {
    errors.push(`Лабораторная ${pad2(draft.id)} уже есть в этом предмете.`);
  }
  if (!draft.title.trim()) errors.push("Введи название лабораторной.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.push("Укажи дату.");
  if (!STATUSES.some((s) => s.value === draft.status)) {
    errors.push("Выбери статус.");
  }

  if (draft.report && !REPORT_EXT.includes(extensionOf(draft.report.name))) {
    errors.push("Отчёт должен быть .docx, .doc или .pdf.");
  }
  if (draft.archive && extensionOf(draft.archive.name) !== ".zip") {
    errors.push("Архив проекта должен быть .zip.");
  }
  for (const shot of draft.screenshots) {
    if (!IMAGE_EXT.includes(extensionOf(shot.name))) {
      errors.push(`Скриншот «${shot.name}» не является изображением.`);
    }
  }

  const all = [
    draft.report,
    draft.archive,
    ...draft.codeFiles.map((c) => c.file),
    ...draft.screenshots,
  ].filter(Boolean);
  for (const file of all) {
    if (file.size > MAX_FILE_BYTES) {
      errors.push(
        `Файл «${file.name}» весит ${formatSize(file.size)} — лимит ${formatSize(MAX_FILE_BYTES)}.`,
      );
    }
  }
  const total = all.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    errors.push(
      `Все файлы вместе весят ${formatSize(total)} — лимит ${formatSize(MAX_TOTAL_BYTES)}. Загрузи часть позже.`,
    );
  }

  try {
    planFiles(draft);
  } catch (error) {
    errors.push(error.message);
  }
  return errors;
}

/** Карта «путь в репозитории → File». Дубликаты имён — ошибка. */
export function planFiles(draft) {
  const base = labFolder(draft.subjectId, draft.id);
  const planned = new Map();
  const add = (relative, file) => {
    const path = `${base}/${relative}`;
    if (planned.has(path)) throw new Error(`Файл повторяется: ${relative}`);
    planned.set(path, file);
  };

  if (draft.report) add(sanitizeFileName(draft.report.name), draft.report);
  if (draft.archive) add("project.zip", draft.archive);
  for (const { path, file } of draft.codeFiles) add(`code/${path}`, file);
  for (const shot of draft.screenshots) {
    add(`screenshots/${sanitizeFileName(shot.name)}`, shot);
  }
  return planned;
}

const naturalOrder = new Intl.Collator("ru", { numeric: true });

/** Запись лабораторной в том же формате, что и остальные в subjects.json. */
export function buildLabEntry(draft, planned) {
  const base = labFolder(draft.subjectId, draft.id);
  const paths = [...planned.keys()];
  const codePaths = paths.filter((p) => p.startsWith(`${base}/code/`));

  return {
    id: draft.id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    date: draft.date,
    status: draft.status,
    tags: draft.tags,
    report: draft.report
      ? `${base}/${sanitizeFileName(draft.report.name)}`
      : "",
    archive: draft.archive ? `${base}/project.zip` : "",
    // !один файл — путь к файлу, несколько — путь к папке (как в lab.js)
    code:
      codePaths.length === 0
        ? []
        : codePaths.length === 1
          ? codePaths
          : [`${base}/code/`],
    screenshots: paths
      .filter((p) => p.startsWith(`${base}/screenshots/`))
      .sort(naturalOrder.compare),
  };
}

/** Добавляет лабораторную в разобранный subjects.json. Мутирует и возвращает data. */
export function mergeLab(data, subjectId, entry) {
  const subject = data.subjects?.find((s) => s.id === subjectId);
  if (!subject)
    throw new Error(`Предмет «${subjectId}» не найден в subjects.json.`);
  if (subject.labs.some((lab) => Number(lab.id) === entry.id)) {
    const error = new Error(
      `Лабораторная ${pad2(entry.id)} уже записана в subjects.json.`,
    );
    error.code = "EXISTS";
    throw error;
  }
  subject.labs.push(entry);
  subject.labs.sort((a, b) => Number(a.id) - Number(b.id));
  return data;
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// !Ищет парную закрывающую скобку, пропуская строки (скобки внутри "..." не считаются)
function findClosing(text, open) {
  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "[" || char === "{") depth += 1;
    else if (char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// !Вставляет запись в конец массива labs нужного предмета, не трогая остальной текст
function insertIntoText(text, subjectId, entry) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const indent = text.match(/\n([ \t]+)"/)?.[1] ?? "   ";

  const idMatch = new RegExp(`"id"\\s*:\\s*"${escapeRegExp(subjectId)}"`).exec(
    text,
  );
  if (!idMatch) return null;
  const labsKey = text.indexOf('"labs"', idMatch.index);
  const open = labsKey < 0 ? -1 : text.indexOf("[", labsKey);
  const close = open < 0 ? -1 : findClosing(text, open);
  if (close < 0) return null;

  const keyIndent = text.slice(text.lastIndexOf("\n", labsKey) + 1, labsKey);
  if (!/^[ \t]*$/.test(keyIndent)) return null;
  const objIndent = keyIndent + indent;
  const body = JSON.stringify(entry, null, indent).replace(
    /\n/g,
    eol + objIndent,
  );

  const inner = text.slice(open + 1, close);
  if (inner.trim() === "") {
    return `${text.slice(0, open + 1)}${eol}${objIndent}${body}${eol}${keyIndent}${text.slice(close)}`;
  }
  const lastEnd = open + 1 + inner.trimEnd().length;
  return `${text.slice(0, lastEnd)},${eol}${objIndent}${body}${text.slice(lastEnd)}`;
}

/**
 * Возвращает новый текст subjects.json с добавленной лабораторной.
 * Обычный случай — точечная вставка: в git-диффе только новые строки.
 * Если вставка невозможна (номер не последний, нестандартная вёрстка) —
 * файл пересобирается целиком в том же стиле (serializeLike).
 * Результат вставки всегда проверяется повторным разбором JSON.
 */
export function addLabToText(originalText, subjectId, entry) {
  const data = JSON.parse(originalText.replace(/^\uFEFF/, ""));
  mergeLab(data, subjectId, entry); // проверка предмета и дубликата номера
  const subject = data.subjects.find((s) => s.id === subjectId);

  if (subject.labs[subject.labs.length - 1] === entry) {
    const patched = insertIntoText(originalText, subjectId, entry);
    try {
      if (
        patched &&
        JSON.stringify(JSON.parse(patched.replace(/^\uFEFF/, ""))) ===
          JSON.stringify(data)
      ) {
        return patched;
      }
    } catch {
      // !вставка дала невалидный JSON — идём в запасной путь
    }
  }
  return serializeLike(originalText, data);
}

/**
 * Сериализует объект так же, как был оформлен исходный текст:
 * тот же отступ, переводы строк (CRLF/LF), BOM и перевод строки в конце.
 * Иначе git покажет «изменён весь файл».
 */
export function serializeLike(originalText, data) {
  const bom = originalText.startsWith("\uFEFF") ? "\uFEFF" : "";
  const eol = originalText.includes("\r\n") ? "\r\n" : "\n";
  const indent = originalText.match(/\n([ \t]+)"/)?.[1] ?? "   ";
  const body = JSON.stringify(data, null, indent).replace(/\n/g, eol);
  const tail = /\n\s*$/.test(originalText) ? eol : "";
  return bom + body + tail;
}

/* ---------- Редактирование существующей лабораторной ---------- */

/** Проверка формы редактирования: номер и предмет менять нельзя, файлы необязательны. */
export function validateEditDraft(draft, original) {
  const errors = [];
  if (!draft.title.trim()) errors.push("Введи название лабораторной.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.push("Укажи дату.");
  if (!STATUSES.some((s) => s.value === draft.status))
    errors.push("Выбери статус.");
  if (draft.report && !REPORT_EXT.includes(extensionOf(draft.report.name))) {
    errors.push("Отчёт должен быть .docx, .doc или .pdf.");
  }
  if (draft.archive && extensionOf(draft.archive.name) !== ".zip") {
    errors.push("Архив проекта должен быть .zip.");
  }
  for (const shot of draft.screenshots) {
    if (!IMAGE_EXT.includes(extensionOf(shot.name))) {
      errors.push(`Скриншот «${shot.name}» не является изображением.`);
    }
  }

  const all = [
    draft.report,
    draft.archive,
    ...draft.codeFiles.map((c) => c.file),
    ...draft.screenshots,
  ].filter(Boolean);
  for (const file of all) {
    if (file.size > MAX_FILE_BYTES) {
      errors.push(
        `Файл «${file.name}» весит ${formatSize(file.size)} — лимит ${formatSize(MAX_FILE_BYTES)}.`,
      );
    }
  }
  const total = all.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    errors.push(
      `Новые файлы вместе весят ${formatSize(total)} — лимит ${formatSize(MAX_TOTAL_BYTES)}. Загрузи часть позже.`,
    );
  }

  try {
    buildEditPlan(draft, original);
  } catch (error) {
    errors.push(error.message);
  }
  return errors;
}

/**
 * План правки: что загрузить, что удалить и какой будет запись в subjects.json.
 * existingPaths — файлы папки лабораторной в репозитории (нужны, чтобы заменить код целиком).
 */
export function buildEditPlan(draft, original, existingPaths = []) {
  const base = labFolder(draft.subjectId, draft.id);
  const upload = new Map();
  const remove = new Set();
  const put = (relative, file) => {
    const path = `${base}/${relative}`;
    if (upload.has(path)) throw new Error(`Файл повторяется: ${relative}`);
    upload.set(path, file);
    return path;
  };

  const entry = {
    ...original,
    title: draft.title.trim(),
    description: draft.description.trim(),
    date: draft.date,
    status: draft.status,
    tags: draft.tags,
  };

  // !Отчёт: новый заменяет старый (имя может отличаться — старый файл удаляем)
  if (draft.report) {
    const path = put(sanitizeFileName(draft.report.name), draft.report);
    if (original.report && original.report !== path)
      remove.add(original.report);
    entry.report = path;
  } else if (draft.removeReport && original.report) {
    remove.add(original.report);
    entry.report = "";
  }

  if (draft.archive) {
    const path = put("project.zip", draft.archive);
    if (original.archive && original.archive !== path)
      remove.add(original.archive);
    entry.archive = path;
  } else if (draft.removeArchive && original.archive) {
    remove.add(original.archive);
    entry.archive = "";
  }

  // !Код: новая загрузка заменяет папку code/ целиком, иначе остались бы «хвосты» старых файлов
  const oldCode = existingPaths.filter((p) => p.startsWith(`${base}/code/`));
  if (draft.codeFiles.length) {
    const paths = draft.codeFiles.map(({ path, file }) =>
      put(`code/${path}`, file),
    );
    oldCode.forEach((p) => remove.add(p));
    entry.code = paths.length === 1 ? paths : [`${base}/code/`];
  } else if (draft.removeCode && (original.code?.length || oldCode.length)) {
    oldCode.forEach((p) => remove.add(p));
    entry.code = [];
  }

  const oldShots = original.screenshots ?? [];
  const dropped = new Set(
    draft.removeScreenshots.filter((p) => oldShots.includes(p)),
  );
  dropped.forEach((p) => remove.add(p));
  const kept = oldShots.filter((p) => !dropped.has(p));
  const added = draft.screenshots.map((shot) =>
    put(`screenshots/${sanitizeFileName(shot.name)}`, shot),
  );
  const clash = added.find((p) => kept.includes(p));
  if (clash) {
    throw new Error(
      `Скриншот «${clash.split("/").pop()}» уже есть — отметь его на удаление или переименуй файл.`,
    );
  }
  entry.screenshots = [...kept, ...added].sort(naturalOrder.compare);

  // !Если путь и грузится, и удаляется — это перезапись, удалять нельзя
  for (const path of upload.keys()) remove.delete(path);

  const changed =
    upload.size > 0 ||
    remove.size > 0 ||
    JSON.stringify(entry) !== JSON.stringify(original);
  return { entry, upload, remove, changed };
}

/**
 * Заменяет запись одной лабораторной в тексте subjects.json, не трогая остальной текст:
 * в git-диффе меняется только эта запись. Если не получилось — пересборка в том же стиле.
 */
export function replaceLabInText(originalText, subjectId, entry) {
  const data = JSON.parse(originalText.replace(/^\uFEFF/, ""));
  const subject = data.subjects?.find((s) => s.id === subjectId);
  if (!subject)
    throw new Error(`Предмет «${subjectId}» не найден в subjects.json.`);
  const index = subject.labs.findIndex(
    (lab) => Number(lab.id) === Number(entry.id),
  );
  if (index < 0) {
    const error = new Error(
      `Лабораторная ${pad2(entry.id)} не найдена в subjects.json.`,
    );
    error.code = "MISSING";
    throw error;
  }
  subject.labs[index] = entry;

  const patched = patchLabText(originalText, subjectId, entry);
  try {
    if (
      patched &&
      JSON.stringify(JSON.parse(patched.replace(/^\uFEFF/, ""))) ===
        JSON.stringify(data)
    ) {
      return patched;
    }
  } catch {
    // !точечная замена дала невалидный JSON — идём в запасной путь
  }
  return serializeLike(originalText, data);
}

function patchLabText(text, subjectId, entry) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const indent = text.match(/\n([ \t]+)"/)?.[1] ?? "   ";

  const idMatch = new RegExp(`"id"\\s*:\\s*"${escapeRegExp(subjectId)}"`).exec(
    text,
  );
  if (!idMatch) return null;
  const labsKey = text.indexOf('"labs"', idMatch.index);
  const open = labsKey < 0 ? -1 : text.indexOf("[", labsKey);
  const close = open < 0 ? -1 : findClosing(text, open);
  if (close < 0) return null;

  const keyIndent = text.slice(text.lastIndexOf("\n", labsKey) + 1, labsKey);
  if (!/^[ \t]*$/.test(keyIndent)) return null;
  const objIndent = keyIndent + indent;

  // !Идём по объектам массива labs и ищем тот, у которого нужный id
  let cursor = open + 1;
  while (cursor < close) {
    const start = text.indexOf("{", cursor);
    if (start < 0 || start > close) return null;
    const end = findClosing(text, start);
    if (end < 0) return null;
    let lab;
    try {
      lab = JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
    if (Number(lab.id) === Number(entry.id)) {
      const body = JSON.stringify(entry, null, indent).replace(
        /\n/g,
        eol + objIndent,
      );
      return text.slice(0, start) + body + text.slice(end + 1);
    }
    cursor = end + 1;
  }
  return null;
}
