(function () {
  "use strict";

  const SIDEBAR_COOKIE_NAME = "sidebar_state";
  const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

  // Event delegation for sidebar interactions (Desktop only - Mobile uses Sheet)
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-tui-sidebar-trigger]");
    if (trigger) {
      e.preventDefault();
      const targetId = trigger.getAttribute("data-tui-sidebar-target");
      if (targetId) {
        toggleSidebar(targetId);
      }
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
    const cookieValue = state === "expanded" ? "true" : "false";
    saveSidebarState(sidebarId, cookieValue);
  }

  function saveSidebarState(sidebarId, cookieValue) {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${cookieValue}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }
})();

