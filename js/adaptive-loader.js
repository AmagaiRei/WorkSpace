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

   const mem = navigator.deviceMemory;
   const cores = navigator.hardwareConcurrency;
   let perf = 'low';
   if ((mem && mem >= 8) || (cores && cores >= 8)) perf = 'high';
   else if ((mem && mem >= 4) || (cores && cores >= 4)) perf = 'medium';
   document.documentElement.classList.add(`perf-${perf}`);

   return {
      profile,
      saveData: Boolean(saveData),
      downlink,
      effectiveType,
      perf,
   };
})();

export function maxConcurrencyByProfile(defaultConcurrency = 3) {
   const p = NETWORK_PROFILE.profile;
   if (p === 'economy') return 1;
   if (p === 'limited') return 2;
   return defaultConcurrency;
}

export function isBackgroundSyncDisabled() {
   return NETWORK_PROFILE.profile === 'economy';
}
