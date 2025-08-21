/**
 * Sidebar toggle functionality with event delegation
 */
(function () {
  "use strict";

  let resizeHandlerSetup = false;

  // Initialize all sidebars
  function initSidebars() {
    // Set initial state for all sidebars
    document
      .querySelectorAll('[data-sidebar="sidebar"]')
      .forEach(setSidebarInitialState);

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
            node.querySelector?.('[data-sidebar="sidebar"]') ||
            node.matches?.('[data-sidebar="sidebar"]')
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

  function setSidebarInitialState(sidebar) {
    // Get default open state from data attribute
    const defaultOpen = sidebar.getAttribute("data-sidebar-default-open") === "true";
    
    // Mobile: always closed, Desktop: respect DefaultOpen prop
    const isMobile = window.innerWidth < 1024;
    sidebar.setAttribute(
      "data-sidebar-state",
      isMobile ? "closed" : (defaultOpen ? "open" : "closed"),
    );
  }

  function setupResizeHandler() {
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document
          .querySelectorAll('[data-sidebar="sidebar"]')
          .forEach((sidebar) => {
            const isDesktop = window.innerWidth >= 1024;
            const isOpen =
              sidebar.getAttribute("data-sidebar-state") === "open";

            // Adjust sidebar state on breakpoint change
            if (isDesktop && !isOpen) {
              openSidebar(sidebar);
            } else if (!isDesktop && isOpen) {
              closeSidebar(sidebar);
            }
          });
      }, 250);
    });
  }

  // Event delegation for all sidebar interactions
  document.addEventListener("click", (e) => {
    // Handle trigger clicks
    const trigger = e.target.closest("[data-sidebar-trigger]");
    if (trigger) {
      e.preventDefault();
      const sidebar = findSidebar(trigger);
      if (sidebar) toggleSidebar(sidebar);
      return;
    }

    // Handle backdrop clicks
    const backdrop = e.target.closest("[data-sidebar-backdrop]");
    if (backdrop) {
      const sidebarId = backdrop.getAttribute("data-sidebar-id");
      const sidebar = document.getElementById(sidebarId);
      if (sidebar) closeSidebar(sidebar);
      return;
    }
  });

  // Handle keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Escape key - close sidebar
    if (e.key === "Escape") {
      document
        .querySelectorAll('[data-sidebar="sidebar"][data-sidebar-state="open"]')
        .forEach(closeSidebar);
    }

    // Ctrl+B or Cmd+B - toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (sidebar) toggleSidebar(sidebar);
    }
  });

  function findSidebar(trigger) {
    // Check for explicit target
    const targetId = trigger.getAttribute("data-sidebar-target");
    if (targetId) {
      return document.getElementById(targetId);
    }

    // Find nearest sidebar in parent hierarchy
    const sidebar = trigger.closest('[data-sidebar="sidebar"]');
    if (sidebar) return sidebar;

    // Find sibling sidebar
    let parent = trigger.parentElement;
    while (parent) {
      const sidebar = parent.querySelector('[data-sidebar="sidebar"]');
      if (sidebar) return sidebar;
      parent = parent.parentElement;
    }

    // Fallback to first sidebar
    return document.querySelector('[data-sidebar="sidebar"]');
  }

  function toggleSidebar(sidebar) {
    const isOpen = sidebar.getAttribute("data-sidebar-state") === "open";
    isOpen ? closeSidebar(sidebar) : openSidebar(sidebar);
  }

  function openSidebar(sidebar) {
    sidebar.setAttribute("data-sidebar-state", "open");

    // Mobile: show backdrop and prevent scroll
    if (window.innerWidth < 1024) {
      const backdrop = document.querySelector(
        `[data-sidebar-backdrop][data-sidebar-id="${sidebar.id}"]`,
      );
      if (backdrop) backdrop.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closeSidebar(sidebar) {
    sidebar.setAttribute("data-sidebar-state", "closed");

    // Hide backdrop and restore scroll
    const backdrop = document.querySelector(
      `[data-sidebar-backdrop][data-sidebar-id="${sidebar.id}"]`,
    );
    if (backdrop) backdrop.classList.add("hidden");
    document.body.style.overflow = "";
  }
})();

