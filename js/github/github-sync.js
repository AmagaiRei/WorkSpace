// ! Синхронизация счётчика лабораторных с GitHub на главной странице.
import { fetchLabsFromGitHub, clearGitHubCache } from "./github.js";

function updateStatus(statusEl, message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `github-sync-status github-sync-status--${type}`;
}

export async function syncWithGitHub() {
  const btn = document.getElementById("github-sync");
  const statusEl = document.getElementById("github-sync-status");

  if (!btn || !statusEl) {
    console.warn("Элементы для синхронизации не найдены.");
    return;
  }

  btn.disabled = true;
  btn.classList.add("is-syncing");
  updateStatus(statusEl, "🔄 Получаю данные с GitHub…", "info");

  try {
    clearGitHubCache();
    const labs = await fetchLabsFromGitHub();
    const count = labs.length;
    const noun =
      count === 1
        ? "лабораторная"
        : count >= 2 && count <= 4
          ? "лабораторные"
          : "лабораторных";
    updateStatus(
      statusEl,
      `✓ Данные синхронизированы · ${count} ${noun}`,
      "success",
    );
  } catch (error) {
    console.error("Ошибка синхронизации с GitHub:", error);
    updateStatus(
      statusEl,
      `Не удалось обновить данные: ${error.message}`,
      "error",
    );
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-syncing");
  }
}

export function bindGitHubSync() {
  const btn = document.getElementById("github-sync");
  if (!btn || btn.dataset.syncBound === "true") return;

  btn.dataset.syncBound = "true";
  btn.addEventListener("click", syncWithGitHub);
}
