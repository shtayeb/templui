(function () {
  if (typeof window.toastHandler === "undefined") {
    window.toastHandler = true;
    window.toasts = new Map();

    function initToast(toast) {
      if (!toast || toast.hasAttribute("data-initialized")) return;
      toast.setAttribute("data-initialized", "true");
      
      if (window.toasts.has(toast)) return;

      const duration = parseInt(toast.getAttribute("data-tui-toast-duration") || "0");
      const progress = toast.querySelector("[data-tui-toast-progress]");
      const dismiss = toast.querySelector("[data-tui-toast-dismiss]");

      const state = {
        timer: null,
        remaining: duration,
        startTime: Date.now(),
        progress: progress,
        paused: false,
      };
      window.toasts.set(toast, state);

      function removeToast() {
        clearTimeout(state.timer);
        toast.classList.remove("toast-enter-active");
        toast.classList.add("toast-leave-active");

        toast.addEventListener(
          "transitionend",
          () => {
            toast.remove();
            window.toasts.delete(toast);
          },
          { once: true }
        );
      }

      function startTimer(time) {
        if (time <= 0) return;

        clearTimeout(state.timer);
        state.startTime = Date.now();
        state.remaining = time;
        state.paused = false;
        state.timer = setTimeout(removeToast, time);

        if (state.progress) {
          state.progress.style.transition = `width ${time}ms linear`;
          void state.progress.offsetWidth;
          state.progress.style.width = "0%";
        }
      }

      function pauseTimer() {
        if (state.paused || state.remaining <= 0) return;

        clearTimeout(state.timer);
        state.remaining -= Date.now() - state.startTime;
        state.paused = true;

        if (state.progress) {
          const width = window.getComputedStyle(state.progress).width;
          state.progress.style.transition = "none";
          state.progress.style.width = width;
        }
      }

      function resumeTimer() {
        if (!state.paused || state.remaining <= 0) return;
        startTimer(state.remaining);
      }

      if (duration > 0) {
        toast.addEventListener("mouseenter", pauseTimer);
        toast.addEventListener("mouseleave", resumeTimer);
      }

      if (dismiss) {
        dismiss.addEventListener("click", removeToast);
      }

      setTimeout(() => {
        toast.classList.add("toast-enter-active");
        if (state.progress) {
          state.progress.style.width = "100%";
        }
        startTimer(duration);
      }, 50);
    }

    function init(root = document) {
      const toastsToInit = [];
      if (root instanceof Element && root.matches("[data-tui-toast]")) {
        if (!root.hasAttribute("data-initialized")) {
          toastsToInit.push(root);
        }
      }
      if (root && typeof root.querySelectorAll === "function") {
        root.querySelectorAll("[data-tui-toast]:not([data-initialized])").forEach((toast) => {
          toastsToInit.push(toast);
        });
      }
      toastsToInit.forEach(initToast);
    }

    window.templUI = window.templUI || {};
    window.templUI.toast = { init: init };

    document.addEventListener("DOMContentLoaded", () => init());
  }
})();
