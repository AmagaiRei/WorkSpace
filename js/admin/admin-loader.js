//! Лёгкий загрузчик: слушает горячую клавишу и только тогда подгружает панель.
//! Обычные посетители не скачивают код админки вообще.
//! Ctrl+Alt+A (надёжно) или Ctrl+Shift+A (в части браузеров перехватывается самим браузером).

let panelModule = null;

function isHotkey(event) {
   if (event.code !== 'KeyA' || event.metaKey || event.repeat) return false;
   const ctrlAlt = event.ctrlKey && event.altKey && !event.shiftKey;
   const ctrlShift = event.ctrlKey && event.shiftKey && !event.altKey;
   return ctrlAlt || ctrlShift;
}

document.addEventListener('keydown', async (event) => {
   if (!isHotkey(event)) return;
   event.preventDefault();
   try {
      panelModule ??= await import('./admin-panel.js');
      panelModule.toggleAdminPanel();
   } catch (error) {
      console.error('Не удалось открыть админ-панель:', error);
   }
});
