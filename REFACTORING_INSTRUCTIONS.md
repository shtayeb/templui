# templUI JavaScript Component Refactoring Instructions

## Overview

This document provides detailed instructions for refactoring templUI JavaScript components from instance-based event listeners to a global event delegation pattern. This refactoring solves browser back/forward navigation issues and improves overall performance.

## Problem Statement

Current templUI components have critical issues:

- Components stop working after browser back/forward navigation
- `data-initialized` checks prevent re-initialization
- Direct event listeners cause memory leaks
- State stored in JavaScript closures doesn't survive page restoration

## Solution: Event Delegation Pattern

Implement a global event delegation pattern that:

- Always works with browser navigation
- Is framework-agnostic (HTMX, Turbo, vanilla)
- Prevents memory leaks
- Simplifies code
- Improves performance

## Implementation Pattern

### Pattern to Remove

```javascript
function initComponent(element) {
  // REMOVE: Initialization checks
  if (element.hasAttribute("data-initialized")) return;
  element.setAttribute("data-initialized", "true");

  // REMOVE: Component state objects
  const state = {
    currentIndex: 0,
    isOpen: false,
    // etc...
  };

  // REMOVE: Direct event listeners
  button.addEventListener("click", handler);
  element.addEventListener("mouseenter", onHover);

  // REMOVE: Cleanup methods
  function destroy() {
    button.removeEventListener("click", handler);
  }
}
```

### Pattern to Implement

```javascript
(function () {
  // Global setup - runs ONCE
  let initialized = false;
  const globalResources = new Map(); // For intervals, observers, etc.

  function setupGlobalHandlers() {
    if (initialized) return;
    initialized = true;

    // Event delegation at document level
    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("mouseenter", handleMouseEnter, true); // Use capture for hover
    document.addEventListener("mouseleave", handleMouseLeave, true);

    // Setup global observers if needed
    setupIntersectionObserver();
  }

  function handleClick(e) {
    // Use closest() to find component elements
    const trigger = e.target.closest("[data-component-trigger]");
    if (trigger) {
      const component = trigger.closest(".component-root");
      if (component) {
        performAction(component);
      }
      return;
    }

    // Handle other click targets...
  }

  function performAction(component) {
    // Read state from DOM
    const isOpen = component.dataset.open === "true";

    // Update DOM state
    component.dataset.open = !isOpen;

    // Update visual state
    updateComponentVisuals(component);
  }

  function init(root = document) {
    setupGlobalHandlers(); // Only runs once

    // Initialize components in root (set initial state, start observers)
    root.querySelectorAll(".component-root").forEach(initComponent);
  }

  function initComponent(component) {
    // Set initial state from data attributes
    const currentIndex = component.dataset.currentIndex || "0";
    updateComponentVisuals(component);

    // Start observers if needed (e.g., for autoplay)
    if (component.dataset.autoplay === "true") {
      startAutoplay(component);
    }
  }

  // Export
  window.templUI = window.templUI || {};
  window.templUI.componentName = { init };

  // Auto-initialize
  document.addEventListener("DOMContentLoaded", () => init());
})();
```

## Key Principles

### 1. State Management

- **Store state in DOM** using data attributes
- **No JavaScript state objects** that can be lost
- **Read state when needed** from data attributes

### 2. Event Handling

- **Use event delegation** at document level
- **No direct event listeners** on components
- **Use event.target.closest()** to find elements

### 3. Resource Management

- **Use Maps/Sets** for global resources (intervals, observers)
- **Leverage browser APIs** (IntersectionObserver, MutationObserver)
- **No cleanup needed** for delegated events

### 4. Initialization

- **Remove all initialized checks**
- **Components are always re-initializable**
- **Global handlers setup once**

## Components to Refactor

### Priority 1 - Core Interactive Components (7)

1. **modal.js** - Click events for open/close
2. **drawer.js** - Click events for open/close
3. **dropdown.js** - Click events for menu items
4. **tabs.js** - Click events for tab switching
5. **popover.js** - Click/hover events for triggers
6. **toast.js** - Timer and dismiss events
7. **selectbox.js** - Click events for options

### Priority 2 - Form Components (6)

8. **inputotp.js** - Input/keydown events
9. **textarea.js** - Input event for auto-resize
10. **tagsinput.js** - Keyboard/click events for tags
11. **slider.js** - Mouse/touch drag events
12. **rating.js** - Click/hover events for stars
13. **datepicker.js** - Click events for date selection

### Priority 3 - Other Components (4)

14. **calendar.js** - Click events for navigation
15. **timepicker.js** - Click/input events
16. **avatar.js** - Image load/error events
17. **carousel.js** - ✅ ALREADY COMPLETED

### Do NOT Refactor (5)

- **chart.js** - Chart.js library wrapper only
- **code.js** - Syntax highlighting setup only
- **input.js** - Check first, likely validation only
- **label.js** - Check first, likely styling only
- **progress.js** - Visual updates only, no user events

## Testing Checklist

After refactoring each component, verify:

- [ ] Works on initial page load
- [ ] Works after HTMX swaps
- [ ] Works after browser back/forward navigation
- [ ] No duplicate event handlers after multiple init calls
- [ ] Autoplay/intervals stop when component is removed from view
- [ ] State persists correctly in DOM attributes
- [ ] No memory leaks (check with DevTools)

## Example: Carousel Refactoring

See `carousel.js` for a complete example of the pattern implementation.

## Notes

- Use `data-*` attributes consistently across components (data-tui-[component]-\*)
- Use css/tailwind changes on statechanges only via data attributes and the states which are changed by javascript and javascript should not change/toggle tailwind classes
- Prefer CSS classes for visual states over inline styles
- Use `:hover` pseudo-class instead of JavaScript hover when possible
- Consider using CSS animations instead of JavaScript timers

