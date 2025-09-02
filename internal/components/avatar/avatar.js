(function () {
  'use strict';
  
  // Check for broken images on init
  function checkImages() {
    document.querySelectorAll('[data-tui-avatar-image]').forEach((img) => {
      // If already complete and broken, hide it
      if (img.complete && img.naturalWidth === 0) {
        img.style.display = 'none';
      }
    });
  }
  
  // Run check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkImages);
  } else {
    checkImages();
  }
  
  // Hide future broken images
  document.addEventListener('error', (e) => {
    if (e.target.matches('[data-tui-avatar-image]')) {
      e.target.style.display = 'none';
    }
  }, true);
})();
