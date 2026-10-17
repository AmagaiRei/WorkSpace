import { el } from './common.js';

const STATUS_ITEMS = [
   { key: 'total', label: 'Всего работ', icon: '▦', className: 'total' },
   { key: 'done', label: 'Сдано', icon: '✓', className: 'done' },
   { key: 'progress', label: 'В работе', icon: '↗', className: 'progress' },
   { key: 'todo', label: 'Не начато', icon: '○', className: 'todo' },
];

const prefersReducedMotion = window.matchMedia(
   '(prefers-reduced-motion: reduce), (hover: none), (max-width: 760px)',
);

function pluralizeWork(count) {
   const remainder100 = count % 100;
   if (remainder100 >= 11 && remainder100 <= 14) return 'работ';
   const remainder10 = count % 10;
   if (remainder10 === 1) return 'работу';
   if (remainder10 >= 2 && remainder10 <= 4) return 'работы';
   return 'работ';
}

export function calculateStatistics(subjects) {
   const labs = (subjects ?? []).flatMap((subject) => subject.labs ?? []);
   const stats = {
      total: labs.length,
      done: 0,
      progress: 0,
      todo: 0,
   };

   for (const lab of labs) {
      if (lab.status === 'done') stats.done += 1;
      else if (lab.status === 'progress') stats.progress += 1;
      else stats.todo += 1;
   }

   stats.percent = stats.total
      ? Math.round((stats.done / stats.total) * 100)
      : 0;
   stats.remaining = stats.total - stats.done;

   return stats;
}

function createKpiCard({ key, label, icon, className }, value) {
   return el(
      'article',
      {
         className: `dashboard__kpi dashboard__kpi--${className}`,
         attrs: { 'aria-label': `${label}: ${value}` },
      },
      el('span', { className: 'dashboard__kpi-icon', text: icon, attrs: { 'aria-hidden': 'true' } }),
      el('span', { className: 'dashboard__kpi-label', text: label }),
      el('strong', {
         className: 'dashboard__kpi-value',
         text: String(value),
         attrs: { 'data-kpi-value': key },
      }),
   );
}

function animateNumber(element, target, duration = 1100) {
   if (prefersReducedMotion.matches || target === 0) {
      element.textContent = String(target);
      return;
   }

   const startTime = performance.now();
   const frame = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      element.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(frame);
   };

   requestAnimationFrame(frame);
}

function createProgress(stats) {
   const fill = el('span', { className: 'dashboard__bar-fill' });
   const track = el(
      'div',
      {
         className: 'dashboard__bar-track',
         attrs: {
            role: 'progressbar',
            'aria-label': 'Общий прогресс лабораторных',
            'aria-valuemin': '0',
            'aria-valuemax': '100',
            'aria-valuenow': String(stats.percent),
         },
      },
      fill,
   );
   const percent = el('strong', {
      className: 'dashboard__percent',
      text: prefersReducedMotion.matches ? `${stats.percent}%` : '0%',
      attrs: { 'data-dashboard-percent': '' },
   });

   return { track, fill, percent };
}

function getHint(stats) {
   if (stats.total === 0) return 'Пока нет лабораторных — добавь работы, чтобы отслеживать прогресс.';
   if (stats.remaining === 0) return 'Всё сдано — можно отдыхать! ✨';

   const hint = `Осталось доработать ${stats.remaining} ${pluralizeWork(stats.remaining)}`;
   if (stats.progress > 0) {
      return `${hint}. Сейчас в работе: ${stats.progress}.`;
   }
   return `${hint}. Маленькими шагами к большой цели!`;
}

export function renderDashboard(subjects, container = document.getElementById('dashboard')) {
   if (!container) return;

   const stats = calculateStatistics(subjects);
   const { track, fill, percent } = createProgress(stats);
   const kpis = STATUS_ITEMS.map((item) =>
      createKpiCard(item, stats[item.key]),
   );

   container.replaceChildren(
      el(
         'div',
         { className: 'dashboard__glass' },
         el(
            'div',
            { className: 'dashboard__heading' },
            el('div', {}, 
               el('p', { className: 'dashboard__eyebrow', text: 'ТВОЙ ПРОГРЕСС' }),
               el('h2', { className: 'dashboard__title', text: 'Всё под контролем' }),
            ),
            el('span', {
               className: 'dashboard__total-chip',
               text: `${stats.done} / ${stats.total}`,
               attrs: { 'aria-label': `${stats.done} из ${stats.total} сдано` },
            }),
         ),
         el('div', { className: 'dashboard__kpis' }, ...kpis),
         el(
            'div',
            { className: 'dashboard__progress-section' },
            el(
               'div',
               { className: 'dashboard__progress-heading' },
               el('span', { text: 'Общий прогресс' }),
               percent,
            ),
            track,
            el('p', { className: 'dashboard__hint', text: getHint(stats) }),
         ),
      ),
   );

   for (const item of STATUS_ITEMS) {
      const valueElement = container.querySelector(`[data-kpi-value="${item.key}"]`);
      animateNumber(valueElement, stats[item.key], 850);
   }

   if (prefersReducedMotion.matches) {
      fill.style.width = `${stats.percent}%`;
      return;
   }

   fill.style.width = '0%';
   requestAnimationFrame(() => {
      requestAnimationFrame(() => {
         fill.style.width = `${stats.percent}%`;
         percent.textContent = `${stats.percent}%`;
         const startedAt = performance.now();
         const duration = 1200;

         const animatePercent = (now) => {
            const progress = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - (1 - progress) ** 3;
            percent.textContent = `${Math.round(stats.percent * eased)}%`;
            if (progress < 1) requestAnimationFrame(animatePercent);
         };

         percent.textContent = '0%';
         requestAnimationFrame(animatePercent);
      });
   });
}
