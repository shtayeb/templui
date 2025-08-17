(function () {
  function initCarousel(carousel) {
    if (!carousel || carousel.hasAttribute("data-tui-carousel-initialized")) return;
    carousel.setAttribute("data-tui-carousel-initialized", "true");
    
    const track = carousel.querySelector(".carousel-track");
    const items = Array.from(track?.querySelectorAll(".carousel-item") || []);
    if (items.length === 0) return;

    const indicators = Array.from(
      carousel.querySelectorAll(".carousel-indicator")
    );
    const prevBtn = carousel.querySelector(".carousel-prev");
    const nextBtn = carousel.querySelector(".carousel-next");

    const state = {
      currentIndex: 0,
      slideCount: items.length,
      autoplay: carousel.getAttribute("data-tui-carousel-autoplay") === "true",
      interval: parseInt(carousel.getAttribute("data-tui-carousel-interval") || 5000),
      loop: carousel.getAttribute("data-tui-carousel-loop") === "true",
      autoplayInterval: null,
      isHovering: false,
      isDragging: false,
      startX: 0,
      currentX: 0,
      dragStartTime: 0,
    };

    function updateTrackPosition() {
      track.style.transform = `translateX(-${state.currentIndex * 100}%)`;
    }

    function updateIndicators() {
      indicators.forEach((indicator, i) => {
        if (i < state.slideCount) {
          if (i === state.currentIndex) {
            indicator.classList.add("bg-primary");
            indicator.classList.remove("bg-foreground/30");
          } else {
            indicator.classList.remove("bg-primary");
            indicator.classList.add("bg-foreground/30");
          }
          indicator.style.display = "";
        } else {
          indicator.style.display = "none";
        }
      });
    }

    function updateButtons() {
      if (prevBtn) {
        prevBtn.disabled = !state.loop && state.currentIndex === 0;
        prevBtn.classList.toggle("opacity-50", prevBtn.disabled);
        prevBtn.classList.toggle("cursor-not-allowed", prevBtn.disabled);
      }

      if (nextBtn) {
        nextBtn.disabled =
          !state.loop && state.currentIndex === state.slideCount - 1;
        nextBtn.classList.toggle("opacity-50", nextBtn.disabled);
        nextBtn.classList.toggle("cursor-not-allowed", nextBtn.disabled);
      }
    }

    function startAutoplay() {
      if (state.autoplayInterval) {
        clearInterval(state.autoplayInterval);
      }

      if (state.autoplay) {
        state.autoplayInterval = setInterval(() => {
          if (!state.isHovering) {
            goToNext();
          }
        }, state.interval);
      }
    }

    function stopAutoplay() {
      if (state.autoplayInterval) {
        clearInterval(state.autoplayInterval);
        state.autoplayInterval = null;
      }
    }

    function goToNext() {
      let nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.slideCount) {
        if (state.loop) {
          nextIndex = 0;
        } else {
          return;
        }
      }
      goToSlide(nextIndex);
    }

    function goToPrev() {
      let prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        if (state.loop) {
          prevIndex = state.slideCount - 1;
        } else {
          return;
        }
      }
      goToSlide(prevIndex);
    }

    function goToSlide(index) {
      if (index < 0 || index >= state.slideCount) {
        if (state.loop) {
          index = (index + state.slideCount) % state.slideCount;
        } else {
          return;
        }
      }

      if (index === state.currentIndex) return;

      state.currentIndex = index;
      updateTrackPosition();
      updateIndicators();
      updateButtons();

      if (state.autoplay && !state.isHovering) {
        stopAutoplay();
        startAutoplay();
      }
    }

    // Unified drag/swipe support for mouse and touch
    if (track) {
      // Set cursor style
      track.style.cursor = "grab";
      
      function startDrag(e) {
        state.isDragging = true;
        state.dragStartTime = Date.now();
        state.startX = e.clientX || e.touches?.[0]?.clientX || 0;
        state.currentX = state.startX;
        
        track.style.cursor = "grabbing";
        track.style.userSelect = "none";
        track.style.transition = "none";
        
        // Stop autoplay during drag
        if (state.autoplay) {
          stopAutoplay();
        }
      }
      
      function drag(e) {
        if (!state.isDragging) return;
        
        e.preventDefault();
        state.currentX = e.clientX || e.touches?.[0]?.clientX || 0;
        const diff = state.currentX - state.startX;
        const currentOffset = -state.currentIndex * 100;
        const dragOffset = (diff / track.offsetWidth) * 100;
        
        track.style.transform = `translateX(${currentOffset + dragOffset}%)`;
      }
      
      function endDrag(e) {
        if (!state.isDragging) return;
        
        state.isDragging = false;
        track.style.cursor = "grab";
        track.style.userSelect = "";
        track.style.transition = "";
        
        const endX = e.clientX || e.changedTouches?.[0]?.clientX || state.currentX;
        const diff = state.startX - endX;
        const threshold = 50; // Minimum drag distance in pixels
        const velocity = Math.abs(diff) / (Date.now() - state.dragStartTime);
        
        // Determine if we should change slide based on distance or velocity
        if (Math.abs(diff) > threshold || velocity > 0.5) {
          if (diff > 0) {
            goToNext();
          } else {
            goToPrev();
          }
        } else {
          // Snap back to current slide
          updateTrackPosition();
        }
        
        // Restart autoplay if it was active
        if (state.autoplay && !state.isHovering) {
          startAutoplay();
        }
      }
      
      // Mouse events
      track.addEventListener("mousedown", startDrag);
      window.addEventListener("mousemove", drag);
      window.addEventListener("mouseup", endDrag);
      
      // Touch events
      track.addEventListener("touchstart", startDrag, { passive: false });
      track.addEventListener("touchmove", drag, { passive: false });
      track.addEventListener("touchend", endDrag, { passive: false });
      
      // Cancel drag on mouse leave
      track.addEventListener("mouseleave", () => {
        if (state.isDragging) {
          endDrag({ clientX: state.currentX });
        }
      });
    }

    indicators.forEach((indicator, index) => {
      if (index < state.slideCount) {
        indicator.addEventListener("click", () => goToSlide(index));
      }
    });

    if (prevBtn) prevBtn.addEventListener("click", goToPrev);
    if (nextBtn) nextBtn.addEventListener("click", goToNext);

    carousel.addEventListener("mouseenter", () => {
      state.isHovering = true;
      if (state.autoplay) stopAutoplay();
    });

    carousel.addEventListener("mouseleave", () => {
      state.isHovering = false;
      if (state.autoplay) startAutoplay();
    });

    updateTrackPosition();
    updateIndicators();
    updateButtons();

    if (state.autoplay) startAutoplay();
  }

  function init(root = document) {
    if (root instanceof Element && root.matches(".carousel-component")) {
      initCarousel(root);
    }
    for (const carousel of root.querySelectorAll(".carousel-component:not([data-tui-carousel-initialized])")) {
      initCarousel(carousel);
    }
  }

  window.templUI = window.templUI || {};
  window.templUI.carousel = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();
