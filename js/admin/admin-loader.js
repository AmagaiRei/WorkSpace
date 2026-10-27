// ! Лёгкий загрузчик: слушает горячие клавиши и только тогда подгружает нужное окно.
// ! Обычные посетители не скачивают код админки вообще.
// ! Добавление: Ctrl+Alt+A. Редактирование: Ctrl+Alt+E.
// ! Вариант Ctrl+Shift+… тоже работает, но в части браузеров перехватывается самим браузером.

const PANELS = {
  add: () => import("./admin-panel.js"),
  edit: () => import("./admin-edit.js"),
};
const KEYS = { KeyA: "add", KeyE: "edit" };
const loaded = new Map();

function panelFor(event) {
  if (!(event.code in KEYS) || event.metaKey || event.repeat) return null;
  const ctrlAlt = event.ctrlKey && event.altKey && !event.shiftKey;
  const ctrlShift = event.ctrlKey && event.shiftKey && !event.altKey;
  return ctrlAlt || ctrlShift ? KEYS[event.code] : null;
}

async function load(kind) {
  if (!loaded.has(kind)) loaded.set(kind, await PANELS[kind]());
  return loaded.get(kind);
}

document.addEventListener("keydown", async (event) => {
  const kind = panelFor(event);
  if (!kind) return;
  event.preventDefault();
  try {
    // !два окна одновременно не держим: чужое закрываем перед открытием
    for (const [other, module] of loaded) {
      if (other !== kind && module.isOpen()) module.closeAdminPanel();
    }
    (await load(kind)).toggleAdminPanel();
  } catch (error) {
    console.error("Не удалось открыть админ-окно:", error);
  }
});
