(function () {
  "use strict";

  const toastTimers = new Map();

  // Setup toast when it appears
  function setupToast(toast) {
    const duration = parseInt(toast.dataset.tuiToastDuration || "3000");
    const progress = toast.querySelector(".toast-progress");

    // Initialize timer state
    const state = {
      timer: null,
      startTime: Date.now(),
      remaining: duration,
      paused: false
    };
    toastTimers.set(toast, state);

    // Animate progress bar if present
    if (progress && duration > 0) {
      progress.style.transitionDuration = duration + "ms";
      requestAnimationFrame(() => {
        progress.style.transform = "scaleX(0)";
      });
    }

    // Auto-dismiss after duration
    if (duration > 0) {
      state.timer = setTimeout(() => dismissToast(toast), duration);
    }

    // Pause on hover
    toast.addEventListener("mouseenter", () => {
      const state = toastTimers.get(toast);
      if (!state || state.paused) return;

      // Clear the dismiss timer
      clearTimeout(state.timer);
      
      // Calculate remaining time
      state.remaining = state.remaining - (Date.now() - state.startTime);
      state.paused = true;

      // Pause progress animation
      if (progress) {
        const computed = getComputedStyle(progress);
        progress.style.transitionDuration = "0ms";
        progress.style.transform = computed.transform;
      }
    });

    // Resume on mouse leave
    toast.addEventListener("mouseleave", () => {
      const state = toastTimers.get(toast);
      if (!state || !state.paused || state.remaining <= 0) return;

      // Resume timer with remaining time
      state.startTime = Date.now();
      state.paused = false;
      state.timer = setTimeout(() => dismissToast(toast), state.remaining);

      // Resume progress animation
      if (progress) {
        progress.style.transitionDuration = state.remaining + "ms";
        progress.style.transform = "scaleX(0)";
      }
    });
  }

  // Dismiss toast with fade out
  function dismissToast(toast) {
    // Clean up timer state
    toastTimers.delete(toast);
    
    // Add transition for smooth fade out
    toast.style.transition = "opacity 300ms, transform 300ms";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(1rem)";
    
    // Remove after animation
    setTimeout(() => toast.remove(), 300);
  }

  // Handle dismiss button clicks
  document.addEventListener("click", (e) => {
    const dismissBtn = e.target.closest("[data-tui-toast-dismiss]");
    if (dismissBtn) {
      const toast = dismissBtn.closest("[data-tui-toast]");
      if (toast) dismissToast(toast);
    }
  });

  // Watch for new toasts
  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.matches?.("[data-tui-toast]")) {
          setupToast(node);
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();