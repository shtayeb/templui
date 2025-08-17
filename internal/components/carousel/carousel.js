(function () {
  // Global setup - runs once
  let initialized = false;
  const autoplayIntervals = new Map();
  let intersectionObserver = null;

  // Global drag state (per carousel via data attributes)
  function setupGlobalHandlers() {
    if (initialized) return;
    initialized = true;

    // Single click handler for ALL carousels
    document.addEventListener("click", (e) => {
      // Previous button
      if (e.target.closest(".carousel-prev")) {
        const carousel = e.target.closest(".carousel-component");
        if (carousel) moveCarousel(carousel, -1);
        return;
      }

      // Next button
      if (e.target.closest(".carousel-next")) {
        const carousel = e.target.closest(".carousel-component");
        if (carousel) moveCarousel(carousel, 1);
        return;
      }

      // Indicators
      const indicator = e.target.closest(".carousel-indicator");
      if (indicator) {
        const carousel = indicator.closest(".carousel-component");
        if (carousel) {
          const indicators = carousel.querySelectorAll(".carousel-indicator");
          const index = Array.from(indicators).indexOf(indicator);
          if (index >= 0) setCarouselIndex(carousel, index);
        }
      }
    });

    // Mouse drag support
    document.addEventListener("mousedown", (e) => {
      const track = e.target.closest(".carousel-track");
      if (track) {
        const carousel = track.closest(".carousel-component");
        startDrag(carousel, e.clientX, "mouse");
        e.preventDefault();
      }
    });

    document.addEventListener("mousemove", (e) => {
      document
        .querySelectorAll('.carousel-component[data-dragging="true"]')
        .forEach((carousel) => {
          if (carousel.dataset.dragType === "mouse") {
            doDrag(carousel, e.clientX);
          }
        });
    });

    document.addEventListener("mouseup", (e) => {
      document
        .querySelectorAll('.carousel-component[data-dragging="true"]')
        .forEach((carousel) => {
          if (carousel.dataset.dragType === "mouse") {
            endDrag(carousel, e.clientX);
          }
        });
    });

    // Touch support
    document.addEventListener(
      "touchstart",
      (e) => {
        const track = e.target.closest(".carousel-track");
        if (track) {
          const carousel = track.closest(".carousel-component");
          startDrag(carousel, e.touches[0].clientX, "touch");
        }
      },
      { passive: false },
    );

    document.addEventListener(
      "touchmove",
      (e) => {
        document
          .querySelectorAll('.carousel-component[data-dragging="true"]')
          .forEach((carousel) => {
            if (carousel.dataset.dragType === "touch") {
              doDrag(carousel, e.touches[0].clientX);
              e.preventDefault();
            }
          });
      },
      { passive: false },
    );

    document.addEventListener(
      "touchend",
      (e) => {
        document
          .querySelectorAll('.carousel-component[data-dragging="true"]')
          .forEach((carousel) => {
            if (carousel.dataset.dragType === "touch") {
              const touch = e.changedTouches[0];
              endDrag(carousel, touch.clientX);
            }
          });
      },
      { passive: false },
    );

    // Mouse leave handling
    document.addEventListener(
      "mouseleave",
      (e) => {
        if (e.target.closest(".carousel-track")) {
          const carousel = e.target.closest(".carousel-component");
          if (carousel && carousel.dataset.dragging === "true") {
            endDrag(carousel, parseInt(carousel.dataset.currentX || "0"));
          }
        }
      },
      true,
    );

    // Hover handling for autoplay
    document.addEventListener(
      "mouseenter",
      (e) => {
        const carousel = e.target.closest(".carousel-component");
        if (carousel && carousel.dataset.tuiCarouselAutoplay === "true") {
          carousel.dataset.hovering = "true";
        }
      },
      true,
    );

    document.addEventListener(
      "mouseleave",
      (e) => {
        const carousel = e.target.closest(".carousel-component");
        if (carousel && carousel.dataset.tuiCarouselAutoplay === "true") {
          carousel.dataset.hovering = "false";
        }
      },
      true,
    );

    // Setup IntersectionObserver for autoplay
    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const carousel = entry.target;
        if (
          entry.isIntersecting &&
          carousel.dataset.tuiCarouselAutoplay === "true"
        ) {
          startAutoplay(carousel);
        } else {
          stopAutoplay(carousel);
        }
      });
    });
  }

  function startDrag(carousel, clientX, type) {
    const track = carousel.querySelector(".carousel-track");
    if (!track) return;

    carousel.dataset.dragging = "true";
    carousel.dataset.dragType = type;
    carousel.dataset.dragStartX = clientX;
    carousel.dataset.currentX = clientX;
    carousel.dataset.dragStartTime = Date.now();

    track.style.cursor = "grabbing";
    track.style.userSelect = "none";
    track.style.transition = "none";

    // Stop autoplay during drag
    if (carousel.dataset.tuiCarouselAutoplay === "true") {
      stopAutoplay(carousel);
    }
  }

  function doDrag(carousel, clientX) {
    if (carousel.dataset.dragging !== "true") return;

    const track = carousel.querySelector(".carousel-track");
    if (!track) return;

    carousel.dataset.currentX = clientX;
    const startX = parseInt(carousel.dataset.dragStartX || "0");
    const diff = clientX - startX;
    const currentIndex = parseInt(carousel.dataset.currentIndex || "0");
    const currentOffset = -currentIndex * 100;
    const dragOffset = (diff / track.offsetWidth) * 100;

    track.style.transform = `translateX(${currentOffset + dragOffset}%)`;
  }

  function endDrag(carousel, clientX) {
    if (carousel.dataset.dragging !== "true") return;

    const track = carousel.querySelector(".carousel-track");
    if (!track) return;

    carousel.dataset.dragging = "false";
    track.style.cursor = "grab";
    track.style.userSelect = "";
    track.style.transition = "";

    const startX = parseInt(carousel.dataset.dragStartX || "0");
    const diff = startX - clientX;
    const threshold = 50; // Minimum drag distance in pixels
    const dragStartTime = parseInt(carousel.dataset.dragStartTime || "0");
    const velocity = Math.abs(diff) / (Date.now() - dragStartTime);

    // Determine if we should change slide based on distance or velocity
    if (Math.abs(diff) > threshold || velocity > 0.5) {
      if (diff > 0) {
        moveCarousel(carousel, 1);
      } else {
        moveCarousel(carousel, -1);
      }
    } else {
      // Snap back to current slide
      const currentIndex = parseInt(carousel.dataset.currentIndex || "0");
      setCarouselIndex(carousel, currentIndex);
    }

    // Restart autoplay if it was active
    if (
      carousel.dataset.tuiCarouselAutoplay === "true" &&
      carousel.dataset.hovering !== "true"
    ) {
      startAutoplay(carousel);
    }
  }

  function moveCarousel(carousel, direction) {
    const current = parseInt(carousel.dataset.currentIndex || "0");
    const items = carousel.querySelectorAll(".carousel-item");
    const count = items.length;
    const loop = carousel.dataset.tuiCarouselLoop === "true";

    let next = current + direction;

    if (loop) {
      next = (next + count) % count;
    } else {
      next = Math.max(0, Math.min(next, count - 1));
    }

    setCarouselIndex(carousel, next);
  }

  function setCarouselIndex(carousel, index) {
    const track = carousel.querySelector(".carousel-track");
    const indicators = carousel.querySelectorAll(".carousel-indicator");
    const prevBtn = carousel.querySelector(".carousel-prev");
    const nextBtn = carousel.querySelector(".carousel-next");
    const count = carousel.querySelectorAll(".carousel-item").length;
    const loop = carousel.dataset.tuiCarouselLoop === "true";

    // Update state
    carousel.dataset.currentIndex = index;

    // Update track position
    if (track) {
      track.style.transform = `translateX(-${index * 100}%)`;
      track.style.cursor = "grab"; // Ensure grab cursor is set
    }

    // Update indicators with correct colors from main branch
    indicators.forEach((ind, i) => {
      if (i < count) {
        ind.style.display = "";
        if (i === index) {
          ind.classList.add("bg-primary");
          ind.classList.remove("bg-foreground/30");
        } else {
          ind.classList.remove("bg-primary");
          ind.classList.add("bg-foreground/30");
        }
      } else {
        ind.style.display = "none";
      }
    });

    // Update buttons
    if (prevBtn) {
      prevBtn.disabled = !loop && index === 0;
      prevBtn.classList.toggle("opacity-50", prevBtn.disabled);
      prevBtn.classList.toggle("cursor-not-allowed", prevBtn.disabled);
    }

    if (nextBtn) {
      nextBtn.disabled = !loop && index === count - 1;
      nextBtn.classList.toggle("opacity-50", nextBtn.disabled);
      nextBtn.classList.toggle("cursor-not-allowed", nextBtn.disabled);
    }

    // Restart autoplay if needed
    if (
      carousel.dataset.tuiCarouselAutoplay === "true" &&
      carousel.dataset.hovering !== "true"
    ) {
      stopAutoplay(carousel);
      startAutoplay(carousel);
    }
  }

  function startAutoplay(carousel) {
    stopAutoplay(carousel); // Clear any existing

    const interval = parseInt(carousel.dataset.tuiCarouselInterval || "5000");
    const intervalId = setInterval(() => {
      // Don't advance if hovering or dragging
      if (
        carousel.dataset.hovering !== "true" &&
        carousel.dataset.dragging !== "true"
      ) {
        moveCarousel(carousel, 1);
      }
    }, interval);

    autoplayIntervals.set(carousel, intervalId);
  }

  function stopAutoplay(carousel) {
    const intervalId = autoplayIntervals.get(carousel);
    if (intervalId) {
      clearInterval(intervalId);
      autoplayIntervals.delete(carousel);
    }
  }

  function initCarousel(carousel) {
    // Initialize state from DOM or defaults
    const currentIndex = parseInt(carousel.dataset.currentIndex || "0");
    setCarouselIndex(carousel, currentIndex);

    // Observe for autoplay
    if (
      carousel.dataset.tuiCarouselAutoplay === "true" &&
      intersectionObserver
    ) {
      intersectionObserver.observe(carousel);
    }
  }

  function init(root = document) {
    setupGlobalHandlers();

    // Initialize all carousels in root
    const carousels = root.querySelectorAll(".carousel-component");
    carousels.forEach(initCarousel);
  }

  // Export
  window.templUI = window.templUI || {};
  window.templUI.carousel = { init: init };

  // Auto-initialize
  document.addEventListener("DOMContentLoaded", () => init());
})();

