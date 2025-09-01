(function () {
  'use strict';
  
  let openModalId = null;
  
  // Open modal
  function openModal(modalId) {
    // Close any open modal first
    if (openModalId) closeModal(openModalId);
    
    const modal = document.getElementById(modalId);
    const content = modal?.querySelector('[data-tui-modal-content]');
    if (!modal || !content) return;
    
    openModalId = modalId;
    modal.style.display = 'flex';
    modal.setAttribute('data-tui-modal-open', 'true');
    document.body.style.overflow = 'hidden';
    
    // Update triggers
    document.querySelectorAll(`[data-tui-modal-trigger="${modalId}"]`).forEach(trigger => {
      trigger.setAttribute('data-tui-modal-trigger-open', 'true');
    });
    
    // Animation
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      modal.classList.add('opacity-100');
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    });
    
    // Focus first focusable element
    setTimeout(() => {
      const focusable = content.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }, 50);
  }
  
  // Close modal
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const content = modal?.querySelector('[data-tui-modal-content]');
    if (!modal) return;
    
    modal.setAttribute('data-tui-modal-open', 'false');
    
    // Update triggers
    document.querySelectorAll(`[data-tui-modal-trigger="${modalId}"]`).forEach(trigger => {
      trigger.setAttribute('data-tui-modal-trigger-open', 'false');
    });
    
    // Animation
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    content?.classList.remove('scale-100', 'opacity-100');
    content?.classList.add('scale-95', 'opacity-0');
    
    // Hide after animation
    setTimeout(() => {
      if (modal.getAttribute('data-tui-modal-open') === 'false') {
        modal.style.display = 'none';
        if (openModalId === modalId) {
          openModalId = null;
          document.body.style.overflow = '';
        }
      }
    }, 300);
  }
  
  // Event delegation
  document.addEventListener('click', (e) => {
    // Handle trigger clicks
    const trigger = e.target.closest('[data-tui-modal-trigger]');
    if (trigger && !trigger.hasAttribute('disabled') && !trigger.classList.contains('opacity-50')) {
      const modalId = trigger.getAttribute('data-tui-modal-trigger');
      const modal = document.getElementById(modalId);
      if (modal?.getAttribute('data-tui-modal-open') === 'true') {
        closeModal(modalId);
      } else {
        openModal(modalId);
      }
      return;
    }
    
    // Handle close button clicks
    const closeBtn = e.target.closest('[data-tui-modal-close]');
    if (closeBtn) {
      const modal = closeBtn.closest('[data-tui-modal]');
      if (modal?.id) closeModal(modal.id);
      return;
    }
    
    // Handle click away - close when clicking on backdrop or modal container (but not content)
    if (openModalId) {
      const modal = document.getElementById(openModalId);
      const isBackdropClick = e.target.matches('[data-tui-modal-backdrop]');
      const isModalContainerClick = e.target === modal;
      
      if (modal?.getAttribute('data-tui-modal-disable-click-away') !== 'true' &&
          (isBackdropClick || isModalContainerClick) && 
          !e.target.closest('[data-tui-modal-trigger]')) {
        closeModal(openModalId);
      }
    }
  });
  
  // ESC key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openModalId) {
      const modal = document.getElementById(openModalId);
      if (modal?.getAttribute('data-tui-modal-disable-esc') !== 'true') {
        closeModal(openModalId);
      }
    }
  });
  
  // MutationObserver for initial open state
  new MutationObserver(() => {
    document.querySelectorAll('[data-tui-modal][data-tui-modal-initial-open]').forEach(modal => {
      if (modal.id && modal.getAttribute('data-tui-modal-open') !== 'true') {
        openModal(modal.id);
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
})();