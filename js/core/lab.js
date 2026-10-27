import {
  loadData,
  el,
  statusBadge,
  formatDate,
  showError,
  renderContacts,
} from "../utils/common.js";
import { createFileViewer } from "../components/file-viewer.js";
import {
  buildTree,
  extensionOf,
  fileName,
  matchPaths,
  plural,
  sortedDirs,
  sortedFiles,
  typeOf,
} from "../utils/tree.js";

const API_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60_000;

// !Иконки - статичные SVG из этого файла. Данные из JSON сюда не попадают, поэтому innerHTML безопасен.
const FILE_PATH =
  '<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M14 3v5h5" />';

const ICONS = {
  chevron: '<path d="m9 6 6 6-6 6" />',
  folder:
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />',
  file: FILE_PATH,
  code: `${FILE_PATH}<path d="m10 13-2 2 2 2M14 13l2 2-2 2" />`,
  doc: `${FILE_PATH}<path d="M9 13h6M9 17h6" />`,
  database:
    '<ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />',
  archive:
    '<path d="M4 7h16v4H4z" /><path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M10 15h4" />',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" />',
};

function icon(name, tone) {
  const node = el("span", {
    className: tone ? `icon icon--${name} tone--${tone}` : `icon icon--${name}`,
    attrs: { "aria-hidden": "true" },
  });
  node.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${ICONS[name]}</svg>`;
  return node;
}

/* !---------- Карточки скачивания: отчёт и архив ---------- */

const REPORT_TYPES = {
  docx: {
    badge: "W",
    tone: "word",
    desc: "Документ Microsoft Word с материалами отчёта.",
    meta: "DOCX · Word",
    download: true,
  },
  pdf: {
    badge: "PDF",
    tone: "pdf",
    desc: "PDF-версия отчёта, откроется прямо в браузере.",
    meta: "PDF · Документ",
    download: false,
  },
};

const DEFAULT_REPORT = {
  badge: "FILE",
  tone: "file",
  desc: "Файл с материалами отчёта.",
  meta: "Отчёт",
  download: true,
};

const ARCHIVE = {
  badge: "ZIP",
  tone: "zip",
  desc: "Архив с исходниками и инструкцией для запуска на компьютере.",
  meta: "ZIP · Проект для VS Code",
  download: true,
};

function createDownloadCard(href, title, kind) {
  const attrs = kind.download
    ? { href, download: "" }
    : { href, target: "_blank", rel: "noopener" };
  return el(
    "a",
    { className: "file", attrs },
    el("span", {
      className: `file__badge file__badge--${kind.tone}`,
      text: kind.badge,
    }),
    el(
      "span",
      {},
      el("span", { className: "file__name", text: title }),
      el("span", { className: "file__desc", text: kind.desc }),
      el("span", { className: "file__meta", text: kind.meta }),
    ),
    el("span", {
      className: "file__action",
      text: kind.download ? "Скачать ↓" : "Открыть ↗",
    }),
  );
}

function renderDownloads(lab) {
  const cards = [];
  if (lab.report) {
    const kind = REPORT_TYPES[extensionOf(lab.report)] ?? DEFAULT_REPORT;
    cards.push(createDownloadCard(lab.report, "Отчёт лабораторной", kind));
  } else {
    cards.push(
      el("p", { className: "empty", text: "Отчёт пока не добавлен." }),
    );
  }
  if (lab.archive) {
    cards.push(createDownloadCard(lab.archive, "Скачать весь проект", ARCHIVE));
  }
  return el("div", { className: "downloads" }, ...cards);
}

/* !---------- Список файлов кода: явные пути + папки через GitHub API ---------- */

function readCachedPaths(key) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key));
    return cached && Date.now() - cached.time < CACHE_TTL_MS
      ? cached.paths
      : null;
  } catch {
    return null;
  }
}

function writeCachedPaths(key, paths) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ time: Date.now(), paths }));
  } catch {
    // !не критично: список просто не закэшируется
  }
}

let repoPathsPromise = null;

// !Одно обращение к API на страницу + короткий кэш: у GitHub лимит 60 запросов в час на IP.
function fetchRepoPaths(repo) {
  const { owner, name, branch = "main" } = repo;
  const key = `repoPaths:${owner}/${name}@${branch}`;
  const cached = readCachedPaths(key);
  if (cached) return Promise.resolve(cached);

  if (!repoPathsPromise) {
    const url = `https://api.github.com/repos/${owner}/${name}/git/trees/${branch}?recursive=1`;
    repoPathsPromise = fetch(url, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GitHub API ответил HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(({ tree }) => {
        const paths = tree
          .filter((item) => item.type === "blob")
          .map((item) => item.path);
        writeCachedPaths(key, paths);
        return paths;
      })
      .catch((error) => {
        repoPathsPromise = null;
        throw error;
      });
  }
  return repoPathsPromise;
}

async function listFolder(repo, folder) {
  if (!repo) throw new Error("в subjects.json нет блока repo");
  const paths = await fetchRepoPaths(repo);
  return paths.filter((path) => path.startsWith(folder));
}

// !Путь с «/» на конце - папка (список берём с GitHub), иначе - один файл.
async function collectCodeFiles(entries, repo) {
  const files = new Set();
  const problems = [];
  for (const entry of entries) {
    if (!entry.endsWith("/")) {
      files.add(entry);
      continue;
    }
    try {
      for (const path of await listFolder(repo, entry)) files.add(path);
    } catch (error) {
      problems.push(`${entry}: ${error.message}`);
    }
  }
  return { files: [...files].sort(), problems };
}

/* !---------- Проводник: дерево слева, карточки справа ---------- */

function createItem({ iconName, tone, name, meta, desc }, tag, attrs = {}) {
  return el(
    tag,
    {
      className: "item",
      attrs: tag === "button" ? { type: "button", ...attrs } : attrs,
    },
    el(
      "span",
      { className: `item__badge item__badge--${tone}` },
      icon(iconName),
    ),
    el(
      "span",
      {},
      el("span", { className: "item__name", text: name }),
      el("span", { className: "item__meta", text: meta }),
      el("span", { className: "item__desc", text: desc }),
    ),
  );
}

function createExplorer(root) {
  const crumbs = el("nav", {
    className: "explorer__path",
    attrs: { "aria-label": "Путь к папке" },
  });
  const grid = el("div", { className: "file-grid" });
  const start = el(
    "div",
    { className: "fv-start" },
    el("p", {
      className: "hint",
      text: "Выбери файл в дереве: он откроется во вкладке.",
    }),
    crumbs,
    grid,
  );
  const filesByPath = new Map();
  const folders = [];
  const viewer = createFileViewer({
    icon,
    onActivate: handleActivate,
    onMissing: handleMissing,
  });
  let currentFolder = root;
  let currentRow = null;
  let selectedPath = null;
  let savedOpen = null;

  function markCurrent(row) {
    currentRow?.removeAttribute("aria-current");
    row.setAttribute("aria-current", "true");
    currentRow = row;
  }

  function renderCrumbs(folder) {
    const chain = [];
    for (let node = folder; node; node = node.parent) chain.unshift(node);

    crumbs.replaceChildren(
      ...chain.map((node, index) => {
        if (index === chain.length - 1) {
          return el(
            "span",
            { className: "crumb" },
            el("span", {
              text: node.name,
              attrs: { "aria-current": "location" },
            }),
          );
        }
        const button = el("button", {
          text: node.name,
          attrs: { type: "button" },
        });
        button.addEventListener("click", () =>
          showFolder(node, { reveal: true }),
        );
        return el("span", { className: "crumb" }, button);
      }),
    );
  }

  function createFolderCard(folder) {
    const count = folder.dirs.size + folder.files.length;
    const card = createItem(
      {
        iconName: "folder",
        tone: "folder",
        name: folder.name,
        meta: `Папка · ${count} ${plural(count, ["элемент", "элемента", "элементов"])}`,
      },
      "button",
    );
    card.addEventListener("click", () => showFolder(folder, { reveal: true }));
    return card;
  }

  function createFileCard(file) {
    const type = typeOf(file.path);
    const card = createItem(
      {
        iconName: type.icon,
        tone: type.tone,
        name: file.name,
        meta: `${type.label} · ${type.kind}`,
        desc: type.desc,
      },
      "button",
    );
    card.addEventListener("click", () => openFile(file));
    return card;
  }

  function renderCards(folder) {
    const cards = [
      ...sortedDirs(folder).map(createFolderCard),
      ...sortedFiles(folder).map(createFileCard),
    ];
    grid.replaceChildren(
      ...(cards.length
        ? cards
        : [el("p", { className: "empty", text: "Папка пуста." })]),
    );
  }

  function showFolder(folder, { reveal = false } = {}) {
    if (reveal) {
      for (let node = folder; node; node = node.parent)
        node.details.open = true;
    }
    currentFolder = folder;
    // !Пока открыт файл, подсвечен он, а не папка.
    if (selectedPath === null) markCurrent(folder.row);
    renderCrumbs(folder);
    renderCards(folder);
  }

  function openFile(file) {
    viewer.open({
      path: file.path,
      name: file.name,
      shown: file.path.slice(root.path.length),
    });
    closeDrawer();
  }

  // !Вызывается просмотрщиком при смене вкладки: null - вкладок не осталось, возвращаем стартовое состояние.
  function handleActivate(path) {
    if (path === null) {
      selectedPath = null;
      start.hidden = false;
      showFolder(currentFolder);
      return;
    }
    const file = filesByPath.get(path);
    selectedPath = path;
    start.hidden = true;
    showFolder(file.folder, { reveal: true });
    markCurrent(file.row);
    file.row.scrollIntoView({ block: "nearest" });
  }

  function handleMissing(path) {
    const row = filesByPath.get(path)?.row;
    if (!row) return;
    row.classList.add("tree__row--missing");
    row.title = "Файл не найден на сервере";
  }

  function createTreeFile(file) {
    const type = typeOf(file.path);
    file.row = el(
      "button",
      { className: "tree__row", attrs: { type: "button" } },
      icon(type.icon, type.tone),
      el("span", { text: file.name }),
    );
    file.row.addEventListener("click", () => openFile(file));
    filesByPath.set(file.path, file);
    return file.row;
  }

  function createTreeFolder(folder, depth) {
    const list = el("ul", { className: "tree__list" });
    for (const child of sortedDirs(folder)) {
      list.append(createTreeFolder(child, depth + 1));
    }
    for (const file of sortedFiles(folder)) {
      file.item = el("li", {}, createTreeFile(file));
      list.append(file.item);
    }

    folder.row = el(
      "summary",
      { className: "tree__row" },
      icon("chevron"),
      icon("folder", "folder"),
      el("span", { text: folder.name }),
    );
    // !Раскрытие делает сам <details>; мы только показываем содержимое папки справа.
    folder.row.addEventListener("click", () => showFolder(folder));

    folder.details = el(
      "details",
      { className: "tree__folder" },
      folder.row,
      list,
    );
    folder.details.open = depth === 0;
    folder.item = el("li", {}, folder.details);
    folders.push(folder);
    return folder.item;
  }

  /* !----- Поиск по дереву: скрываем лишнее, а не перестраиваем дерево ----- */

  const searchInput = el("input", {
    className: "tree-search__input",
    attrs: {
      type: "search",
      placeholder: "Имя или .расширение",
      "aria-label": "Поиск по файлам проекта",
      autocomplete: "off",
      spellcheck: "false",
    },
  });
  const clearButton = el("button", {
    className: "tree-search__clear",
    text: "×",
    attrs: { type: "button", "aria-label": "Очистить поиск", hidden: "" },
  });
  const noMatch = el("p", {
    className: "tree__nomatch",
    attrs: { "aria-live": "polite" },
  });

  function applyFilter() {
    const visible = matchPaths([...filesByPath.keys()], searchInput.value);
    clearButton.hidden = !searchInput.value;
    if (visible && !savedOpen) {
      savedOpen = new Map(
        folders.map((folder) => [folder, folder.details.open]),
      );
    }
    for (const folder of folders) {
      const show = !visible || !folder.parent || visible.has(folder.path);
      folder.item.hidden = !show;
      if (visible && show) folder.details.open = true;
    }
    for (const [path, file] of filesByPath) {
      file.item.hidden = Boolean(visible) && !visible.has(path);
    }
    if (!visible && savedOpen) {
      for (const [folder, wasOpen] of savedOpen) folder.details.open = wasOpen;
      savedOpen = null;
    }
    noMatch.textContent =
      visible && visible.size === 0
        ? "Ничего не найдено. Попробуй другое имя или расширение, например .sql"
        : "";
  }

  function clearSearch() {
    searchInput.value = "";
    applyFilter();
  }

  searchInput.addEventListener("input", applyFilter);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchInput.value) {
      event.stopPropagation();
      clearSearch();
    }
  });
  clearButton.addEventListener("click", () => {
    clearSearch();
    searchInput.focus();
  });

  /* !----- Телефон: дерево выезжает отдельной панелью ----- */

  const backdrop = el("div", { className: "fv-backdrop" });
  const filesButton = el("button", {
    className: "fv-files-btn",
    text: "📁 Файлы",
    attrs: {
      type: "button",
      "aria-controls": "lab-sidebar",
      "aria-expanded": "false",
    },
  });
  const closeButton = el("button", {
    className: "lab-sidebar__close",
    text: "×",
    attrs: { type: "button", "aria-label": "Закрыть список файлов" },
  });
  const sidebar = el(
    "aside",
    {
      className: "lab-sidebar",
      attrs: { id: "lab-sidebar", "aria-label": "Файлы проекта" },
    },
    el(
      "div",
      { className: "lab-sidebar__head" },
      el("h2", { className: "lab-sidebar__title", text: "Файлы проекта" }),
      closeButton,
    ),
    el("div", { className: "tree-search" }, searchInput, clearButton),
    el(
      "div",
      { className: "tree" },
      el("ul", { className: "tree__list" }, createTreeFolder(root, 0)),
    ),
    noMatch,
  );

  function setDrawer(isOpen) {
    sidebar.classList.toggle("lab-sidebar--open", isOpen);
    backdrop.classList.toggle("is-open", isOpen);
    filesButton.setAttribute("aria-expanded", String(isOpen));
    // !Пока панель открыта, остальная страница недоступна ни мыши, ни клавиатуре.
    if (sidebar.nextElementSibling) sidebar.nextElementSibling.inert = isOpen;
    if (isOpen) searchInput.focus();
  }

  function closeDrawer(refocus = false) {
    if (!sidebar.classList.contains("lab-sidebar--open")) return;
    setDrawer(false);
    if (refocus) filesButton.focus();
  }

  filesButton.addEventListener("click", () => setDrawer(true));
  closeButton.addEventListener("click", () => closeDrawer(true));
  backdrop.addEventListener("click", () => closeDrawer(true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer(true);
  });
  window
    .matchMedia("(max-width: 800px)")
    .addEventListener("change", (event) => {
      if (!event.matches) closeDrawer();
    });

  showFolder(root);
  return { sidebar, backdrop, filesButton, start, viewer: viewer.root };
}

function renderCode(files, problems) {
  const title = el("h2", {
    className: "lab-panel__title",
    text: "Исходный код",
  });
  const notices = problems.map((problem) =>
    el("p", {
      className: "notice notice--error",
      text: `Не удалось получить список файлов (${problem}). Перечисли файлы в subjects.json вручную.`,
    }),
  );

  if (!files.length) {
    const empty = problems.length
      ? null
      : el("p", { className: "empty", text: "Файлов с кодом пока нет." });
    return {
      sidebar: null,
      backdrop: null,
      panel: el(
        "section",
        { className: "lab-panel lab-panel--code" },
        title,
        empty,
        ...notices,
      ),
    };
  }

  const explorer = createExplorer(buildTree(files));
  return {
    sidebar: explorer.sidebar,
    backdrop: explorer.backdrop,
    panel: el(
      "section",
      { className: "lab-panel lab-panel--code" },
      title,
      explorer.filesButton,
      explorer.start,
      explorer.viewer,
      ...notices,
    ),
  };
}

/* !---------- Скриншоты: миниатюры с увеличением ---------- */

function createScreenshot(path, index, dialog) {
  const img = el("img", {
    attrs: { src: path, alt: `Скриншот ${index + 1}`, loading: "lazy" },
  });
  const button = el(
    "button",
    {
      className: "shot",
      attrs: {
        type: "button",
        "aria-label": `Увеличить скриншот ${index + 1}`,
      },
    },
    img,
  );

  button.addEventListener("click", () => {
    const big = dialog.querySelector("img");
    big.src = path;
    big.alt = img.alt;
    dialog.showModal();
  });
  // !Битая картинка: вместо пустой рамки показываем понятную подпись
  img.addEventListener("error", () => {
    button.replaceWith(
      el("p", { className: "empty", text: `Нет файла: ${fileName(path)}` }),
    );
  });
  return button;
}

function renderScreenshots(lab) {
  const shots = lab.screenshots ?? [];
  const title = el("h2", { className: "lab-panel__title", text: "Скриншоты" });
  const panel = (...children) =>
    el(
      "section",
      { className: "lab-panel lab-panel--screenshots" },
      title,
      ...children,
    );

  if (!shots.length) {
    return panel(el("p", { className: "empty", text: "Скриншотов пока нет." }));
  }

  const closeButton = el("button", {
    className: "file-button",
    text: "Закрыть",
    attrs: { type: "button" },
  });
  const dialog = el(
    "dialog",
    { className: "lightbox" },
    el("img", { attrs: { alt: "" } }),
    closeButton,
  );
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close(); // !клик по тёмному фону закрывает окно
  });

  return panel(
    el(
      "div",
      { className: "gallery" },
      ...shots.map((path, i) => createScreenshot(path, i, dialog)),
    ),
    dialog,
  );
}

/* !---------- Сборка страницы ---------- */

function renderBreadcrumbs(nav, subject, lab) {
  const item = (content) =>
    el("li", { className: "breadcrumbs__item" }, content);
  const link = (text, href) =>
    el("a", { className: "breadcrumbs__link", text, attrs: { href } });

  nav.replaceChildren(
    el(
      "ol",
      { className: "breadcrumbs__list" },
      item(link("Главная", "index.html")),
      item(link(subject.title, `index.html#${encodeURIComponent(subject.id)}`)),
      item(
        el("span", {
          text: `${lab.id}) ${lab.title}`,
          attrs: { "aria-current": "page" },
        }),
      ),
    ),
  );
}

function renderHeader(head, subject, lab) {
  head.append(
    ...[
      el("p", { className: "page-head__subject", text: subject.title }),
      el("h1", {
        className: "page-head__title",
        text: `${lab.id}) ${lab.title}`,
      }),
      lab.description &&
        el("p", { className: "page-head__text", text: lab.description }),
      el(
        "p",
        { className: "lab-card__meta" },
        statusBadge(lab.status),
        el("span", { text: formatDate(lab.date) }),
      ),
    ].filter(Boolean),
  );
}

async function renderBody(lab, repo, body) {
  const { files, problems } = await collectCodeFiles(lab.code ?? [], repo);
  const code = renderCode(files, problems);

  const main = el(
    "div",
    { className: "lab-main" },
    renderDownloads(lab),
    code.panel,
    renderScreenshots(lab),
  );
  const layoutClass = code.sidebar
    ? "lab-layout"
    : "lab-layout lab-layout--single";

  body.replaceChildren(
    el(
      "section",
      { className: "lab-section lab-section--code" },
      el("div", { className: layoutClass }, code.backdrop, code.sidebar, main),
    ),
  );
}

async function init() {
  const head = document.getElementById("lab-head");
  const body = document.getElementById("lab-body");
  const params = new URLSearchParams(location.search);

  try {
    const data = await loadData();
    renderContacts(data.profile);

    const subject = data.subjects.find((s) => s.id === params.get("subject"));
    const lab = subject?.labs.find((l) => String(l.id) === params.get("lab"));
    if (!lab) {
      throw new Error(
        "Такой лабораторной нет. Вернись на главную и выбери её из списка.",
      );
    }

    document.title = `${lab.id}) ${lab.title} — ${subject.title}`;
    renderBreadcrumbs(document.getElementById("breadcrumbs"), subject, lab);
    renderHeader(head, subject, lab);
    await renderBody(lab, data.repo, body);
  } catch (error) {
    showError(body, error);
  }
}

init();

// !Service Worker регистрация для офлайн поддержки
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Зарегистрирован:", registration.scope);
      })
      .catch((error) => {
        console.warn("[SW] Ошибка регистрации:", error);
      });
  });
}
