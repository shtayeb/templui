(function () {
  'use strict';
  
  const openSheets = new Set();
  
  // Helper to get sheet elements
  const getSheetElements = (id) => ({
    backdrop: document.querySelector(`[data-tui-sheet-backdrop][data-sheet-instance="${id}"]`),
    content: document.querySelector(`[data-tui-sheet-content][data-sheet-instance="${id}"]`),
    wrapper: document.querySelector(`[data-tui-sheet][data-sheet-instance="${id}"]`)
  });
  
  // Toggle sheet state
  function toggleSheet(id, forceState) {
    const { backdrop, content } = getSheetElements(id);
    if (!backdrop || !content) return;
    
    const isOpen = backdrop.dataset.tuiSheetOpen === 'true';
    const newState = forceState !== undefined ? forceState : !isOpen;
    
    backdrop.dataset.tuiSheetOpen = newState;
    content.dataset.tuiSheetOpen = newState;
    
    if (newState) {
      openSheets.add(id);
      if (openSheets.size === 1) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      // Delay removal to allow animation to complete
      setTimeout(() => {
        openSheets.delete(id);
        if (openSheets.size === 0) {
          document.body.style.overflow = '';
        }
      }, 300);
    }
  }
  
  // Single click handler
  document.addEventListener('click', (e) => {
    // Handle trigger clicks
    const trigger = e.target.closest('[data-tui-sheet-trigger]');
    if (trigger?.dataset.sheetInstance) {
      toggleSheet(trigger.dataset.sheetInstance);
      return;
    }
    
    // Handle close button clicks
    const closeBtn = e.target.closest('[data-tui-sheet-close]');
    if (closeBtn) {
      const content = closeBtn.closest('[data-tui-sheet-content]');
      if (content?.dataset.sheetInstance) {
        toggleSheet(content.dataset.sheetInstance, false);
      }
      return;
    }
    
    // Handle backdrop clicks
    const backdrop = e.target.closest('[data-tui-sheet-backdrop]');
    if (backdrop?.dataset.sheetInstance) {
      const { wrapper } = getSheetElements(backdrop.dataset.sheetInstance);
      if (wrapper?.dataset.tuiSheetDisableClickaway !== 'true') {
        toggleSheet(backdrop.dataset.sheetInstance, false);
      }
    }
  });
  
  // ESC key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openSheets.size > 0) {
      const lastId = Array.from(openSheets).pop();
      const { wrapper } = getSheetElements(lastId);
      if (wrapper?.dataset.tuiSheetDisableEsc !== 'true') {
        toggleSheet(lastId, false);
      }
    }
  });
})();