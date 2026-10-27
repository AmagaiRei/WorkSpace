const TRIGGER_SELECTOR = "[data-readme]";
const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*! * @type {{root: HTMLElement, dialog: HTMLElement, title: HTMLElement, body: HTMLElement} | null} */
let modal = null;
let opener = null;
let controller = null;

class HttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

// ! Рендер: чистая часть, без работы с модалкой

/*! *
 * @param {string} markdown исходный текст
 * @param {URL} baseUrl адрес самого .md-файла, от него считаются относительные пути
 * @returns {DocumentFragment} безопасный фрагмент DOM
 */
export function renderMarkdown(markdown, baseUrl) {
  const { marked, DOMPurify } = window;
  if (!marked || !DOMPurify) {
    throw new Error("Не загружены библиотеки marked или DOMPurify.");
  }
  const rawHtml = marked.parse(markdown, { gfm: true, async: false });
  const fragment = DOMPurify.sanitize(rawHtml, { RETURN_DOM_FRAGMENT: true });
  rewriteUrls(fragment, baseUrl);
  return fragment;
}

function resolveUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

// ! Картинки и ссылки внутри .md пишутся относительно файла, а не страницы.//
function rewriteUrls(root, baseUrl) {
  root.querySelectorAll("img[src]").forEach((img) => {
    img.src = resolveUrl(img.getAttribute("src"), baseUrl);
    img.loading = "lazy";
  });

  root.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (href.startsWith("#")) return;

    link.href = resolveUrl(href, baseUrl);
    const target = new URL(link.href);
    const isExternal =
      /^https?:$/.test(target.protocol) && target.origin !== location.origin;
    if (isExternal) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });
}

export function highlightCode(root) {
  if (!window.hljs) return;
  root
    .querySelectorAll("pre code")
    .forEach((block) => window.hljs.highlightElement(block));
}

// ! Модальное окно

function ensureModal() {
  if (modal) return;

  const root = document.createElement("div");
  root.className = "md-modal";
  root.hidden = true;
  root.innerHTML = `
    <div class="md-modal__backdrop" data-md-close></div>
    <section class="md-modal__dialog" role="dialog" aria-modal="true"
             aria-labelledby="md-modal-title" tabindex="-1">
      <header class="md-modal__header">
        <h2 class="md-modal__title" id="md-modal-title"></h2>
        <button class="md-modal__close" type="button" aria-label="Закрыть" data-md-close>&times;</button>
      </header>
      <div class="md-modal__body" tabindex="0"></div>
    </section>`;
  document.body.append(root);

  modal = {
    root,
    dialog: root.querySelector(".md-modal__dialog"),
    title: root.querySelector(".md-modal__title"),
    body: root.querySelector(".md-modal__body"),
  };

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-md-close]")) closeModal();
  });
  document.addEventListener("keydown", onKeydown);
}

function setStatus(message, isError = false) {
  const status = document.createElement("p");
  status.className =
    "md-modal__status" + (isError ? " md-modal__status--error" : "");
  status.textContent = message;
  if (isError) status.setAttribute("role", "alert");
  modal.body.replaceChildren(status);
  modal.body.setAttribute("aria-busy", String(!isError));
}

function describeError(error, url) {
  if (error instanceof HttpError && error.status === 404) {
    return `Файл не найден: ${url}. Проверь путь и регистр букв в имени файла.`;
  }
  if (error instanceof HttpError) {
    return `Сервер ответил с ошибкой ${error.status} на запрос ${url}.`;
  }
  if (location.protocol === "file:") {
    return "Страница открыта как file://, и браузер блокирует загрузку файлов. Запусти локальный сервер (см. README).";
  }
  return error.message || "Не удалось загрузить файл.";
}

async function fetchText(url, signal) {
  const response = await fetch(url, { signal, cache: "no-cache" });
  if (!response.ok) throw new HttpError(response.status);
  return response.text();
}

/*! *
 * Открывает модалку и показывает Markdown-файл по адресу url.
 * @param {string} url
 * @param {{title?: string, opener?: Element}} [options]
 */
export async function openMarkdown(url, options = {}) {
  ensureModal();

  if (modal.root.hidden) {
    opener = options.opener ?? document.activeElement;
    modal.root.hidden = false;
    document.body.classList.add("md-modal-open");
    modal.dialog.focus();
  }

  const fileUrl = new URL(url, document.baseURI);
  modal.title.textContent = options.title || fileUrl.pathname.split("/").pop();
  setStatus("Загрузка…");

  controller?.abort(); // ?повторный клик не должен затирать новый ответ старым
  controller = new AbortController();

  try {
    const text = await fetchText(fileUrl, controller.signal);
    modal.body.replaceChildren(renderMarkdown(text, fileUrl));
    modal.body.removeAttribute("aria-busy");
    modal.body.scrollTop = 0;
    highlightCode(modal.body);
  } catch (error) {
    if (error.name === "AbortError") return;
    setStatus(describeError(error, url), true);
  }
}

export function closeModal() {
  if (!modal || modal.root.hidden) return;
  controller?.abort();
  modal.root.hidden = true;
  document.body.classList.remove("md-modal-open");
  opener?.focus?.();
  opener = null;
}

function onKeydown(event) {
  if (modal.root.hidden) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key !== "Tab") return;

  // !Фокус не должен уходить на страницу под модалкой.
  const items = [...modal.dialog.querySelectorAll(FOCUSABLE)];
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || active === modal.dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

// ! Подключение к странице

document.addEventListener("click", (event) => {
  const trigger = event.target.closest?.(TRIGGER_SELECTOR);
  if (!trigger) return;

  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey)
    return;

  const url = trigger.dataset.readme || trigger.getAttribute("href");
  if (!url) return;

  event.preventDefault();
  openMarkdown(url, { title: trigger.dataset.readmeTitle, opener: trigger });
});
