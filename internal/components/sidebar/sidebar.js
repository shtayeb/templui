/*
 * Sidebar toggle functionality with collapsible modes support
 */
(function () {
  "use strict";

  const SIDEBAR_COOKIE_NAME = "sidebar_state";
  const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

  let resizeHandlerSetup = false;

  // Initialize all sidebars
  function initSidebars() {
    // Setup resize handler only once
    if (!resizeHandlerSetup) {
      setupResizeHandler();
      resizeHandlerSetup = true;
    }

    // Restore sidebar states from cookies
    restoreSidebarStates();
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
    // Escape key - close sidebar (only for offcanvas mode)
    if (e.key === "Escape") {
      document
        .querySelectorAll(
          '[data-tui-sidebar-wrapper][data-tui-sidebar-state="expanded"][data-tui-sidebar-collapsible="offcanvas"]',
        )
        .forEach((wrapper) => {
          const sidebarId = wrapper.getAttribute("data-tui-sidebar-id");
          if (sidebarId) {
            setSidebarState(sidebarId, "collapsed");
          }
        });
    }

    // Ctrl+B or Cmd+B - toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (sidebar && sidebar.id) {
        toggleSidebar(sidebar.id);
      }
    }
  });

  function toggleSidebar(sidebarId) {
    const wrapper = document.querySelector(
      `[data-tui-sidebar-wrapper][data-tui-sidebar-id="${sidebarId}"]`,
    );
    if (!wrapper) return;

    // Check collapsible mode
    const collapsible = wrapper.getAttribute("data-tui-sidebar-collapsible");
    
    // Don't toggle if collapsible is "none"
    if (collapsible === "none") {
      return;
    }

    const currentState = wrapper.getAttribute("data-tui-sidebar-state");
    const newState = currentState === "expanded" ? "collapsed" : "expanded";
    
    setSidebarState(sidebarId, newState);
  }

  function setSidebarState(sidebarId, state) {
    const wrapper = document.querySelector(
      `[data-tui-sidebar-wrapper][data-tui-sidebar-id="${sidebarId}"]`,
    );
    if (!wrapper) return;

    const collapsible = wrapper.getAttribute("data-tui-sidebar-collapsible");
    
    // Don't change state if collapsible is "none"
    if (collapsible === "none") {
      return;
    }

    // Update data-tui-sidebar-state attribute
    wrapper.setAttribute("data-tui-sidebar-state", state);

    // For icon mode, also set data-tui-sidebar-collapsible when collapsed
    if (state === "collapsed" && collapsible) {
      wrapper.setAttribute("data-tui-sidebar-collapsible", collapsible);
    }

    // Save state to cookie
    saveSidebarState(sidebarId, state);
  }

  function saveSidebarState(sidebarId, state) {
    document.cookie = `${SIDEBAR_COOKIE_NAME}_${sidebarId}=${state}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }

  function getSidebarState(sidebarId) {
    const name = `${SIDEBAR_COOKIE_NAME}_${sidebarId}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  }

  function restoreSidebarStates() {
    document.querySelectorAll("[data-tui-sidebar-wrapper]").forEach((wrapper) => {
      const sidebarId = wrapper.getAttribute("data-tui-sidebar-id");
      const collapsible = wrapper.getAttribute("data-tui-sidebar-collapsible");
      
      // Skip if collapsible is "none"
      if (collapsible === "none") {
        wrapper.setAttribute("data-tui-sidebar-state", "expanded");
        return;
      }

      const savedState = getSidebarState(sidebarId);
      if (savedState) {
        wrapper.setAttribute("data-tui-sidebar-state", savedState);
        if (savedState === "collapsed" && collapsible) {
          wrapper.setAttribute("data-tui-sidebar-collapsible", collapsible);
        }
      }
    });
  }
})();