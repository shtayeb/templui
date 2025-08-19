(function () {
  'use strict';
  
  const toastTimers = new Map();
  
  // Remove toast
  function removeToast(toast) {
    const state = toastTimers.get(toast);
    if (state) {
      clearTimeout(state.timer);
      toastTimers.delete(toast);
    }
    
    toast.classList.remove('toast-enter-active');
    toast.classList.add('toast-leave-active');
    
    toast.addEventListener('transitionend', () => {
      toast.remove();
    }, { once: true });
  }
  
  // Start timer
  function startTimer(toast, duration) {
    if (duration <= 0) return;
    
    const state = toastTimers.get(toast) || {};
    clearTimeout(state.timer);
    
    state.startTime = Date.now();
    state.remaining = duration;
    state.paused = false;
    state.timer = setTimeout(() => removeToast(toast), duration);
    
    toastTimers.set(toast, state);
    
    // Update progress bar
    const progress = toast.querySelector('[data-tui-toast-progress]');
    if (progress) {
      progress.style.transition = `width ${duration}ms linear`;
      requestAnimationFrame(() => {
        progress.style.width = '0%';
      });
    }
  }
  
  // Pause timer
  function pauseTimer(toast) {
    const state = toastTimers.get(toast);
    if (!state || state.paused || state.remaining <= 0) return;
    
    clearTimeout(state.timer);
    state.remaining -= Date.now() - state.startTime;
    state.paused = true;
    
    const progress = toast.querySelector('[data-tui-toast-progress]');
    if (progress) {
      const width = window.getComputedStyle(progress).width;
      progress.style.transition = 'none';
      progress.style.width = width;
    }
  }
  
  // Resume timer
  function resumeTimer(toast) {
    const state = toastTimers.get(toast);
    if (!state || !state.paused || state.remaining <= 0) return;
    startTimer(toast, state.remaining);
  }
  
  // Initialize toast
  function initToast(toast) {
    const duration = parseInt(toast.getAttribute('data-tui-toast-duration') || '0');
    const progress = toast.querySelector('[data-tui-toast-progress]');
    
    // Set initial state
    toastTimers.set(toast, {
      timer: null,
      remaining: duration,
      startTime: Date.now(),
      paused: false
    });
    
    // Animate in
    setTimeout(() => {
      toast.classList.add('toast-enter-active');
      if (progress) {
        progress.style.width = '100%';
      }
      startTimer(toast, duration);
    }, 50);
  }
  
  // Event delegation
  document.addEventListener('click', (e) => {
    const dismissBtn = e.target.closest('[data-tui-toast-dismiss]');
    if (dismissBtn) {
      const toast = dismissBtn.closest('[data-tui-toast]');
      if (toast) removeToast(toast);
    }
  });
  
  document.addEventListener('mouseenter', (e) => {
    const toast = e.target.closest('[data-tui-toast]');
    if (toast && toastTimers.has(toast)) {
      pauseTimer(toast);
    }
  }, true);
  
  document.addEventListener('mouseleave', (e) => {
    const toast = e.target.closest('[data-tui-toast]');
    if (toast && toastTimers.has(toast)) {
      resumeTimer(toast);
    }
  }, true);
  
  // MutationObserver for new toasts
  new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          if (node.matches?.('[data-tui-toast]') && !toastTimers.has(node)) {
            initToast(node);
          }
          node.querySelectorAll?.('[data-tui-toast]').forEach(toast => {
            if (!toastTimers.has(toast)) {
              initToast(toast);
            }
          });
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();