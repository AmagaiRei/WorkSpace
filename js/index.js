import {
   loadData,
   el,
   statusBadge,
   formatDate,
   showError,
   renderContacts,
} from './common.js';
import { collectTags, filterSubjects, normalize } from './filters.js';
import {
   fetchLabsFromGitHub,
   clearGitHubCache,
   fetchLabReadme,
} from './github.js';
import { bindGitHubSync } from './github-sync.js';
import { renderDashboard } from './dashboard.js';

// !Состояние страницы: данные + то, что выбрал пользователь.
// !Экран всегда рисуется заново из этого состояния (функция render).
const state = { subjects: [], query: '', tag: null };
const openIds = new Set(); // !предметы, которые пользователь раскрыл сам

// !Синхронизация описаний с README.md на GitHub (progressive enhancement).
// !render() пересоздаёт весь DOM, поэтому данные README живут здесь, а не в узлах:
// !любая новая карточка при создании берёт текст из readmes.
const README_SYNC = {
   overrideTitle: true, // !заголовок из README заменяет title из subjects.json
   concurrency: 3, // !сколько README грузим одновременно (бережём лимит API)
};
const readmes = new Map(); // !ключ лабораторной -> { title, description }, только успешные
const readmePending = new Set(); // !ключи, чей README сейчас грузится
const labIndex = new Map(); // !ключ лабораторной -> { subjectId, lab }
let readmeSyncRunning = false;

const ui = {
   subjects: document.getElementById('subjects'),
   search: document.getElementById('search'),
   tags: document.getElementById('tag-filters'),
   reset: document.getElementById('filters-reset'),
   count: document.getElementById('results-count'),
};

function createTagPill({ key, label }) {
   return el('button', {
      className: 'tag-pill',
      text: label,
      attrs: { type: 'button', 'aria-pressed': 'false', 'data-tag': key },
   });
}

function createProgress({ percent }) {
   const bar = el('span', { className: 'progress__bar' });
   bar.style.width = `${percent}%`;
   const track = el(
      'span',
      {
         className: 'progress__track',
         attrs: {
            role: 'progressbar',
            'aria-label': 'Сдано лабораторных',
            'aria-valuemin': '0',
            'aria-valuemax': '100',
            'aria-valuenow': String(percent),
         },
      },
      bar,
   );
   return el(
      'span',
      { className: 'progress' },
      track,
      el('span', { className: 'progress__text', text: `${percent}%` }),
   );
}

// !Ключ лабораторной: уникален в пределах сайта (id повторяются между предметами)
const getLabKey = (subjectId, lab) => `${subjectId}/${lab.id}`;

// !Папка лабораторной в репозитории: data/labs/<subjectId>/lab-<NN>
const getLabPath = (subjectId, lab) =>
   `data/labs/${subjectId}/lab-${String(lab.id).padStart(2, '0')}`;

// !Итоговые тексты карточки: README важнее subjects.json, если он загрузился
function resolveLabTexts(key, lab) {
   const readme = readmes.get(key);
   const title =
      README_SYNC.overrideTitle && readme?.title ? readme.title : lab.title;
   const description = readme?.description || lab.description || '';
   return { title: `${lab.id}) ${title}`, description };
}

// !Карточка лабораторной: классы .card* берутся из style.css
function createLabCard(subjectId, lab) {
   const key = getLabKey(subjectId, lab);
   const { title, description } = resolveLabTexts(key, lab);

   const tags = lab.tags?.length
      ? el(
           'span',
           { className: 'card__tags' },
           ...lab.tags.map((tag) =>
              el('span', { className: 'card__tag', text: tag }),
           ),
        )
      : null;

   return el(
      'a',
      {
         className: readmePending.has(key) ? 'card card--loading' : 'card',
         attrs: {
            href: `lab.html?subject=${encodeURIComponent(subjectId)}&lab=${lab.id}`,
            'data-lab-key': key,
         },
      },
      el('span', { className: 'card__title', text: title }),
      // !Описание создаём всегда, даже пустое: в него потом придёт текст из README
      el('span', { className: 'card__text', text: description }),
      tags,
      el(
         'span',
         { className: 'card__meta' },
         statusBadge(lab.status),
         el('span', { text: formatDate(lab.date) }),
      ),
   );
}

// !Точечно обновляет карточку, которая сейчас на экране. Страницу не перерисовываем.
// !Скрытые карточки (закрытый <details>) тоже в DOM, поэтому обновляются так же.
function patchLabCard(key) {
   const entry = labIndex.get(key);
   const card = ui.subjects.querySelector(
      `[data-lab-key="${CSS.escape(key)}"]`,
   );
   // !Карточки нет на экране (её скрыл фильтр): следующий render() возьмёт данные из readmes
   if (!entry || !card) return;

   const { title, description } = resolveLabTexts(key, entry.lab);
   card.querySelector('.card__title').textContent = title;
   card.querySelector('.card__text').textContent = description;
   card.classList.toggle('card--loading', readmePending.has(key));
}

// !Грузит README одной лабораторной. Исключения наружу не выпускает.
async function syncLab(key) {
   const { subjectId, lab } = labIndex.get(key);
   try {
      const data = await fetchLabReadme(getLabPath(subjectId, lab));
      // !found=false: README нет, папки нет в репозитории или API недоступен
      if (data.found) {
         readmes.set(key, { title: data.title, description: data.description });
      } else {
         readmes.delete(key); // !README пропал: возвращаемся к subjects.json
      }
   } catch (error) {
      console.warn(`Синхронизация README не удалась (${key}):`, error);
   } finally {
      readmePending.delete(key);
      patchLabCard(key); // !снимает индикатор загрузки в любом случае
   }
}

// !Фоновая синхронизация: N воркеров разбирают общую очередь
async function syncReadmes() {
   if (readmeSyncRunning) return;
   readmeSyncRunning = true;

   const queue = [...labIndex.keys()];
   for (const key of queue) {
      readmePending.add(key);
      patchLabCard(key);
   }

   const worker = async () => {
      while (queue.length) await syncLab(queue.shift());
   };
   try {
      await Promise.all(
         Array.from(
            { length: Math.min(README_SYNC.concurrency, queue.length) },
            worker,
         ),
      );
   } finally {
      readmeSyncRunning = false;
   }
}

function createSubject({ subject, labs, progress }, filtersActive) {
   const summaryText = progress.total
      ? `${progress.done} из ${progress.total} сдано`
      : 'Пока пусто';

   const content = labs.length
      ? el(
           'div',
           { className: 'grid' },
           ...labs.map((lab) => createLabCard(subject.id, lab)),
        )
      : el('p', {
           className: 'empty',
           text: 'Лабораторных пока нет',
        });

   const details = el(
      'details',
      { className: 'subject', attrs: { id: subject.id } },
      el(
         'summary',
         { className: 'subject__summary' },
         el('span', { className: 'subject__title', text: subject.title }),
         el('span', { className: 'subject__count', text: summaryText }),
         progress.total ? createProgress(progress) : null,
      ),
      el('div', { className: 'subject__content' }, content),
   );

   // !При поиске раскрывается всё найденное, иначе — то, что раскрыл пользователь
   details.open = filtersActive || openIds.has(subject.id);
   details.addEventListener('toggle', () => {
      if (filtersActive) return;
      if (details.open) openIds.add(subject.id);
      else openIds.delete(subject.id);
   });
   return details;
}

function render() {
   const filtersActive = normalize(state.query) !== '' || state.tag !== null;
   const results = filterSubjects(state.subjects, state);

   ui.subjects.replaceChildren(
      ...results.map((entry) => createSubject(entry, filtersActive)),
   );
   if (results.length === 0) {
      ui.subjects.append(
         el('p', {
            className: 'empty',
            text: 'Ничего не найдено. Измени запрос или сбрось фильтры.',
         }),
      );
   }

   for (const pill of ui.tags.children) {
      pill.setAttribute('aria-pressed', String(pill.dataset.tag === state.tag));
   }
   ui.reset.hidden = !filtersActive;
   ui.count.textContent = filtersActive
      ? `Найдено предметов: ${results.length}`
      : '';
}

function bindEvents() {
   let searchTimer = 0;
   ui.search.addEventListener('input', () => {
      state.query = ui.search.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 90);
   });

   // !Один обработчик на весь контейнер (делегирование), а не по одному на каждую кнопку
   ui.tags.addEventListener('click', (event) => {
      const pill = event.target.closest('.tag-pill');
      if (!pill) return;
      state.tag = state.tag === pill.dataset.tag ? null : pill.dataset.tag; // !повторный клик снимает тег
      render();
   });

   ui.reset.addEventListener('click', () => {
      state.query = '';
      state.tag = null;
      ui.search.value = '';
      render();
   });
}

function renderLifeProject(project, container) {
   const hasLink = Boolean(project.link);
   container.replaceChildren(
      el(
         hasLink ? 'a' : 'div',
         {
            className: 'life-card',
            attrs: hasLink ? { href: project.link } : {},
         },
         el(
            'span',
            { className: 'life-card__status' },
            statusBadge(project.status),
         ),
         el('h3', { className: 'life-card__title', text: project.title }),
         el('p', { className: 'life-card__text', text: project.description }),
      ),
   );
}

async function init() {
   try {
      const data = await loadData();
      state.subjects = data.subjects;
      renderDashboard(state.subjects);
      for (const subject of state.subjects) {
         for (const lab of subject.labs ?? []) {
            labIndex.set(getLabKey(subject.id, lab), {
               subjectId: subject.id,
               lab,
            });
         }
      }

      // !Если в адресе есть #databases, этот предмет сразу раскрыт
      const hash = decodeURIComponent(location.hash.slice(1));
      if (state.subjects.some((subject) => subject.id === hash))
         openIds.add(hash);

      ui.tags.replaceChildren(
         ...collectTags(state.subjects).map(createTagPill),
      );
      bindEvents();
      bindGitHubSync();
      render();
      document.getElementById(hash)?.scrollIntoView();

      renderLifeProject(
         data.lifeProject,
         document.getElementById('life-project'),
      );
      renderContacts(data.profile);

      // !Без await: страница уже нарисована из subjects.json, README подтянутся в фоне
      syncReadmes();
      // !Кнопка 🔄: github-sync.js сначала чистит кэш (до своего первого await),
      // !затем этот обработчик заново тянет README. Порядок = порядок подписки.
      document
         .getElementById('github-sync')
         ?.addEventListener('click', syncReadmes);
   } catch (error) {
      showError(ui.subjects, error);
   }
}

init();
