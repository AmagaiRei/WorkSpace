// ============================================================
// Адаптивная загрузка ресурсов через Network Information API
// ============================================================
const ni =
   navigator.connection ||
   navigator.mozConnection ||
   navigator.webkitConnection ||
   {};

export const NETWORK_PROFILE = (() => {
   const {
      effectiveType = 'unknown',
      downlink = Infinity,
      saveData = false,
   } = ni;

   let profile;
   if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      profile = 'economy';
   } else if (effectiveType === '3g' || downlink < 1.5) {
      profile = 'limited';
   } else if (effectiveType === '4g' && downlink >= 5) {
      profile = 'rich';
   } else {
      profile = 'limited';
   }

   document.documentElement.classList.add(`net-${profile}`);

   return {
      profile,
      saveData: Boolean(saveData),
      downlink,
      effectiveType,
   };
})();

// Хелпер: ограничить параллелизм фоновых fetch'ов по профилю сети
export function maxConcurrencyByProfile(defaultConcurrency = 3) {
   if (NETWORK_PROFILE.profile === 'economy') return 1;
   if (NETWORK_PROFILE.profile === 'limited') return 2;
   return defaultConcurrency;
}

// Хелпер: нужно ли вообще отключать фоновую синхронизацию (README и т.п.)
export function isBackgroundSyncDisabled() {
   return NETWORK_PROFILE.profile === 'economy';
}
