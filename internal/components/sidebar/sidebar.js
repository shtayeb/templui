/**
 * Sidebar toggle functionality with event delegation
 */
(function () {
  "use strict";

  let resizeHandlerSetup = false;

  // Initialize all sidebars
  function initSidebars() {
    // Setup resize handler only once
    if (!resizeHandlerSetup) {
      setupResizeHandler();
      resizeHandlerSetup = true;
    }
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebars);
  } else {
    initSidebars();
  }

  // Watch for dynamically added sidebars (HTMX navigation)
  const observer = new MutationObserver((mutations) => {
    let shouldInit = false;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          // Element node
          if (
            node.querySelector?.('[data-tui-sidebar="sidebar"]') ||
            node.matches?.('[data-tui-sidebar="sidebar"]')
          ) {
            shouldInit = true;
            break;
          }
        }
      }
      if (shouldInit) break;
    }

    if (shouldInit) {
      // Small delay to ensure DOM is fully updated
      setTimeout(initSidebars, 10);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });


  function setupResizeHandler() {
    // Resize handler for future use if needed
  }

  // Event delegation for sidebar interactions (Desktop only - Mobile uses Sheet)
  document.addEventListener("click", (e) => {
    // Handle trigger clicks - Desktop only
    const trigger = e.target.closest("[data-tui-sidebar-trigger]");
    if (trigger) {
      e.preventDefault();
      const targetId = trigger.getAttribute("data-tui-sidebar-target");
      if (targetId) {
        toggleSidebar(targetId);
      }
      return;
    }
  });

  // Handle keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Escape key - close sidebar
    if (e.key === "Escape") {
      document
        .querySelectorAll(
          '[data-tui-sidebar="sidebar"][data-tui-sidebar-state="open"]',
        )
        .forEach(closeSidebar);
    }

    // Ctrl+B or Cmd+B - toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      const sidebar = document.querySelector('[data-tui-sidebar="sidebar"]');
      if (sidebar && sidebar.id) {
        toggleSidebar(sidebar.id);
      }
    }
  });


  function toggleSidebar(sidebarId) {
    const wrapper = document.querySelector(
      `[data-tui-sidebar-wrapper][data-tui-sidebar-id="${sidebarId}"]`,
    );
    if (wrapper) {
      const isOpen = wrapper.getAttribute("data-tui-sidebar-state") === "open";
      wrapper.setAttribute("data-tui-sidebar-state", isOpen ? "closed" : "open");
    }
  }

  function closeSidebar(sidebar) {
    // Find wrapper by sidebar ID
    const wrapper = document.querySelector(
      `[data-tui-sidebar-wrapper][data-tui-sidebar-id="${sidebar.id}"]`,
    );
    if (wrapper) {
      wrapper.setAttribute("data-tui-sidebar-state", "closed");
    }
  }
})();
