(function () {
  // Global setup - runs once
  let initialized = false;
  const autoplayIntervals = new Map();
  let intersectionObserver = null;
  
  function setupGlobalHandlers() {
    if (initialized) return;
    initialized = true;
    
    // Single click handler for ALL carousels
    document.addEventListener('click', (e) => {
      // Previous button
      if (e.target.closest('.carousel-prev')) {
        const carousel = e.target.closest('.carousel-component');
        if (carousel) moveCarousel(carousel, -1);
        return;
      }
      
      // Next button
      if (e.target.closest('.carousel-next')) {
        const carousel = e.target.closest('.carousel-component');
        if (carousel) moveCarousel(carousel, 1);
        return;
      }
      
      // Indicators
      const indicator = e.target.closest('.carousel-indicator');
      if (indicator) {
        const carousel = indicator.closest('.carousel-component');
        if (carousel) {
          const indicators = carousel.querySelectorAll('.carousel-indicator');
          const index = Array.from(indicators).indexOf(indicator);
          if (index >= 0) setCarouselIndex(carousel, index);
        }
      }
    });
    
    // Touch handling
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
      const track = e.target.closest('.carousel-track');
      if (track) {
        touchStartX = e.touches[0].clientX;
      }
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      const track = e.target.closest('.carousel-track');
      if (track) {
        const carousel = track.closest('.carousel-component');
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          moveCarousel(carousel, diff > 0 ? 1 : -1);
        }
      }
    }, { passive: true });
    
    // Setup IntersectionObserver for autoplay
    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const carousel = entry.target;
        if (entry.isIntersecting && carousel.dataset.tuiCarouselAutoplay === 'true') {
          startAutoplay(carousel);
        } else {
          stopAutoplay(carousel);
        }
      });
    });
  }
  
  function moveCarousel(carousel, direction) {
    const current = parseInt(carousel.dataset.currentIndex || '0');
    const items = carousel.querySelectorAll('.carousel-item');
    const count = items.length;
    const loop = carousel.dataset.tuiCarouselLoop === 'true';
    
    let next = current + direction;
    
    if (loop) {
      next = (next + count) % count;
    } else {
      next = Math.max(0, Math.min(next, count - 1));
    }
    
    setCarouselIndex(carousel, next);
  }
  
  function setCarouselIndex(carousel, index) {
    const track = carousel.querySelector('.carousel-track');
    const indicators = carousel.querySelectorAll('.carousel-indicator');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    const count = carousel.querySelectorAll('.carousel-item').length;
    const loop = carousel.dataset.tuiCarouselLoop === 'true';
    
    // Update state
    carousel.dataset.currentIndex = index;
    
    // Update track position
    track.style.transform = `translateX(-${index * 100}%)`;
    
    // Update indicators
    indicators.forEach((ind, i) => {
      if (i < count) {
        ind.style.display = '';
        ind.classList.toggle('bg-white', i === index);
        ind.classList.toggle('bg-white/50', i !== index);
      } else {
        ind.style.display = 'none';
      }
    });
    
    // Update buttons
    if (prevBtn) {
      prevBtn.disabled = !loop && index === 0;
      prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
      prevBtn.classList.toggle('cursor-not-allowed', prevBtn.disabled);
    }
    
    if (nextBtn) {
      nextBtn.disabled = !loop && index === count - 1;
      nextBtn.classList.toggle('opacity-50', nextBtn.disabled);
      nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
    }
  }
  
  function startAutoplay(carousel) {
    stopAutoplay(carousel); // Clear any existing
    
    const interval = parseInt(carousel.dataset.tuiCarouselInterval || '5000');
    const intervalId = setInterval(() => {
      // Don't advance if hovering
      if (!carousel.matches(':hover')) {
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
    const currentIndex = parseInt(carousel.dataset.currentIndex || '0');
    setCarouselIndex(carousel, currentIndex);
    
    // Observe for autoplay
    if (carousel.dataset.tuiCarouselAutoplay === 'true' && intersectionObserver) {
      intersectionObserver.observe(carousel);
    }
  }
  
  function init(root = document) {
    setupGlobalHandlers();
    
    // Initialize all carousels in root
    const carousels = root.querySelectorAll('.carousel-component');
    carousels.forEach(initCarousel);
  }
  
  // Export
  window.templUI = window.templUI || {};
  window.templUI.carousel = { init: init };
  
  // Auto-initialize
  document.addEventListener('DOMContentLoaded', () => init());
})();
