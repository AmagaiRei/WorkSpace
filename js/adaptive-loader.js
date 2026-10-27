/**
 * Adaptive Loader — детект устройства/сети + установка классов на <html>
 * Запускается как можно раньше (module script в <head>)
 */
import { adaptiveStore } from "./adaptive-store.js";

// ---- Утилиты ----
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function addHtmlClass(...classes) {
  document.documentElement.classList.add(...classes);
}

function removeHtmlClass(...classes) {
  document.documentElement.classList.remove(...classes);
}

function setHtmlClasses(prefix, value) {
  // Удаляем старые классы с этим префиксом
  const existing = [...document.documentElement.classList].filter((c) =>
    c.startsWith(prefix),
  );
  if (existing.length) removeHtmlClass(...existing);
  if (value) addHtmlClass(`${prefix}${value}`);
}

// ---- 1. СЕТЬ (Network Information API) ----
function detectNetwork() {
  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    {};
  const {
    effectiveType = "unknown",
    downlink = Infinity,
    rtt = 0,
    saveData = false,
  } = conn;

  let netProfile = "unknown";
  if (saveData || effectiveType === "slow-2g" || effectiveType === "2g") {
    netProfile = "economy";
  } else if (effectiveType === "3g" || downlink < 1.5) {
    netProfile = "limited";
  } else if (effectiveType === "4g" && downlink >= 5) {
    netProfile = "rich";
  } else {
    netProfile = "limited";
  }

  setHtmlClasses("net-", netProfile);

  return {
    netProfile,
    saveData: Boolean(saveData),
    downlink,
    effectiveType,
    rtt,
  };
}

// ---- 2. УСТРОЙСТВО (память, ядра) ----
function detectDeviceBaseline() {
  const mem = navigator.deviceMemory; // GB, может быть undefined
  const cores = navigator.hardwareConcurrency; // логические ядра

  let score = 0;
  if (mem) score += Math.min(mem, 8) * 10; // до 80 баллов
  if (cores) score += Math.min(cores, 16) * 5; // до 80 баллов

  return { mem, cores, baselineScore: score };
}

// ---- 3. GPU (WebGL) ----
function detectGPU() {
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return { vendor: "unknown", renderer: "unknown", gpuScore: 0 };

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const vendor = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    : "unknown";
  const renderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : "unknown";

  // Грубая эвристика: интегрированная vs дискретная
  const isIntegrated =
    /intel|amd\s+radeon\s+(vega|rx\s+5[0-9]{2})|apple\s+gpu|mali|adreno/i.test(
      renderer,
    );
  const gpuScore = isIntegrated ? 30 : 70;

  return { vendor, renderer, gpuScore, isIntegrated };
}

// ---- 4. FPS МОНИТОРИНГ ----
function measureFPS(durationMs = 2500) {
  return new Promise((resolve) => {
    const frames = [];
    let start = performance.now();

    function tick(now) {
      frames.push(now);
      if (now - start < durationMs) {
        requestAnimationFrame(tick);
        return;
      }
      // Считаем FPS
      const elapsed = frames[frames.length - 1] - frames[0];
      const fps = frames.length / (elapsed / 1000);
      resolve(Math.round(fps));
    }

    requestAnimationFrame(tick);
  });
}

// ---- 5. БАТАРЕЯ ----
async function detectBattery() {
  if (!navigator.getBattery)
    return { level: 1, charging: true, lowBattery: false };
  try {
    const battery = await navigator.getBattery();
    const lowBattery = !battery.charging && battery.level < 0.2;
    // Слушаем изменения
    battery.addEventListener("levelchange", () => {
      if (!battery.charging && battery.level < 0.2) {
        addHtmlClass("low-battery");
        adaptiveStore.setProfile({
          ...adaptiveStore.getProfile(),
          lowBattery: true,
        });
      } else {
        removeHtmlClass("low-battery");
        adaptiveStore.setProfile({
          ...adaptiveStore.getProfile(),
          lowBattery: false,
        });
      }
    });
    battery.addEventListener("chargingchange", () => {
      if (battery.charging) removeHtmlClass("low-battery");
    });
    return { level: battery.level, charging: battery.charging, lowBattery };
  } catch {
    return { level: 1, charging: true, lowBattery: false };
  }
}

// ---- 6. SAVE-DATA (HTTP заголовок + JS) ----
function detectSaveData() {
  // navigator.connection.saveData уже проверяли в detectNetwork
  // Дополнительно: проверим через fetch заголовок (если нужно)
  return false; // пока полагаемся на connection.saveData
}

// ---- 7. PREFERS-REDUCED-MOTION ----
function detectReducedMotion() {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = mq.matches;
  if (reduced) addHtmlClass("reduce-motion");
  mq.addEventListener("change", (e) => {
    if (e.matches) addHtmlClass("reduce-motion");
    else removeHtmlClass("reduce-motion");
    // Обновляем профиль
    const p = adaptiveStore.getProfile();
    if (p) adaptiveStore.setProfile({ ...p, reducedMotion: e.matches });
  });
  return reduced;
}

// ---- 8. PREFERS-CONTRAST ----
function detectPrefersContrast() {
  const mq = window.matchMedia("(prefers-contrast: more)");
  const highContrast = mq.matches;
  if (highContrast) addHtmlClass("high-contrast");
  mq.addEventListener("change", (e) => {
    if (e.matches) addHtmlClass("high-contrast");
    else removeHtmlClass("high-contrast");
  });
  return highContrast;
}

// ---- 9. КОМБИНИРОВАННЫЙ ПРОФИЛЬ ----
function computePerfProfile({
  baselineScore,
  gpuScore,
  fps,
  lowBattery,
  reducedMotion,
}) {
  // Веса: baseline 40%, GPU 30%, FPS 20%, батарея -20% если слабая, reduced motion -> low
  if (reducedMotion) return "low";

  let score = baselineScore * 0.4 + gpuScore * 0.3;

  if (fps > 0) {
    // Нормализуем FPS: 60 -> 100, 30 -> 50, 15 -> 25
    const fpsScore = clamp((fps / 60) * 100, 0, 100);
    score += fpsScore * 0.2;
  }

  if (lowBattery) score *= 0.7;

  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ---- MAIN ----
export const NETWORK_PROFILE = (() => {
  const net = detectNetwork();
  const device = detectDeviceBaseline();
  const gpu = detectGPU();
  const reducedMotion = detectReducedMotion();
  detectPrefersContrast();

  // Асинхронные части
  let fpsPromise = measureFPS(2000);
  let batteryPromise = detectBattery();

  // Сначала ставим базовый профиль (без FPS/батареи)
  let perfProfile = computePerfProfile({
    baselineScore: device.baselineScore,
    gpuScore: gpu.gpuScore,
    fps: 0,
    lowBattery: false,
    reducedMotion,
  });

  setHtmlClasses("perf-", perfProfile);

  // Итоговый объект профиля
  const profile = {
    netProfile: net.netProfile,
    saveData: net.saveData,
    downlink: net.downlink,
    effectiveType: net.effectiveType,
    rtt: net.rtt,
    perfProfile,
    mem: device.mem,
    cores: device.cores,
    gpuVendor: gpu.vendor,
    gpuRenderer: gpu.renderer,
    reducedMotion,
    lowBattery: false,
  };

  adaptiveStore.setProfile(profile);

  // Обновляем когда придут FPS и батарея
  Promise.all([fpsPromise, batteryPromise]).then(([fps, battery]) => {
    perfProfile = computePerfProfile({
      baselineScore: device.baselineScore,
      gpuScore: gpu.gpuScore,
      fps,
      lowBattery: battery.lowBattery,
      reducedMotion,
    });

    setHtmlClasses("perf-", perfProfile);
    if (battery.lowBattery) addHtmlClass("low-battery");

    adaptiveStore.setProfile({
      ...profile,
      perfProfile,
      fps,
      lowBattery: battery.lowBattery,
    });
  });

  return profile;
})();

// Экспорт для обратной совместимости
export function maxConcurrencyByProfile(defaultConcurrency = 3) {
  const p = adaptiveStore.getProfile()?.netProfile || "limited";
  if (p === "economy") return 1;
  if (p === "limited") return 2;
  return defaultConcurrency;
}

export function isBackgroundSyncDisabled() {
  return adaptiveStore.getProfile()?.netProfile === "economy";
}

export { adaptiveStore };

// Экспорт для глобального доступа (дебаг в консоли)
if (typeof window !== "undefined") {
  window.__ADAPTIVE__ = {
    adaptiveStore,
    getProfile: () => adaptiveStore.getProfile(),
  };
}
