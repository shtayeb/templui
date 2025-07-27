(function () {
  const modals = new Map();
  let openModalId = null;

  // Update trigger states
  function updateTriggers(modalId, isOpen) {
    document
      .querySelectorAll(`[data-tui-modal-trigger="${modalId}"]`)
      .forEach((trigger) => {
        trigger.setAttribute("data-tui-modal-trigger-open", isOpen);
      });
  }

  // Create modal instance
  function createModal(modal) {
    if (!modal || modal.hasAttribute("data-initialized")) return null;
    modal.setAttribute("data-initialized", "true");
    
    const modalId = modal.id;
    const content = modal.querySelector("[data-tui-modal-content]");
    const isInitiallyOpen = modal.hasAttribute("data-tui-modal-initial-open");

    if (!content || !modalId) return null;

    let isOpen = isInitiallyOpen;

    // Set state
    function setState(open) {
      isOpen = open;
      modal.style.display = open ? "flex" : "none";
      modal.setAttribute("data-tui-modal-open", open);
      updateTriggers(modalId, open);

      if (open) {
        openModalId = modalId;
        document.body.style.overflow = "hidden";

        // Animation classes
        modal.classList.remove("opacity-0");
        modal.classList.add("opacity-100");
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");

        // Focus first element
        setTimeout(() => {
          const focusable = content.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          focusable?.focus();
        }, 50);
      } else {
        if (openModalId === modalId) {
          openModalId = null;
          document.body.style.overflow = "";
        }

        // Animation classes
        modal.classList.remove("opacity-100");
        modal.classList.add("opacity-0");
        content.classList.remove("scale-100", "opacity-100");
        content.classList.add("scale-95", "opacity-0");
      }
    }

    // Open modal
    function open() {
      // Close any other open modal
      if (openModalId && openModalId !== modalId) {
        modals.get(openModalId)?.close(true);
      }

      modal.style.display = "flex";
      modal.offsetHeight; // Force reflow
      setState(true);

      // Add event listeners
      document.addEventListener("keydown", handleEsc);
      document.addEventListener("click", handleClickAway);
    }

    // Close modal
    function close(immediate = false) {
      setState(false);

      // Remove event listeners
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("click", handleClickAway);

      // Hide after animation
      if (!immediate) {
        setTimeout(() => {
          if (!isOpen) modal.style.display = "none";
        }, 300);
      }
    }

    // Toggle modal
    function toggle() {
      isOpen ? close() : open();
    }

    // Handle escape key
    function handleEsc(e) {
      if (
        e.key === "Escape" &&
        isOpen &&
        modal.getAttribute("data-tui-modal-disable-esc") !== "true"
      ) {
        close();
      }
    }

    // Handle click away
    function handleClickAway(e) {
      if (modal.getAttribute("data-tui-modal-disable-click-away") === "true") return;

      if (!content.contains(e.target) && !isTriggerClick(e.target)) {
        close();
      }
    }

    // Check if click is on a trigger
    function isTriggerClick(target) {
      const trigger = target.closest("[data-tui-modal-trigger]");
      return trigger && trigger.getAttribute("data-tui-modal-trigger") === modalId;
    }

    // Setup close buttons
    modal.querySelectorAll("[data-tui-modal-close]").forEach((btn) => {
      btn.addEventListener("click", close);
    });

    // Set initial state
    setState(isInitiallyOpen);

    return { open, close, toggle };
  }

  // Initialize all modals and triggers
  function init(root = document) {
    // Find and initialize modals
    root.querySelectorAll("[data-tui-modal]:not([data-initialized])").forEach((modal) => {
      const modalInstance = createModal(modal);
      if (modalInstance && modal.id) {
        modals.set(modal.id, modalInstance);
      }
    });

    // Setup trigger clicks
    root.querySelectorAll("[data-tui-modal-trigger]").forEach((trigger) => {
      if (trigger.dataset.initialized) return;
      trigger.dataset.initialized = "true";

      const modalId = trigger.getAttribute("data-tui-modal-trigger");
      trigger.addEventListener("click", () => {
        if (
          !trigger.hasAttribute("disabled") &&
          !trigger.classList.contains("opacity-50")
        ) {
          modals.get(modalId)?.toggle();
        }
      });
    });
  }

  // Export
  window.templUI = window.templUI || {};
  window.templUI.modal = { init: init };

  // Auto-initialize
  document.addEventListener("DOMContentLoaded", () => init());
})();
