(function () {
  function initTextarea(textarea) {
    if (textarea.hasAttribute("data-tui-textarea-initialized")) return;

    textarea.setAttribute("data-tui-textarea-initialized", "true");

    const autoResize = textarea.getAttribute("data-tui-textarea-auto-resize") === "true";
    if (!autoResize) return;

    const computedStyle = window.getComputedStyle(textarea);
    const initialMinHeight = computedStyle.minHeight;

    function resize() {
      textarea.style.height = initialMinHeight;
      textarea.style.height = `${textarea.scrollHeight}px`;
    }

    resize();
    textarea.addEventListener("input", resize);
  }

  function init(root = document) {
    if (root instanceof Element && root.matches("textarea[data-tui-textarea]")) {
      initTextarea(root);
    }
    for (const textarea of root.querySelectorAll(
      "textarea[data-tui-textarea]:not([data-tui-textarea-initialized])"
    )) {
      initTextarea(textarea);
    }
  }

  document.addEventListener("DOMContentLoaded", () => init());
})();
