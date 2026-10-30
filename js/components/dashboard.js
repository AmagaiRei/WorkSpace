// !Дашборд прогресса: расчёт статистики, анимация чисел и красивый градиентный прогресс-бар.
import { el } from "../utils/common.js";

const STATUS_ITEMS = [
  {
    key: "total",
    label: "Всего работ",
    icon: "▦",
    className: "total",
    color: "purple",
  },
  { key: "done", label: "Сдано", icon: "✓", className: "done", color: "green" },
  {
    key: "progress",
    label: "В работе",
    icon: "↗",
    className: "progress",
    color: "orange",
  },
  {
    key: "todo",
    label: "Не начато",
    icon: "○",
    className: "todo",
    color: "cyan",
  },
];

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

// !Склонение слова «работа» для подсказок.
function pluralizeWork(count) {
  const remainder100 = count % 100;
  if (remainder100 >= 11 && remainder100 <= 14) return "работ";
  const remainder10 = count % 10;
  if (remainder10 === 1) return "работу";
  if (remainder10 >= 2 && remainder10 <= 4) return "работы";
  return "работ";
}

export function calculateStatistics(subjects) {
  const labs = (subjects ?? []).flatMap((subject) => subject.labs ?? []);
  const stats = {
    total: labs.length,
    done: 0,
    progress: 0,
    todo: 0,
  };

  for (const lab of labs) {
    if (lab.status === "done") stats.done += 1;
    else if (lab.status === "progress") stats.progress += 1;
    else stats.todo += 1;
  }

  stats.percent = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;
  stats.remaining = stats.total - stats.done;

  return stats;
}

function createKpiCard({ key, label, icon, className, color }, value) {
  const colorMap = {
    purple: {
      accent: "var(--color-accent-purple)",
      glow: "var(--glow-purple)",
      dim: "var(--color-accent-purple-dim)",
    },
    green: {
      accent: "var(--color-accent-green)",
      glow: "var(--glow-green)",
      dim: "var(--color-accent-green-dim)",
    },
    orange: {
      accent: "var(--color-accent-orange)",
      glow: "var(--glow-orange)",
      dim: "var(--color-accent-orange-dim)",
    },
    cyan: {
      accent: "var(--color-accent-cyan)",
      glow: "var(--glow-cyan)",
      dim: "var(--color-accent-cyan-dim)",
    },
  };
  const c = colorMap[color] || colorMap.purple;

  return el(
    "article",
    {
      className: `dashboard__kpi dashboard__kpi--${className}`,
      attrs: { "aria-label": `${label}: ${value}` },
      style: `--kpi-accent: ${c.accent}; --kpi-glow: ${c.glow}; --kpi-dim: ${c.dim};`,
    },
    el("div", {
      className: "dashboard__kpi-glow",
      attrs: { "aria-hidden": "true" },
    }),
    el("div", {
      className: "dashboard__kpi-ring",
      attrs: { "aria-hidden": "true" },
    }),
    el(
      "div",
      { className: "dashboard__kpi-content" },
      el("span", {
        className: "dashboard__kpi-icon",
        text: icon,
        attrs: { "aria-hidden": "true" },
      }),
      el("span", { className: "dashboard__kpi-label", text: label }),
      el("strong", {
        className: "dashboard__kpi-value",
        text: String(value),
        attrs: { "data-kpi-value": key },
      }),
    ),
  );
}

// !Анимация счётчика: ease-out cubic с проверкой prefers-reduced-motion.
function animateNumber(element, target, duration = 1100) {
  if (prefersReducedMotion.matches || target === 0) {
    element.textContent = String(target);
    return;
  }

  const startTime = performance.now();
  const frame = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = String(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

function createProgress(stats) {
  // !Создаём красивый прогресс-бар с градиентом и блоком процента
  const track = el(
    "div",
    {
      className: "dashboard__progress-track",
      attrs: {
        role: "progressbar",
        "aria-label": "Общий прогресс лабораторных",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(stats.percent),
      },
    },
    el(
      "div",
      { className: "dashboard__progress-fill" },
      el("div", { className: "dashboard__progress-shimmer" }),
    ),
    el("div", { className: "dashboard__progress-glow" }),
  );

  const percent = el("strong", {
    className: "dashboard__percent",
    text: prefersReducedMotion.matches ? `${stats.percent}%` : "0%",
    attrs: { "data-dashboard-percent": "" },
  });

  return {
    track,
    fill: track.querySelector(".dashboard__progress-fill"),
    percent,
  };
}

function getHint(stats) {
  if (stats.total === 0) return "Пока нет лабораторных";
  if (stats.remaining === 0) return "Всё сдано ✨";

  const hint = `Осталось доработать ${stats.remaining} ${pluralizeWork(stats.remaining)}`;
  if (stats.progress > 0) {
    return `${hint}. Сейчас в работе: ${stats.progress}.`;
  }
  return `${hint}. Почти...`;
}

export function renderDashboard(
  subjects,
  container = document.getElementById("dashboard"),
) {
  if (!container) return;

  const stats = calculateStatistics(subjects);
  const { track, fill, percent } = createProgress(stats);
  const kpis = STATUS_ITEMS.map((item) => createKpiCard(item, stats[item.key]));

  container.replaceChildren(
    el(
      "div",
      { className: "dashboard__glass" },
      el(
        "div",
        { className: "dashboard__heading" },
        el(
          "div",
          {},
          el("p", {
            className: "dashboard__eyebrow",
            text: "ТВОЙ ПРОГРЕСС",
          }),
          el("h2", {
            className: "dashboard__title",
            text: "Всё под контролем",
          }),
        ),
        el("span", {
          className: "dashboard__total-chip",
          text: `${stats.done} / ${stats.total}`,
          attrs: { "aria-label": `${stats.done} из ${stats.total} сдано` },
        }),
      ),
      el("div", { className: "dashboard__kpis" }, ...kpis),
      el(
        "div",
        { className: "dashboard__progress-section" },
        el(
          "div",
          { className: "dashboard__progress-heading" },
          el("span", { text: "Общий прогресс" }),
          percent,
        ),
        track,
        el("p", { className: "dashboard__hint", text: getHint(stats) }),
      ),
    ),
  );

  for (const item of STATUS_ITEMS) {
    const valueElement = container.querySelector(
      `[data-kpi-value="${item.key}"]`,
    );
    animateNumber(valueElement, stats[item.key], 850);
  }

  // !Анимация красивого прогресс-бара с градиентом
  if (prefersReducedMotion.matches) {
    fill.style.width = `${stats.percent}%`;
    fill.querySelector(".dashboard__progress-shimmer").style.opacity = "1";
    return;
  }

  fill.style.width = "0%";
  fill.querySelector(".dashboard__progress-shimmer").style.opacity = "0";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.width = `${stats.percent}%`;
      fill.querySelector(".dashboard__progress-shimmer").style.opacity = "1";
      percent.textContent = `${stats.percent}%`;
      const startedAt = performance.now();
      const duration = 1200;

      const animatePercent = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        percent.textContent = `${Math.round(stats.percent * eased)}%`;
        if (progress < 1) requestAnimationFrame(animatePercent);
      };

      percent.textContent = "0%";
      requestAnimationFrame(animatePercent);
    });
  });
}
