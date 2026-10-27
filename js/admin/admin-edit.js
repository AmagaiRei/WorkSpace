// ! Окно редактирования лабораторных. Открывается так же, как окно добавления:
// ! только горячей клавишей (Ctrl+Alt+E / Ctrl+Shift+E) и только с GitHub-токеном админа.
import {
  collectCodeFiles,
  parseTags,
  pad2,
  STATUSES,
  validateEditDraft,
} from "./admin-model.js";
import { publishEdit, verifyToken } from "./admin-github.js";
import * as tokenStore from "./admin-token.js";

let root;
let data;
let busy = false;

const $ = (selector) => root.querySelector(selector);
const esc = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const fileName = (path) => path.split("/").filter(Boolean).pop() ?? path;
const fileInput = (
  id,
  label,
  accept = "",
  multiple = false,
  directory = false,
) =>
  `<label class="ws-admin__field"><span>${label}</span><input id="${id}" type="file" ${accept ? `accept="${accept}"` : ""} ${multiple ? "multiple" : ""} ${directory ? "webkitdirectory directory" : ""}></label>`;

export const isOpen = () => Boolean(root?.isConnected);

function setMessage(message, kind = "") {
  const box = root?.querySelector("[data-message]");
  if (!box) return;
  box.textContent = message;
  box.dataset.kind = kind;
}

const currentSubject = () =>
  data.subjects.find((subject) => subject.id === $("#ws-subject").value);
const currentLab = () =>
  currentSubject()?.labs.find((lab) => String(lab.id) === $("#ws-lab").value);

function render() {
  const subjects = data.subjects
    .map(
      (subject) =>
        `<option value="${esc(subject.id)}">${esc(subject.title)}</option>`,
    )
    .join("");
  const statuses = STATUSES.map(
    (status) => `<option value="${status.value}">${status.label}</option>`,
  ).join("");
  root = document.createElement("section");
  root.className = "ws-admin";
  root.innerHTML = `
      <div class="ws-admin__backdrop" data-close></div>
      <section class="ws-admin__dialog" role="dialog" aria-modal="true" aria-labelledby="ws-admin-title">
         <header class="ws-admin__header"><div><p>WORKSPACE / ADMIN</p><h2 id="ws-admin-title">Редактирование лабораторной</h2></div><div class="ws-admin__header-actions"><button type="button" class="ws-admin__button ws-admin__button--quiet" data-switch>+ Добавить</button><button type="button" class="ws-admin__close" data-close aria-label="Закрыть">×</button></div></header>
         <div class="ws-admin__content">
            <details class="ws-admin__token" ${tokenStore.isUnlocked() ? "" : "open"}><summary>Доступ к GitHub</summary>
               <label class="ws-admin__field"><span>GitHub token</span><input id="ws-token" type="password" autocomplete="off" placeholder="github_pat_…"></label>
               <label class="ws-admin__field"><span>Парольная фраза для локального шифрования</span><input id="ws-passphrase" type="password" autocomplete="new-password" placeholder="Минимум 8 символов"></label>
               <div class="ws-admin__actions"><button type="button" class="ws-admin__button" id="ws-save-token">Проверить и сохранить</button><button type="button" class="ws-admin__button ws-admin__button--quiet" id="ws-unlock-token">Разблокировать сохранённый</button><button type="button" class="ws-admin__button ws-admin__button--quiet" id="ws-lock-token">Заблокировать</button></div>
               <p class="ws-admin__hint">Токен нужен с доступом Contents: Read and write. Он хранится в браузере только в зашифрованном виде.</p>
            </details>
            <form id="ws-lab-form">
               <div class="ws-admin__grid ws-admin__grid--even">
                  <label class="ws-admin__field"><span>Предмет</span><select id="ws-subject">${subjects}</select></label>
                  <label class="ws-admin__field"><span>Лабораторная</span><select id="ws-lab"></select></label>
               </div>
               <div id="ws-edit-body">
                  <label class="ws-admin__field"><span>Название</span><input id="ws-title" required maxlength="180"></label>
                  <label class="ws-admin__field"><span>Описание</span><textarea id="ws-description" rows="3"></textarea></label>
                  <div class="ws-admin__grid">
                     <label class="ws-admin__field"><span>Дата</span><input id="ws-date" type="date" required></label>
                     <label class="ws-admin__field"><span>Статус</span><select id="ws-status">${statuses}</select></label>
                  </div>
                  <label class="ws-admin__field"><span>Теги (через запятую)</span><input id="ws-tags" placeholder="SQL, PostgreSQL, JOIN"></label>
                  <div class="ws-edit__current" id="ws-current"></div>
                  <div class="ws-admin__files">
                     ${fileInput("ws-report", "Заменить отчёт (.docx, .doc, .pdf)", ".docx,.doc,.pdf")}
                     ${fileInput("ws-archive", "Заменить архив проекта (.zip)", ".zip")}
                     ${fileInput("ws-code", "Заменить код: файлы или папка", "", true, true)}
                     ${fileInput("ws-shots", "Добавить скриншоты", ".png,.jpg,.jpeg,.gif,.webp", true)}
                  </div>
                  <p class="ws-admin__hint">Пустые поля файлов не меняют ничего. Новый код полностью заменяет текущую папку code/. Лимит: до 25 МБ на файл и до 60 МБ суммарно. Сохранение создаёт один коммит.</p>
               </div>
               <p class="ws-admin__hint" id="ws-empty" hidden>В этом предмете пока нет лабораторных — сначала добавь её в окне добавления.</p>
               <div class="ws-admin__message" data-message role="status" aria-live="polite"></div>
               <div class="ws-admin__actions"><button class="ws-admin__button ws-admin__button--primary" id="ws-publish" type="submit">Сохранить в GitHub</button></div>
            </form>
         </div>
      </section>`;
  document.body.append(root);
  root
    .querySelectorAll("[data-close]")
    .forEach((button) => button.addEventListener("click", closeAdminPanel));
  $("[data-switch]").addEventListener("click", switchToAdd);
  $("#ws-subject").addEventListener("change", fillLabList);
  $("#ws-lab").addEventListener("change", fillForm);
  $("#ws-save-token").addEventListener("click", saveToken);
  $("#ws-unlock-token").addEventListener("click", unlockToken);
  $("#ws-lock-token").addEventListener("click", () => {
    tokenStore.lock();
    setMessage("Токен заблокирован в памяти вкладки.");
  });
  $("#ws-lab-form").addEventListener("submit", saveFromForm);
  fillLabList();
  (tokenStore.isUnlocked() ? $("#ws-lab") : $("#ws-token")).focus();
}

function fillLabList(keepId) {
  const labs = currentSubject()?.labs ?? [];
  $("#ws-lab").innerHTML = labs
    .map(
      (lab) =>
        `<option value="${esc(lab.id)}">${pad2(Number(lab.id))} — ${esc(lab.title)}</option>`,
    )
    .join("");
  if (typeof keepId === "number") $("#ws-lab").value = String(keepId);
  fillForm();
}

function currentFilesHtml(lab) {
  const link = (path) =>
    `<a href="${esc(encodeURI(path))}" target="_blank" rel="noopener">${esc(fileName(path))}</a>`;
  const remove = (id, text) =>
    `<label class="ws-edit__check"><input type="checkbox" id="${id}"> ${text}</label>`;
  const rows = [];
  rows.push(
    lab.report
      ? `<div class="ws-edit__row"><span>Отчёт: ${link(lab.report)}</span>${remove("ws-rm-report", "удалить")}</div>`
      : '<div class="ws-edit__row"><span>Отчёта нет</span></div>',
  );
  rows.push(
    lab.archive
      ? `<div class="ws-edit__row"><span>Архив: ${link(lab.archive)}</span>${remove("ws-rm-archive", "удалить")}</div>`
      : '<div class="ws-edit__row"><span>Архива нет</span></div>',
  );
  rows.push(
    lab.code?.length
      ? `<div class="ws-edit__row"><span>Код: ${lab.code.map(link).join(", ")}</span>${remove("ws-rm-code", "удалить весь код")}</div>`
      : '<div class="ws-edit__row"><span>Кода нет</span></div>',
  );
  const shots = (lab.screenshots ?? [])
    .map(
      (path) =>
        `<label class="ws-edit__shot" title="${esc(fileName(path))}"><img src="${esc(encodeURI(path))}" alt="" loading="lazy"><span><input type="checkbox" data-rm-shot value="${esc(path)}"> удалить</span></label>`,
    )
    .join("");
  rows.push(
    shots
      ? `<div class="ws-edit__shots">${shots}</div>`
      : '<div class="ws-edit__row"><span>Скриншотов нет</span></div>',
  );
  return `<p class="ws-edit__title">Текущие файлы</p>${rows.join("")}`;
}

function fillForm() {
  const lab = currentLab();
  $("#ws-edit-body").hidden = !lab;
  $("#ws-empty").hidden = Boolean(lab);
  $("#ws-publish").disabled = !lab;
  if (!lab) return;
  $("#ws-title").value = lab.title ?? "";
  $("#ws-description").value = lab.description ?? "";
  $("#ws-date").value = lab.date ?? "";
  $("#ws-status").value = lab.status ?? "todo";
  $("#ws-tags").value = (lab.tags ?? []).join(", ");
  $("#ws-current").innerHTML = currentFilesHtml(lab);
  for (const id of ["#ws-report", "#ws-archive", "#ws-code", "#ws-shots"])
    $(id).value = "";
}

async function saveToken() {
  const token = $("#ws-token").value.trim();
  const passphrase = $("#ws-passphrase").value;
  try {
    setMessage("Проверяю доступ к репозиторию…");
    await verifyToken(token, data?.repo);
    await tokenStore.save(token, passphrase);
    setMessage(
      "Доступ проверен. Токен сохранён в зашифрованном виде.",
      "success",
    );
  } catch (error) {
    setMessage(error.message || "Не удалось сохранить токен.", "error");
  }
}

async function unlockToken() {
  try {
    await tokenStore.unlock($("#ws-passphrase").value);
    setMessage(
      "Токен разблокирован до закрытия или перезагрузки вкладки.",
      "success",
    );
  } catch (error) {
    setMessage(error.message || "Не удалось разблокировать токен.", "error");
  }
}

async function saveFromForm(event) {
  event.preventDefault();
  if (busy) return;
  const subject = currentSubject();
  const lab = currentLab();
  if (!subject || !lab) return;
  const draft = {
    subjectId: subject.id,
    id: Number(lab.id),
    title: $("#ws-title").value,
    description: $("#ws-description").value,
    date: $("#ws-date").value,
    status: $("#ws-status").value,
    tags: parseTags($("#ws-tags").value),
    report: $("#ws-report").files[0] ?? null,
    archive: $("#ws-archive").files[0] ?? null,
    codeFiles: collectCodeFiles($("#ws-code").files).files,
    screenshots: [...$("#ws-shots").files],
    removeReport: $("#ws-rm-report")?.checked ?? false,
    removeArchive: $("#ws-rm-archive")?.checked ?? false,
    removeCode: $("#ws-rm-code")?.checked ?? false,
    removeScreenshots: [...root.querySelectorAll("[data-rm-shot]:checked")].map(
      (input) => input.value,
    ),
  };
  const errors = validateEditDraft(draft, lab);
  if (errors.length) {
    setMessage(errors.join(" "), "error");
    return;
  }
  if (!tokenStore.isUnlocked()) {
    setMessage("Сначала сохрани или разблокируй GitHub token.", "error");
    return;
  }
  busy = true;
  const button = $("#ws-publish");
  button.disabled = true;
  button.textContent = "Сохранение…";
  try {
    const result = await publishEdit({
      token: tokenStore.getToken(),
      repo: data.repo,
      draft,
      onProgress: (message) => setMessage(message),
    });
    const index = subject.labs.findIndex(
      (item) => Number(item.id) === draft.id,
    );
    subject.labs[index] = result.entry;
    fillLabList(draft.id);
    setMessage(
      `Готово! Загружено: ${result.uploaded}, удалено: ${result.removed}. Коммит: ${result.commitUrl}`,
      "success",
    );
  } catch (error) {
    setMessage(error.message || "Ошибка сохранения.", "error");
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = "Сохранить в GitHub";
  }
}

async function switchToAdd() {
  closeAdminPanel();
  if (isOpen()) return; // !закрытие отклонено (идёт сохранение)
  const panel = await import("./admin-panel.js");
  panel.toggleAdminPanel();
}

export async function toggleAdminPanel() {
  if (isOpen()) {
    closeAdminPanel();
    return;
  }
  try {
    const response = await fetch("data/subjects.json", { cache: "no-store" });
    if (!response.ok)
      throw new Error(
        "Не удалось загрузить data/subjects.json. Запусти сайт через локальный сервер.",
      );
    data = await response.json();
    render();
  } catch (error) {
    window.alert(error.message || "Не удалось открыть окно редактирования.");
  }
}

export function closeAdminPanel() {
  if (busy && !window.confirm("Сохранение ещё выполняется. Закрыть окно?"))
    return;
  root?.remove();
  root = null;
}
