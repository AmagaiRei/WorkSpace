import { el } from "../utils/common.js";
import { highlightCode, renderMarkdown } from "./markdown-modal.js";
import {
  closeTab,
  countLines,
  extensionOf,
  formatSize,
  languageOf,
  plural,
  tabLabels,
  typeOf,
} from "../utils/tree.js";

const MAX_CODE_CHARS = 200_000;
const MAX_HIGHLIGHT_CHARS = 100_000;
const TOAST_MS = 2800;

function isTextFile(path) {
  return (
    /\.(?:sql|txt|md|markdown|rst|adoc|js|mjs|cjs|ts|mts|cts|tsx|jsx|html?|xhtml|css|scss|sass|less|json|jsonc|json5|ipynb|xml|xsd|xsl|xslt|ya?ml|toml|ini|cfg|conf|properties|env|gitignore|gitattributes|editorconfig|py|pyw|pyi|java|kt|kts|c|cc|cpp|cxx|h|hh|hpp|hxx|cs|csx|csproj|sln|props|targets|resx|vb|fs|fsx|go|rs|php|phtml|rb|swift|dart|scala|groovy|gradle|sh|bash|zsh|bat|cmd|ps1|psm1|log|csv|tsv|vue|svelte|graphql|gql|dockerignore|makefile|cmake|gradle|lock)$/i.test(
      path,
    ) ||
    /(?:^|\/)(?:dockerfile|makefile|cmakelists\.txt|\.gitignore|\.gitattributes|\.editorconfig|\.dockerignore|\.env(?:\.[^/]*)?)$/i.test(
      path,
    )
  );
}

const note = (text, kind = "info") =>
  el("p", {
    className: `fv-note fv-note--${kind}`,
    text,
    attrs: kind === "warn" ? { role: "alert" } : {},
  });

function describeFailure(error, path) {
  if (error.status === 404) {
    return `Файл не найден: ${path}. Проверь путь и регистр букв в имени файла.`;
  }
  if (error.status) {
    return `Сервер ответил ошибкой ${error.status} на запрос ${path}.`;
  }
  if (location.protocol === "file:") {
    return "Страница открыта как file://, и браузер блокирует загрузку файлов. Запусти сайт через Live Server.";
  }
  return `Не удалось загрузить файл: ${error.message}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // !Запасной путь для страниц без HTTPS: временное поле и execCommand
    const area = el("textarea", {
      text,
      attrs: { readonly: "", "aria-hidden": "true", tabindex: "-1" },
    });
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.append(area);
    area.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    area.remove();
    return copied;
  }
}

/* !---------- Просмотрщик: вкладки + панель на каждый открытый файл ---------- */

export function createFileViewer({ icon, onActivate, onMissing }) {
  const tabs = el("div", {
    className: "fv__tabs",
    attrs: { role: "tablist", "aria-label": "Открытые файлы" },
  });
  const panels = el("div", { className: "fv__panels" });
  const toast = el("div", {
    className: "fv-toast",
    attrs: { role: "status", "aria-live": "polite" },
  });
  const root = el(
    "section",
    { className: "fv", attrs: { hidden: "", "aria-label": "Просмотр файлов" } },
    tabs,
    panels,
    toast,
  );

  let openPaths = [];
  let activePath = null;
  let toastTimer = 0;
  let idCounter = 0;
  const files = new Map();
  const panelNodes = new Map();
  const ids = new Map();
  // !Кэши: содержимое и HEAD-ответ грузятся один раз, повторное открытие вкладки сети не касается.
  const texts = new Map();
  const probes = new Map();

  const idOf = (path) => {
    if (!ids.has(path)) ids.set(path, `fv-tab-${(idCounter += 1)}`);
    return ids.get(path);
  };

  function notify(message, kind = "ok") {
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => toast.classList.remove("is-visible"),
      TOAST_MS,
    );
  }

  function loadText(path) {
    if (!texts.has(path)) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);
      const request = fetch(path, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.status = response.status;
            throw error;
          }
          return (await response.text()).replace(/\r\n?/g, "\n");
        })
        .finally(() => window.clearTimeout(timeoutId));
      texts.set(path, request);
      request.catch(() => texts.delete(path));
    }
    return texts.get(path);
  }

  // !HEAD даёт размер и статус без скачивания файла; GitHub API для этого не нужен.
  function probe(path) {
    if (!probes.has(path)) {
      probes.set(
        path,
        fetch(path, { method: "HEAD" })
          .then((response) => {
            const length = Number(response.headers.get("content-length"));
            return {
              status: response.status,
              size: length > 0 ? length : null,
            };
          })
          .catch(() => ({ status: 0, size: null })),
      );
    }
    return probes.get(path);
  }

  function actionLinks(file, { open = true } = {}) {
    const download = el("a", {
      className: "fv-btn fv-btn--primary",
      text: "Скачать ↓",
      attrs: { href: file.path, download: file.name },
    });
    download.addEventListener("click", () =>
      notify(`Скачивание ${file.name} начато`),
    );
    const links = [download];
    if (open) {
      const openButton = el("button", {
        className: "fv-btn",
        text: "Открыть ↗",
        attrs: { type: "button" },
      });
      openButton.addEventListener("click", () => {
        // !Открываем пустую вкладку сразу, чтобы браузер не заблокировал её как всплывающее окно.
        const opened = window.open("about:blank", "_blank");
        if (!opened) {
          notify("Разреши всплывающие окна для открытия файла.");
          return;
        }
        opened.document.title = file.name;
        opened.document.body.style.cssText =
          "margin:0;padding:24px;background:#100b19;color:#f4efff;font:14px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere";
        opened.document.body.textContent = "Загрузка файла…";

        const showError = () => {
          if (!opened.closed)
            opened.document.body.textContent =
              "Не удалось открыть файл. Проверь подключение и попробуй ещё раз.";
        };

        if (isTextFile(file.path)) {
          loadText(file.path)
            .then((content) => {
              if (opened.closed) return;
              const heading = opened.document.createElement("h2");
              heading.textContent = file.name;
              heading.style.cssText =
                "font:600 18px system-ui,sans-serif;margin:0 0 18px";
              const pre = opened.document.createElement("pre");
              pre.textContent = content;
              pre.style.cssText =
                "white-space:pre-wrap;overflow-wrap:anywhere;margin:0";
              opened.document.body.replaceChildren(heading, pre);
            })
            .catch(showError);
          return;
        }

        // !Определяем MIME по расширению: некоторые серверы отдают все файлы как attachment/octet-stream.
        const mimeByExtension = {
          pdf: "application/pdf",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          webp: "image/webp",
          svg: "image/svg+xml",
          bmp: "image/bmp",
          ico: "image/x-icon",
          mp3: "audio/mpeg",
          wav: "audio/wav",
          ogg: "audio/ogg",
          mp4: "video/mp4",
          webm: "video/webm",
          mp4v: "video/mp4",
          txt: "text/plain",
          csv: "text/csv",
          html: "text/html",
          htm: "text/html",
          css: "text/css",
          js: "text/javascript",
          json: "application/json",
          xml: "application/xml",
          md: "text/markdown",
          svgz: "image/svg+xml",
          wasm: "application/wasm",
        };
        const extension = String(
          file.name.split(".").pop() || "",
        ).toLowerCase();
        fetch(file.path)
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.blob();
          })
          .then((blob) => {
            if (opened.closed) return;
            const inferredType = mimeByExtension[extension];
            const normalizedBlob = inferredType
              ? new Blob([blob], { type: inferredType })
              : blob;
            const objectUrl = URL.createObjectURL(normalizedBlob);
            opened.location.replace(objectUrl);
            // !Не отзываем URL слишком рано: встроенным просмотрщикам PDF и медиа может понадобиться больше времени.
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60_000);
          })
          .catch(showError);
      });
      links.push(openButton);
    }
    return links;
  }

  function markMissing(file, body, message) {
    body.replaceChildren(note(message, "warn"));
    onMissing?.(file.path);
  }

  /* !----- Текст и код ----- */

  function createSource(text, file) {
    const shown =
      text.length > MAX_CODE_CHARS ? text.slice(0, MAX_CODE_CHARS) : text;
    const lines = Math.max(1, countLines(shown));
    const gutter = el("span", {
      className: "fv-gutter",
      text: Array.from({ length: lines }, (_, i) => i + 1).join("\n"),
      attrs: { "aria-hidden": "true" },
    });
    const code = el("code", { text: shown });
    const language = languageOf(file.path);
    if (
      language &&
      shown.length <= MAX_HIGHLIGHT_CHARS &&
      window.hljs?.getLanguage(language)
    ) {
      code.className = `language-${language}`;
      try {
        window.hljs.highlightElement(code);
      } catch {
        code.textContent = shown;
      }
    }
    const view = el(
      "div",
      {
        className: "fv-code",
        attrs: {
          tabindex: "0",
          role: "region",
          "aria-label": `Исходный код ${file.name}`,
        },
      },
      gutter,
      el("pre", {}, code),
    );
    const source = el("div", { className: "fv-source" }, view);
    if (shown.length < text.length) {
      source.append(
        note(
          "Файл обрезан: показаны первые 200 000 символов. Остальное по кнопке «Открыть ↗».",
          "warn",
        ),
      );
    }
    return source;
  }

  function createMarkdownView(text, file) {
    try {
      const rendered = el("div", { className: "md-modal__body fv-md" });
      rendered.append(
        renderMarkdown(text, new URL(file.path, document.baseURI)),
      );
      highlightCode(rendered);
      return rendered;
    } catch (error) {
      notify(`Markdown не отрисован: ${error.message}`, "warn");
      return null;
    }
  }

  function createModeSwitch(onChange) {
    const buttons = [
      ["view", "Просмотр"],
      ["source", "Исходник"],
    ].map(([mode, text]) =>
      el("button", {
        className: "fv-btn fv-btn--seg",
        text,
        attrs: { type: "button", "data-mode": mode, "aria-pressed": "false" },
      }),
    );
    const group = el(
      "div",
      {
        className: "fv-seg",
        attrs: { role: "group", "aria-label": "Режим Markdown" },
      },
      ...buttons,
    );
    function set(mode) {
      for (const button of buttons) {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.mode === mode),
        );
      }
      onChange(mode);
    }
    group.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mode]");
      if (button) set(button.dataset.mode);
    });
    return { group, set };
  }

  function fillText(file, ui) {
    const type = typeOf(file.path);
    const copy = el("button", {
      className: "fv-btn",
      text: "📋 Копировать",
      attrs: { type: "button", disabled: "" },
    });
    ui.actions.append(copy, ...actionLinks(file));
    ui.body.append(note("Загрузка…"));

    loadText(file.path)
      .then((text) => {
        const lines = countLines(text);
        const bytes = new TextEncoder().encode(text).length;
        ui.meta.textContent = [
          type.label,
          `${lines} ${plural(lines, ["строка", "строки", "строк"])}`,
          formatSize(bytes),
        ].join(" · ");

        if (!text) {
          ui.body.replaceChildren(note("Файл пуст."));
          return;
        }

        copy.disabled = false;
        copy.addEventListener("click", async () => {
          const copied = await copyText(text);
          notify(
            copied
              ? `Содержимое ${file.name} скопировано`
              : "Не удалось скопировать: выдели текст и нажми Ctrl+C",
            copied ? "ok" : "warn",
          );
        });

        const source = createSource(text, file);
        const rendered =
          extensionOf(file.path) === "md"
            ? createMarkdownView(text, file)
            : null;
        ui.body.replaceChildren(source);

        if (rendered) {
          ui.body.append(rendered);
          const switcher = createModeSwitch((mode) => {
            rendered.hidden = mode !== "view";
            source.hidden = mode !== "source";
          });
          ui.actions.prepend(switcher.group);
          switcher.set("view");
        }
      })
      .catch((error) => {
        ui.body.replaceChildren(
          note(describeFailure(error, file.path), "warn"),
        );
        if (error.status === 404) onMissing?.(file.path);
      });
  }

  /* !----- Картинки, PDF, остальное ----- */

  function fillImage(file, ui) {
    const type = typeOf(file.path);
    const info = { dims: "", size: "" };
    const updateMeta = () =>
      (ui.meta.textContent = [type.label, info.dims, info.size]
        .filter(Boolean)
        .join(" · "));
    updateMeta();
    ui.actions.append(...actionLinks(file));

    const img = el("img", {
      attrs: { src: file.path, alt: file.name, decoding: "async" },
    });
    const frame = el("div", { className: "fv-image" }, img);
    ui.body.append(frame);

    img.addEventListener("load", () => {
      if (img.naturalWidth)
        info.dims = `${img.naturalWidth}×${img.naturalHeight}`;
      updateMeta();
    });
    img.addEventListener("error", () =>
      markMissing(
        file,
        ui.body,
        `Не удалось загрузить изображение ${file.name}. Проверь, что файл лежит по пути ${file.path}.`,
      ),
    );
    probe(file.path).then(({ size }) => {
      info.size = formatSize(size);
      updateMeta();
    });
  }

  async function fillPdf(file, ui) {
    ui.meta.textContent = "PDF";
    ui.actions.append(...actionLinks(file));
    ui.body.append(note("Загрузка…"));

    const { status, size } = await probe(file.path);
    if (status === 404) {
      markMissing(file, ui.body, describeFailure({ status }, file.path));
      return;
    }
    ui.meta.textContent = ["PDF", formatSize(size)].filter(Boolean).join(" · ");
    ui.body.replaceChildren(
      el("iframe", {
        className: "fv-pdf",
        attrs: { src: file.path, title: `PDF: ${file.name}` },
      }),
      note(
        "Если PDF не отображается (так бывает на телефонах), открой его кнопкой «Открыть ↗».",
      ),
    );
  }

  function fillInfo(file, ui) {
    const type = typeOf(file.path);
    ui.meta.textContent = type.label;

    const sizeValue = el("dd", { text: "определяется…" });
    const download = actionLinks(file, { open: false })[0];
    const card = el(
      "div",
      { className: "fv-info" },
      el("span", { className: "fv-info__badge" }, icon(type.icon, type.tone)),
      el(
        "div",
        { className: "fv-info__main" },
        el("p", { className: "fv-info__name", text: file.name }),
        el(
          "dl",
          { className: "fv-info__list" },
          el("dt", { text: "Тип" }),
          el("dd", { text: `${type.label} · ${type.kind}` }),
          el("dt", { text: "Размер" }),
          sizeValue,
          el("dt", { text: "Путь" }),
          el("dd", { text: file.shown }),
        ),
        el("p", {
          className: "fv-note",
          text: "Предпросмотр для этого формата недоступен. Файл скачивается только по кнопке.",
        }),
        download,
      ),
    );
    ui.body.append(card);

    probe(file.path).then(({ status, size }) => {
      if (status === 404) {
        markMissing(file, ui.body, describeFailure({ status }, file.path));
        return;
      }
      sizeValue.textContent = size ? formatSize(size) : "неизвестен";
    });
  }

  /* !----- Вкладки ----- */

  function createPanel(file) {
    const type = typeOf(file.path);
    const meta = el("span", { className: "fv__meta" });
    const actions = el("div", { className: "fv__actions" });
    const body = el("div", { className: "fv__body" });
    const panel = el(
      "div",
      {
        className: "fv-panel",
        attrs: {
          role: "tabpanel",
          id: `${idOf(file.path)}-panel`,
          "aria-labelledby": idOf(file.path),
          hidden: "",
        },
      },
      el(
        "div",
        { className: "fv__bar" },
        el("span", { className: "fv__path", text: file.shown }),
        meta,
        actions,
      ),
      body,
    );
    const ui = { meta, actions, body };
    if (type.preview === "image") fillImage(file, ui);
    else if (type.preview === "pdf") fillPdf(file, ui);
    else if (type.text) fillText(file, ui);
    else fillInfo(file, ui);
    return panel;
  }

  function renderTabs() {
    const labels = tabLabels(openPaths.map((path) => files.get(path).shown));
    tabs.replaceChildren(
      ...openPaths.map((path) => {
        const file = files.get(path);
        const type = typeOf(path);
        const isActive = path === activePath;
        const select = el(
          "button",
          {
            className: "fv-tab__select",
            attrs: {
              type: "button",
              role: "tab",
              id: idOf(path),
              "aria-selected": String(isActive),
              "aria-controls": `${idOf(path)}-panel`,
              "aria-keyshortcuts": "Delete",
              tabindex: isActive ? "0" : "-1",
              title: file.shown,
              "data-path": path,
            },
          },
          icon(type.icon, type.tone),
          el("span", {
            className: "fv-tab__label",
            text: labels.get(file.shown),
          }),
        );
        const close = el("button", {
          className: "fv-tab__close",
          text: "×",
          attrs: {
            type: "button",
            tabindex: "-1",
            "aria-label": `Закрыть вкладку ${file.name}`,
            "data-close": path,
          },
        });
        return el(
          "div",
          { className: isActive ? "fv-tab fv-tab--active" : "fv-tab" },
          select,
          close,
        );
      }),
    );
    const current = tabs.querySelector('[aria-selected="true"]')?.parentElement;
    if (!current) return;
    if (current.offsetLeft < tabs.scrollLeft) {
      tabs.scrollLeft = current.offsetLeft;
    } else if (
      current.offsetLeft + current.offsetWidth >
      tabs.scrollLeft + tabs.clientWidth
    ) {
      tabs.scrollLeft =
        current.offsetLeft + current.offsetWidth - tabs.clientWidth;
    }
  }

  function showActive() {
    root.hidden = activePath === null;
    for (const [path, panel] of panelNodes) panel.hidden = path !== activePath;
    if (activePath === null) return;
    if (!panelNodes.has(activePath)) {
      const panel = createPanel(files.get(activePath));
      panelNodes.set(activePath, panel);
      panels.append(panel);
      panel.hidden = false;
    }
  }

  function activate(path) {
    activePath = path;
    renderTabs();
    showActive();
    onActivate?.(path);
  }

  function focusActiveTab() {
    tabs.querySelector('[aria-selected="true"]')?.focus();
  }

  function closeFile(path, { refocus = false } = {}) {
    const next = closeTab(openPaths, path, activePath);
    openPaths = next.open;
    panelNodes.get(path)?.remove();
    panelNodes.delete(path);
    if (next.active === activePath && activePath !== null) {
      renderTabs();
    } else {
      activate(next.active);
    }
    if (refocus) focusActiveTab();
  }

  function open(file) {
    const entry = { shown: file.path, ...file };
    files.set(entry.path, entry);
    if (!openPaths.includes(entry.path)) openPaths = [...openPaths, entry.path];
    activate(entry.path);
    root.scrollIntoView({ block: "nearest" });
  }

  function onTabKeys(event) {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) return;
    const index = openPaths.indexOf(tab.dataset.path);
    const last = openPaths.length - 1;
    let target;
    if (event.key === "ArrowRight")
      target = openPaths[index === last ? 0 : index + 1];
    else if (event.key === "ArrowLeft")
      target = openPaths[index === 0 ? last : index - 1];
    else if (event.key === "Home") target = openPaths[0];
    else if (event.key === "End") target = openPaths[last];
    else if (event.key === "Delete") {
      event.preventDefault();
      closeFile(tab.dataset.path, { refocus: true });
      return;
    } else return;
    event.preventDefault();
    activate(target);
    focusActiveTab();
  }

  tabs.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close]");
    if (close) {
      closeFile(close.dataset.close);
      return;
    }
    const tab = event.target.closest('[role="tab"]');
    if (tab && tab.dataset.path !== activePath) activate(tab.dataset.path);
  });
  // !Средняя кнопка мыши закрывает вкладку, как в браузере и VS Code.
  tabs.addEventListener("mousedown", (event) => {
    if (event.button === 1) event.preventDefault();
  });
  tabs.addEventListener("auxclick", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (event.button === 1 && tab) {
      event.preventDefault();
      closeFile(tab.dataset.path);
    }
  });
  tabs.addEventListener("keydown", onTabKeys);

  return { root, open };
}
