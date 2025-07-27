import "./floating_ui_dom.js";
import "./floating_ui_core.js";

if (typeof window.popoverState === "undefined") {
  window.popoverState = new Map();
}

(function () {
  if (window.popoverSystemInitialized) return;

  // --- Ensure Global Portal Container ---
  let portalContainer = document.querySelector(
    "[data-tui-popover-portal-container]"
  );
  if (!portalContainer) {
    portalContainer = document.createElement("div");
    portalContainer.setAttribute("data-tui-popover-portal-container", "");
    portalContainer.className = "fixed inset-0 z-[9999] pointer-events-none";
    document.body.appendChild(portalContainer);
  }
  // --- End Ensure Global Portal Container ---

  // --- Floating UI Check & Helper ---
  let FloatingUIDOM = null;

  function whenFloatingUiReady(callback, attempt = 1) {
    if (window.FloatingUIDOM) {
      FloatingUIDOM = window.FloatingUIDOM;
      callback();
    } else if (attempt < 40) {
      setTimeout(() => whenFloatingUiReady(callback, attempt + 1), 50);
    } else {
      console.error("Floating UI DOM failed to load after several attempts.");
    }
  }

  // --- Helper Functions ---
  function findReferenceElement(triggerSpan) {
    const children = triggerSpan.children;
    if (children.length === 0) return triggerSpan;
    let bestElement = triggerSpan;
    let largestArea = 0;
    for (const child of children) {
      if (typeof child.getBoundingClientRect !== "function") continue;
      const rect = child.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > largestArea) {
        largestArea = area;
        bestElement = child;
      }
    }
    return bestElement;
  }

  function positionArrow(arrowElement, placement, arrowData, content) {
    const { x: arrowX, y: arrowY } = arrowData;
    const staticSide = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    }[placement.split("-")[0]];
    Object.assign(arrowElement.style, {
      left: arrowX != null ? `${arrowX}px` : "",
      top: arrowY != null ? `${arrowY}px` : "",
      right: "",
      bottom: "",
      [staticSide]: "-5px",
    });
    const popoverStyle = window.getComputedStyle(content);
    const popoverBorderColor = popoverStyle.borderColor;
    arrowElement.style.backgroundColor = popoverStyle.backgroundColor;
    arrowElement.style.borderTopColor = popoverBorderColor;
    arrowElement.style.borderRightColor = popoverBorderColor;
    arrowElement.style.borderBottomColor = popoverBorderColor;
    arrowElement.style.borderLeftColor = popoverBorderColor;
    switch (staticSide) {
      case "top":
        arrowElement.style.borderBottomColor = "transparent";
        arrowElement.style.borderRightColor = "transparent";
        break;
      case "bottom":
        arrowElement.style.borderTopColor = "transparent";
        arrowElement.style.borderLeftColor = "transparent";
        break;
      case "left":
        arrowElement.style.borderTopColor = "transparent";
        arrowElement.style.borderRightColor = "transparent";
        break;
      case "right":
        arrowElement.style.borderBottomColor = "transparent";
        arrowElement.style.borderLeftColor = "transparent";
        break;
    }
  }

  function addAnimationStyles() {
    if (document.getElementById("popover-animations")) return;
    const style = document.createElement("style");
    style.id = "popover-animations";
    style.textContent = `
            @keyframes popover-in { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
            @keyframes popover-out { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.95); } }
            [data-tui-popover-id].popover-animate-in { animation: popover-in 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
            [data-tui-popover-id].popover-animate-out { animation: popover-out 0.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `;
    document.head.appendChild(style);
  }

  // --- Core Popover Logic ---

  // Update trigger states
  function updateTriggers(popoverId, isOpen) {
    document
      .querySelectorAll(`[data-tui-popover-trigger="${popoverId}"]`)
      .forEach((trigger) => {
        trigger.setAttribute("data-tui-popover-open", isOpen);
      });
  }

  function updatePosition(state) {
    if (!FloatingUIDOM || !state || !state.trigger || !state.content) return;
    const { computePosition, offset, flip, shift, arrow } = FloatingUIDOM;
    const referenceElement = findReferenceElement(state.trigger);
    const arrowElement = state.content.querySelector("[data-tui-popover-arrow]");
    const placement = state.content.getAttribute("data-tui-popover-placement") || "bottom";
    const offsetValue =
      parseInt(state.content.getAttribute("data-tui-popover-offset")) || (arrowElement ? 8 : 4);
    const shouldMatchWidth = state.content.getAttribute("data-tui-popover-match-width") === "true";

    const middleware = [
      offset(offsetValue),
      flip({ padding: 10 }),
      shift({ padding: 10 }),
    ];
    if (arrowElement)
      middleware.push(arrow({ element: arrowElement, padding: 5 }));

    computePosition(referenceElement, state.content, {
      placement,
      middleware,
    }).then(({ x, y, placement, middlewareData }) => {
      Object.assign(state.content.style, { left: `${x}px`, top: `${y}px` });

      if (shouldMatchWidth) {
        const triggerWidth = referenceElement.offsetWidth;
        state.content.style.setProperty(
          "--popover-trigger-width",
          `${triggerWidth}px`
        );
      }

      if (arrowElement && middlewareData.arrow) {
        positionArrow(
          arrowElement,
          placement,
          middlewareData.arrow,
          state.content
        );
      }
    });
  }

  function addGlobalListeners(popoverId, state) {
    removeGlobalListeners(state); // Ensure no duplicates
    if (state.content.getAttribute("data-tui-popover-disable-clickaway") !== "true") {
      const handler = (e) => {
        // Close if click is outside trigger and content
        if (
          !state.trigger.contains(e.target) &&
          !state.content.contains(e.target)
        ) {
          closePopover(popoverId);
        }
      };
      // Use setTimeout to avoid capturing the click that opened the popover
      setTimeout(() => document.addEventListener("click", handler), 0);
      state.eventListeners.clickAway = handler;
    }
    if (state.content.getAttribute("data-tui-popover-disable-esc") !== "true") {
      const handler = (e) => {
        if (e.key === "Escape") closePopover(popoverId);
      };
      document.addEventListener("keydown", handler);
      state.eventListeners.esc = handler;
    }
  }

  function removeGlobalListeners(state) {
    if (state.eventListeners.clickAway)
      document.removeEventListener("click", state.eventListeners.clickAway);
    if (state.eventListeners.esc)
      document.removeEventListener("keydown", state.eventListeners.esc);
    state.eventListeners = {}; // Clear stored handlers
  }

  function openPopover(popoverId, trigger) {
    if (!FloatingUIDOM) return;
    const { autoUpdate } = FloatingUIDOM;
    const content = document.getElementById(popoverId);
    if (!content) return;

    let state = window.popoverState.get(popoverId);
    if (!state) {
      // Should be created by initTrigger, but as a fallback
      state = {
        trigger,
        content,
        isOpen: false,
        cleanup: null,
        hoverState: {},
        eventListeners: {},
      };
      window.popoverState.set(popoverId, state);
    } else if (state.isOpen) return;

    state.trigger = trigger; // Ensure trigger reference is current
    state.content = content; // Ensure content reference is current

    const portal = document.querySelector("[data-tui-popover-portal-container]");
    if (portal && content.parentNode !== portal) portal.appendChild(content);

    content.style.display = "block";
    content.classList.remove("popover-animate-out");
    content.classList.add("popover-animate-in");

    // Update data-tui-popover-open attributes
    content.setAttribute("data-tui-popover-open", "true");
    updateTriggers(popoverId, "true");

    // Initial position update before autoUpdate starts
    updatePosition(state);

    if (state.cleanup) state.cleanup();
    state.cleanup = autoUpdate(
      findReferenceElement(trigger),
      content,
      () => updatePosition(state),
      { animationFrame: true }
    ); // Use animationFrame for smoother updates

    addGlobalListeners(popoverId, state);
    state.isOpen = true;
  }

  function closePopover(popoverId, immediate = false) {
    const state = window.popoverState.get(popoverId);
    if (!state || !state.isOpen) return;

    if (state.cleanup) {
      state.cleanup();
      state.cleanup = null;
    }
    removeGlobalListeners(state);

    const content = state.content;

    // Update data-tui-popover-open attributes
    content.setAttribute("data-tui-popover-open", "false");
    updateTriggers(popoverId, "false");

    function hideContent() {
      content.style.display = "none";
      content.classList.remove("popover-animate-in", "popover-animate-out");
    }

    if (immediate) hideContent();
    else {
      content.classList.remove("popover-animate-in");
      content.classList.add("popover-animate-out");
      setTimeout(hideContent, 150); // Match animation duration
    }
    state.isOpen = false;
  }

  // Expose closePopover globally
  window.closePopover = closePopover;

  // --- Trigger Initialization & Handling ---

  function closeAllOtherPopovers(exceptId) {
    for (const [id, state] of window.popoverState) {
      if (id !== exceptId && state.isOpen) {
        closePopover(id);
      }
    }
  }

  function attachClickTrigger(trigger, popoverId) {
    const handler = (e) => {
      e.stopPropagation();
      const state = window.popoverState.get(popoverId);
      if (state?.isOpen) closePopover(popoverId);
      else {
        closeAllOtherPopovers(popoverId);
        openPopover(popoverId, trigger);
      }
    };
    trigger.addEventListener("click", handler);
    trigger._popoverListener = handler;
  }

  function attachHoverTrigger(trigger, popoverId) {
    const content = document.getElementById(popoverId);
    if (!content) return;
    let state = window.popoverState.get(popoverId);
    if (!state) return; // State should exist from initTrigger

    const hoverDelay = parseInt(content.getAttribute("data-tui-popover-hover-delay")) || 100;
    const hoverOutDelay = parseInt(content.getAttribute("data-tui-popover-hover-out-delay")) || 200;

    const handleTriggerEnter = () => {
      clearTimeout(state.hoverState.leaveTimeout);
      state.hoverState.enterTimeout = setTimeout(
        () => openPopover(popoverId, trigger),
        hoverDelay
      );
    };
    const handleTriggerLeave = (e) => {
      clearTimeout(state.hoverState.enterTimeout);
      state.hoverState.leaveTimeout = setTimeout(() => {
        if (!content.contains(e.relatedTarget)) closePopover(popoverId);
      }, hoverOutDelay);
    };
    const handleContentEnter = () =>
      clearTimeout(state.hoverState.leaveTimeout);
    const handleContentLeave = (e) => {
      state.hoverState.leaveTimeout = setTimeout(() => {
        if (!trigger.contains(e.relatedTarget)) closePopover(popoverId);
      }, hoverOutDelay);
    };

    trigger.addEventListener("mouseenter", handleTriggerEnter);
    trigger.addEventListener("mouseleave", handleTriggerLeave);
    content.addEventListener("mouseenter", handleContentEnter);
    content.addEventListener("mouseleave", handleContentLeave);

    // Store handlers for cleanup
    trigger._popoverHoverListeners = { handleTriggerEnter, handleTriggerLeave };
    content._popoverHoverListeners = { handleContentEnter, handleContentLeave };
  }

  function initTrigger(trigger) {
    if (!trigger || trigger.hasAttribute("data-initialized")) return;
    trigger.setAttribute("data-initialized", "true");
    
    const popoverId = trigger.getAttribute("data-tui-popover-trigger");
    const content = document.getElementById(popoverId);
    if (!popoverId || !content) return;

    // Prevent re-attaching listeners to the same DOM element instance
    if (trigger._popoverListenerAttached) return;

    // Ensure state object exists
    if (!window.popoverState.has(popoverId)) {
      window.popoverState.set(popoverId, {
        trigger,
        content,
        isOpen: false,
        cleanup: null,
        hoverState: {},
        eventListeners: {},
      });
    } else {
      // Update refs in existing state if trigger persisted
      const state = window.popoverState.get(popoverId);
      state.trigger = trigger;
      state.content = content;
      // Ensure closed state after potential swap/cleanup
      if (state.isOpen) closePopover(popoverId, true);
    }

    // Cleanup any stray listeners before attaching new ones
    if (trigger._popoverListener)
      trigger.removeEventListener("click", trigger._popoverListener);
    if (trigger._popoverHoverListeners) {
      trigger.removeEventListener(
        "mouseenter",
        trigger._popoverHoverListeners.handleTriggerEnter
      );
      trigger.removeEventListener(
        "mouseleave",
        trigger._popoverHoverListeners.handleTriggerLeave
      );
    }
    if (content._popoverHoverListeners) {
      content.removeEventListener(
        "mouseenter",
        content._popoverHoverListeners.handleContentEnter
      );
      content.removeEventListener(
        "mouseleave",
        content._popoverHoverListeners.handleContentLeave
      );
    }
    delete trigger._popoverListener;
    delete trigger._popoverHoverListeners;
    if (content) delete content._popoverHoverListeners;

    // Attach the correct listener type
    const triggerType = trigger.getAttribute("data-tui-popover-type") || "click";
    if (triggerType === "click") {
      attachClickTrigger(trigger, popoverId);
    } else if (triggerType === "hover") {
      attachHoverTrigger(trigger, popoverId);
    }
    trigger._popoverListenerAttached = true;
  }

  // --- Cleanup ---

  function cleanupPopovers(element) {
    const cleanupTrigger = (trigger) => {
      const popoverId = trigger.getAttribute("data-tui-popover-trigger");
      if (popoverId) {
        closePopover(popoverId, true); // Close popover, remove global listeners, stop Floating UI
      }

      // Remove listeners directly attached to the trigger
      if (trigger._popoverListener)
        trigger.removeEventListener("click", trigger._popoverListener);
      if (trigger._popoverHoverListeners) {
        trigger.removeEventListener(
          "mouseenter",
          trigger._popoverHoverListeners.handleTriggerEnter
        );
        trigger.removeEventListener(
          "mouseleave",
          trigger._popoverHoverListeners.handleTriggerLeave
        );
      }

      // Remove listeners attached to the content (for hover)
      const content = document.getElementById(popoverId);
      if (content && content._popoverHoverListeners) {
        content.removeEventListener(
          "mouseenter",
          content._popoverHoverListeners.handleContentEnter
        );
        content.removeEventListener(
          "mouseleave",
          content._popoverHoverListeners.handleContentLeave
        );
        delete content._popoverHoverListeners;
      }

      // Clean up stored references and flags on the trigger
      delete trigger._popoverListener;
      delete trigger._popoverHoverListeners;
      delete trigger._popoverListenerAttached;

      // Optionally remove state - might be desired if the element is definitely gone
      // window.popoverState.delete(popoverId);
    };

    // Cleanup element itself if it's a trigger
    if (element.matches && element.matches("[data-tui-popover-trigger]")) {
      cleanupTrigger(element);
    }
    // Cleanup descendants
    if (element.querySelectorAll) {
      element
        .querySelectorAll("[data-tui-popover-trigger]")
        .forEach(cleanupTrigger);
    }
  }

  function init(root = document) {
    if (!FloatingUIDOM) return; // Don't init if library isn't ready
    if (root instanceof Element && root.matches("[data-tui-popover-trigger]")) {
      initTrigger(root);
    }
    if (root && typeof root.querySelectorAll === "function") {
      for (const trigger of root.querySelectorAll("[data-tui-popover-trigger]:not([data-initialized])")) {
        initTrigger(trigger);
      }
    }
  }

  window.templUI = window.templUI || {};
  window.templUI.popover = { init: init };

  document.addEventListener("DOMContentLoaded", () => {
    whenFloatingUiReady(() => {
      addAnimationStyles();
      init();
    });
  });

  window.popoverSystemInitialized = true;
})();
