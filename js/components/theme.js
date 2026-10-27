// !Управление темой — только тёмная. Подключать в <head> БЕЗ defer — тема применяется до отрисовки.
const THEME_KEY = "workspace-theme";

function applyDarkTheme() {
  document.documentElement.setAttribute("data-theme", "dark");
  // Скрываем кнопку переключения темы, если она есть в DOM
  const button = document.getElementById("theme-toggle");
  if (button) button.hidden = true;
}

// !Применяем тёмную тему сразу (без мигания)
applyDarkTheme();

// !Если DOM уже готов — скрываем toggle
if (document.readyState !== "loading") {
  const button = document.getElementById("theme-toggle");
  if (button) button.hidden = true;
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("theme-toggle");
    if (button) button.hidden = true;
  });
}
