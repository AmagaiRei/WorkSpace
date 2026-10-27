/**
 * Adaptive Store — простое состояние профиля устройства/сети
 * Позволяет другим модулям читать профиль и подписываться на изменения
 */

let profile = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(profile);
}

export const adaptiveStore = {
  getProfile() {
    return profile;
  },

  setProfile(newProfile) {
    profile = { ...profile, ...newProfile };
    notify();
  },

  subscribe(fn) {
    listeners.add(fn);
    if (profile) fn(profile);
    return () => listeners.delete(fn);
  },
};

// Удобные селекторы для обратной совместимости
export function getNetworkProfile() {
  return profile?.netProfile || "limited";
}

export function getPerfProfile() {
  return profile?.perfProfile || "medium";
}

export function isReduceMotion() {
  return profile?.reducedMotion === true;
}

export function isLowBattery() {
  return profile?.lowBattery === true;
}

export function isHighContrast() {
  // Проверяем и класс на html, и профиль
  return (
    document.documentElement.classList.contains("high-contrast") ||
    profile?.highContrast === true
  );
}
