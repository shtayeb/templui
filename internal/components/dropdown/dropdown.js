(function () {
  function handleDropdownItemClick(event) {
    const item = event.currentTarget;

    // Check if this item should prevent dropdown from closing
    if (item.getAttribute("data-tui-dropdown-prevent-close") === "true") {
      return; // Don't close the dropdown
    }

    const popoverContent = item.closest("[data-tui-popover-id]");
    if (popoverContent) {
      const popoverId = popoverContent.dataset.popoverId;
      if (window.closePopover) {
        window.closePopover(popoverId, true);
      } else {
        console.warn("popover.Script's closePopover function not found.");
        document.body.click(); // Fallback
      }
    }
  }

  function init(root = document) {
    // Select items with 'data-tui-dropdown-item' but not 'data-tui-dropdown-submenu-trigger'
    const items = root.querySelectorAll(
      "[data-tui-dropdown-item]:not([data-tui-dropdown-submenu-trigger]):not([data-tui-dropdown-initialized])",
    );
    items.forEach((item) => {
      item.setAttribute("data-tui-dropdown-initialized", "true");
      item.removeEventListener("click", handleDropdownItemClick);
      item.addEventListener("click", handleDropdownItemClick);
    });
  }

  window.templUI = window.templUI || {};
  window.templUI.dropdown = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();
