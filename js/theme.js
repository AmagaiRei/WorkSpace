// !Управление темой. Подключать в <head> БЕЗ defer — тогда тема применяется до отрисовки страницы (нет «вспышки»).
const THEME_KEY = 'workspace-theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function readSavedTheme() {
   try {
      const value = localStorage.getItem(THEME_KEY);
      return value === 'dark' || value === 'light' ? value : null;
   } catch {
      return null; // !localStorage может быть недоступен (приватный режим, блокировка)
   }
}

function saveTheme(theme) {
   try {
      localStorage.setItem(THEME_KEY, theme);
   } catch {
      // !не критично: тема просто не запомнится
   }
}

function applyTheme(theme) {
   if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
   } else {
      document.documentElement.removeAttribute('data-theme');
   }
   updateToggle(theme);
}

function currentTheme() {
   return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
}

function updateToggle(theme) {
   const button = document.getElementById('theme-toggle');
   const icon = document.querySelector('.theme-toggle__icon');
   if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
   if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.setAttribute(
         'aria-label',
         theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему',
      );
   }
}

// !Плавная смена темы: браузер делает снимок старой страницы и растворяет его в новую (View Transitions API).
// !Градиенты фона нельзя анимировать обычным CSS transition, а так плавно меняется всё сразу.
// !Если API нет или включено «уменьшить анимацию» — тема меняется мгновенно.
function switchTheme(theme) {
   const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
   ).matches;
   if (!document.startViewTransition || reduceMotion) {
      applyTheme(theme);
      return;
   }
   document.startViewTransition(() => applyTheme(theme));
}

// !1. Применяем тему сразу. В localStorage НЕ пишем: выбор сохраняется только по клику пользователя.
applyTheme(readSavedTheme() ?? (darkQuery.matches ? 'dark' : 'light'));

// !2. Кнопку и иконку можно найти только после разбора DOM.
document.addEventListener('DOMContentLoaded', () => {
   updateToggle(currentTheme());
   document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      switchTheme(next);
   });
});

// !3. Пока пользователь не выбирал тему сам — следуем за настройкой ОС.
darkQuery.addEventListener('change', (event) => {
   if (readSavedTheme() === null) switchTheme(event.matches ? 'dark' : 'light');
});
