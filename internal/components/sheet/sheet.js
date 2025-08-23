(function () {
  'use strict';
  
  let openSheetId = null;
  
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
  
  // Open sheet
  function openSheet(sheetId) {
    const backdrop = document.getElementById(sheetId);
    const content = document.getElementById(sheetId + '-content');
    if (!backdrop || !content) return;
    
    const position = content.getAttribute('data-tui-sheet-position') || 'right';
    
    openSheetId = sheetId;
    backdrop.style.display = 'block';
    content.style.display = 'block';
    backdrop.setAttribute('data-tui-sheet-open', 'true');
    document.body.style.overflow = 'hidden';
    
    // Update triggers
    document.querySelectorAll(`[data-tui-sheet-trigger="${sheetId}"]`).forEach(trigger => {
      trigger.setAttribute('data-tui-sheet-open', 'true');
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
  
  // Close sheet
  function closeSheet(sheetId) {
    const backdrop = document.getElementById(sheetId);
    const content = document.getElementById(sheetId + '-content');
    if (!backdrop || !content) return;
    
    const position = content.getAttribute('data-tui-sheet-position') || 'right';
    
    backdrop.setAttribute('data-tui-sheet-open', 'false');
    
    // Update triggers
    document.querySelectorAll(`[data-tui-sheet-trigger="${sheetId}"]`).forEach(trigger => {
      trigger.setAttribute('data-tui-sheet-open', 'false');
    });
    
    // Animation
    backdrop.style.opacity = '0';
    content.style.opacity = '0';
    content.style.transform = getTransform(position, false);
    
    // Hide after animation
    setTimeout(() => {
      if (backdrop.getAttribute('data-tui-sheet-open') === 'false') {
        backdrop.style.display = 'none';
        content.style.display = 'none';
        if (openSheetId === sheetId) {
          openSheetId = null;
          document.body.style.overflow = '';
        }
      }
    }, 300);
  }
  
  // Event delegation
  document.addEventListener('click', (e) => {
    // Handle trigger clicks
    const trigger = e.target.closest('[data-tui-sheet-trigger]');
    if (trigger) {
      const sheetId = trigger.getAttribute('data-tui-sheet-trigger');
      const backdrop = document.getElementById(sheetId);
      if (backdrop?.getAttribute('data-tui-sheet-open') === 'true') {
        closeSheet(sheetId);
      } else {
        openSheet(sheetId);
      }
      return;
    }
    
    // Handle close button clicks
    const closeBtn = e.target.closest('[data-tui-sheet-close]');
    if (closeBtn && openSheetId) {
      closeSheet(openSheetId);
      return;
    }
    
    // Handle backdrop click
    if (openSheetId && e.target.id === openSheetId && e.target.hasAttribute('data-tui-sheet-component')) {
      closeSheet(openSheetId);
    }
  });
  
  // ESC key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openSheetId) {
      closeSheet(openSheetId);
    }
  });
  
  // MutationObserver for initial setup
  new MutationObserver(() => {
    document.querySelectorAll('[data-tui-sheet-component="sheet"]').forEach(backdrop => {
      if (!backdrop.id || backdrop.hasAttribute('data-tui-sheet-setup')) return;
      backdrop.setAttribute('data-tui-sheet-setup', 'true');
      
      const content = document.getElementById(backdrop.id + '-content');
      if (!content) return;
      
      const position = content.getAttribute('data-tui-sheet-position') || 'right';
      const isInitiallyOpen = backdrop.hasAttribute('data-tui-sheet-initial-open');
      
      // Set initial closed state
      if (!isInitiallyOpen) {
        backdrop.style.display = 'none';
        content.style.display = 'none';
        backdrop.style.opacity = '0';
        content.style.opacity = '0';
        content.style.transform = getTransform(position, false);
      } else {
        // Open initially if needed
        openSheet(backdrop.id);
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
})();