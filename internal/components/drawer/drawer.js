(function () {
  const drawers = new Map();

  // Update trigger states
  function updateTriggers(drawerId, isOpen) {
    document
      .querySelectorAll(`[data-tui-drawer-trigger="${drawerId}"]`)
      .forEach((trigger) => {
        trigger.setAttribute("data-tui-drawer-open", isOpen);
      });
  }

  // Get transform value based on position
  function getTransform(position, isOpen) {
    if (isOpen) return "translate(0)";

    switch (position) {
      case "left":
        return "translateX(-100%)";
      case "right":
        return "translateX(100%)";
      case "top":
        return "translateY(-100%)";
      case "bottom":
        return "translateY(100%)";
      default:
        return "translateX(100%)";
    }
  }

  // Create drawer instance
  function createDrawer(backdrop) {
    if (!backdrop || backdrop.hasAttribute("data-tui-drawer-initialized")) return null;
    backdrop.setAttribute("data-tui-drawer-initialized", "true");
    
    const drawerId = backdrop.id;
    const content = document.getElementById(drawerId + "-content");
    const position = content?.getAttribute("data-tui-drawer-position") || "right";
    const isInitiallyOpen = backdrop.hasAttribute("data-tui-drawer-initial-open");

    if (!content || !drawerId) return null;

    let isOpen = isInitiallyOpen;

    // Set initial state
    function setState(open) {
      isOpen = open;
      const display = open ? "block" : "none";
      const opacity = open ? "1" : "0";

      if (open) {
        backdrop.style.display = display;
        content.style.display = display;

        // Force reflow
        content.offsetHeight;

        // Add transitions
        backdrop.style.transition = "opacity 300ms ease";
        content.style.transition = "opacity 300ms ease, transform 300ms ease";
      }

      backdrop.style.opacity = opacity;
      content.style.opacity = opacity;
      content.style.transform = getTransform(position, open);

      backdrop.setAttribute("data-tui-drawer-open", open);
      updateTriggers(drawerId, open);

      document.body.style.overflow = open ? "hidden" : "";
    }

    // Open drawer
    function open() {
      setState(true);

      // Add event listeners
      backdrop.addEventListener("click", handleBackdropClick);
      document.addEventListener("keydown", handleEsc);
    }

    // Close drawer
    function close() {
      setState(false);

      // Remove event listeners
      backdrop.removeEventListener("click", handleBackdropClick);
      document.removeEventListener("keydown", handleEsc);

      // Hide after animation
      setTimeout(() => {
        if (!isOpen) {
          backdrop.style.display = "none";
          content.style.display = "none";
        }
      }, 300);
    }

    // Toggle drawer
    function toggle() {
      isOpen ? close() : open();
    }

    // Handle escape key
    function handleEsc(e) {
      if (e.key === "Escape" && isOpen) close();
    }

    // Handle backdrop click - only close if clicking directly on backdrop
    function handleBackdropClick(e) {
      if (e.target === backdrop) {
        close();
      }
    }

    // Check if click is on a trigger
    function isTriggerClick(target) {
      const triggers = document.querySelectorAll(
        `[data-tui-drawer-trigger="${drawerId}"]`
      );
      return Array.from(triggers).some((trigger) => trigger.contains(target));
    }

    // Setup close buttons
    content.querySelectorAll("[data-tui-drawer-close]").forEach((btn) => {
      btn.addEventListener("click", close);
    });

    // Set initial state
    setState(isInitiallyOpen);

    return { open, close, toggle };
  }

  // Initialize all drawers and triggers
  function init(root = document) {
    // Find and initialize drawers
    root.querySelectorAll('[data-tui-drawer-component="drawer"]:not([data-tui-drawer-initialized])').forEach((backdrop) => {
      const drawer = createDrawer(backdrop);
      if (drawer && backdrop.id) {
        drawers.set(backdrop.id, drawer);
      }
    });

    // Setup trigger clicks
    root.querySelectorAll("[data-tui-drawer-trigger]").forEach((trigger) => {
      if (trigger.dataset.tuiDrawerInitialized) return;
      trigger.dataset.tuiDrawerInitialized = "true";

      const drawerId = trigger.getAttribute("data-tui-drawer-trigger");
      trigger.addEventListener("click", () => {
        drawers.get(drawerId)?.toggle();
      });
    });
  }

  // Export
  window.templUI = window.templUI || {};
  window.templUI.drawer = { init: init };

  // Auto-initialize
  document.addEventListener("DOMContentLoaded", () => init());
})();
