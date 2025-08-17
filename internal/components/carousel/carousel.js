(function() {
  'use strict';
  
  // Global state for autoplay intervals
  const autoplays = new Map();
  
  // Handle all clicks
  document.addEventListener('click', (e) => {
    // Previous button
    if (e.target.closest('[data-tui-carousel-prev]')) {
      const carousel = e.target.closest('[data-tui-carousel]');
      if (carousel) navigate(carousel, -1);
      return;
    }
    
    // Next button
    if (e.target.closest('[data-tui-carousel-next]')) {
      const carousel = e.target.closest('[data-tui-carousel]');
      if (carousel) navigate(carousel, 1);
      return;
    }
    
    // Indicator
    const indicator = e.target.closest('[data-tui-carousel-indicator]');
    if (indicator) {
      const carousel = indicator.closest('[data-tui-carousel]');
      const index = parseInt(indicator.dataset.tuiCarouselIndicator);
      if (carousel && !isNaN(index)) {
        updateCarousel(carousel, index);
      }
    }
  });
  
  // Drag/swipe support
  let dragState = null;
  
  function startDrag(e) {
    const track = e.target.closest('[data-tui-carousel-track]');
    if (!track) return;
    
    const carousel = track.closest('[data-tui-carousel]');
    if (!carousel) return;
    
    e.preventDefault();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    
    dragState = {
      carousel,
      track,
      startX: clientX,
      currentX: clientX,
      startTime: Date.now()
    };
    
    track.style.cursor = 'grabbing';
    track.style.transition = 'none';
    
    // Stop autoplay during drag
    stopAutoplay(carousel);
  }
  
  function doDrag(e) {
    if (!dragState) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragState.currentX = clientX;
    
    const diff = clientX - dragState.startX;
    const currentIndex = parseInt(dragState.carousel.dataset.tuiCarouselCurrent || '0');
    const offset = -currentIndex * 100 + (diff / dragState.track.offsetWidth) * 100;
    
    dragState.track.style.transform = `translateX(${offset}%)`;
  }
  
  function endDrag(e) {
    if (!dragState) return;
    
    const { carousel, track, startX, startTime } = dragState;
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : (e.clientX || dragState.currentX);
    
    track.style.cursor = '';
    track.style.transition = '';
    
    const diff = startX - clientX;
    const velocity = Math.abs(diff) / (Date.now() - startTime);
    
    // Navigate if drag was significant
    if (Math.abs(diff) > 50 || velocity > 0.5) {
      navigate(carousel, diff > 0 ? 1 : -1);
    } else {
      // Snap back
      const currentIndex = parseInt(carousel.dataset.tuiCarouselCurrent || '0');
      updateCarousel(carousel, currentIndex);
    }
    
    dragState = null;
    
    // Restart autoplay if needed
    if (carousel.dataset.tuiCarouselAutoplay === 'true' && !carousel.matches(':hover')) {
      startAutoplay(carousel);
    }
  }
  
  // Mouse events
  document.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('mouseleave', (e) => {
    if (e.target === document.documentElement) endDrag(e);
  });
  
  // Touch events
  document.addEventListener('touchstart', startDrag, { passive: false });
  document.addEventListener('touchmove', doDrag, { passive: false });
  document.addEventListener('touchend', endDrag, { passive: false });
  
  // Navigation
  function navigate(carousel, direction) {
    const current = parseInt(carousel.dataset.tuiCarouselCurrent || '0');
    const items = carousel.querySelectorAll('[data-tui-carousel-item]');
    const count = items.length;
    
    if (count === 0) return;
    
    let next = current + direction;
    
    // Handle looping
    if (carousel.dataset.tuiCarouselLoop === 'true') {
      next = ((next % count) + count) % count;
    } else {
      next = Math.max(0, Math.min(next, count - 1));
    }
    
    updateCarousel(carousel, next);
  }
  
  // Update carousel to show specific index
  function updateCarousel(carousel, index) {
    const track = carousel.querySelector('[data-tui-carousel-track]');
    const indicators = carousel.querySelectorAll('[data-tui-carousel-indicator]');
    const prevBtn = carousel.querySelector('[data-tui-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-tui-carousel-next]');
    const items = carousel.querySelectorAll('[data-tui-carousel-item]');
    const count = items.length;
    
    // Update state
    carousel.dataset.tuiCarouselCurrent = index;
    
    // Update track position
    if (track) {
      track.style.transform = `translateX(-${index * 100}%)`;
    }
    
    // Update indicators
    indicators.forEach((ind, i) => {
      ind.dataset.tuiCarouselActive = (i === index) ? 'true' : 'false';
      // Keep classes for backwards compatibility
      ind.classList.toggle('bg-primary', i === index);
      ind.classList.toggle('bg-foreground/30', i !== index);
    });
    
    // Update navigation buttons
    const isLoop = carousel.dataset.tuiCarouselLoop === 'true';
    
    if (prevBtn) {
      prevBtn.disabled = !isLoop && index === 0;
      prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
    }
    
    if (nextBtn) {
      nextBtn.disabled = !isLoop && index === count - 1;
      nextBtn.classList.toggle('opacity-50', nextBtn.disabled);
    }
  }
  
  // Autoplay management
  function startAutoplay(carousel) {
    if (carousel.dataset.tuiCarouselAutoplay !== 'true') return;
    
    stopAutoplay(carousel);
    
    const interval = parseInt(carousel.dataset.tuiCarouselInterval || '5000');
    
    const id = setInterval(() => {
      // Stop if removed from DOM
      if (!document.contains(carousel)) {
        stopAutoplay(carousel);
        return;
      }
      
      // Skip if hovering or dragging
      if (carousel.matches(':hover') || dragState?.carousel === carousel) {
        return;
      }
      
      navigate(carousel, 1);
    }, interval);
    
    autoplays.set(carousel, id);
  }
  
  function stopAutoplay(carousel) {
    const id = autoplays.get(carousel);
    if (id) {
      clearInterval(id);
      autoplays.delete(carousel);
    }
  }
  
  // Initialize carousels when DOM is ready
  function initCarousels() {
    document.querySelectorAll('[data-tui-carousel]').forEach(carousel => {
      // Set initial state
      const index = parseInt(carousel.dataset.tuiCarouselCurrent || '0');
      updateCarousel(carousel, index);
      
      // Start autoplay if in viewport
      if (carousel.dataset.tuiCarouselAutoplay === 'true') {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              startAutoplay(entry.target);
            } else {
              stopAutoplay(entry.target);
            }
          });
        });
        observer.observe(carousel);
      }
    });
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousels);
  } else {
    initCarousels();
  }
})();