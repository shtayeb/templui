(function () {
  function updateProgressWidth(progressBar) {
    if (!progressBar || progressBar.hasAttribute("data-tui-progress-initialized")) return;
    progressBar.setAttribute("data-tui-progress-initialized", "true");

    const indicator = progressBar.querySelector("[data-tui-progress-indicator]");
    if (!indicator) return;

    const value = parseFloat(progressBar.getAttribute("aria-valuenow") || "0");
    let max = parseFloat(progressBar.getAttribute("aria-valuemax") || "100");
    if (max <= 0) max = 100;

    let percentage = 0;
    if (max > 0) {
      percentage = (Math.max(0, Math.min(value, max)) / max) * 100;
    }

    indicator.style.width = percentage + "%";
  }

  function init(root = document) {
    if (root instanceof Element && root.matches('[role="progressbar"]')) {
      updateProgressWidth(root);
    }
    if (root && typeof root.querySelectorAll === "function") {
      for (const progressBar of root.querySelectorAll('[role="progressbar"]:not([data-tui-progress-initialized])')) {
        updateProgressWidth(progressBar);
      }
    }
  }

  window.templUI = window.templUI || {};
  window.templUI.progress = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();
