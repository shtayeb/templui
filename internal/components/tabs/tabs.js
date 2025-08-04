(function () {
  function initTabs(container) {
    if (container.hasAttribute("data-tui-tabs-initialized")) return;

    container.setAttribute("data-tui-tabs-initialized", "true");

    const tabsId = container.getAttribute("data-tui-tabs-id");
    if (!tabsId) return;

    const triggers = Array.from(
      container.querySelectorAll(
        `[data-tui-tabs-trigger][data-tui-tabs-id="${tabsId}"]`
      )
    );
    const contents = Array.from(
      container.querySelectorAll(
        `[data-tui-tabs-content][data-tui-tabs-id="${tabsId}"]`
      )
    );
    const marker = container.querySelector(
      `[data-tui-tabs-marker][data-tui-tabs-id="${tabsId}"]`
    );

    function updateMarker(activeTrigger) {
      if (!marker || !activeTrigger) return;

      marker.style.width = activeTrigger.offsetWidth + "px";
      marker.style.height = activeTrigger.offsetHeight + "px";
      marker.style.left = activeTrigger.offsetLeft + "px";
    }

    function setActiveTab(value) {
      let activeTrigger = null;

      for (const trigger of triggers) {
        const isActive = trigger.getAttribute("data-tui-tabs-value") === value;
        trigger.setAttribute("data-tui-tabs-state", isActive ? "active" : "inactive");
        trigger.classList.toggle("text-foreground", isActive);
        trigger.classList.toggle("bg-background", isActive);
        trigger.classList.toggle("shadow-xs", isActive);

        if (isActive) activeTrigger = trigger;
      }

      for (const content of contents) {
        const isActive = content.getAttribute("data-tui-tabs-value") === value;
        content.setAttribute("data-tui-tabs-state", isActive ? "active" : "inactive");
        content.classList.toggle("hidden", !isActive);
      }

      updateMarker(activeTrigger);
    }

    const defaultTrigger =
      triggers.find((t) => t.getAttribute("data-tui-tabs-state") === "active") || triggers[0];
    if (defaultTrigger) {
      setActiveTab(defaultTrigger.getAttribute("data-tui-tabs-value"));
    }

    for (const trigger of triggers) {
      trigger.addEventListener("click", () => {
        setActiveTab(trigger.getAttribute("data-tui-tabs-value"));
      });
    }
  }

  function init(root = document) {
    if (root instanceof Element && root.matches("[data-tui-tabs]")) {
      initTabs(root);
    }
    for (const tabs of root.querySelectorAll(
      "[data-tui-tabs]:not([data-tui-tabs-initialized])"
    )) {
      initTabs(tabs);
    }
  }

  window.templUI = window.templUI || {};
  window.templUI.tabs = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();
