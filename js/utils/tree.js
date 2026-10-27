// !Чистая логика проводника: никакого DOM, поэтому её легко проверить в Node.

export const fileName = (path) => path.split("/").pop();

export function extensionOf(path) {
  const name = fileName(path);
  return name.includes(".") ? name.split(".").pop().toLowerCase() : "";
}

// !Фабрики описаний: text — файл можно показать на странице как текст.
const code = (icon, tone, label, desc) => ({
  icon,
  tone,
  label,
  kind: "Код",
  desc,
  text: true,
});
const data = (label, desc) => ({
  icon: "file",
  tone: "text",
  label,
  kind: "Данные",
  desc,
  text: true,
});
const binary = (icon, tone, label, kind, desc) => ({
  icon,
  tone,
  label,
  kind,
  desc,
  text: false,
});
// !preview: что показать во вкладке для нетекстового файла (картинка или PDF прямо в браузере).
const image = (label, desc) => ({
  ...binary("image", "image", label, "Изображение", desc),
  preview: "image",
});

export const FILE_TYPES = {
  sql: code("database", "sql", "SQL", "SQL-скрипт для базы данных."),
  py: code("code", "script", "Python", "Скрипт на Python."),
  js: code("code", "script", "JavaScript", "Скрипт на JavaScript."),
  ts: code("code", "script", "TypeScript", "Скрипт на TypeScript."),
  java: code("code", "script", "Java", "Исходный код на Java."),
  cs: code("code", "script", "C#", "Исходный код на C#."),
  cpp: code("code", "script", "C++", "Исходный код на C++."),
  c: code("code", "script", "C", "Исходный код на C."),
  php: code("code", "script", "PHP", "Скрипт на PHP."),
  sh: code("code", "script", "Shell", "Скрипт для командной строки."),
  bat: code("code", "script", "Batch", "Командный файл Windows."),
  ps1: code("code", "script", "PowerShell", "Скрипт PowerShell."),
  html: code("code", "web", "HTML", "Разметка веб-страницы."),
  css: code("code", "web", "CSS", "Стили оформления."),
  json: data("JSON", "Данные в формате JSON."),
  xml: data("XML", "Структурированные данные в формате XML."),
  yml: data("YAML", "Файл настроек в формате YAML."),
  yaml: data("YAML", "Файл настроек в формате YAML."),
  csv: data("CSV", "Таблица с данными в текстовом виде."),
  csproj: data("CSPROJ", "Файл проекта .NET в формате XML."),
  resx: data("RESX", "Ресурсы приложения в формате XML."),
  toml: data("TOML", "Файл настроек в формате TOML."),
  h: code("code", "script", "C/C++ Header", "Заголовочный файл C/C++."),
  hpp: code("code", "script", "C++ Header", "Заголовочный файл C++."),
  mjs: code("code", "script", "JavaScript", "Модуль JavaScript."),
  jsx: code("code", "script", "JSX", "Компонент на JSX."),
  tsx: code("code", "script", "TSX", "Компонент на TSX."),
  scss: code("code", "web", "SCSS", "Стили оформления на SCSS."),
  md: data("Markdown", "Текстовое описание с разметкой."),
  txt: data("TXT", "Обычный текстовый файл."),
  ini: data("INI", "Файл настроек."),
  log: data("LOG", "Журнал выполнения."),
  docx: binary("doc", "doc", "DOCX", "Word", "Документ Microsoft Word."),
  pdf: {
    ...binary("doc", "doc", "PDF", "Документ", "Документ PDF."),
    preview: "pdf",
  },
  zip: binary("archive", "archive", "ZIP", "Архив", "Архив с файлами проекта."),
  png: image("PNG", "Снимок экрана."),
  jpg: image("JPG", "Изображение."),
  jpeg: image("JPG", "Изображение."),
  gif: image("GIF", "Изображение."),
  webp: image("WebP", "Изображение."),
  svg: image("SVG", "Векторное изображение."),
};

const DEFAULT_TYPE = binary("file", "file", "Файл", "Файл", "Файл проекта.");

export const typeOf = (path) => FILE_TYPES[extensionOf(path)] ?? DEFAULT_TYPE;

// !Склонение: 1 элемент, 2 элемента, 5 элементов.
export function plural(count, [one, few, many]) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// !Общая папка всех путей: её отрезаем, чтобы дерево начиналось с содержательной папки.
export function commonDirectory(paths) {
  const dirs = paths.map((path) => path.split("/").slice(0, -1));
  let common = dirs[0];
  for (const parts of dirs.slice(1)) {
    let i = 0;
    while (i < common.length && common[i] === parts[i]) i++;
    common = common.slice(0, i);
  }
  return common.length ? `${common.join("/")}/` : "";
}

const createFolder = (name, path, parent) => ({
  name,
  path,
  parent,
  dirs: new Map(),
  files: [],
  // !details, row и item заполняет интерфейс, когда рисует дерево.
  details: null,
  row: null,
  item: null,
});

export function buildTree(paths) {
  const prefix = commonDirectory(paths);
  const rootName = prefix.split("/").filter(Boolean).pop() ?? "project";
  const root = createFolder(rootName, prefix, null);

  for (const path of paths) {
    const parts = path.slice(prefix.length).split("/");
    const name = parts.pop();
    let folder = root;
    for (const part of parts) {
      if (!folder.dirs.has(part)) {
        folder.dirs.set(
          part,
          createFolder(part, `${folder.path}${part}/`, folder),
        );
      }
      folder = folder.dirs.get(part);
    }
    folder.files.push({ name, path, folder, row: null, item: null });
  }
  return root;
}

const byName = (a, b) => a.name.localeCompare(b.name, "ru", { numeric: true });

export const sortedDirs = (folder) => [...folder.dirs.values()].sort(byName);
export const sortedFiles = (folder) => [...folder.files].sort(byName);

// !Язык для Highlight.js. Только то, что есть в его «common»-сборке; остальное показываем без подсветки.
const LANGUAGES = {
  html: "xml",
  htm: "xml",
  xhtml: "xml",
  xml: "xml",
  xsd: "xml",
  xsl: "xml",
  xslt: "xml",
  csproj: "xml",
  fsproj: "xml",
  vbproj: "xml",
  props: "xml",
  targets: "xml",
  resx: "xml",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "typescript",
  json: "json",
  jsonc: "json",
  json5: "json",
  md: "markdown",
  markdown: "markdown",
  sql: "sql",
  py: "python",
  pyw: "python",
  pyi: "python",
  cs: "csharp",
  csx: "csharp",
  c: "c",
  h: "c",
  i: "c",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",
  java: "java",
  jar: "java",
  php: "php",
  phtml: "php",
  go: "go",
  rs: "rust",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  rb: "ruby",
  dart: "dart",
  scala: "scala",
  groovy: "groovy",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  yaml: "yaml",
  ini: "ini",
  toml: "toml",
  cfg: "ini",
  conf: "ini",
  properties: "properties",
  vue: "xml",
  svelte: "xml",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
  makefile: "makefile",
};

export const languageOf = (path) => LANGUAGES[extensionOf(path)] ?? "";

export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} Б`;
  const units = ["КБ", "МБ", "ГБ"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0).replace(".", ",")} ${units[unit]}`;
}

// !Последний перевод строки не создаёт лишнюю пустую строку.
export function countLines(text) {
  if (!text) return 0;
  return text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

// !Поиск: «cs» ищет в имени, «.cs» — только по расширению. Возвращает Set путей файлов и всех их папок (с «/» на конце), либо null, если запрос пуст.
export function matchPaths(paths, query) {
  const q = query.trim().toLowerCase();
  const byExtension = q.startsWith(".");
  const wanted = byExtension ? q.slice(1) : q;
  if (!wanted) return null;

  const visible = new Set();
  for (const path of paths) {
    const hit = byExtension
      ? extensionOf(path) === wanted
      : fileName(path).toLowerCase().includes(wanted);
    if (!hit) continue;
    visible.add(path);
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i += 1) {
      visible.add(`${parts.slice(0, i).join("/")}/`);
    }
  }
  return visible;
}

// !Закрытие вкладки: активной становится соседняя справа, иначе слева, иначе никакая.
export function closeTab(open, path, active) {
  const index = open.indexOf(path);
  if (index === -1) return { open, active };
  const rest = open.filter((item) => item !== path);
  if (active !== path) return { open: rest, active };
  return { open: rest, active: rest[index] ?? rest[index - 1] ?? null };
}

// !Одинаковые имена в разных папках различаем родительской папкой: «src/main.js» и «tests/main.js».
export function tabLabels(paths) {
  const counts = new Map();
  for (const path of paths) {
    const name = fileName(path);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return new Map(
    paths.map((path) => {
      const name = fileName(path);
      if (counts.get(name) === 1) return [path, name];
      const parent = path.split("/").slice(-2, -1)[0];
      return [path, parent ? `${parent}/${name}` : name];
    }),
  );
}
