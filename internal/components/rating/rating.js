if (typeof window.ratingState === "undefined") {
  window.ratingState = new WeakMap();
}

(function () {
  function initRating(ratingElement) {
    if (!ratingElement || ratingElement.hasAttribute("data-initialized")) return;
    ratingElement.setAttribute("data-initialized", "true");

    const existingState = window.ratingState.get(ratingElement);
    if (existingState) {
      cleanupRating(ratingElement, existingState);
    }

    ratingElement.setAttribute("data-tui-rating-initialized", "true");

    const config = {
      value: parseFloat(ratingElement.getAttribute("data-tui-rating-initial-value")) || 0,
      precision: parseFloat(ratingElement.getAttribute("data-tui-rating-precision")) || 1,
      readonly: ratingElement.getAttribute("data-tui-rating-readonly") === "true",
      name: ratingElement.getAttribute("data-tui-rating-name") || "",
      onlyInteger: ratingElement.getAttribute("data-tui-rating-onlyinteger") === "true",
      maxValue: 0,
    };

    const hiddenInput = ratingElement.querySelector("[data-tui-rating-input]");
    let items = Array.from(
      ratingElement.querySelectorAll("[data-tui-rating-item]")
    );

    let currentValue = config.value;
    let previewValue = 0;

    const handlers = {
      click: handleClick,
      mouseover: handleMouseOver,
      mouseleave: handleMouseLeave,
    };

    function calculateMaxValue() {
      let highestValue = 0;
      for (const item of items) {
        const value = parseInt(item.getAttribute("data-tui-rating-value"), 10);
        if (!isNaN(value) && value > highestValue) {
          highestValue = value;
        }
      }
      config.maxValue = Math.max(1, highestValue);
      currentValue = Math.max(0, Math.min(config.maxValue, currentValue));
      currentValue =
        Math.round(currentValue / config.precision) * config.precision;
      updateHiddenInput();
    }

    function updateHiddenInput() {
      if (hiddenInput) {
        hiddenInput.value = currentValue.toFixed(2);
      }
    }

    function updateItemStyles(displayValue) {
      for (const item of items) {
        const itemValue = parseInt(item.getAttribute("data-tui-rating-value"), 10);
        if (isNaN(itemValue)) continue;

        const foreground = item.querySelector("[data-tui-rating-item-foreground]");
        if (!foreground) continue;

        const valueToCompare = displayValue > 0 ? displayValue : currentValue;

        const filled = itemValue <= Math.floor(valueToCompare);
        const partial =
          !filled &&
          itemValue - 1 < valueToCompare &&
          valueToCompare < itemValue;
        const percentage = partial
          ? (valueToCompare - Math.floor(valueToCompare)) * 100
          : 0;

        foreground.style.width = filled
          ? "100%"
          : partial
          ? `${percentage}%`
          : "0%";
      }
    }

    function setValue(itemValue) {
      if (config.readonly) return;

      let newValue = itemValue;
      if (config.onlyInteger) {
        newValue = Math.round(newValue);
      } else {
        if (currentValue === newValue && newValue % 1 === 0) {
          newValue = Math.max(0, newValue - config.precision);
        } else {
          newValue = Math.round(newValue / config.precision) * config.precision;
        }
      }

      currentValue = Math.max(0, Math.min(config.maxValue, newValue));
      previewValue = 0;
      updateHiddenInput();
      updateItemStyles(0);

      ratingElement.dispatchEvent(
        new CustomEvent("rating-change", {
          bubbles: true,
          detail: {
            name: config.name,
            value: currentValue,
            maxValue: config.maxValue,
          },
        })
      );

      if (hiddenInput) {
        hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
        hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    function handleMouseOver(event) {
      if (config.readonly) return;
      const item = event.target.closest("[data-tui-rating-item]");
      if (!item) return;

      previewValue = parseInt(item.getAttribute("data-tui-rating-value"), 10);
      if (!isNaN(previewValue)) {
        updateItemStyles(previewValue);
      }
    }

    function handleMouseLeave() {
      if (config.readonly) return;
      previewValue = 0;
      updateItemStyles(0);
    }

    function handleClick(event) {
      if (config.readonly) return;
      const item = event.target.closest("[data-tui-rating-item]");
      if (!item) return;

      const itemValue = parseInt(item.getAttribute("data-tui-rating-value"), 10);
      if (!isNaN(itemValue)) {
        setValue(itemValue);
      }
    }

    calculateMaxValue();
    updateItemStyles(0);

    if (config.readonly) {
      ratingElement.style.cursor = "default";
      for (const item of items) {
        item.style.cursor = "default";
      }
    } else {
      ratingElement.addEventListener("click", handlers.click);
      ratingElement.addEventListener("mouseover", handlers.mouseover);
      ratingElement.addEventListener("mouseleave", handlers.mouseleave);
    }

    // Form reset support
    const form = ratingElement.closest('form');
    if (form) {
      form.addEventListener('reset', () => {
        currentValue = config.value; // Reset to initial value
        previewValue = 0;
        updateHiddenInput();
        updateItemStyles(0);
      });
    }

    const observer = new MutationObserver(() => {
      try {
        const currentItemCount =
          ratingElement.querySelectorAll("[data-tui-rating-item]").length;
        if (currentItemCount !== items.length) {
          items = Array.from(
            ratingElement.querySelectorAll("[data-tui-rating-item]")
          );
          calculateMaxValue();
          updateItemStyles(previewValue > 0 ? previewValue : 0);
        }
      } catch (err) {
        console.error("Error in rating MutationObserver:", err);
      }
    });

    observer.observe(ratingElement, { childList: true, subtree: true });

    const state = {
      handlers,
      observer,
      items,
    };

    window.ratingState.set(ratingElement, state);
  }

  function cleanupRating(ratingElement, state) {
    if (!ratingElement || !state) return;

    if (!ratingElement.getAttribute("data-tui-rating-readonly") === "true") {
      ratingElement.removeEventListener("click", state.handlers.click);
      ratingElement.removeEventListener("mouseover", state.handlers.mouseover);
      ratingElement.removeEventListener(
        "mouseleave",
        state.handlers.mouseleave
      );
    }

    if (state.observer) {
      state.observer.disconnect();
    }

    window.ratingState.delete(ratingElement);
    ratingElement.removeAttribute("data-tui-rating-initialized");
  }

  function init(root = document) {
    if (root instanceof Element && root.matches("[data-tui-rating-component]")) {
      initRating(root); // initRating handles already initialized check internally
    }
    if (root && typeof root.querySelectorAll === "function") {
      root.querySelectorAll("[data-tui-rating-component]:not([data-initialized])").forEach(initRating);
    }
  }

  window.templUI = window.templUI || {};
  window.templUI.rating = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();
