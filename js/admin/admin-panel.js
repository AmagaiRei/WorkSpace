//! Админ-панель для публикации лабораторных прямо из браузера в GitHub.
import { collectCodeFiles, nextLabId, parseTags, todayIso, validateDraft } from './admin-model.js';
import { publishLab, verifyToken } from './admin-github.js';
import * as tokenStore from './admin-token.js';

let root;
let data;
let busy = false;

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fileInput = (id, label, accept = '', multiple = false, directory = false) => `<label class="ws-admin__field"><span>${label}</span><input id="${id}" type="file" ${accept ? `accept="${accept}"` : ''} ${multiple ? 'multiple' : ''} ${directory ? 'webkitdirectory directory' : ''}></label>`;

function setMessage(message, kind = '') {
   const box = root?.querySelector('[data-message]');
   if (!box) return;
   box.textContent = message;
   box.dataset.kind = kind;
}

function render() {
   const subjects = (data?.subjects ?? []).map((subject) => `<option value="${esc(subject.id)}">${esc(subject.title)}</option>`).join('');
   root = document.createElement('section');
   root.className = 'ws-admin';
   root.innerHTML = `
      <div class="ws-admin__backdrop" data-close></div>
      <section class="ws-admin__dialog" role="dialog" aria-modal="true" aria-labelledby="ws-admin-title">
         <header class="ws-admin__header"><div><p>WORKSPACE / ADMIN</p><h2 id="ws-admin-title">Публикация лабораторной</h2></div><button type="button" class="ws-admin__close" data-close aria-label="Закрыть">×</button></header>
         <div class="ws-admin__content">
            <details class="ws-admin__token" open><summary>Доступ к GitHub</summary>
               <label class="ws-admin__field"><span>GitHub token</span><input id="ws-token" type="password" autocomplete="off" placeholder="github_pat_…"></label>
               <label class="ws-admin__field"><span>Парольная фраза для локального шифрования</span><input id="ws-passphrase" type="password" autocomplete="new-password" placeholder="Минимум 8 символов"></label>
               <div class="ws-admin__actions"><button type="button" class="ws-admin__button" id="ws-save-token">Проверить и сохранить</button><button type="button" class="ws-admin__button ws-admin__button--quiet" id="ws-unlock-token">Разблокировать сохранённый</button><button type="button" class="ws-admin__button ws-admin__button--quiet" id="ws-lock-token">Заблокировать</button></div>
               <p class="ws-admin__hint">Токен нужен с доступом Contents: Read and write. Он хранится в браузере только в зашифрованном виде.</p>
            </details>
            <form id="ws-lab-form">
               <div class="ws-admin__grid">
                  <label class="ws-admin__field"><span>Предмет</span><select id="ws-subject" required>${subjects}</select></label>
                  <label class="ws-admin__field"><span>Номер лабораторной</span><input id="ws-id" type="number" min="1" max="99" required></label>
               </div>
               <label class="ws-admin__field"><span>Название</span><input id="ws-title" required maxlength="180" placeholder="Например, Работа с внешними ключами"></label>
               <label class="ws-admin__field"><span>Описание</span><textarea id="ws-description" rows="3" placeholder="Краткое описание работы"></textarea></label>
               <div class="ws-admin__grid">
                  <label class="ws-admin__field"><span>Дата</span><input id="ws-date" type="date" required value="${todayIso()}"></label>
                  <label class="ws-admin__field"><span>Статус</span><select id="ws-status"><option value="done">Сдано</option><option value="progress">В работе</option><option value="todo" selected>Не начато</option><option value="idea">Идея</option></select></label>
               </div>
               <label class="ws-admin__field"><span>Теги (через запятую)</span><input id="ws-tags" placeholder="SQL, PostgreSQL, JOIN"></label>
               <div class="ws-admin__files">
                  ${fileInput('ws-report', 'Отчёт (.docx, .doc, .pdf)', '.docx,.doc,.pdf')}
                  ${fileInput('ws-archive', 'Архив проекта (.zip)', '.zip')}
                  ${fileInput('ws-code', 'Файлы исходного кода или папка', '', true, true)}
                  ${fileInput('ws-shots', 'Скриншоты', '.png,.jpg,.jpeg,.gif,.webp', true)}
               </div>
               <p class="ws-admin__hint">Лимит: до 25 МБ на файл и до 60 МБ суммарно. Публикация создаёт коммит в репозитории.</p>
               <div class="ws-admin__message" data-message role="status" aria-live="polite"></div>
               <div class="ws-admin__actions"><button class="ws-admin__button ws-admin__button--primary" id="ws-publish" type="submit">Опубликовать в GitHub</button></div>
            </form>
         </div>
      </section>`;
   document.body.append(root);
   root.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', closeAdminPanel));
   root.querySelector('#ws-subject').addEventListener('change', updateNextId);
   root.querySelector('#ws-save-token').addEventListener('click', saveToken);
   root.querySelector('#ws-unlock-token').addEventListener('click', unlockToken);
   root.querySelector('#ws-lock-token').addEventListener('click', () => { tokenStore.lock(); setMessage('Токен заблокирован в памяти вкладки.'); });
   root.querySelector('#ws-lab-form').addEventListener('submit', publishFromForm);
   updateNextId();
   root.querySelector('#ws-token').focus();
}

function updateNextId() {
   const subject = data?.subjects?.find((item) => item.id === root.querySelector('#ws-subject').value);
   root.querySelector('#ws-id').value = nextLabId(subject);
}

async function saveToken() {
   const token = root.querySelector('#ws-token').value.trim();
   const passphrase = root.querySelector('#ws-passphrase').value;
   const repo = data?.repo;
   try {
      setMessage('Проверяю доступ к репозиторию…');
      await verifyToken(token, repo);
      await tokenStore.save(token, passphrase);
      setMessage('Доступ проверен. Токен сохранён в зашифрованном виде.', 'success');
   } catch (error) { setMessage(error.message || 'Не удалось сохранить токен.', 'error'); }
}

async function unlockToken() {
   try {
      await tokenStore.unlock(root.querySelector('#ws-passphrase').value);
      setMessage('Токен разблокирован до закрытия или перезагрузки вкладки.', 'success');
   } catch (error) { setMessage(error.message || 'Не удалось разблокировать токен.', 'error'); }
}

async function publishFromForm(event) {
   event.preventDefault();
   if (busy) return;
   const subjectId = root.querySelector('#ws-subject').value;
   const code = collectCodeFiles(root.querySelector('#ws-code').files);
   const draft = {
      subjectId,
      id: Number(root.querySelector('#ws-id').value),
      title: root.querySelector('#ws-title').value,
      description: root.querySelector('#ws-description').value,
      date: root.querySelector('#ws-date').value,
      status: root.querySelector('#ws-status').value,
      tags: parseTags(root.querySelector('#ws-tags').value),
      report: root.querySelector('#ws-report').files[0] ?? null,
      archive: root.querySelector('#ws-archive').files[0] ?? null,
      codeFiles: code.files,
      screenshots: [...root.querySelector('#ws-shots').files],
   };
   const errors = validateDraft(draft, data);
   if (errors.length) { setMessage(errors.join(' '), 'error'); return; }
   if (!tokenStore.isUnlocked()) { setMessage('Сначала сохрани или разблокируй GitHub token.', 'error'); return; }
   busy = true;
   const button = root.querySelector('#ws-publish');
   button.disabled = true;
   button.textContent = 'Публикация…';
   try {
      const result = await publishLab({ token: tokenStore.getToken(), repo: data.repo, draft, onProgress: (message) => setMessage(message) });
      setMessage(`Готово! Загружено файлов: ${result.fileCount}. Коммит: ${result.commitUrl}`, 'success');
      root.querySelector('#ws-lab-form').reset();
      root.querySelector('#ws-date').value = todayIso();
      updateNextId();
   } catch (error) { setMessage(error.message || 'Ошибка публикации.', 'error'); }
   finally { busy = false; button.disabled = false; button.textContent = 'Опубликовать в GitHub'; }
}

export async function toggleAdminPanel() {
   if (root?.isConnected) { closeAdminPanel(); return; }
   try {
      const response = await fetch('data/subjects.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Не удалось загрузить data/subjects.json. Запусти сайт через локальный сервер.');
      data = await response.json();
      render();
   } catch (error) { window.alert(error.message || 'Не удалось открыть админ-панель.'); }
}

function closeAdminPanel() {
   if (busy && !window.confirm('Публикация ещё выполняется. Закрыть панель?')) return;
   root?.remove();
   root = null;
}
