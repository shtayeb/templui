import "./floating_ui_dom.js";
import "./floating_ui_core.js";

(function () {
  'use strict';
  
  // --- Global State for FloatingUI cleanup only ---
  const floatingCleanups = new Map();
  const hoverTimeouts = new Map();
  
  // --- Ensure Global Portal Container ---
  function ensurePortalContainer() {
    let portalContainer = document.querySelector("[data-tui-popover-portal-container]");
    if (!portalContainer) {
      portalContainer = document.createElement("div");
      portalContainer.setAttribute("data-tui-popover-portal-container", "");
      portalContainer.className = "fixed inset-0 z-[9999] pointer-events-none";
      document.body.appendChild(portalContainer);
    }
    return portalContainer;
  }
  
  // --- Floating UI Setup ---
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
  
  function updatePosition(trigger, content) {
    if (!FloatingUIDOM) return;
    
    const { computePosition, offset, flip, shift, arrow } = FloatingUIDOM;
    const referenceElement = findReferenceElement(trigger);
    const arrowElement = content.querySelector("[data-tui-popover-arrow]");
    const placement = content.getAttribute("data-tui-popover-placement") || "bottom";
    const offsetValue = parseInt(content.getAttribute("data-tui-popover-offset")) || (arrowElement ? 8 : 4);
    const shouldMatchWidth = content.getAttribute("data-tui-popover-match-width") === "true";
    
    const middleware = [
      offset(offsetValue),
      flip({ padding: 10 }),
      shift({ padding: 10 }),
    ];
    
    if (arrowElement) {
      middleware.push(arrow({ element: arrowElement, padding: 5 }));
    }
    
    computePosition(referenceElement, content, {
      placement,
      middleware,
    }).then(({ x, y, placement, middlewareData }) => {
      Object.assign(content.style, { left: `${x}px`, top: `${y}px` });
      
      if (shouldMatchWidth) {
        const triggerWidth = referenceElement.offsetWidth;
        content.style.setProperty("--popover-trigger-width", `${triggerWidth}px`);
      }
      
      if (arrowElement && middlewareData.arrow) {
        positionArrow(arrowElement, placement, middlewareData.arrow, content);
      }
    });
  }
  
  function openPopover(trigger) {
    if (!FloatingUIDOM) return;
    
    const popoverId = trigger.getAttribute("data-tui-popover-trigger");
    if (!popoverId) return;
    
    const content = document.getElementById(popoverId);
    if (!content) return;
    
    // Close all other popovers
    closeAllPopovers(popoverId);
    
    // Move to portal
    const portal = ensurePortalContainer();
    if (content.parentNode !== portal) {
      portal.appendChild(content);
    }
    
    // Show content
    content.style.display = "block";
    content.classList.remove("popover-animate-out");
    content.classList.add("popover-animate-in");
    
    // Update state attributes
    content.setAttribute("data-tui-popover-open", "true");
    trigger.setAttribute("data-tui-popover-open", "true");
    
    // Update all triggers for this popover
    document.querySelectorAll(`[data-tui-popover-trigger="${popoverId}"]`).forEach(t => {
      t.setAttribute("data-tui-popover-open", "true");
    });
    
    // Initial position
    updatePosition(trigger, content);
    
    // Start auto-update for position
    const { autoUpdate } = FloatingUIDOM;
    const cleanup = autoUpdate(
      findReferenceElement(trigger),
      content,
      () => updatePosition(trigger, content),
      { animationFrame: true }
    );
    
    floatingCleanups.set(popoverId, cleanup);
  }
  
  function closePopover(popoverId, immediate = false) {
    const content = document.getElementById(popoverId);
    if (!content) return;
    
    // Stop FloatingUI auto-update
    const cleanup = floatingCleanups.get(popoverId);
    if (cleanup) {
      cleanup();
      floatingCleanups.delete(popoverId);
    }
    
    // Clear any hover timeouts
    const timeouts = hoverTimeouts.get(popoverId);
    if (timeouts) {
      clearTimeout(timeouts.enter);
      clearTimeout(timeouts.leave);
      hoverTimeouts.delete(popoverId);
    }
    
    // Update state attributes
    content.setAttribute("data-tui-popover-open", "false");
    
    // Update all triggers for this popover
    document.querySelectorAll(`[data-tui-popover-trigger="${popoverId}"]`).forEach(trigger => {
      trigger.setAttribute("data-tui-popover-open", "false");
    });
    
    function hideContent() {
      content.style.display = "none";
      content.classList.remove("popover-animate-in", "popover-animate-out");
    }
    
    if (immediate) {
      hideContent();
    } else {
      content.classList.remove("popover-animate-in");
      content.classList.add("popover-animate-out");
      setTimeout(hideContent, 150);
    }
  }
  
  function closeAllPopovers(exceptId = null) {
    document.querySelectorAll('[data-tui-popover-open="true"][data-tui-popover-id]').forEach(content => {
      const popoverId = content.id;
      if (popoverId && popoverId !== exceptId) {
        closePopover(popoverId);
      }
    });
  }
  
  function togglePopover(trigger) {
    const popoverId = trigger.getAttribute("data-tui-popover-trigger");
    if (!popoverId) return;
    
    const isOpen = trigger.getAttribute("data-tui-popover-open") === "true";
    
    if (isOpen) {
      closePopover(popoverId);
    } else {
      openPopover(trigger);
    }
  }
  
  // --- Event Handlers ---
  
  // Click handling
  document.addEventListener("click", (e) => {
    // Handle trigger clicks
    const trigger = e.target.closest("[data-tui-popover-trigger]");
    if (trigger) {
      const type = trigger.getAttribute("data-tui-popover-type") || "click";
      if (type === "click") {
        e.stopPropagation();
        togglePopover(trigger);
      }
      return;
    }
    
    // Handle click-away (close popovers when clicking outside)
    const clickedContent = e.target.closest("[data-tui-popover-id]");
    document.querySelectorAll('[data-tui-popover-open="true"][data-tui-popover-id]').forEach(content => {
      if (content !== clickedContent) {
        const disableClickaway = content.getAttribute("data-tui-popover-disable-clickaway") === "true";
        if (!disableClickaway) {
          // Check if click is also outside all triggers for this popover
          const popoverId = content.id;
          const triggers = document.querySelectorAll(`[data-tui-popover-trigger="${popoverId}"]`);
          let clickedTrigger = false;
          for (const t of triggers) {
            if (t.contains(e.target)) {
              clickedTrigger = true;
              break;
            }
          }
          if (!clickedTrigger) {
            closePopover(popoverId);
          }
        }
      }
    });
  });
  
  // Hover handling - use mouseover/mouseout instead of mouseenter/mouseleave for proper bubbling
  document.addEventListener("mouseover", (e) => {
    const trigger = e.target.closest("[data-tui-popover-trigger]");
    if (trigger && !trigger.contains(e.relatedTarget)) {
      const type = trigger.getAttribute("data-tui-popover-type") || "click";
      if (type === "hover") {
        const popoverId = trigger.getAttribute("data-tui-popover-trigger");
        const content = document.getElementById(popoverId);
        if (!content) return;
        
        const hoverDelay = parseInt(content.getAttribute("data-tui-popover-hover-delay")) || 100;
        
        // Clear any leave timeout
        const timeouts = hoverTimeouts.get(popoverId) || {};
        clearTimeout(timeouts.leave);
        
        // Set enter timeout
        timeouts.enter = setTimeout(() => {
          openPopover(trigger);
        }, hoverDelay);
        
        hoverTimeouts.set(popoverId, timeouts);
      }
    }
    
    // Handle hover on content - only if entering from outside
    const content = e.target.closest("[data-tui-popover-id]");
    if (content && !content.contains(e.relatedTarget) && content.getAttribute("data-tui-popover-open") === "true") {
      const popoverId = content.id;
      const triggers = document.querySelectorAll(`[data-tui-popover-trigger="${popoverId}"]`);
      
      // Check if any trigger is hover type
      for (const t of triggers) {
        if (t.getAttribute("data-tui-popover-type") === "hover") {
          const timeouts = hoverTimeouts.get(popoverId) || {};
          clearTimeout(timeouts.leave);
          hoverTimeouts.set(popoverId, timeouts);
          break;
        }
      }
    }
  });
  
  document.addEventListener("mouseout", (e) => {
    const trigger = e.target.closest("[data-tui-popover-trigger]");
    if (trigger && !trigger.contains(e.relatedTarget)) {
      const type = trigger.getAttribute("data-tui-popover-type") || "click";
      if (type === "hover") {
        const popoverId = trigger.getAttribute("data-tui-popover-trigger");
        const content = document.getElementById(popoverId);
        if (!content) return;
        
        const hoverOutDelay = parseInt(content.getAttribute("data-tui-popover-hover-out-delay")) || 200;
        
        // Clear any enter timeout
        const timeouts = hoverTimeouts.get(popoverId) || {};
        clearTimeout(timeouts.enter);
        
        // Set leave timeout (unless moving to content)
        if (!content.contains(e.relatedTarget)) {
          timeouts.leave = setTimeout(() => {
            closePopover(popoverId);
          }, hoverOutDelay);
          hoverTimeouts.set(popoverId, timeouts);
        }
      }
    }
    
    // Handle hover leave on content - only if leaving to outside
    const content = e.target.closest("[data-tui-popover-id]");
    if (content && !content.contains(e.relatedTarget) && content.getAttribute("data-tui-popover-open") === "true") {
      const popoverId = content.id;
      const triggers = document.querySelectorAll(`[data-tui-popover-trigger="${popoverId}"]`);
      
      // First check if this is a hover popover - only close hover popovers on mouseout
      let isHoverPopover = false;
      for (const t of triggers) {
        if (t.getAttribute("data-tui-popover-type") === "hover") {
          isHoverPopover = true;
          break;
        }
      }
      
      // Only handle mouseout for hover popovers
      if (isHoverPopover) {
        // Check if moving to trigger
        let movingToTrigger = false;
        for (const t of triggers) {
          if (t.contains(e.relatedTarget)) {
            movingToTrigger = true;
            break;
          }
        }
        
        if (!movingToTrigger) {
          const hoverOutDelay = parseInt(content.getAttribute("data-tui-popover-hover-out-delay")) || 200;
          const timeouts = hoverTimeouts.get(popoverId) || {};
          
          timeouts.leave = setTimeout(() => {
            closePopover(popoverId);
          }, hoverOutDelay);
          
          hoverTimeouts.set(popoverId, timeouts);
        }
      }
    }
  });
  
  // ESC key handling
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll('[data-tui-popover-open="true"][data-tui-popover-id]').forEach(content => {
        const disableEsc = content.getAttribute("data-tui-popover-disable-esc") === "true";
        if (!disableEsc) {
          closePopover(content.id);
        }
      });
    }
  });
  
  // Expose closePopover globally for other components
  window.closePopover = closePopover;
  
  // Initialize when FloatingUI is ready
  whenFloatingUiReady(() => {
    addAnimationStyles();
  });
})();