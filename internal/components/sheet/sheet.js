(function () {
  'use strict';
  
  let openSheetId = null;
  
  // Open sheet
  function openSheet(sheetId) {
    const backdrop = document.getElementById(sheetId);
    const content = document.getElementById(sheetId + '-content');
    if (!backdrop || !content) return;
    
    openSheetId = sheetId;
    backdrop.setAttribute('data-tui-sheet-open', 'true');
    content.setAttribute('data-tui-sheet-open', 'true');
    document.body.style.overflow = 'hidden';
    
    // Update triggers
    document.querySelectorAll(`[data-tui-sheet-trigger="${sheetId}"]`).forEach(trigger => {
      trigger.setAttribute('data-tui-sheet-open', 'true');
    });
  }
  
  // Close sheet
  function closeSheet(sheetId) {
    const backdrop = document.getElementById(sheetId);
    const content = document.getElementById(sheetId + '-content');
    if (!backdrop || !content) return;
    
    backdrop.setAttribute('data-tui-sheet-open', 'false');
    content.setAttribute('data-tui-sheet-open', 'false');
    
    // Update triggers
    document.querySelectorAll(`[data-tui-sheet-trigger="${sheetId}"]`).forEach(trigger => {
      trigger.setAttribute('data-tui-sheet-open', 'false');
    });
    
    // Reset body overflow after animation
    setTimeout(() => {
      if (backdrop.getAttribute('data-tui-sheet-open') === 'false') {
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
})();