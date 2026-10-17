// !Чистая логика проводника: никакого DOM, поэтому её легко проверить в Node.

export const fileName = (path) => path.split('/').pop();

export function extensionOf(path) {
   const name = fileName(path);
   return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
}

// !Фабрики описаний: text — файл можно показать на странице как текст.
const code = (icon, tone, label, desc) => ({
   icon,
   tone,
   label,
   kind: 'Код',
   desc,
   text: true,
});
const data = (label, desc) => ({
   icon: 'file',
   tone: 'text',
   label,
   kind: 'Данные',
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

export const FILE_TYPES = {
   sql: code('database', 'sql', 'SQL', 'SQL-скрипт для базы данных.'),
   py: code('code', 'script', 'Python', 'Скрипт на Python.'),
   js: code('code', 'script', 'JavaScript', 'Скрипт на JavaScript.'),
   ts: code('code', 'script', 'TypeScript', 'Скрипт на TypeScript.'),
   java: code('code', 'script', 'Java', 'Исходный код на Java.'),
   cs: code('code', 'script', 'C#', 'Исходный код на C#.'),
   cpp: code('code', 'script', 'C++', 'Исходный код на C++.'),
   c: code('code', 'script', 'C', 'Исходный код на C.'),
   php: code('code', 'script', 'PHP', 'Скрипт на PHP.'),
   sh: code('code', 'script', 'Shell', 'Скрипт для командной строки.'),
   bat: code('code', 'script', 'Batch', 'Командный файл Windows.'),
   ps1: code('code', 'script', 'PowerShell', 'Скрипт PowerShell.'),
   html: code('code', 'web', 'HTML', 'Разметка веб-страницы.'),
   css: code('code', 'web', 'CSS', 'Стили оформления.'),
   json: data('JSON', 'Данные в формате JSON.'),
   xml: data('XML', 'Структурированные данные в формате XML.'),
   yml: data('YAML', 'Файл настроек в формате YAML.'),
   yaml: data('YAML', 'Файл настроек в формате YAML.'),
   csv: data('CSV', 'Таблица с данными в текстовом виде.'),
   md: data('Markdown', 'Текстовое описание с разметкой.'),
   txt: data('TXT', 'Обычный текстовый файл.'),
   ini: data('INI', 'Файл настроек.'),
   log: data('LOG', 'Журнал выполнения.'),
   docx: binary('doc', 'doc', 'DOCX', 'Word', 'Документ Microsoft Word.'),
   pdf: binary('doc', 'doc', 'PDF', 'Документ', 'Документ PDF.'),
   zip: binary('archive', 'archive', 'ZIP', 'Архив', 'Архив с файлами проекта.'),
   png: binary('image', 'image', 'PNG', 'Изображение', 'Снимок экрана.'),
   jpg: binary('image', 'image', 'JPG', 'Изображение', 'Изображение.'),
   jpeg: binary('image', 'image', 'JPG', 'Изображение', 'Изображение.'),
   svg: binary('image', 'image', 'SVG', 'Изображение', 'Векторное изображение.'),
};

const DEFAULT_TYPE = binary('file', 'file', 'Файл', 'Файл', 'Файл проекта.');

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
   const dirs = paths.map((path) => path.split('/').slice(0, -1));
   let common = dirs[0];
   for (const parts of dirs.slice(1)) {
      let i = 0;
      while (i < common.length && common[i] === parts[i]) i++;
      common = common.slice(0, i);
   }
   return common.length ? `${common.join('/')}/` : '';
}

const createFolder = (name, path, parent) => ({
   name,
   path,
   parent,
   dirs: new Map(),
   files: [],
   // !details и row заполняет интерфейс, когда рисует дерево.
   details: null,
   row: null,
});

export function buildTree(paths) {
   const prefix = commonDirectory(paths);
   const rootName = prefix.split('/').filter(Boolean).pop() ?? 'project';
   const root = createFolder(rootName, prefix, null);

   for (const path of paths) {
      const parts = path.slice(prefix.length).split('/');
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
      folder.files.push({ name, path, folder, row: null });
   }
   return root;
}

const byName = (a, b) => a.name.localeCompare(b.name, 'ru', { numeric: true });

export const sortedDirs = (folder) => [...folder.dirs.values()].sort(byName);
export const sortedFiles = (folder) => [...folder.files].sort(byName);
