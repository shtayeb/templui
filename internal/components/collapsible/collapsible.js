/**
 * Collapsible - Simple event delegation
 */
(function () {
  "use strict";

  function toggle(trigger) {
    const root = trigger.closest('[data-tui-collapsible="root"]');
    const content = root?.querySelector('[data-tui-collapsible="content"]');
    if (!root || !content) return;
    
    const isOpen = root.getAttribute("data-tui-collapsible-state") === "open";
    const newState = isOpen ? "closed" : "open";
    
    // Update states
    root.setAttribute("data-tui-collapsible-state", newState);
    trigger.setAttribute("aria-expanded", !isOpen);
    content.setAttribute("data-tui-collapsible-state", newState);
    
    // Animate height
    if (!isOpen) {
      content.style.height = content.scrollHeight + "px";
      setTimeout(() => content.style.height = "auto", 200);
    } else {
      content.style.height = content.scrollHeight + "px";
      content.offsetHeight; // Force reflow
      content.style.height = "0";
    }
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

  // Init existing collapsibles
  function init() {
    document.querySelectorAll('[data-tui-collapsible="root"]').forEach(root => {
      const trigger = root.querySelector('[data-tui-collapsible="trigger"]');
      const content = root.querySelector('[data-tui-collapsible="content"]');
      if (!trigger || !content) return;
      
      const isOpen = root.getAttribute("data-tui-collapsible-state") === "open";
      trigger.setAttribute("aria-expanded", isOpen);
      content.setAttribute("data-tui-collapsible-state", isOpen ? "open" : "closed");
      content.style.height = isOpen ? "auto" : "0";
    });
  }

  // Initial setup
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Watch for new content (HTMX/dynamic)
  const observer = new MutationObserver(() => {
    // Re-init when DOM changes
    init();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();