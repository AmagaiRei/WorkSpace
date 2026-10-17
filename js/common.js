// !Общие функции для index.html и lab.html

const DATA_URL = 'data/subjects.json';

const STATUS_LABELS = {
   done: 'Сдано',
   progress: 'В работе',
   todo: 'Не начато',
   idea: 'Идея',
};

export async function loadData() {
   const response = await fetch(DATA_URL, { cache: 'no-cache' });
   if (!response.ok) {
      throw new Error(
         `Не удалось загрузить ${DATA_URL} (HTTP ${response.status})`,
      );
   }
   return response.json();
}

// !Создаёт элемент. Текст всегда идёт через textContent — это защита от XSS.
export function el(tag, { className, text, attrs } = {}, ...children) {
   const node = document.createElement(tag);
   if (className) node.className = className;
   if (text !== undefined) node.textContent = text;
   if (attrs) {
      for (const [name, value] of Object.entries(attrs)) {
         node.setAttribute(name, value);
      }
   }
   node.append(...children.filter(Boolean));
   return node;
}

export function statusBadge(status) {
   return el('span', {
      className: `badge badge--${status}`,
      text: STATUS_LABELS[status] ?? status,
   });
}

export function formatDate(iso) {
   if (!iso) return 'Срок не назначен';
   return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
   });
}

export function showError(container, error) {
   container.replaceChildren(
      el(
         'div',
         { className: 'section section--tight' },
         el('p', { className: 'notice notice--error', text: error.message }),
         el('p', {
            className: 'notice',
            text: 'Если открываешь файл двойным кликом, браузер блокирует загрузку JSON. Запусти сайт через Live Server в VS Code или открой его на GitHub Pages.',
         }),
      ),
   );
}

export function renderContacts(profile) {
   const profileUrl = (value, base) => {
      if (!value) return null;
      if (/^https?:\/\//i.test(value)) return value;
      return `${base}${value.replace(/^@/, '')}`;
   };

   const links = {
      github: profileUrl(profile.github, 'https://github.com/'),
      telegram: profileUrl(profile.telegram, 'https://t.me/'),
      email: profile.email
         ? profile.email.startsWith('mailto:')
            ? profile.email
            : `mailto:${profile.email}`
         : null,
   };

   for (const anchor of document.querySelectorAll('[data-contact]')) {
      const contactType = anchor.dataset.contact;
      const href = links[contactType];

      if (href) {
         anchor.href = href;
         anchor.hidden = false;
      } else {
         anchor.hidden = true;
      }
   }
}
