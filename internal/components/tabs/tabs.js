(function () {
  "use strict";

  // Update tab state
  function setActiveTab(container, value) {
    const tabsId = container.getAttribute("data-tui-tabs-id");
    if (!tabsId) return;

    let activeTrigger = null;

    // Update triggers
    container
      .querySelectorAll(`[data-tui-tabs-trigger][data-tui-tabs-id="${tabsId}"]`)
      .forEach((trigger) => {
        const isActive = trigger.getAttribute("data-tui-tabs-value") === value;
        trigger.setAttribute(
          "data-tui-tabs-state",
          isActive ? "active" : "inactive",
        );
        trigger.classList.toggle("text-foreground", isActive);
        trigger.classList.toggle("bg-background", isActive);
        trigger.classList.toggle("shadow-xs", isActive);
        if (isActive) activeTrigger = trigger;
      });

    // Update contents
    container
      .querySelectorAll(`[data-tui-tabs-content][data-tui-tabs-id="${tabsId}"]`)
      .forEach((content) => {
        const isActive = content.getAttribute("data-tui-tabs-value") === value;
        content.setAttribute(
          "data-tui-tabs-state",
          isActive ? "active" : "inactive",
        );
        content.classList.toggle("hidden", !isActive);
      });

    // Update marker
    const marker = container.querySelector(
      `[data-tui-tabs-marker][data-tui-tabs-id="${tabsId}"]`,
    );
    if (marker && activeTrigger) {
      marker.style.width = activeTrigger.offsetWidth + "px";
      marker.style.height = activeTrigger.offsetHeight + "px";
      marker.style.left = activeTrigger.offsetLeft + "px";
    }
  }

  // Event delegation
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-tui-tabs-trigger]");
    if (!trigger) return;

    const container = trigger.closest("[data-tui-tabs]");
    const value = trigger.getAttribute("data-tui-tabs-value");
    if (container && value) {
      setActiveTab(container, value);
    }
  });

  // Initialize tabs function
  function initializeTabs() {
    document.querySelectorAll("[data-tui-tabs]").forEach((container) => {
      const tabsId = container.getAttribute("data-tui-tabs-id");
      if (!tabsId) return;

      // Skip if already initialized (has the initialized marker)
      if (container.hasAttribute("data-tui-tabs-initialized")) return;
      container.setAttribute("data-tui-tabs-initialized", "true");

      const triggers = container.querySelectorAll(
        `[data-tui-tabs-trigger][data-tui-tabs-id="${tabsId}"]`,
      );
      if (triggers.length === 0) return;

      // Find default trigger - check for active state or use first
      const defaultTrigger =
        Array.from(triggers).find(
          (t) => t.getAttribute("data-tui-tabs-state") === "active",
        ) || triggers[0];

      if (defaultTrigger) {
        setActiveTab(
          container,
          defaultTrigger.getAttribute("data-tui-tabs-value"),
        );
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTabs);
  } else {
    initializeTabs();
  }

  // MutationObserver for dynamic content
  new MutationObserver(initializeTabs).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

