(function () {
  'use strict';
  
  // Handle image load events using capture phase (since load doesn't bubble)
  document.addEventListener('load', (e) => {
    if (e.target.matches('[data-tui-avatar-image]')) {
      const image = e.target;
      const fallback = image.parentElement?.querySelector('[data-tui-avatar-fallback]');
      
      image.style.display = '';
      if (fallback) {
        fallback.style.display = 'none';
      }
    }
  }, true); // Use capture phase
  
  // Handle image error events using capture phase (since error doesn't bubble)
  document.addEventListener('error', (e) => {
    if (e.target.matches('[data-tui-avatar-image]')) {
      const image = e.target;
      const fallback = image.parentElement?.querySelector('[data-tui-avatar-fallback]');
      
      image.style.display = 'none';
      if (fallback) {
        fallback.style.display = '';
      }
    }
  }, true); // Use capture phase
})();
