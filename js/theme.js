const THEME_KEY = 'workspace-theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function readSavedTheme() {
   try {
      const value = localStorage.getItem(THEME_KEY);
      return value === 'dark' || value === 'light' ? value : null;
   } catch {
      return null;
   }
}

function saveTheme(theme) {
   try {
      localStorage.setItem(THEME_KEY, theme);
   } catch {}
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

document.addEventListener('DOMContentLoaded', () => {
   updateToggle(currentTheme());
   document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      switchTheme(next);
   });
});

darkQuery.addEventListener('change', (event) => {
   if (readSavedTheme() === null) switchTheme(event.matches ? 'dark' : 'light');
});
