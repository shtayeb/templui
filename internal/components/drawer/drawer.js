(function () {
  'use strict';
  
  let openDrawerId = null;
  
  // Get transform value based on position
  function getTransform(position, isOpen) {
    if (isOpen) return 'translate(0)';
    
    switch (position) {
      case 'left': return 'translateX(-100%)';
      case 'right': return 'translateX(100%)';
      case 'top': return 'translateY(-100%)';
      case 'bottom': return 'translateY(100%)';
      default: return 'translateX(100%)';
    }
  }
  
  // Open drawer
  function openDrawer(drawerId) {
    const backdrop = document.getElementById(drawerId);
    const content = document.getElementById(drawerId + '-content');
    if (!backdrop || !content) return;
    
    const position = content.getAttribute('data-tui-drawer-position') || 'right';
    
    openDrawerId = drawerId;
    backdrop.style.display = 'block';
    content.style.display = 'block';
    backdrop.setAttribute('data-tui-drawer-open', 'true');
    document.body.style.overflow = 'hidden';
    
    // Update triggers
    document.querySelectorAll(`[data-tui-drawer-trigger="${drawerId}"]`).forEach(trigger => {
      trigger.setAttribute('data-tui-drawer-open', 'true');
    });
    
    // Animation
    requestAnimationFrame(() => {
      backdrop.style.transition = 'opacity 300ms ease';
      content.style.transition = 'opacity 300ms ease, transform 300ms ease';
      backdrop.style.opacity = '1';
      content.style.opacity = '1';
      content.style.transform = getTransform(position, true);
    });
  }
  
  // Close drawer
  function closeDrawer(drawerId) {
    const backdrop = document.getElementById(drawerId);
    const content = document.getElementById(drawerId + '-content');
    if (!backdrop || !content) return;
    
    const position = content.getAttribute('data-tui-drawer-position') || 'right';
    
    backdrop.setAttribute('data-tui-drawer-open', 'false');
    
    // Update triggers
    document.querySelectorAll(`[data-tui-drawer-trigger="${drawerId}"]`).forEach(trigger => {
      trigger.setAttribute('data-tui-drawer-open', 'false');
    });
    
    // Animation
    backdrop.style.opacity = '0';
    content.style.opacity = '0';
    content.style.transform = getTransform(position, false);
    
    // Hide after animation
    setTimeout(() => {
      if (backdrop.getAttribute('data-tui-drawer-open') === 'false') {
        backdrop.style.display = 'none';
        content.style.display = 'none';
        if (openDrawerId === drawerId) {
          openDrawerId = null;
          document.body.style.overflow = '';
        }
      }
    }, 300);
  }
  
  // Event delegation
  document.addEventListener('click', (e) => {
    // Handle trigger clicks
    const trigger = e.target.closest('[data-tui-drawer-trigger]');
    if (trigger) {
      const drawerId = trigger.getAttribute('data-tui-drawer-trigger');
      const backdrop = document.getElementById(drawerId);
      if (backdrop?.getAttribute('data-tui-drawer-open') === 'true') {
        closeDrawer(drawerId);
      } else {
        openDrawer(drawerId);
      }
      return;
    }
    
    // Handle close button clicks
    const closeBtn = e.target.closest('[data-tui-drawer-close]');
    if (closeBtn && openDrawerId) {
      closeDrawer(openDrawerId);
      return;
    }
    
    // Handle backdrop click
    if (openDrawerId && e.target.id === openDrawerId && e.target.hasAttribute('data-tui-drawer-component')) {
      closeDrawer(openDrawerId);
    }
  });
  
  // ESC key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openDrawerId) {
      closeDrawer(openDrawerId);
    }
  });
  
  // MutationObserver for initial setup
  new MutationObserver(() => {
    document.querySelectorAll('[data-tui-drawer-component="drawer"]').forEach(backdrop => {
      if (!backdrop.id || backdrop.hasAttribute('data-tui-drawer-setup')) return;
      backdrop.setAttribute('data-tui-drawer-setup', 'true');
      
      const content = document.getElementById(backdrop.id + '-content');
      if (!content) return;
      
      const position = content.getAttribute('data-tui-drawer-position') || 'right';
      const isInitiallyOpen = backdrop.hasAttribute('data-tui-drawer-initial-open');
      
      // Set initial closed state
      if (!isInitiallyOpen) {
        backdrop.style.display = 'none';
        content.style.display = 'none';
        backdrop.style.opacity = '0';
        content.style.opacity = '0';
        content.style.transform = getTransform(position, false);
      } else {
        // Open initially if needed
        openDrawer(backdrop.id);
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
})();