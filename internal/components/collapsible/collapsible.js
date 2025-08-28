(function () {
  "use strict";

  function toggle(trigger) {
    const root = trigger.closest('[data-tui-collapsible="root"]');
    if (!root) return;

    const isOpen = root.getAttribute("data-tui-collapsible-state") === "open";
    const newState = isOpen ? "closed" : "open";

    // Update states
    root.setAttribute("data-tui-collapsible-state", newState);
    trigger.setAttribute("aria-expanded", !isOpen);
  }

  // Click handler
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest('[data-tui-collapsible="trigger"]');
    if (trigger) {
      e.preventDefault();
      toggle(trigger);
    }
  });

  // Keyboard handler
  document.addEventListener("keydown", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    const trigger = e.target.closest('[data-tui-collapsible="trigger"]');
    if (trigger) {
      e.preventDefault();
      toggle(trigger);
    }
  });
})();